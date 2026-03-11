// 追问逻辑 - 模拟狗蛋的深度追问

// 检测回答是否模糊
export const isVagueAnswer = (answer) => {
  const vagueWords = ['都行', '随便', '都可以', '无所谓', '不知道', '没想过', '差不多', '还行'];
  const answer_lower = answer.toLowerCase().trim();
  
  if (answer.length < 5) return true;
  if (vagueWords.some(word => answer_lower.includes(word))) return true;
  return false;
};

// 根据问题类型和回答生成追问
export const generateFollowUp = (question, answer, followUpCount = 0) => {
  // 最多追问2次
  if (followUpCount >= 2) return null;

  // 如果回答模糊，进行追问
  if (question.checkVague && isVagueAnswer(answer)) {
    return {
      type: 'vague',
      message: getVagueFollowUp(question.field),
    };
  }

  // Dog类问题的深度追问
  if (question.needDeepDive) {
    return generateDogFollowUp(question, answer, followUpCount);
  }

  return null;
};

// 模糊回答的追问模板
const getVagueFollowUp = (field) => {
  const templates = {
    hobbyType: '能具体说说那个作品哪里打动你吗？',
    weekendStyle: '上次有这样的周末是什么时候？做了什么？',
    longTermHobby: '第一次接触这个爱好是什么契机？',
    default: '能再多说一些吗？我想更了解你～',
  };
  return templates[field] || templates.default;
};

// Dog类问题的深度追问
const generateDogFollowUp = (question, answer, followUpCount) => {
  const followUps = {
    familyRelationship: [
      '具体是怎样的？可以举个例子吗？',
      '这个词背后，有什么故事吗？',
    ],
    currentState: [
      '如果必须选一个最像的，是哪个？',
      '这种状态持续多久了？',
    ],
    trustedFor: [
      '能分享一个具体的例子吗？',
      '当时是什么情况？',
    ],
    understoodMoment: [
      '是什么让你感到被理解了？',
      '那种感觉对你来说重要吗？',
    ],
    relationshipBlindspot: [
      '你上次出现这个情况是什么时候？',
      '你自己有在改吗？',
    ],
    idealRelationship: [
      '如果只能选一个最不能缺的，是哪个？',
      '为什么是这三个词？',
    ],
    coreNeed: [
      '如果对方做不到这点，你会怎样？',
      '这个需求是从什么时候开始的？',
    ],
    conflictHandling: [
      '上次吵架你是怎么做的？',
      '说的和做的一致吗？',
    ],
    dealBreakers: [
      '为什么这个绝对不能接受？',
      '是经历过什么吗？',
    ],
    futureVision: [
      '那个画面里，对方在做什么？',
      '是你现在的生活缺什么吗？',
    ],
  };

  const questionFollowUps = followUps[question.field];
  if (questionFollowUps && followUpCount < questionFollowUps.length) {
    return {
      type: 'deep',
      message: questionFollowUps[followUpCount],
    };
  }

  return null;
};

// 生成AI回复（简单版，实际可接Kimi API）
export const generateAIResponse = (question, answer) => {
  const responses = [
    '嗯，我记下了。继续下一个问题～',
    '了解，这个回答很有意思呢。',
    '收到！下一个问题：',
    '明白了，那我们继续吧～',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// 生成分类标签
export const generateTags = (answers) => {
  const tags = [];
  
  // 根据答案生成标签（示例逻辑）
  if (answers.sleepSchedule === '夜猫子') tags.push('夜猫子');
  if (answers.sleepSchedule === '早睡早起') tags.push('晨型人');
  if (answers.weekendStyle?.includes('宅')) tags.push('宅系');
  if (answers.weekendStyle?.includes('朋友')) tags.push('社交型');
  if (answers.solitudeFeeling === '充电回血') tags.push('享受独处');
  if (answers.planningStyle === '计划控') tags.push('规划控');
  if (answers.planningStyle === '随性派') tags.push('随性派');
  
  return tags.slice(0, 5); // 最多5个标签
};