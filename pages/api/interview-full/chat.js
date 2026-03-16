import { 
  createFullInterviewSession, 
  getSession, 
  updateSession,
  extractAnswer,
  generateOpening,
  generateNextQuestion,
  generateConfirmation,
  generateCompletionReport,
  saveProfile,
  QUESTION_FLOW
} from '../../../lib/interview-full';
import { callKimiAPI, generateFollowUpPrompt } from '../../../lib/api';

// 需要AI判断的开放题字段
const AI_FOLLOWUP_FIELDS = [
  'hobby_type', 'douyin_content_type', 'travel_style', 
  'xingge', 'xinggetwo', 'core_need', 'deal_breakers'
];

// 检查是否有Kimi API Key
const hasKimiAPI = () => !!process.env.KIMI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message, action } = req.body;

    // 开始新会话
    if (action === 'start') {
      const newSessionId = await createFullInterviewSession();
      const { reply } = generateOpening();
      
      // 保存开场消息
      await updateSession(newSessionId, {
        messages: [{ role: 'ai', content: reply, timestamp: Date.now() }]
      });

      return res.json({
        success: true,
        sessionId: newSessionId,
        reply,
        progress: { current: 0, total: QUESTION_FLOW.length, percentage: 0 },
        stage: 'opening'
      });
    }

    // 继续对话
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const aiState = session.ai_state || {};
    const currentMessages = session.messages || [];
    const collectedAnswers = session.collected_answers || {};
    
    // 处理开场确认（用户说准备好了）
    if (aiState.stage === 'opening') {
      const readyKeywords = ['好', '准备好了', '开始', '嗯', '行', '可以', 'ok', 'yes'];
      const isReady = readyKeywords.some(k => message.toLowerCase().includes(k));
      
      if (isReady) {
        // 开始第一题
        const { reply, nextIndex, question } = generateNextQuestion(collectedAnswers, -1);
        
        await updateSession(sessionId, {
          ai_state: {
            ...aiState,
            currentQuestionIndex: nextIndex,
            stage: 'interviewing',
            currentQuestion: question
          },
          messages: [
            ...currentMessages,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'ai', content: reply, timestamp: Date.now() }
          ]
        });
        
        return res.json({
          success: true,
          reply,
          progress: { current: 1, total: QUESTION_FLOW.length, percentage: Math.round(1/QUESTION_FLOW.length*100) },
          stage: 'interviewing'
        });
      } else {
        // 还没准备好
        return res.json({
          success: true,
          reply: '没关系，准备好了随时告诉我～',
          progress: { current: 0, total: QUESTION_FLOW.length, percentage: 0 },
          stage: 'opening'
        });
      }
    }
    
    // 处理追问回复
    if (aiState.pendingFollowUp) {
      const { field, originalValue, question } = aiState.pendingFollowUp;
      
      // 把追问回复追加到原答案
      const combinedValue = `${originalValue}（追问补充：${message}）`;
      const newAnswer = { [field]: combinedValue };
      const newAnswers = { ...collectedAnswers, ...newAnswer };
      
      // 进入下一题或完成
      const nextResult = generateNextQuestion(newAnswers, aiState.currentQuestionIndex);
      
      if (nextResult.complete) {
        const report = generateCompletionReport(newAnswers);
        const { profileId } = await saveProfile(newAnswers, sessionId);
        
        await updateSession(sessionId, {
          collected_answers: newAnswers,
          ai_state: {
            ...aiState,
            pendingFollowUp: null,
            stage: 'complete'
          },
          messages: [
            ...currentMessages,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'ai', content: report, timestamp: Date.now() }
          ],
          status: 'completed'
        });
        
        return res.json({
          success: true,
          reply: report,
          progress: { current: QUESTION_FLOW.length, total: QUESTION_FLOW.length, percentage: 100 },
          stage: 'complete',
          profileId,
          completed: true
        });
      }
      
      // 还有下一题
      const { reply, nextIndex, question: nextQuestion } = nextResult;
      
      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          ...aiState,
          currentQuestionIndex: nextIndex,
          currentQuestion: nextQuestion,
          pendingFollowUp: null
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: reply, timestamp: Date.now() }
        ]
      });
      
      return res.json({
        success: true,
        reply,
        progress: { 
          current: nextIndex + 1, 
          total: QUESTION_FLOW.length, 
          percentage: Math.round((nextIndex + 1) / QUESTION_FLOW.length * 100)
        },
        stage: 'interviewing'
      });
    }
    
    // 处理确认回复
    if (aiState.pendingConfirm) {
      const confirmKeywords = ['对', '是的', '没错', '正确', '可以', '嗯', '好', 'yes', 'y', '确定', '行'];
      const denyKeywords = ['不对', '错了', '不是', '重新', '改', 'no', 'n', '否'];
      
      const isConfirm = confirmKeywords.some(k => message.includes(k));
      const isDeny = denyKeywords.some(k => message.includes(k));
      
      if (isDeny || (!isConfirm && !isDeny)) {
        // 否认或模糊，重新问同一题
        const question = QUESTION_FLOW[aiState.currentQuestionIndex];
        const reply = question.question + '\n\n（重新说一次吧）';
        
        await updateSession(sessionId, {
          ai_state: {
            ...aiState,
            pendingConfirm: null
          },
          messages: [
            ...currentMessages,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'ai', content: reply, timestamp: Date.now() }
          ]
        });
        
        return res.json({
          success: true,
          reply,
          progress: { 
            current: aiState.currentQuestionIndex + 1, 
            total: QUESTION_FLOW.length, 
            percentage: Math.round((aiState.currentQuestionIndex + 1) / QUESTION_FLOW.length * 100)
          },
          stage: 'interviewing'
        });
      }
      
      // 确认成功，保存答案并进入下一题
      const confirmedAnswer = { [aiState.pendingConfirm.field]: aiState.pendingConfirm.value };
      const newAnswers = { ...collectedAnswers, ...confirmedAnswer };
      
      const nextResult = generateNextQuestion(newAnswers, aiState.currentQuestionIndex);
      
      console.log('Confirm - Next result:', { 
        currentIndex: aiState.currentQuestionIndex, 
        complete: nextResult.complete 
      });
      
      if (nextResult.complete) {
        // 全部完成
        const report = generateCompletionReport(newAnswers);
        const { profileId } = await saveProfile(newAnswers, sessionId);
        
        await updateSession(sessionId, {
          collected_answers: newAnswers,
          ai_state: {
            ...aiState,
            pendingConfirm: null,
            stage: 'complete'
          },
          messages: [
            ...currentMessages,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'ai', content: report, timestamp: Date.now() }
          ],
          status: 'completed'
        });
        
        return res.json({
          success: true,
          reply: report,
          progress: { current: QUESTION_FLOW.length, total: QUESTION_FLOW.length, percentage: 100 },
          stage: 'complete',
          profileId,
          completed: true
        });
      }
      
      // 还有下一题
      const { reply, nextIndex, question } = nextResult;
      
      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          ...aiState,
          currentQuestionIndex: nextIndex,
          currentQuestion: question,
          pendingConfirm: null
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: reply, timestamp: Date.now() }
        ]
      });
      
      return res.json({
        success: true,
        reply,
        progress: { 
          current: nextIndex + 1, 
          total: QUESTION_FLOW.length, 
          percentage: Math.round((nextIndex + 1) / QUESTION_FLOW.length * 100)
        },
        stage: 'interviewing'
      });
    }
    
    // 正常答题流程
    const currentQuestion = aiState.currentQuestion;
    if (!currentQuestion) {
      return res.status(400).json({ error: 'No current question' });
    }
    
    // 提取答案
    const extraction = extractAnswer(message, currentQuestion.key, currentQuestion.type);
    
    // 如果需要确认（置信度低或可疑）
    if (extraction.needsConfirm) {
      const { reply } = generateConfirmation(currentQuestion.key, extraction.originalValue, extraction);
      
      await updateSession(sessionId, {
        ai_state: {
          ...aiState,
          pendingConfirm: {
            field: currentQuestion.key,
            value: extraction.value
          }
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: reply, timestamp: Date.now() }
        ]
      });
      
      return res.json({
        success: true,
        reply,
        needsConfirm: true,
        progress: { 
          current: aiState.currentQuestionIndex + 1, 
          total: QUESTION_FLOW.length, 
          percentage: Math.round((aiState.currentQuestionIndex + 1) / QUESTION_FLOW.length * 100)
        },
        stage: 'confirming'
      });
    }
    
    // 置信度够高，检查是否需要AI追问
    const newAnswer = { [currentQuestion.key]: extraction.value };
    const newAnswers = { ...collectedAnswers, ...newAnswer };
    
    // 如果是开放题且配置了Kimi API，调用AI判断是否需要追问
    if (AI_FOLLOWUP_FIELDS.includes(currentQuestion.key) && hasKimiAPI()) {
      try {
        const messages = generateFollowUpPrompt(
          currentQuestion.question, 
          extraction.value,
          collectedAnswers
        );
        
        const aiResponse = await callKimiAPI(messages, process.env.KIMI_API_KEY);
        
        // AI认为需要追问（回复不是"继续"）
        if (aiResponse && !aiResponse.includes('继续') && aiResponse.length > 5) {
          const followUpReply = aiResponse.trim();
          
          await updateSession(sessionId, {
            collected_answers: newAnswers,
            ai_state: {
              ...aiState,
              pendingFollowUp: {
                field: currentQuestion.key,
                originalValue: extraction.value,
                question: currentQuestion
              }
            },
            messages: [
              ...currentMessages,
              { role: 'user', content: message, timestamp: Date.now() },
              { role: 'ai', content: followUpReply, timestamp: Date.now() }
            ]
          });
          
          return res.json({
            success: true,
            reply: followUpReply,
            needsFollowUp: true,
            progress: { 
              current: aiState.currentQuestionIndex + 1, 
              total: QUESTION_FLOW.length, 
              percentage: Math.round((aiState.currentQuestionIndex + 1) / QUESTION_FLOW.length * 100)
            },
            stage: 'interviewing'
          });
        }
      } catch (err) {
        console.log('Kimi API调用失败，继续本地流程:', err.message);
        // API失败，继续本地流程
      }
    }
    
    // 本地流程：进入下一题或完成
    const nextResult = generateNextQuestion(newAnswers, aiState.currentQuestionIndex);
    
    if (nextResult.complete) {
      // 全部完成
      const report = generateCompletionReport(newAnswers);
      const { profileId } = await saveProfile(newAnswers, sessionId);
      
      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          ...aiState,
          stage: 'complete'
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: report, timestamp: Date.now() }
        ],
        status: 'completed'
      });
      
      return res.json({
        success: true,
        reply: report,
        progress: { current: QUESTION_FLOW.length, total: QUESTION_FLOW.length, percentage: 100 },
        stage: 'complete',
        profileId,
        completed: true
      });
    }
    
    // 还有下一题
    const { reply, nextIndex, question } = nextResult;
    
    await updateSession(sessionId, {
      collected_answers: newAnswers,
      ai_state: {
        ...aiState,
        currentQuestionIndex: nextIndex,
        currentQuestion: question
      },
      messages: [
        ...currentMessages,
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'ai', content: reply, timestamp: Date.now() }
      ]
    });
    
    return res.json({
      success: true,
      reply,
      progress: { 
        current: nextIndex + 1, 
        total: QUESTION_FLOW.length, 
        percentage: Math.round((nextIndex + 1) / QUESTION_FLOW.length * 100)
      },
      stage: 'interviewing'
    });

  } catch (error) {
    console.error('Full interview API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
