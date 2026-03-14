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
function calculateAgeMatch(birthYearA, ageRangeA, birthYearB, ageRangeB) {
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
  if (!spendingA || !spendingB) return 60;
  
  const levels = { '节俭型': 1, '理性消费': 2, '平衡型': 3, '享受型': 4, '奢侈型': 5 };
  const levelA = levels[spendingA] || 3;
  const levelB = levels[spendingB] || 3;
  const diff = Math.abs(levelA - levelB);
  
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  if (diff === 2) return 40;
  return 20;
}

// 冲突处理方式匹配度
function calculateConflictMatch(conflictA, conflictB) {
  if (!conflictA || !conflictB) return 60;
  
  const styles = { '回避型': 1, '迁就型': 2, '妥协型': 3, '合作型': 4 };
  const levelA = styles[conflictA] || 3;
  const levelB = styles[conflictB] || 3;
  const diff = Math.abs(levelA - levelB);
  
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  if (diff === 2) return 40;
  return 20;
}

// 依恋类型匹配度（核心算法）
function calculateAttachmentMatch(attachmentA, attachmentB) {
  // 如果没有依恋类型数据，返回默认中等匹配度
  if (!attachmentA || !attachmentB) return 60;
  
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
  
  const key = `${attachmentA}+${attachmentB}`;
  return pairs[key] || 50;
}

// 核心需求匹配度
function calculateNeedsMatch(coreNeedA, coreNeedB, giveAbilityA, giveAbilityB) {
  // 如果没有核心需求数据，返回默认中等匹配度
  if (!coreNeedA || !coreNeedB) return 60;
  
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
  // 确保 weights 有效
  let weights = customWeights;
  if (!weights || typeof weights !== 'object' || Array.isArray(weights) || Object.keys(weights).length === 0) {
    weights = DEFAULT_WEIGHTS;
  }
  
  // 确保所有维度都有值
  const validDimensions = ['basic', 'emotion', 'values', 'lifestyle', 'interest', 'social'];
  for (const dim of validDimensions) {
    if (weights[dim] === undefined || weights[dim] === null) {
      weights[dim] = DEFAULT_WEIGHTS[dim];
    }
  }
  
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
    conflict: calculateConflictMatch(
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
  const socialScore = (profileA.social_circle && profileB.social_circle && profileA.social_circle === profileB.social_circle) ? 100 : 60;
  
  // 计算加权总分
  const weightedSum = 
    basicScore * (weights.basic || 0) +
    emotionScore * (weights.emotion || 0) +
    valuesScore * (weights.values || 0) +
    lifestyleScore * (weights.lifestyle || 0) +
    interestScore * (weights.interest || 0) +
    socialScore * (weights.social || 0);
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + (b || 0), 0);
  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  
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

// 计算双向匹配（A看B 和 B看A）
export function calculateBidirectionalMatch(profileA, profileB, weightsA = null, weightsB = null) {
  // A看B的匹配度（使用A的权重偏好）
  const matchFromA = calculateMatch(profileA, profileB, weightsA);
  
  // B看A的匹配度（使用B的权重偏好）
  const matchFromB = calculateMatch(profileB, profileA, weightsB);
  
  return {
    fromA: matchFromA,
    fromB: matchFromB,
    // 双向综合分数（取平均）
    bidirectionalScore: Math.round((matchFromA.score + matchFromB.score) / 2)
  };
}

// 关系发展阶段权重配置
const RELATIONSHIP_PHASES = {
  // 前期（0-3个月）：兴趣主导
  early: {
    interest: 9,
    basic: 8,
    emotion: 6,
    social: 6,
    lifestyle: 4,
    values: 3
  },
  // 中期（3-12个月）：情感+生活方式
  middle: {
    interest: 6,
    basic: 7,
    emotion: 9,
    lifestyle: 8,
    social: 6,
    values: 6
  },
  // 后期（12个月+）：价值观主导
  late: {
    interest: 4,
    basic: 6,
    emotion: 8,
    values: 10,
    lifestyle: 9,
    social: 5
  }
};

// 计算关系发展曲线数据
export function calculateRelationshipCurve(profileA, profileB) {
  // 计算各阶段匹配度
  const earlyMatch = calculateMatch(profileA, profileB, RELATIONSHIP_PHASES.early);
  const middleMatch = calculateMatch(profileA, profileB, RELATIONSHIP_PHASES.middle);
  const lateMatch = calculateMatch(profileA, profileB, RELATIONSHIP_PHASES.late);
  
  // 生成曲线数据点（模拟渐进变化）
  const curveData = [];
  
  // 前期曲线（0-3个月）
  for (let month = 0; month <= 3; month += 0.5) {
    const progress = month / 3;
    // 从0开始，逐渐上升到前期分数
    const score = Math.round(earlyMatch.score * Math.min(1, progress * 1.2));
    curveData.push({
      month: Math.round(month * 10) / 10,
      phase: '初期',
      score: score,
      dominant: '兴趣匹配'
    });
  }
  
  // 中期曲线（3-12个月）
  for (let month = 3; month <= 12; month += 1) {
    const progress = (month - 3) / 9;
    // 从前期间渡到中期
    const score = Math.round(
      earlyMatch.score * (1 - progress) + middleMatch.score * progress
    );
    curveData.push({
      month: month,
      phase: '发展期',
      score: score,
      dominant: '情感+生活方式'
    });
  }
  
  // 后期曲线（12-24个月）
  for (let month = 12; month <= 24; month += 2) {
    const progress = Math.min(1, (month - 12) / 12);
    // 从中期间渡到后期
    const score = Math.round(
      middleMatch.score * (1 - progress * 0.8) + lateMatch.score * (progress * 0.8 + 0.2)
    );
    curveData.push({
      month: month,
      phase: '稳定期',
      score: score,
      dominant: '价值观契合'
    });
  }
  
  return {
    curve: curveData,
    phaseScores: {
      early: earlyMatch.score,
      middle: middleMatch.score,
      late: lateMatch.score
    },
    insights: generateInsights(earlyMatch, middleMatch, lateMatch)
  };
}

// 生成关系发展洞察
function generateInsights(early, middle, late) {
  const insights = [];
  
  if (early.score >= 80) {
    insights.push('初期吸引力强，容易建立连接');
  } else if (early.score < 60) {
    insights.push('初期可能需要更多耐心培养共同话题');
  }
  
  if (middle.score >= 80) {
    insights.push('中期相处和谐，情感基础扎实');
  }
  
  if (late.score >= 80) {
    insights.push('长期价值观契合，适合稳定发展');
  } else if (late.score < 60) {
    insights.push('长期需关注价值观差异，需要更多磨合');
  }
  
  if (late.score > early.score) {
    insights.push('关系呈上升趋势，时间会让你们更契合');
  } else if (late.score < early.score - 15) {
    insights.push('初期火热但长期需更多磨合，建议多了解彼此核心价值观');
  }
  
  return insights;
}

// 为一个档案找到最佳匹配
export function findBestMatches(profile, candidates, limit = 5, customWeights = null) {
  // 确保 weights 有效
  let weights = customWeights || profile.match_weights;
  if (!weights || typeof weights !== 'object' || Array.isArray(weights) || Object.keys(weights).length === 0) {
    weights = DEFAULT_WEIGHTS;
  }
  // 确保所有维度都有值
  const validDimensions = ['basic', 'emotion', 'values', 'lifestyle', 'interest', 'social'];
  for (const dim of validDimensions) {
    if (weights[dim] === undefined || weights[dim] === null) {
      weights[dim] = DEFAULT_WEIGHTS[dim];
    }
  }
  
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
