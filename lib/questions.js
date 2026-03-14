// AI相亲问题库 v1.1
// 分类：Auto(自动) / Semi(半自动) / Dog(狗蛋主导)
// 验证模式：block(阻断式) / warn(警告式)

// 验证工具函数
export const validators = {
  // 检测乱填模式
  isNonsense: (text) => {
    if (!text || text.length < 2) return true;
    const vaguePatterns = [
      /^[啊哦嗯哈嘿呵哼]+$/i,           // 纯语气词
      /^[asdfojkl;qwer]{3,}$/i,         // 键盘乱敲
      /^[1234567890]{2,}$/,             // 纯数字
      /^(.)\1{2,}$/,                   // 重复字符
      /不知道|随便|都行|随便填| test|测试|aaa|bbb|ccc/i  // 敷衍词
    ];
    return vaguePatterns.some(p => p.test(text.trim()));
  },
  
  // 检测合理年份
  isValidBirthYear: (year) => {
    const y = parseInt(year);
    const currentYear = new Date().getFullYear();
    return y >= 1960 && y <= currentYear - 18 && y <= currentYear - 12;
  },
  
  // 检测中国城市
  isValidCity: (city) => {
    const commonCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '天津', '苏州', '长沙', '郑州', '青岛', '大连', '厦门', '宁波', '无锡', '佛山'];
    const hasValidChar = /[\u4e00-\u9fa5]/.test(city);
    const notNonsense = !validators.isNonsense(city);
    const minLength = city.length >= 2;
    return hasValidChar && notNonsense && minLength;
  },
  
  // 检测职业描述
  isValidOccupation: (text) => {
    if (text.length < 2) return false;
    if (/^[0-9]+$/.test(text)) return false;
    return !validators.isNonsense(text);
  }
};

export const questions = [
  // ========== 基础信息 (Auto) ==========
  {
    id: 'basic_1',
    type: 'auto',
    category: '基础信息',
    question: '先简单认识一下～你怎么称呼呢？',
    field: 'nickname',
    inputType: 'text',
    placeholder: '可以是昵称或名字',
    // 警告式验证
    validation: {
      mode: 'warn',
      rules: [
        { min: 2, max: 20, message: '昵称需要在2-20个字之间' },
        { check: 'nonsense', message: '这个昵称看起来有点随意，确定要这样写吗？' }
      ]
    }
  },
  {
    id: 'basic_2',
    type: 'auto',
    category: '基础信息',
    question: '你的性别是？',
    field: 'gender',
    inputType: 'choice',
    options: ['男生', '女生'],
    required: true
  },
  {
    id: 'basic_3',
    type: 'auto',
    category: '基础信息',
    question: '出生年份是？',
    field: 'birthYear',
    inputType: 'number',
    placeholder: '例如：1995',
    // 阻断式验证
    validation: {
      mode: 'block',
      rules: [
        { check: 'birthYear', message: '请输入合理的出生年份（18-65岁）' }
      ]
    }
  },
  {
    id: 'basic_4',
    type: 'auto',
    category: '基础信息',
    question: '现在住在哪个城市呀？',
    field: 'city',
    inputType: 'text',
    placeholder: '例如：北京、上海',
    // 阻断式验证
    validation: {
      mode: 'block',
      rules: [
        { check: 'city', message: '请填写真实有效的城市名称（如：北京、上海、杭州等）' }
      ]
    }
  },
  {
    id: 'basic_5',
    type: 'auto',
    category: '基础信息',
    question: '从事什么领域的工作呢？',
    field: 'occupation',
    inputType: 'text',
    placeholder: '简单描述一下～',
    // 警告式验证
    validation: {
      mode: 'warn',
      rules: [
        { min: 2, message: '至少写2个字嘛' },
        { check: 'occupation', message: '这个描述看起来不太完整，要不要再详细一点？' }
      ]
    }
  },
  {
    id: 'basic_6',
    type: 'auto',
    category: '基础信息',
    question: '学历是？',
    field: 'education',
    inputType: 'choice',
    options: ['高中及以下', '大专', '本科', '硕士', '博士'],
    required: true
  },
  {
    id: 'basic_7',
    type: 'auto',
    category: '基础信息',
    question: '能否接受异地恋？',
    field: 'acceptLongDistance',
    inputType: 'choice',
    options: ['完全不能接受', '短期可以，长期不行', '看感情深度', '可以接受'],
    required: true
  },
  {
    id: 'basic_8',
    type: 'auto',
    category: '基础信息',
    question: '能接受对方比你大/小几岁？',
    field: 'ageRange',
    inputType: 'choice',
    options: ['±3岁', '±5岁', '±8岁', '±10岁', '不限'],
    required: true
  },

  // ========== 兴趣 & 话题共鸣 (Semi) - 精简版4题+互补追问 ==========
  {
    id: 'interest_1',
    type: 'semi',
    category: '兴趣爱好',
    question: '不上班的时候，你最常做的事情是什么？最近有特别沉迷或喜欢的吗？🌿\n\n你更希望另一半在这方面跟你「志同道合一起玩」，还是「各有各的爱好互相尊重」？',
    field: 'hobbyType',
    inputType: 'text',
    placeholder: '比如追剧、打游戏、看书、发呆...都可以说',
    checkVague: true,
  },
  {
    id: 'interest_2',
    type: 'semi',
    category: '旅行偏好',
    question: '如果去旅行，你更倾向「特种兵式打卡」还是「慢下来享受」？或者两者都可以？✨\n\n你更希望另一半的旅行节奏「跟你一致」，还是「不一样但能互相迁就」？',
    field: 'travelStyle',
    inputType: 'text',
    placeholder: '说说你喜欢的旅行节奏～',
  },
  {
    id: 'interest_3',
    type: 'semi',
    category: '社交圈子',
    question: '你现在的社交圈子主要是什么构成的？比如同事、同学、兴趣爱好认识的朋友，还是其他？🌿\n\n你更希望另一半是「社交活跃型（圈子大、带动你认识更多人）」，还是「社交精简型（圈子小、给你更多二人空间）」？',
    field: 'socialCircle',
    inputType: 'text',
    placeholder: '描述你的社交圈子构成',
    checkVague: true,
  },
  {
    id: 'interest_4',
    type: 'semi',
    category: '社交角色',
    question: '朋友聚会时，你通常是「气氛组」「旁听者」还是「组织者」？🌿\n\n你更希望另一半在聚会里「跟你角色相似」，还是「互补搭配」？',
    field: 'socialRole',
    inputType: 'choice',
    options: ['气氛组', '旁听者', '组织者', '视情况而定'],
  },
  },

  // ========== 生活底色 (Auto + Semi) ==========
  {
    id: 'life_1',
    type: 'semi',
    category: '消费观念',
    question: '你的消费观更接近「攒钱有安全感」「平衡享受当下」还是「喜欢就买」？',
    field: 'spendingHabit',
    inputType: 'choice',
    options: ['攒钱有安全感', '平衡享受当下', '喜欢就买'],
  },
  {
    id: 'life_2',
    type: 'auto',
    category: '作息类型',
    question: '作息是「早睡早起规律党」「夜猫子」还是「看情况灵活调整」？',
    field: 'sleepSchedule',
    inputType: 'choice',
    options: ['早睡早起', '夜猫子', '灵活调整'],
  },
  {
    id: 'life_3',
    type: 'auto',
    category: '整洁程度',
    question: '家里/房间通常是「井井有条」「乱中有序」还是「能找着就行」？',
    field: 'tidiness',
    inputType: 'choice',
    options: ['井井有条', '乱中有序', '能找着就行'],
  },
  {
    id: 'life_4',
    type: 'semi',
    category: '压力应对',
    question: '遇到压力时，你倾向「自己消化」「找人倾诉」还是「转移注意力」？',
    field: 'stressResponse',
    inputType: 'choice',
    options: ['自己消化', '找人倾诉', '转移注意力'],
  },
  {
    id: 'life_5',
    type: 'semi',
    category: '决策方式',
    question: '做决定时，你更相信「直觉感受」「逻辑分析」还是「问信任的人」？',
    field: 'decisionStyle',
    inputType: 'choice',
    options: ['直觉感受', '逻辑分析', '问信任的人'],
  },
  {
    id: 'life_6',
    type: 'dog',
    category: '家庭关系',
    question: '和家人/原生家庭的关系，用一个词形容是什么？',
    field: 'familyRelationship',
    inputType: 'text',
    placeholder: '一个词，真实的就好',
    needDeepDive: true,
  },
  {
    id: 'life_7',
    type: 'auto',
    category: '计划性',
    question: '你觉得自己是「计划控」「随性派」还是「大方向有计划，细节随意」？',
    field: 'planningStyle',
    inputType: 'choice',
    options: ['计划控', '随性派', '大方向有计划'],
  },
  {
    id: 'life_8',
    type: 'semi',
    category: '成就感来源',
    question: '工作中/学业上，什么状态会让你感到满足？',
    field: 'achievementSource',
    inputType: 'text',
    placeholder: '完成任务、被认可、解决难题...？',
  },
  {
    id: 'life_9',
    type: 'semi',
    category: '独处感受',
    question: '独处时，你会感到「充电回血」「有点无聊」还是「偶尔孤独但享受」？',
    field: 'solitudeFeeling',
    inputType: 'choice',
    options: ['充电回血', '有点无聊', '偶尔孤独但享受'],
  },
  {
    id: 'life_10',
    type: 'semi',
    category: '生活偏好',
    question: '如果必须选，你更想要「稳定可预期的生活」还是「充满变化的可能性」？',
    field: 'lifePreference',
    inputType: 'choice',
    options: ['稳定可预期', '充满变化'],
  },

  // ========== 核心人格 (Dog) ==========
  {
    id: 'core_1',
    type: 'dog',
    category: '当前状态',
    question: '形容一下你现在的状态——是「正在找方向」「稳步前进」还是「想要突破」？不用着急，慢慢想～',
    field: 'currentState',
    inputType: 'text',
    placeholder: '真实的感受就好',
    needDeepDive: true,
  },
  {
    id: 'core_2',
    type: 'dog',
    category: '信任点',
    question: '你觉得朋友最信任你哪一点？举个例子。慢慢想，真实的就好～',
    field: 'trustedFor',
    inputType: 'text',
    placeholder: '具体例子比形容词更重要',
    needDeepDive: true,
  },
  {
    id: 'core_3',
    type: 'dog',
    category: '被理解经历',
    question: '上一次感到"被深深理解"是什么时候？什么事？不用着急，慢慢想～',
    field: 'understoodMoment',
    inputType: 'text',
    placeholder: '如果想不到也可以直说',
    needDeepDive: true,
  },
  {
    id: 'core_4',
    type: 'dog',
    category: '关系盲点',
    question: '你觉得自己在亲密关系中，最可能犯的"毛病"是什么？（比如爱冷战、太黏人、藏心事）',
    field: 'relationshipBlindspot',
    inputType: 'text',
    placeholder: '诚实的自我观察',
    needDeepDive: true,
  },
  {
    id: 'core_5',
    type: 'dog',
    category: '理想关系',
    question: '用三个词形容你理想中的亲密关系，会是什么？不用着急，慢慢想～',
    field: 'idealRelationship',
    inputType: 'text',
    placeholder: '三个词，可以简单解释',
    needDeepDive: true,
  },

  // ========== 相处偏好 (Dog) ==========
  {
    id: 'relationship_1',
    type: 'dog',
    category: '核心需求',
    question: '恋爱中，你最需要对方给什么？（被肯定、陪伴、空间、被照顾……）',
    field: 'coreNeed',
    inputType: 'text',
    placeholder: '最重要的那个需求',
    needDeepDive: true,
  },
  {
    id: 'relationship_2',
    type: 'dog',
    category: '冲突处理',
    question: '吵架/有分歧时，你希望对方怎么对你？（给时间冷静、马上沟通、先道歉再聊……）',
    field: 'conflictHandling',
    inputType: 'text',
    placeholder: '你真实的偏好',
    needDeepDive: true,
  },
  {
    id: 'relationship_3',
    type: 'auto',
    category: '联系频率',
    question: '你能接受的"最频繁联系"是什么样的？',
    field: 'contactFrequency',
    inputType: 'choice',
    options: ['每天聊', '有事才找', '住一起各自忙碌', '看情况'],
  },
  {
    id: 'relationship_4',
    type: 'dog',
    category: '关系红线',
    question: '对方有什么行为是你绝对接受不了的？（说谎、冷暴力、控制欲、不上进……说1-3个）',
    field: 'dealBreakers',
    inputType: 'text',
    placeholder: '你的底线',
    needDeepDive: true,
  },
  {
    id: 'relationship_5',
    type: 'dog',
    category: '未来画面',
    question: '想象一年后，你和理想伴侣的生活画面是什么样的？（不用完美，真实就好）',
    field: 'futureVision',
    inputType: 'text',
    placeholder: '描述那个画面～',
    needDeepDive: true,
  },
];

// 获取问题总数
export const getTotalQuestions = () => questions.length;

// 按分类获取问题
export const getQuestionsByType = (type) => questions.filter(q => q.type === type);

// 获取当前问题索引
export const getQuestionIndex = (id) => questions.findIndex(q => q.id === id);

// 获取下一个问题
export const getNextQuestion = (currentId) => {
  const currentIndex = getQuestionIndex(currentId);
  return questions[currentIndex + 1] || null;
};