// 匹配算法 - 计算两个档案的匹配度

// 默认权重（均衡版）
export const DEFAULT_WEIGHTS = {
  basic: 7,      // 基础条件
  emotion: 8,    // 情感核心
  values: 8,     // 价值观
  lifestyle: 6,  // 生活方式
  interest: 6,   // 兴趣匹配
  social: 5      // 社交偏好
};

// 年龄匹配度计算
function calculateAgeMatch(birthYearA, birthRangeA, birthYearB, birthRangeB) {
  if (!birthYearA || !birthYearB) return 50;
  
  const ageA = new Date().getFullYear() - birthYearA;
  const ageB = new Date().getFullYear() - birthYearB;
  const ageDiff = Math.abs(ageA - ageB);
  
  // 解析可接受年龄范围
  const parseAgeRange = (range) => {
    if (!range) return { min: -3, max: 3 };
    const match = range.match(/[+-]?(\d+)/g);
    if (!match) return { min: -3, max: 3 };
    return { min: -parseInt(match[0]), max: parseInt(match[0]) };
  };
  
  const rangeA = parseAgeRange(ageRangeA);
  const rangeB = parseAgeRange(ageRangeB);
  
  // 检查是否在对方接受范围内
  const aAcceptsB = ageDiff <= Math.abs(rangeA.max) && ageDiff >= 0;
  const bAcceptsA = ageDiff <= Math.abs(rangeB.max) && ageDiff >= 0;
  
  if (!aAcceptsB || !bAcceptsA) return 0;
  
  // 计算匹配度：差距越小越好
  return Math.max(0, 100 - ageDiff * 20);
}

// 地理匹配度
function calculateLocationMatch(cityA, cityB, acceptLongDistanceA, acceptLongDistanceB) {
  if (cityA === cityB) return 100;
  
  // 同城匹配失败，检查异地接受度
  const aAccepts = acceptLongDistanceA === '能' || acceptLongDistanceA === '可以接受';
  const bAccepts = acceptLongDistanceB === '能' || acceptLongDistanceB === '可以接受';
  
  if (aAccepts && bAccepts) return 60;  // 都能接受异地
  return 0;  // 至少一方不能接受
}

// 消费观念匹配度
function calculateSpendingMatch(spendingA, spendingB) {
  const levels = { '节俭型': 1, '理性消费': 2, '平衡型': 3, '享受型': 4, '奢侈型': 5 };
  const levelA = levels[spendingA] || 3;
  const levelB = levels[spendingB] || 3;
  const diff = Math.abs(levelA - levelB);
  
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  if (diff === 2) return 40;
  return 20;
}

// 依恋类型匹配度（核心算法）
function calculateAttachmentMatch(attachmentA, attachmentB) {
  // 安全型+焦虑型=最佳互补
  const pairs = {
    '安全型+焦虑型': 100,
    '焦虑型+安全型': 100,
    '安全型+安全型': 90,
    '安全型+回避型': 70,
    '回避型+安全型': 70,
    '焦虑型+回避型': 30,  // 灾难组合
    '回避型+焦虑型': 30,
    '焦虑型+焦虑型': 50,
    '回避型+回避型': 40
  };
  
  const key = `${attachmentA || '安全型'}+${attachmentB || '安全型'}`;
  return pairs[key] || 50;
}

// 核心需求匹配度
function calculateNeedsMatch(coreNeedA, coreNeedB, giveAbilityA, giveAbilityB) {
  // A的核心需求是否能被B满足
  const aNeedMet = giveAbilityB?.includes(coreNeedA) || false;
  const bNeedMet = giveAbilityA?.includes(coreNeedB) || false;
  
  if (aNeedMet && bNeedMet) return 100;
  if (aNeedMet || bNeedMet) return 60;
  return 20;
}

// 兴趣匹配度
function calculateInterestMatch(hobbyA, hobbyB) {
  if (!hobbyA || !hobbyB) return 50;
  
  // 简单字符串匹配，实际可以用更复杂的算法
  const hobbiesA = hobbyA.split(/[,，、]/).map(h => h.trim());
  const hobbiesB = hobbyB.split(/[,，、]/).map(h => h.trim());
  
  const common = hobbiesA.filter(h => hobbiesB.includes(h));
  const total = new Set([...hobbiesA, ...hobbiesB]).size;
  
  return total === 0 ? 50 : Math.round((common.length / Math.min(hobbiesA.length, hobbiesB.length)) * 100);
}

// 人生优先级匹配度
function calculatePriorityMatch(priorityA, priorityB) {
  if (!priorityA || !priorityB) return 50;
  
  const prioritiesA = priorityA.split(/[,，、]/).map(p => p.trim());
  const prioritiesB = priorityB.split(/[,，、]/).map(p => p.trim());
  
  // TOP3重合度
  const topA = prioritiesA.slice(0, 3);
  const topB = prioritiesB.slice(0, 3);
  
  const common = topA.filter(p => topB.includes(p));
  const matchCount = common.length;
  
  if (matchCount === 3) return 100;
  if (matchCount === 2) return 80;
  if (matchCount === 1) return 50;
  return 20;
}

// 主匹配函数
export function calculateMatch(profileA, profileB, customWeights = null) {
  const weights = customWeights || DEFAULT_WEIGHTS;
  
  // 基础条件维度
  const basicScores = {
    age: calculateAgeMatch(
      profileA.birth_year, profileA.age_range,
      profileB.birth_year, profileB.age_range
    ),
    location: calculateLocationMatch(
      profileA.city, profileB.city,
      profileA.accept_long_distance, profileB.accept_long_distance
    )
  };
  const basicScore = Math.round((basicScores.age + basicScores.location) / 2);
  
  // 情感核心维度
  const emotionScores = {
    attachment: calculateAttachmentMatch(
      profileA.attachment_style, profileB.attachment_style
    ),
    needs: calculateNeedsMatch(
      profileA.core_need, profileB.core_need,
      profileA.give_ability, profileB.give_ability
    ),
    conflict: calculateSpendingMatch(  // 复用算法
      profileA.conflict_handling, profileB.conflict_handling
    )
  };
  const emotionScore = Math.round(
    (emotionScores.attachment * 0.5 + emotionScores.needs * 0.3 + emotionScores.conflict * 0.2)
  );
  
  // 价值观维度
  const valuesScore = calculatePriorityMatch(
    profileA.life_preference, profileB.life_preference
  );
  
  // 生活方式维度
  const lifestyleScores = {
    spending: calculateSpendingMatch(
      profileA.spending_habit, profileB.spending_habit
    ),
    schedule: profileA.sleep_schedule === profileB.sleep_schedule ? 100 : 50,
    tidiness: calculateSpendingMatch(  // 复用
      profileA.tidiness, profileB.tidiness
    )
  };
  const lifestyleScore = Math.round(
    (lifestyleScores.spending + lifestyleScores.schedule + lifestyleScores.tidiness) / 3
  );
  
  // 兴趣匹配维度
  const interestScore = calculateInterestMatch(
    profileA.hobby_type, profileB.hobby_type
  );
  
  // 社交偏好维度
  const socialScore = profileA.weekend_style === profileB.weekend_style ? 100 : 60;
  
  // 计算加权总分
  const weightedSum = 
    basicScore * weights.basic +
    emotionScore * weights.emotion +
    valuesScore * valuesScore +
    lifestyleScore * weights.lifestyle +
    interestScore * weights.interest +
    socialScore * weights.social;
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const finalScore = Math.round(weightedSum / totalWeight);
  
  return {
    score: finalScore,
    dimensions: {
      basic: { score: basicScore, details: basicScores },
      emotion: { score: emotionScore, details: emotionScores },
      values: { score: valuesScore },
      lifestyle: { score: lifestyleScore, details: lifestyleScores },
      interest: { score: interestScore },
      social: { score: socialScore }
    },
    weights: weights
  };
}

// 为一个档案找到最佳匹配
export function findBestMatches(profile, candidates, limit = 5, customWeights = null) {
  const weights = customWeights || profile.match_weights || DEFAULT_WEIGHTS;
  
  const matches = candidates
    .filter(c => c.id !== profile.id && c.gender !== profile.gender)  // 排除同性
    .map(candidate => {
      const matchResult = calculateMatch(profile, candidate, weights);
      return {
        profile: candidate,
        ...matchResult
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return matches;
}
