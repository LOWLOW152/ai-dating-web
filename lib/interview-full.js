// 完整21题AI访谈系统
import { sql } from '@vercel/postgres';

// 21题配置（从数据库简化）
export const QUESTION_FLOW = [
  // Part 1: 基础信息 (8题)
  { key: 'nickname', part: 1, question: '先简单认识一下～你怎么称呼呢？', type: 'text', required: true },
  { key: 'gender', part: 1, question: '你的性别是？', type: 'choice', options: ['男', '女'], required: true },
  { key: 'birth_year', part: 1, question: '出生年份是？（比如1995）', type: 'number', required: true },
  { key: 'city', part: 1, question: '目前所在城市是？', type: 'text', required: true },
  { key: 'occupation', part: 1, question: '你的职业是？', type: 'text', required: true },
  { key: 'education', part: 1, question: '学历是？', type: 'choice', options: ['高中及以下', '大专', '本科', '硕士', '博士'], required: true },
  { key: 'accept_long_distance', part: 1, question: '能否接受异地？', type: 'choice', options: ['完全不能接受', '同城/邻近城市可以', '双方能聊得来就可以', '看具体情况'], required: true },
  { key: 'age_range', part: 1, question: '接受对方的年龄范围（比如±3岁）？', type: 'text', required: true },
  
  // Part 2: 兴趣与生活 (12题)
  { key: 'hobby_type', part: 2, question: '休息时最喜欢做的事是什么？', type: 'text', hint: '比如：看书、打游戏、运动、追剧...', required: true },
  { key: 'douyin_content_type', part: 2, question: '刷短视频时，你最常看哪些内容？', type: 'text', hint: '比如：搞笑、知识、美食、萌宠...', required: true },
  { key: 'travel_style', part: 2, question: '旅行时你更喜欢哪种方式？', type: 'text', hint: '比如：特种兵打卡、悠闲度假、探索当地文化...', required: true },
  { key: 'social_circle', part: 2, question: '你的社交圈子类型是？', type: 'choice', options: ['固定小圈子', '常认识新朋友', '工作后社交减少', '看缘分'], required: true },
  { key: 'xingge', part: 2, question: '你觉得你是怎样的人？', type: 'text', hint: '用几个词形容自己', required: true },
  { key: 'xinggetwo', part: 2, question: '你希望对方的性格是？', type: 'text', hint: '比如：温柔体贴、幽默风趣、稳重成熟...', required: true },
  { key: 'spending_habit', part: 2, question: '你的消费观念是？', type: 'choice', options: ['攒钱型', '该省省该花花', '及时行乐型', '投资型'], required: true },
  { key: 'sleep_schedule', part: 2, question: '你的作息类型是？', type: 'choice', options: ['早睡早起', '正常作息', '夜猫子', '看心情'], required: true },
  { key: 'tidiness', part: 2, question: '你的整洁程度是？', type: 'choice', options: [' minimalist极简', '干净整洁', '乱中有序', '随性而为'], required: true },
  { key: 'smoke_drink', part: 2, question: '你抽烟喝酒吗？', type: 'choice', options: ['都不', '偶尔小酌', '抽烟', '都沾一点'], required: true },
  { key: 'time_together', part: 2, question: '你希望与另一半在一起的频率？', type: 'choice', options: ['天天黏在一起', '每天见面但各自有空间', '工作日各自忙周末一起', '看双方节奏'], required: true },
  { key: 'conflict_handling', part: 2, question: '吵架时你通常怎么处理？', type: 'choice', options: ['冷静后再沟通', '当下说清楚', '需要对方哄', '先回避'], required: true },
  
  // Part 3: 深度情感 (2题)
  { key: 'core_need', part: 3, question: '你在亲密关系里最核心的需求是什么？', type: 'text', hint: '比如：被理解、安全感、共同成长...', required: true, isDeep: true },
  { key: 'deal_breakers', part: 3, question: '有什么是你绝对不能接受的？', type: 'text', hint: '比如：出轨、冷暴力、不诚实...', required: true, isDeep: true },
];

// 创建新会话
export async function createFullInterviewSession() {
  const initialState = {
    currentTopic: 'opening',
    currentQuestionIndex: -1, // -1表示还没开始
    missingFields: QUESTION_FLOW.map(q => q.key),
    collectedAnswers: {},
    conversationDepth: 0,
    pendingConfirm: null,
    stage: 'opening' // opening, interviewing, confirming, complete
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

// 从回答中提取信息
export function extractAnswer(message, questionKey, questionType) {
  const trimmed = message.trim();
  
  // 基础验证
  if (trimmed.length < 1) return { value: null, confidence: 0, needsConfirm: true };
  
  // 允许纯数字的字段（年份、年龄等）
  const numericFields = ['birth_year', 'age_range'];
  
  // 检测明显乱答模式（只有这些情况才质疑）
  const isNonsense = (
    // 无意义文字回答
    ['不知道', '随便', '都行', '你猜', '秘密', '无可奉告', '地球', '中国', '亚洲', '不知道啊', '都行吧'].includes(trimmed) ||
    // 纯符号
    /^[^\u4e00-\u9fa5a-zA-Z0-9]+$/.test(trimmed) ||
    // 纯数字但不是允许的字段
    (/^[0-9]+$/.test(trimmed) && !numericFields.includes(questionKey))
  );
  
  if (isNonsense) {
    return { value: trimmed, confidence: 0.1, needsConfirm: true, isNonsense: true };
  }
  
  // 简单明确的回答直接高置信度通过
  if (questionKey === 'gender') {
    // 性别判断 - 更宽松的匹配
    const lowerMsg = trimmed.toLowerCase();
    if (lowerMsg === '男' || lowerMsg === '男生' || lowerMsg.includes('男')) {
      return { value: '男', originalValue: trimmed, confidence: 0.98, needsConfirm: false };
    }
    if (lowerMsg === '女' || lowerMsg === '女生' || lowerMsg.includes('女')) {
      return { value: '女', originalValue: trimmed, confidence: 0.98, needsConfirm: false };
    }
  }
  
  if (questionKey === 'nickname') {
    // 昵称只要不是太长或太怪，直接过
    const cleanValue = trimmed.replace(/^(我叫|我是|昵称是?|叫)/, '').substring(0, 10).trim();
    if (cleanValue.length >= 1 && cleanValue.length <= 6) {
      return { value: cleanValue, originalValue: trimmed, confidence: 0.95, needsConfirm: false };
    }
    // 昵称过长才质疑
    if (cleanValue.length > 8) {
      return { value: cleanValue, originalValue: trimmed, confidence: 0.6, needsConfirm: true };
    }
  }
  
  // 根据字段类型特殊处理
  let value = trimmed;
  let confidence = 0.9; // 默认高置信度
  let needsConfirm = false;
  
  if (questionKey === 'birth_year') {
    // 提取年份
    const yearMatch = trimmed.match(/(19|20)\d{2}/);
    if (yearMatch) {
      value = yearMatch[0];
      const year = parseInt(value);
      const currentYear = 2026;
      const age = currentYear - year;
      
      // 合理相亲年龄：22-50岁 (1976-2004年出生)
      if (age >= 22 && age <= 50) {
        confidence = 0.98; // 合理年份直接过
        needsConfirm = false;
      } else if (age >= 18 && age <= 60) {
        // 边缘年龄：18-21岁或51-60岁，需要确认
        confidence = 0.6;
        needsConfirm = true;
      } else {
        // 明显不合理：未成年或过大
        confidence = 0.3;
        needsConfirm = true;
      }
    } else {
      // 没匹配到标准年份格式，尝试提取数字
      const numMatch = trimmed.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0]);
        if (num > 1000 && num < 10000) {
          value = num.toString();
          confidence = 0.6;
          needsConfirm = true; // 格式不标准，确认一下
        } else {
          confidence = 0.3;
          needsConfirm = true;
        }
      } else {
        confidence = 0.3;
        needsConfirm = true;
      }
    }
  }
  
  if (questionKey === 'age_range') {
    // 提取年龄范围
    const rangeMatch = trimmed.match(/[±+-]?\s*(\d+)\s*岁?/);
    if (rangeMatch) {
      value = '±' + rangeMatch[1] + '岁';
      confidence = 0.95;
    }
  }
  
  if (questionKey === 'nickname') {
    // 昵称已经在上面处理过，这里保持原值
    value = trimmed.replace(/^(我叫|我是|昵称是?|叫)/, '').substring(0, 10).trim();
  }
  
  // 选择题类型（有选项的）高置信度
  if (questionType === 'choice') {
    confidence = 0.95;
    needsConfirm = false;
  }
  
  // 深度题给予更多宽容
  if (questionKey === 'core_need' || questionKey === 'deal_breakers') {
    confidence = 0.95; // 情感类问题不质疑，让用户自由表达
    needsConfirm = false;
  }
  
  return {
    value,
    originalValue: trimmed,
    confidence,
    needsConfirm: needsConfirm || confidence < 0.7 // 只有置信度低于0.7才需要确认
  };
}

// 生成开场白
export function generateOpening() {
  return {
    reply: "哈喽～我是狗蛋 🐶\n\n今天想跟你聊聊，像朋友一样。大概20个问题，了解真实的你。\n\n准备好了吗？",
    nextIndex: -1,
    stage: 'opening'
  };
}

// 生成下一题
export function generateNextQuestion(collectedAnswers, currentIndex) {
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= QUESTION_FLOW.length) {
    return { complete: true };
  }
  
  const question = QUESTION_FLOW[nextIndex];
  
  // 阶段性过渡语
  let prefix = '';
  if (nextIndex === 8) {
    prefix = '基础信息了解得差不多啦～接下来聊聊你的兴趣爱好 🌿\n\n';
  } else if (nextIndex === 20) {
    prefix = '生活部分聊完啦～最后两个比较走心的问题 💭\n\n';
  }
  
  let reply = prefix + question.question;
  
  // 如果有选项，列出来
  if (question.options) {
    reply += '\n\n' + question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
  }
  
  // 如果有提示，加上
  if (question.hint) {
    reply += `\n\n💡 ${question.hint}`;
  }
  
  // 深度题特殊提示
  if (question.isDeep) {
    reply += '\n\n（不用急着回答，慢慢想～）';
  }
  
  return {
    reply,
    nextIndex,
    question,
    stage: 'interviewing'
  };
}

// 生成确认回复
export function generateConfirmation(field, value, isNonsense = false) {
  if (isNonsense) {
    return {
      reply: pickOne([
        `「${value}」...认真的吗？😂 重新说一下呗～`,
        `这个回答有点敷衍哦，正经说一下？`,
        `哈哈，「${value}」是什么鬼，重新来～`,
      ]),
      isConfirm: true
    };
  }
  
  const fieldNames = {
    nickname: '昵称',
    gender: '性别',
    birth_year: '出生年份',
    city: '城市',
    occupation: '职业',
    education: '学历',
    accept_long_distance: '异地接受度',
    age_range: '年龄范围',
    hobby_type: '兴趣爱好',
    douyin_content_type: '爱看的内容',
    travel_style: '旅行风格',
    social_circle: '社交类型',
    xingge: '自我评价',
    xinggetwo: '期望性格',
    spending_habit: '消费观念',
    sleep_schedule: '作息',
    tidiness: '整洁程度',
    smoke_drink: '烟酒习惯',
    time_together: '相处频率',
    conflict_handling: '冲突处理',
    core_need: '核心需求',
    deal_breakers: '关系红线'
  };
  
  const name = fieldNames[field] || field;
  
  return {
    reply: pickOne([
      `${name}记下了：「${value}」～对吗？`,
      `你的${name}是「${value}」，确认下？`,
      `我记${name}=${value}，没错吧？`,
    ]),
    isConfirm: true
  };
}

// 生成完成报告
export function generateCompletionReport(answers) {
  const sections = {
    basic: ['nickname', 'gender', 'birth_year', 'city', 'occupation', 'education', 'accept_long_distance', 'age_range'],
    lifestyle: ['hobby_type', 'douyin_content_type', 'travel_style', 'social_circle', 'xingge', 'xinggetwo', 'spending_habit', 'sleep_schedule', 'tidiness', 'smoke_drink', 'time_together', 'conflict_handling'],
    deep: ['core_need', 'deal_breakers']
  };
  
  const fieldNames = {
    nickname: '昵称', gender: '性别', birth_year: '出生年份', city: '城市',
    occupation: '职业', education: '学历', accept_long_distance: '异地接受度', age_range: '年龄范围',
    hobby_type: '兴趣爱好', douyin_content_type: '爱看内容', travel_style: '旅行风格',
    social_circle: '社交类型', xingge: '自我评价', xinggetwo: '期望性格',
    spending_habit: '消费观念', sleep_schedule: '作息', tidiness: '整洁程度',
    smoke_drink: '烟酒习惯', time_together: '相处频率', conflict_handling: '冲突处理',
    core_need: '核心需求', deal_breakers: '关系红线'
  };
  
  let report = '📋 你的相亲档案\n\n';
  
  report += '【基础信息】\n';
  sections.basic.forEach(key => {
    if (answers[key]) report += `${fieldNames[key]}：${answers[key]}\n`;
  });
  
  report += '\n【兴趣与生活】\n';
  sections.lifestyle.forEach(key => {
    if (answers[key]) report += `${fieldNames[key]}：${answers[key]}\n`;
  });
  
  report += '\n【情感核心】\n';
  sections.deep.forEach(key => {
    if (answers[key]) report += `${fieldNames[key]}：${answers[key]}\n`;
  });
  
  report += '\n✅ 档案已生成！狗蛋会帮你分析并推荐合适的对象～';
  
  return report;
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 保存档案到数据库
export async function saveProfile(answers, sessionId) {
  const inviteCode = 'AI-' + Date.now().toString(36).toUpperCase();
  const profileId = new Date().toISOString().split('T')[0].replace(/-/g, '') + '-' + inviteCode;
  
  // 构建档案数据结构
  const profileData = {
    id: profileId,
    invite_code: inviteCode,
    basic_info: {
      nickname: answers.nickname,
      gender: answers.gender,
      birth_year: answers.birth_year,
      city: answers.city,
      occupation: answers.occupation,
      education: answers.education,
      accept_long_distance: answers.accept_long_distance,
      age_range: answers.age_range
    },
    interests: {
      hobby_type: answers.hobby_type,
      douyin_content_type: answers.douyin_content_type,
      travel_style: answers.travel_style,
      social_circle: answers.social_circle
    },
    personality: {
      self: answers.xingge,
      expect: answers.xinggetwo
    },
    lifestyle: {
      spending_habit: answers.spending_habit,
      sleep_schedule: answers.sleep_schedule,
      tidiness: answers.tidiness,
      smoke_drink: answers.smoke_drink,
      time_together: answers.time_together,
      conflict_handling: answers.conflict_handling
    },
    emotional: {
      core_need: answers.core_need,
      deal_breakers: answers.deal_breakers
    },
    created_at: new Date().toISOString()
  };
  
  // 保存到 profiles 表
  await sql`
    INSERT INTO profiles (id, invite_code, answers, session_id, created_at)
    VALUES (${profileId}, ${inviteCode}, ${JSON.stringify(profileData)}::jsonb, ${sessionId}, NOW())
  `;
  
  return { profileId, inviteCode };
}
