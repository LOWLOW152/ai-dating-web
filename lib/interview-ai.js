// AI驱动访谈系统 - 所有问题由Kimi生成
import { sql } from '@vercel/postgres';

// 21题核心信息（仅用于追踪进度，问题由AI生成）
export const QUESTION_TOPICS = [
  // Part 1: 基础信息 (8题)
  { key: 'nickname', category: 'basic', desc: '昵称/称呼', example: '小明' },
  { key: 'gender', category: 'basic', desc: '性别', example: '男/女' },
  { key: 'birth_year', category: 'basic', desc: '出生年份', example: '1995' },
  { key: 'city', category: 'basic', desc: '所在城市', example: '北京' },
  { key: 'occupation', category: 'basic', desc: '职业', example: '程序员' },
  { key: 'education', category: 'basic', desc: '学历', example: '本科' },
  { key: 'accept_long_distance', category: 'basic', desc: '能否接受异地', example: '完全不能接受' },
  { key: 'age_range', category: 'basic', desc: '接受对方年龄范围', example: '±3岁' },
  
  // Part 2: 兴趣与生活 (12题)
  { key: 'hobby_type', category: 'lifestyle', desc: '休息时喜欢做的事', example: '看书、打游戏、运动' },
  { key: 'douyin_content_type', category: 'lifestyle', desc: '短视频常看内容', example: '搞笑、知识、美食' },
  { key: 'travel_style', category: 'lifestyle', desc: '旅行方式偏好', example: '特种兵打卡、悠闲度假' },
  { key: 'social_circle', category: 'lifestyle', desc: '社交圈子类型', example: '固定小圈子、常认识新朋友' },
  { key: 'xingge', category: 'lifestyle', desc: '自我性格描述', example: '外向、理性、敏感' },
  { key: 'xinggetwo', category: 'lifestyle', desc: '期望对方性格', example: '温柔体贴、幽默风趣' },
  { key: 'spending_habit', category: 'lifestyle', desc: '消费观念', example: '攒钱型、该省省该花花' },
  { key: 'sleep_schedule', category: 'lifestyle', desc: '作息类型', example: '早睡早起、夜猫子' },
  { key: 'tidiness', category: 'lifestyle', desc: '整洁程度', example: '极简、乱中有序' },
  { key: 'smoke_drink', category: 'lifestyle', desc: '烟酒习惯', example: '都不、偶尔小酌' },
  { key: 'time_together', category: 'lifestyle', desc: '相处频率偏好', example: '天天黏在一起、各自有空间' },
  { key: 'conflict_handling', category: 'lifestyle', desc: '冲突处理方式', example: '冷静后再沟通、当下说清楚' },
  
  // Part 3: 深度情感 (2题)
  { key: 'core_need', category: 'deep', desc: '亲密关系核心需求', example: '被理解、安全感、共同成长' },
  { key: 'deal_breakers', category: 'deep', desc: '绝对不能接受的底线', example: '出轨、冷暴力、不诚实' },
];

// AI提问原则系统提示词
export const AI_INTERVIEWER_SYSTEM_PROMPT = `你是"狗蛋"，一位专业的AI相亲助手。你的任务是通过21个问题了解用户，为后续匹配做准备。

【核心原则】
1. **像朋友聊天，不要像审问**
   - 用口语化表达，避免官方腔
   - 适当用emoji增加亲和力
   - 根据用户回答调整语气

2. **一次只问一个问题**
   - 不要一次抛出多个问题
   - 等用户回答完再问下一个
   - 给用户充分表达空间

3. **追问要温柔有针对性**
   - 回答太短（少于10字）：追问细节
   - 回答模糊（"还行""一般"）：追问具体例子
   - 回答敷衍（"随便""不知道"）：温和提醒
   - 深度问题：最多追问1次，挖掘真实想法

4. **保持上下文连贯**
   - 记住之前聊过什么
   - 新问题可以关联之前的回答
   - 让用户感觉你在认真听

5. **过渡自然**
   - 阶段性总结（如：基础信息聊完了～）
   - 换话题时给提示
   - 最后两题提醒"这是比较深的问题"

【提问风格】
- 开场：轻松打招呼，说明来意
- 基础题：直接但不生硬
- 生活题：好奇但不冒犯
- 深度题：温柔、给用户思考时间
- 选项题：列出选项让用户选

【禁止行为】
- 连续追问超过2次
- 用专业术语或心理学术语
- 评判用户的回答
- 一次问多个问题`;

// 生成开场白prompt
export const generateOpeningPrompt = () => [
  { role: 'system', content: AI_INTERVIEWER_SYSTEM_PROMPT },
  { role: 'user', content: `请生成开场白，介绍自己是狗蛋，说明大概21个问题，像朋友聊天一样。语气轻松自然，带emoji。` }
];

// 生成问题prompt
export const generateQuestionPrompt = (topic, collectedAnswers, conversationHistory) => {
  const answeredTopics = Object.keys(collectedAnswers).map(key => {
    const topicInfo = QUESTION_TOPICS.find(t => t.key === key);
    return `- ${topicInfo?.desc || key}: ${collectedAnswers[key]}`;
  }).join('\n');
  
  const historyText = conversationHistory.slice(-4).map(m => 
    `${m.role === 'user' ? '用户' : '狗蛋'}: ${m.content}`
  ).join('\n');
  
  return [
    { role: 'system', content: AI_INTERVIEWER_SYSTEM_PROMPT },
    { role: 'user', content: `当前要询问的话题：${topic.desc}（${topic.key}）

已收集的信息：
${answeredTopics || '暂无'}

最近对话：
${historyText || '刚开始对话'}

请生成这个问题：
1. 如果是第一题，先简单过渡
2. 用自然口语化的方式提问
3. 如果是选择题，列出选项
4. 深度题提醒"慢慢想"
5. 只返回问题内容，不要多余解释` }
  ];
};

// 生成追问prompt
export const generateFollowUpPrompt = (topic, userAnswer, collectedAnswers) => {
  const answeredTopics = Object.keys(collectedAnswers).map(key => {
    const topicInfo = QUESTION_TOPICS.find(t => t.key === key);
    return `- ${topicInfo?.desc || key}: ${collectedAnswers[key]}`;
  }).join('\n');
  
  return [
    { role: 'system', content: AI_INTERVIEWER_SYSTEM_PROMPT },
    { role: 'user', content: `当前话题：${topic.desc}
用户回答："${userAnswer}"

已收集的信息：
${answeredTopics || '暂无'}

请判断是否需要追问：
- 回答太短/模糊/敷衍 → 生成一个温柔的追问
- 回答具体有细节 → 回复"继续"

追问要求：
1. 语气友好，不要指责
2. 针对回答中的某个点深入
3. 给用户台阶下（"可以多说说吗"）

只返回追问内容或"继续"，不要多余解释。` }
  ];
};

// 生成阶段性过渡prompt
export const generateTransitionPrompt = (fromCategory, toCategory, collectedAnswers) => {
  const categoryNames = {
    basic: '基础信息',
    lifestyle: '日常生活',
    deep: '情感需求'
  };
  
  return [
    { role: 'system', content: AI_INTERVIEWER_SYSTEM_PROMPT },
    { role: 'user', content: `${categoryNames[fromCategory]}聊完了，现在要进入${categoryNames[toCategory]}部分。

请生成一个自然的过渡语：
1. 简要总结刚才聊的内容
2. 引出下一个话题
3. 语气轻松，带emoji
4. 2-3句话即可` }
  ];
};

// 生成档案总结prompt
export const generateProfileSummaryPrompt = (collectedAnswers) => {
  const answersText = Object.entries(collectedAnswers).map(([key, value]) => {
    const topic = QUESTION_TOPICS.find(t => t.key === key);
    return `${topic?.desc || key}: ${value}`;
  }).join('\n');
  
  return [
    { role: 'system', content: `你是专业的相亲档案分析师。根据用户回答生成温暖、有洞察的档案总结。

档案结构：
1. 个人画像（3-4个标签式描述）
2. 性格观察（基于回答的洞察）
3. 情感需求（最看重什么）
4. 适合的另一半类型
5. 一句话总结

语气：温暖真诚、有洞察但不评判、突出独特性` },
    { role: 'user', content: `用户回答汇总：\n\n${answersText}\n\n请生成相亲档案总结：` }
  ];
};

// 创建新会话
export async function createFullInterviewSession() {
  const initialState = {
    currentTopicIndex: -1, // -1表示还没开始
    collectedAnswers: {},
    conversationHistory: [],
    stage: 'opening' // opening, interviewing, complete
  };
  
  const result = await sql`
    INSERT INTO interview_sessions (status, collected_answers, ai_state, messages)
    VALUES ('active', '{}', ${JSON.stringify(initialState)}::jsonb, '[]'::jsonb)
    RETURNING id
  `;
  return result.rows[0].id;
}

// 获取会话
export async function getSession(sessionId) {
  const result = await sql`
    SELECT * FROM interview_sessions WHERE id = ${sessionId}
  `;
  return result.rows[0];
}

// 更新会话
export async function updateSession(sessionId, updates) {
  const { collected_answers, ai_state, messages, status } = updates;
  
  const result = await sql`
    UPDATE interview_sessions 
    SET 
      collected_answers = COALESCE(${collected_answers ? JSON.stringify(collected_answers) : null}::jsonb, collected_answers),
      ai_state = COALESCE(${ai_state ? JSON.stringify(ai_state) : null}::jsonb, ai_state),
      messages = COALESCE(${messages ? JSON.stringify(messages) : null}::jsonb, messages),
      status = COALESCE(${status}, status),
      updated_at = NOW()
    WHERE id = ${sessionId}
    RETURNING *
  `;
  return result.rows[0];
}

// 获取当前话题
export function getCurrentTopic(state) {
  const index = state.currentTopicIndex;
  if (index < 0 || index >= QUESTION_TOPICS.length) return null;
  return QUESTION_TOPICS[index];
}

// 获取下一个话题
export function getNextTopic(state) {
  const nextIndex = state.currentTopicIndex + 1;
  if (nextIndex >= QUESTION_TOPICS.length) return null;
  return { topic: QUESTION_TOPICS[nextIndex], index: nextIndex };
}

// 检查是否需要阶段过渡
export function needsTransition(fromIndex, toIndex) {
  if (fromIndex < 0) return false;
  const fromCategory = QUESTION_TOPICS[fromIndex]?.category;
  const toCategory = QUESTION_TOPICS[toIndex]?.category;
  return fromCategory !== toCategory;
}

// 保存档案
export async function saveProfile(answers, sessionId) {
  const inviteCode = 'AI-' + Date.now().toString(36).toUpperCase();
  const profileId = new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + inviteCode;
  
  const profileData = {
    id: profileId,
    invite_code: inviteCode,
    answers,
    created_at: new Date().toISOString()
  };
  
  await sql`
    INSERT INTO profiles (id, invite_code, answers, session_id, created_at)
    VALUES (${profileId}, ${inviteCode}, ${JSON.stringify(profileData)}::jsonb, ${sessionId}, NOW())
  `;
  
  return { profileId, inviteCode };
}
