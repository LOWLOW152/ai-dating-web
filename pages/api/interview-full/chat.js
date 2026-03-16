import { 
  createFullInterviewSession, 
  getSession, 
  updateSession,
  saveProfile,
  getNextTopic,
  needsTransition,
  generateOpeningPrompt,
  generateQuestionPrompt,
  generateFollowUpPrompt,
  generateTransitionPrompt,
  generateProfileSummaryPrompt,
  QUESTION_TOPICS
} from '../../../lib/interview-ai';
import { callKimiAPI } from '../../../lib/api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const kimiApiKey = process.env.KIMI_API_KEY;
  if (!kimiApiKey) {
    return res.status(500).json({ error: 'KIMI_API_KEY not configured' });
  }

  try {
    const { sessionId, message, action } = req.body;

    // 开始新会话
    if (action === 'start') {
      const newSessionId = await createFullInterviewSession();
      
      // AI生成开场白
      const messages = generateOpeningPrompt();
      const opening = await callKimiAPI(messages, kimiApiKey);
      
      await updateSession(newSessionId, {
        messages: [{ role: 'ai', content: opening, timestamp: Date.now() }]
      });

      return res.json({
        success: true,
        sessionId: newSessionId,
        reply: opening,
        progress: { current: 0, total: QUESTION_TOPICS.length, percentage: 0 },
        stage: 'opening'
      });
    }

    // 获取会话
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const aiState = session.ai_state || {};
    const currentMessages = session.messages || [];
    const collectedAnswers = session.collected_answers || {};

    // 处理开场阶段
    if (aiState.stage === 'opening') {
      const readyKeywords = ['好', '准备好了', '开始', '嗯', '行', '可以', 'ok', 'yes', '聊', '来'];
      const isReady = readyKeywords.some(k => message.toLowerCase().includes(k));
      
      if (!isReady) {
        return res.json({
          success: true,
          reply: '没关系，准备好了随时告诉我～',
          progress: { current: 0, total: QUESTION_TOPICS.length, percentage: 0 },
          stage: 'opening'
        });
      }

      // 开始第一题
      const nextTopic = getNextTopic(aiState);
      if (!nextTopic) {
        return res.status(400).json({ error: 'No questions available' });
      }

      // AI生成第一个问题
      const prompt = generateQuestionPrompt(
        nextTopic.topic, 
        collectedAnswers, 
        currentMessages
      );
      const question = await callKimiAPI(prompt, kimiApiKey);

      await updateSession(sessionId, {
        ai_state: {
          ...aiState,
          currentTopicIndex: nextTopic.index,
          stage: 'interviewing',
          pendingFollowUp: null
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: question, timestamp: Date.now() }
        ]
      });

      return res.json({
        success: true,
        reply: question,
        progress: { current: 1, total: QUESTION_TOPICS.length, percentage: Math.round(1/QUESTION_TOPICS.length*100) },
        stage: 'interviewing'
      });
    }

    // 处理追问回复
    if (aiState.pendingFollowUp) {
      const { topicKey, originalAnswer } = aiState.pendingFollowUp;
      const combinedAnswer = `${originalAnswer}（补充：${message}）`;
      
      const newAnswers = { ...collectedAnswers, [topicKey]: combinedAnswer };
      const nextTopic = getNextTopic({ currentTopicIndex: aiState.currentTopicIndex });

      // 最后一题完成
      if (!nextTopic) {
        const summaryPrompt = generateProfileSummaryPrompt(newAnswers);
        const summary = await callKimiAPI(summaryPrompt, kimiApiKey);
        const { profileId } = await saveProfile(newAnswers, sessionId);

        await updateSession(sessionId, {
          collected_answers: newAnswers,
          ai_state: { ...aiState, stage: 'complete', pendingFollowUp: null },
          messages: [
            ...currentMessages,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'ai', content: summary, timestamp: Date.now() }
          ],
          status: 'completed'
        });

        return res.json({
          success: true,
          reply: summary,
          progress: { current: QUESTION_TOPICS.length, total: QUESTION_TOPICS.length, percentage: 100 },
          stage: 'complete',
          profileId,
          completed: true
        });
      }

      // 检查是否需要阶段过渡
      let reply;
      if (needsTransition(aiState.currentTopicIndex, nextTopic.index)) {
        const transitionPrompt = generateTransitionPrompt(
          QUESTION_TOPICS[aiState.currentTopicIndex].category,
          nextTopic.topic.category,
          newAnswers
        );
        const transition = await callKimiAPI(transitionPrompt, kimiApiKey);
        
        const questionPrompt = generateQuestionPrompt(
          nextTopic.topic, 
          newAnswers, 
          [...currentMessages, { role: 'user', content: message }, { role: 'ai', content: transition }]
        );
        const question = await callKimiAPI(questionPrompt, kimiApiKey);
        
        reply = transition + '\n\n' + question;
      } else {
        const questionPrompt = generateQuestionPrompt(
          nextTopic.topic, 
          newAnswers, 
          [...currentMessages, { role: 'user', content: message }]
        );
        reply = await callKimiAPI(questionPrompt, kimiApiKey);
      }

      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          ...aiState,
          currentTopicIndex: nextTopic.index,
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
          current: nextTopic.index + 1, 
          total: QUESTION_TOPICS.length, 
          percentage: Math.round((nextTopic.index + 1) / QUESTION_TOPICS.length * 100)
        },
        stage: 'interviewing'
      });
    }

    // 正常答题处理
    const currentTopic = QUESTION_TOPICS[aiState.currentTopicIndex];
    const newAnswers = { ...collectedAnswers, [currentTopic.key]: message };

    // AI判断是否需要追问
    const followUpPrompt = generateFollowUpPrompt(currentTopic, message, collectedAnswers);
    const followUpResponse = await callKimiAPI(followUpPrompt, kimiApiKey);

    // 需要追问
    if (followUpResponse && followUpResponse.trim() !== '继续' && followUpResponse.length > 3) {
      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: {
          ...aiState,
          pendingFollowUp: {
            topicKey: currentTopic.key,
            originalAnswer: message
          }
        },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: followUpResponse.trim(), timestamp: Date.now() }
        ]
      });

      return res.json({
        success: true,
        reply: followUpResponse.trim(),
        needsFollowUp: true,
        progress: { 
          current: aiState.currentTopicIndex + 1, 
          total: QUESTION_TOPICS.length, 
          percentage: Math.round((aiState.currentTopicIndex + 1) / QUESTION_TOPICS.length * 100)
        },
        stage: 'interviewing'
      });
    }

    // 不需要追问，进入下一题
    const nextTopic = getNextTopic({ currentTopicIndex: aiState.currentTopicIndex });

    // 最后一题完成
    if (!nextTopic) {
      const summaryPrompt = generateProfileSummaryPrompt(newAnswers);
      const summary = await callKimiAPI(summaryPrompt, kimiApiKey);
      const { profileId } = await saveProfile(newAnswers, sessionId);

      await updateSession(sessionId, {
        collected_answers: newAnswers,
        ai_state: { ...aiState, stage: 'complete' },
        messages: [
          ...currentMessages,
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'ai', content: summary, timestamp: Date.now() }
        ],
        status: 'completed'
      });

      return res.json({
        success: true,
        reply: summary,
        progress: { current: QUESTION_TOPICS.length, total: QUESTION_TOPICS.length, percentage: 100 },
        stage: 'complete',
        profileId,
        completed: true
      });
    }

    // 检查是否需要阶段过渡
    let reply;
    if (needsTransition(aiState.currentTopicIndex, nextTopic.index)) {
      const transitionPrompt = generateTransitionPrompt(
        QUESTION_TOPICS[aiState.currentTopicIndex].category,
        nextTopic.topic.category,
        newAnswers
      );
      const transition = await callKimiAPI(transitionPrompt, kimiApiKey);
      
      const questionPrompt = generateQuestionPrompt(
        nextTopic.topic, 
        newAnswers, 
        [...currentMessages, { role: 'user', content: message }, { role: 'ai', content: transition }]
      );
      const question = await callKimiAPI(questionPrompt, kimiApiKey);
      
      reply = transition + '\n\n' + question;
    } else {
      const questionPrompt = generateQuestionPrompt(
        nextTopic.topic, 
        newAnswers, 
        [...currentMessages, { role: 'user', content: message }]
      );
      reply = await callKimiAPI(questionPrompt, kimiApiKey);
    }

    await updateSession(sessionId, {
      collected_answers: newAnswers,
      ai_state: {
        ...aiState,
        currentTopicIndex: nextTopic.index
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
        current: nextTopic.index + 1, 
        total: QUESTION_TOPICS.length, 
        percentage: Math.round((nextTopic.index + 1) / QUESTION_TOPICS.length * 100)
      },
      stage: 'interviewing'
    });

  } catch (error) {
    console.error('AI interview API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
