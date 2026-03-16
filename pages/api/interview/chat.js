import { 
  createInterviewSession, 
  getSession, 
  updateSession,
  extractInfoFromMessage,
  generateAIReply 
} from '../../../lib/interview';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message, action } = req.body;

    // 创建新会话
    if (action === 'start') {
      const session = await createInterviewSession();
      
      // 生成开场白
      const { reply, topic } = generateAIReply({}, ['nickname', 'gender', 'city'], '', 0);
      
      // 保存消息
      const messages = [
        { role: 'ai', content: reply, topic, timestamp: Date.now() }
      ];
      
      await updateSession(session.id, {
        messages,
        ai_state: {
          currentTopic: topic,
          missingFields: ['nickname', 'gender', 'city'],
          conversationDepth: 1,
          pendingConfirm: null  // 待确认的信息
        }
      });

      return res.json({
        success: true,
        sessionId: session.id,
        reply,
        thinking: null,
        progress: {
          collected: 0,
          total: 3,
          percentage: 0
        },
        collectedAnswers: {}
      });
    }

    // 继续对话
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentAnswers = session.collected_answers || {};
    const aiState = session.ai_state || {};
    const currentMessages = session.messages || [];
    const pendingConfirm = aiState.pendingConfirm;

    // 处理确认回复
    if (pendingConfirm) {
      const confirmKeywords = ['对', '是的', '没错', '正确', '可以', '嗯', '好', 'yes', 'y', '确定'];
      const denyKeywords = ['不对', '错了', '不是', '重新', '改', 'no', 'n'];
      
      const isConfirm = confirmKeywords.some(k => message.includes(k));
      const isDeny = denyKeywords.some(k => message.includes(k));
      
      if (isDeny || (!isConfirm && !isDeny)) {
        // 否认或模糊回答，清除待确认状态，重新询问
        const updatedState = {
          ...aiState,
          pendingConfirm: null
        };
        
        // 如果有严重问题（乱答），给提示
        let reply;
        if (pendingConfirm.hasIssue) {
          reply = "哈哈那重新说呗～认真的哦，我怎么称呼你？";
        } else {
          reply = `那${pendingConfirm.field === 'nickname' ? '你想让我怎么称呼你' : pendingConfirm.field === 'city' ? '你在哪个城市呢' : '重新说一下'}？`;
        }
        
        const updatedMessages = [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: reply, topic: 'reask', timestamp: Date.now() }
        ];
        
        await updateSession(sessionId, {
          ai_state: updatedState,
          messages: updatedMessages
        });
        
        return res.json({
          success: true,
          reply,
          thinking: `用户否认了 ${pendingConfirm.value}，重新询问`,
          extractedInfo: {},
          progress: {
            collected: Object.keys(currentAnswers).length,
            total: 3,
            percentage: Math.round((Object.keys(currentAnswers).length / 3) * 100)
          },
          collectedAnswers: currentAnswers,
          missingFields: aiState.missingFields,
          completed: false
        });
      }
      
      // 确认成功，保存答案
      const confirmedAnswer = { [pendingConfirm.field]: pendingConfirm.value };
      const newAnswers = { ...currentAnswers, ...confirmedAnswer };
      const stillMissing = (aiState.missingFields || []).filter(f => !newAnswers[f]);
      
      const depth = aiState.conversationDepth || 0;
      const { reply, topic, complete } = generateAIReply(
        newAnswers, 
        stillMissing, 
        message, 
        depth + 1
      );
      
      const updatedMessages = [
        ...currentMessages,
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'ai', content: reply, topic, timestamp: Date.now() }
      ];
      
      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          currentTopic: topic,
          missingFields: stillMissing,
          conversationDepth: depth + 1,
          pendingConfirm: null
        },
        messages: updatedMessages,
        status: (complete && stillMissing.length === 0) ? 'completed' : 'active'
      });
      
      return res.json({
        success: true,
        reply,
        thinking: `确认 ${pendingConfirm.field} = ${pendingConfirm.value}`,
        extractedInfo: confirmedAnswer,
        progress: {
          collected: Object.keys(newAnswers).length,
          total: 3,
          percentage: Math.round((Object.keys(newAnswers).length / 3) * 100)
        },
        collectedAnswers: newAnswers,
        missingFields: stillMissing,
        completed: complete && stillMissing.length === 0
      });
    }

    // 1. 从用户消息中提取信息
    const missingFields = aiState.missingFields || ['nickname', 'gender', 'city'];
    const extraction = await extractInfoFromMessage(message, missingFields, currentAnswers);
    
    // 2. 如果有提取到信息且需要确认
    if (Object.keys(extraction.extracted).length > 0 && extraction.needsConfirmation) {
      const field = Object.keys(extraction.extracted)[0];
      const value = extraction.extracted[field];
      const thought = extraction.thoughts[field];
      
      // 生成确认回复
      const { reply, topic } = generateAIReply(
        currentAnswers,
        missingFields,
        message,
        aiState.conversationDepth || 0,
        extraction,
        { field, value, thought, hasIssue: extraction.hasSeriousIssue }
      );
      
      // 保存待确认状态
      const updatedMessages = [
        ...currentMessages,
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'ai', content: reply, topic, thinking: thought, extracted: extraction.extracted, timestamp: Date.now() }
      ];
      
      await updateSession(sessionId, {
        ai_state: {
          ...aiState,
          pendingConfirm: { field, value, thought, hasIssue: extraction.hasSeriousIssue }
        },
        messages: updatedMessages
      });
      
      return res.json({
        success: true,
        reply,
        thinking: thought,
        needsConfirmation: true,
        extractedInfo: extraction.extracted,
        progress: {
          collected: Object.keys(currentAnswers).length,
          total: 3,
          percentage: Math.round((Object.keys(currentAnswers).length / 3) * 100)
        },
        collectedAnswers: currentAnswers,
        missingFields,
        completed: false
      });
    }
    
    // 3. 正常流程：合并新提取的信息
    const newAnswers = { ...currentAnswers, ...extraction.extracted };
    
    // 4. 更新缺失字段列表
    const stillMissing = missingFields.filter(f => !newAnswers[f]);
    
    // 5. 生成AI回复
    const depth = aiState.conversationDepth || 0;
    const { reply, topic, complete } = generateAIReply(
      newAnswers, 
      stillMissing, 
      message, 
      depth + 1,
      extraction
    );

    // 6. 保存消息记录
    const updatedMessages = [
      ...currentMessages,
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'ai', content: reply, topic, extracted: extraction.extracted, thinking: extraction.thoughts[Object.keys(extraction.extracted)[0]], timestamp: Date.now() }
    ];

    // 7. 更新会话
    const completed = stillMissing.length === 0 || complete;
    await updateSession(sessionId, {
      collected_answers: newAnswers,
      ai_state: {
        currentTopic: topic,
        missingFields: stillMissing,
        conversationDepth: depth + 1,
        pendingConfirm: null
      },
      messages: updatedMessages,
      status: completed ? 'completed' : 'active'
    });

    // 8. 返回
    const collectedCount = Object.keys(newAnswers).length;
    
    res.json({
      success: true,
      reply,
      thinking: extraction.thoughts[Object.keys(extraction.extracted)[0]] || null,
      extractedInfo: extraction.extracted,
      progress: {
        collected: collectedCount,
        total: 3,
        percentage: Math.round((collectedCount / 3) * 100)
      },
      collectedAnswers: newAnswers,
      missingFields: stillMissing,
      completed: completed && stillMissing.length === 0
    });

  } catch (error) {
    console.error('Interview API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
