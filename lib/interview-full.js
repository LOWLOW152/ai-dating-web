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

// 城市白名单（中国主要城市）
const VALID_CITIES = [
  // 一线城市
  '北京', '上海', '广州', '深圳',
  // 新一线
  '成都', '杭州', '重庆', '西安', '苏州', '武汉', '南京', '天津', '郑州', '长沙', '东莞', '佛山', '宁波', '青岛', '沈阳',
  // 二线
  '昆明', '大连', '厦门', '合肥', '佛山', '福州', '哈尔滨', '济南', '温州', '长春', '石家庄', '常州', '泉州', '南宁', '贵阳', '南昌', '南通', '金华', '徐州', '太原', '嘉兴', '烟台', '惠州', '保定', '台州', '中山', '绍兴', '乌鲁木齐', '潍坊', '兰州',
  // 其他省会
  '海口', '银川', '西宁', '拉萨', '呼和浩特',
  // 港澳台
  '香港', '澳门', '台北', '高雄', '台中',
  // 国外主要城市（允许但置信度降低）
  '纽约', '洛杉矶', '旧金山', '西雅图', '芝加哥', '波士顿', '华盛顿', '迈阿密',
  '伦敦', '曼彻斯特', '爱丁堡', '伯明翰',
  '巴黎', '里昂', '马赛', '波尔多',
  '柏林', '慕尼黑', '法兰克福', '汉堡',
  '东京', '大阪', '京都', '名古屋', '札幌', '福冈',
  '首尔', '釜山',
  '新加坡', '吉隆坡', '曼谷', '雅加达', '马尼拉', '胡志明市', '河内',
  '悉尼', '墨尔本', '布里斯班', '珀斯', '奥克兰',
  '多伦多', '温哥华', '蒙特利尔', '卡尔加里',
  '迪拜', '阿布扎比'
];

// 敏感职业词（需要质疑）
const SENSITIVE_OCCUPATIONS = [
  '妓女', '小姐', '鸭', '牛郎', '陪酒', '卖淫', '性工作者',
  '诈骗', '骗子', '传销', '贩毒', '毒贩', '走私', '黑客', '盗窃', '抢劫',
  '无业', '失业', '家里蹲', '啃老', '混日子', '不工作'
];

// 验证城市
function validateCity(city) {
  const trimmed = city.trim().replace(/[市区县]$/, '');
  
  // 直接匹配
  if (VALID_CITIES.includes(trimmed)) {
    return { valid: true, confidence: 0.95, value: trimmed };
  }
  
  // 包含匹配（如"北京市"匹配"北京"）
  for (const validCity of VALID_CITIES) {
    if (trimmed.includes(validCity) || validCity.includes(trimmed)) {
      return { valid: true, confidence: 0.8, value: validCity };
    }
  }
  
  // 常见错误：国家名
  const countries = ['中国', '美国', '日本', '韩国', '英国', '法国', '德国', '澳大利亚', '加拿大', '新加坡', '马来西亚', '泰国', '越南', '印度', '俄罗斯', '意大利', '西班牙', '巴西', '阿根廷', '墨西哥', '埃及', '南非', '新西兰'];
  if (countries.includes(trimmed)) {
    return { valid: false, confidence: 0.1, isCountry: true };
  }
  
  // 明显虚假/搞笑
  const fakePatterns = ['地球', '火星', '月球', '天堂', '地狱', '王者峡谷', '召唤师峡谷', '提瓦特', '木叶村', '青青草原', '狗熊岭'];
  if (fakePatterns.includes(trimmed)) {
    return { valid: false, confidence: 0.1, isFake: true };
  }
  
  // 未知城市，低置信度
  return { valid: false, confidence: 0.4, value: trimmed };
}

// 验证职业
function validateOccupation(occ) {
  const trimmed = occ.trim();
  
  // 检查敏感词
  for (const sensitive of SENSITIVE_OCCUPATIONS) {
    if (trimmed.includes(sensitive)) {
      return { valid: false, confidence: 0.1, isSensitive: true, word: sensitive };
    }
  }
  
  // 明显敷衍
  const nonsense = ['没有', '无', '不想说', '保密', '国家机密'];
  if (nonsense.includes(trimmed)) {
    return { valid: false, confidence: 0.2, isNonsense: true };
  }
  
  // 正常职业（字数判断）
  if (trimmed.length >= 2 && trimmed.length <= 10) {
    return { valid: true, confidence: 0.9 };
  }
  
  // 过长或过短
  return { valid: false, confidence: 0.5 };
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
    // 如果都不匹配，说明答非所问，需要质疑
    return { value: trimmed, originalValue: trimmed, confidence: 0.4, needsConfirm: true };
  }
  
  if (questionKey === 'nickname') {
    // 昵称只要不是太长或太怪，直接过
    const cleanValue = trimmed.replace(/^(我叫|我是|昵称是?|叫)/, '').substring(0, 10).trim();
    if (cleanValue.length >= 1 && cleanValue.length <= 6) {
      return { value: cleanValue, originalValue: trimmed, confidence: 0.95, needsConfirm: false };
    }
    // 昵称过长或为空，质疑
    return { value: cleanValue || trimmed, originalValue: trimmed, confidence: 0.5, needsConfirm: true };
  }
  
  // 城市验证
  if (questionKey === 'city') {
    const cityValidation = validateCity(trimmed);
    if (cityValidation.valid) {
      return { 
        value: cityValidation.value, 
        originalValue: trimmed, 
        confidence: cityValidation.confidence, 
        needsConfirm: false 
      };
    } else {
      let reason = 'invalid';
      if (cityValidation.isCountry) reason = 'country';
      if (cityValidation.isFake) reason = 'fake';
      return { 
        value: trimmed, 
        originalValue: trimmed, 
        confidence: cityValidation.confidence, 
        needsConfirm: true,
        rejectReason: reason
      };
    }
  }
  
  // 职业验证
  if (questionKey === 'occupation') {
    const occValidation = validateOccupation(trimmed);
    if (occValidation.valid) {
      return { 
        value: trimmed, 
        originalValue: trimmed, 
        confidence: occValidation.confidence, 
        needsConfirm: false 
      };
    } else {
      return { 
        value: trimmed, 
        originalValue: trimmed, 
        confidence: occValidation.confidence, 
        needsConfirm: true,
        rejectReason: occValidation.isSensitive ? 'sensitive' : 'invalid'
      };
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

// 开场白备选池
const OPENING_LINES = [
  "哈喽～我是狗蛋 🐶\n\n别紧张，今天就随便聊聊，像朋友喝咖啡那样。大概20个问题，想更了解真实的你～\n\n准备好了吗？",
  "嗨！我是狗蛋 👋\n\n听说你想找另一半？那得先让我认识你才行～几个问题，放轻松答就好。\n\n我们开始？",
  "哟，来相亲啦？我是狗蛋 🐾\n\n不着急填表，咱先随便唠唠。20个问题，慢慢来～\n\nReady？"
];

// 问题表述的口语化版本
const CASUAL_QUESTIONS = {
  nickname: ["先认识一下～怎么称呼你？", "哈喽！我该怎么叫你？", "先来点轻松的，你的名字是？"],
  gender: ["性别是？（单纯了解一下）", "你是男生还是女生？", "方便说下性别吗～"],
  birth_year: ["哪年生的呀？", "出生年份是？（比如1995）", "多大了？报个年份就行～"],
  city: ["现在在哪个城市？", "你base哪儿？", "目前住在哪个城市呀？"],
  occupation: ["平时做什么工作？", "职业是？", "工作是哪方面的？"],
  education: ["学历是？", "读到什么程度啦？", "教育背景是？"],
  accept_long_distance: ["能接受异地恋吗？", "异地这事你怎么看？", "距离对你来说是问题吗？"],
  age_range: ["希望对方多大？（比如±3岁）", "年龄差能接受多少？", "对方年龄范围？"],
  hobby_type: ["休息时一般干嘛？", "不上班的时候喜欢做什么？", "有什么兴趣爱好？"],
  douyin_content_type: ["刷抖音的话，主要看啥？", "短视频爱看什么类型的？", "平时刷什么内容比较多？"],
  travel_style: ["出门玩的话，你喜欢哪种方式？", "旅行风格是？", "出去玩更喜欢打卡还是悠闲逛？"],
  social_circle: ["朋友圈子大吗？", "平时社交多吗？", "朋友是固定那几个还是常认识新人？"],
  xingge: ["用几个词形容下自己？", "觉得自己是什么样的人？", "性格怎么描述？"],
  xinggetwo: ["希望另一半是什么性格？", "你喜欢什么类型的人？", "对方性格有什么期待？"],
  spending_habit: ["花钱风格是？", "消费观念大概什么样？", "平时怎么花钱的？"],
  sleep_schedule: ["作息怎么样？早睡早起还是夜猫子？", "几点睡几点起？", "生物钟是哪种？"],
  tidiness: ["家里整洁程度如何？", "是收纳达人还是乱中有序？", "居住环境 tidy 吗？"],
  smoke_drink: ["抽烟喝酒吗？", "烟酒沾吗？", "这俩习惯有吗？"],
  time_together: ["希望俩人相处频率是？", "想天天黏一起还是各自有空间？", "相处节奏偏好？"],
  conflict_handling: ["吵架时你一般怎么处理？", "有矛盾了你会？", "冲突处理方式？"],
  core_need: ["在感情里，你最想要的是什么？", "亲密关系里什么对你最重要？", "你觉得自己最核心的情感需求是？"],
  deal_breakers: ["有什么是你绝对不能忍的？", "关系里什么红线不能碰？", "哪些事是你零容忍的？"]
};

// 过渡语池
const TRANSITIONS = {
  part1_end: ["基本信息差不多了～聊聊你的日常 🌿", "好，了解啦。接下来轻松点，聊聊生活 😊", "基础信息get！现在想更了解你平时的样子 ✨"],
  part2_end: ["生活部分聊得差不多了～最后两个走心的问题 💭", "日常了解啦。最后想问问感情观 💕", "差不多啦，最后两个问题比较深哦 🌙"]
};

// 确认收到回答的过渡
const ACKNOWLEDGMENTS = {
  nickname: ["好嘞 {value}～", "记住了，{value} 👋", "嗨{value}！"],
  gender: ["了解～", "收到 👌", "okok"],
  birth_year: ["{value}年，记下了", "{value}年 👍", "好的～"],
  city: ["{value}，不错的地方", "在{value}呀", "{value}，了解～"],
  occupation: ["{value}，挺有意思的", "做{value}的呀", "{value}，了解了 👌"],
  default: ["收到～", "记下了 👍", "了解 ✓", "好的～"]
};

// 生成开场白
export function generateOpening() {
  return {
    reply: pickOne(OPENING_LINES),
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
  const prevQuestion = currentIndex >= 0 ? QUESTION_FLOW[currentIndex] : null;
  const prevAnswer = prevQuestion ? collectedAnswers[prevQuestion.key] : null;
  
  let reply = '';
  
  // 阶段性过渡
  if (nextIndex === 8) {
    reply = pickOne(TRANSITIONS.part1_end) + '\n\n';
  } else if (nextIndex === 20) {
    reply = pickOne(TRANSITIONS.part2_end) + '\n\n';
  } else if (prevAnswer && prevQuestion) {
    // 小过渡：确认收到上一题答案
    const ackPool = ACKNOWLEDGMENTS[prevQuestion.key] || ACKNOWLEDGMENTS.default;
    const ack = pickOne(ackPool).replace('{value}', prevAnswer);
    reply = ack + '\n\n';
  }
  
  // 使用口语化问题
  const casualPool = CASUAL_QUESTIONS[question.key];
  const questionText = casualPool ? pickOne(casualPool) : question.question;
  reply += questionText;
  
  // 如果有选项，列出来（更随意的方式）
  if (question.options) {
    reply += '\n' + question.options.map((opt, i) => `${i + 1}. ${opt}`).join(' / ');
  }
  
  // 提示语更口语化
  if (question.hint) {
    const casualHints = [
      `（${question.hint.replace(/比如：/, '').replace(/.../, '')} 之类的）`,
      `（随便说，${question.hint.replace(/比如：/, '').replace(/.../, '')} 都行）`,
      `（${question.hint.replace(/比如：/, '').replace(/.../, '')}～）`
    ];
    reply += '\n' + pickOne(casualHints);
  }
  
  // 深度题提示
  if (question.isDeep) {
    reply += '\n\n（慢慢想，不着急～）';
  }
  
  return {
    reply,
    nextIndex,
    question,
    stage: 'interviewing'
  };
}

// 生成确认回复
export function generateConfirmation(field, value, extractionResult) {
  const { isNonsense, rejectReason } = extractionResult || {};
  
  // 城市相关问题
  if (field === 'city') {
    if (rejectReason === 'country') {
      return {
        reply: pickOne([`「${value}」是个国家吧？😅 说个具体城市呗～`, `哈哈「${value}」太大了，缩小范围到某个城市？`, `「${value}」是国家名诶，你在哪个城市？`]),
        isConfirm: true
      };
    }
    if (rejectReason === 'fake') {
      return {
        reply: pickOne([`「${value}」...认真的吗？😂 说个真实存在的城市啦～`, `哈哈别闹，「${value}」可没法住人，重新说～`, `「${value}」是认真的？换个真实的城市名呗～`]),
        isConfirm: true
      };
    }
    return {
      reply: pickOne([`「${value}」...确定吗？我好像没听过这个地方😅`, `「${value}」是哪里？确认下城市名～`, `没太听清，「${value}」这个城市对吗？`]),
      isConfirm: true
    };
  }
  
  // 职业相关问题
  if (field === 'occupation') {
    if (rejectReason === 'sensitive') {
      return {
        reply: pickOne([`呃...这个不太合适聊吧 😅 说个正经职业？`, `开玩笑的吧？认真的职业是什么？`, `这个...换个正常的说法？`]),
        isConfirm: true
      };
    }
    return {
      reply: pickOne([`「${value}」...没太听懂，再说清楚点？`, `「${value}」是啥工作？确认下～`, `「${value}」对吗？没太明白这个职业😅`]),
      isConfirm: true
    };
  }
  
  if (isNonsense) {
    return {
      reply: pickOne([`「${value}」...认真的吗？😂 重新说一下呗～`, `这个回答有点敷衍哦，正经说一个？`, `哈哈「${value}」是什么鬼，重新来～`, `「${value}」？别闹，正经回答～`, `诶？「${value}」...这不算回答吧😅`]),
      isConfirm: true
    };
  }
  
  // 普通确认，更随意
  const casualConfirmations = [
    `所以是「${value}」对吧？`,
    `「${value}」，ok？`,
    `我记「${value}」咯，对吗？`,
    `「${value}」，没错吧？`,
    `确定是「${value}」？`
  ];
  
  return {
    reply: pickOne(casualConfirmations),
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
