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
          conversationDepth: 1
        }
      });

      return res.json({
        success: true,
        sessionId: session.id,
        reply,
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

    // 1. 从用户消息中提取信息
    const missingFields = aiState.missingFields || ['nickname', 'gender', 'city'];
    const extraction = await extractInfoFromMessage(message, missingFields, currentAnswers);
    
    // 2. 合并新提取的信息
    const newAnswers = { ...currentAnswers, ...extraction.extracted };
    
    // 3. 更新缺失字段列表
    const stillMissing = missingFields.filter(f => !newAnswers[f]);
    
    // 4. 生成AI回复
    const depth = aiState.conversationDepth || 0;
    const { reply, topic, complete } = generateAIReply(
      newAnswers, 
      stillMissing, 
      message, 
      depth + 1
    );

    // 5. 保存消息记录
    const updatedMessages = [
      ...currentMessages,
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'ai', content: reply, topic, extracted: extraction.extracted, timestamp: Date.now() }
    ];

    // 6. 更新会话
    const completed = stillMissing.length === 0 || complete;
    await updateSession(sessionId, {
      collected_answers: newAnswers,
      ai_state: {
        currentTopic: topic,
        missingFields: stillMissing,
        conversationDepth: depth + 1
      },
      messages: updatedMessages,
      status: completed ? 'completed' : 'active'
    });

    // 7. 返回
    const collectedCount = Object.keys(newAnswers).length;
    
    res.json({
      success: true,
      reply,
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
