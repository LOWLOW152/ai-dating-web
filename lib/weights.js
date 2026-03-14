// 动态权重计算 - 基于追问答案调整

// 基础权重
export const BASE_WEIGHTS = {
  basic: 7,
  emotion: 8,
  values: 8,
  lifestyle: 6,
  interest: 6,
  social: 5
};

// 根据追问答案计算权重
export function calculateWeights(answers) {
  const weights = { ...BASE_WEIGHTS };
  
  // Q1: 兴趣爱好匹配偏好
  const hobbyMatch = answers.hobbyMatchPreference;
  if (hobbyMatch === '志同道合一起玩') {
    weights.interest += 2;
  } else if (hobbyMatch === '各有各的爱好互相尊重') {
    weights.interest -= 2;
  }
  // "都可以看情况" 不调整
  
  // Q2: 旅行节奏匹配偏好
  const travelMatch = answers.travelMatchPreference;
  if (travelMatch === '跟我一致') {
    weights.lifestyle += 2;
  } else if (travelMatch === '不一样但能互相迁就') {
    weights.lifestyle -= 2;
  }
  // "都可以" 不调整
  
  // Q3: 社交圈子偏好
  const socialCircle = answers.socialCirclePreference;
  if (socialCircle === '社交活跃型（圈子大）') {
    weights.social += 2;
  } else if (socialCircle === '社交精简型（圈子小）') {
    weights.social -= 2;
  }
  // "都可以" 不调整
  
  // Q4: 社交角色匹配偏好
  const socialRole = answers.socialRolePreference;
  if (socialRole === '跟我角色相似') {
    weights.social += 2;
  } else if (socialRole === '互补搭配') {
    weights.social -= 2;
  }
  // "都可以" 不调整
  
  // 限制范围 1-10
  for (let key in weights) {
    weights[key] = Math.max(1, Math.min(10, weights[key]));
  }
  
  return weights;
}

// 获取权重调整说明（用于档案展示）
export function getWeightExplanation(answers) {
  const explanations = [];
  
  const hobbyMatch = answers.hobbyMatchPreference;
  if (hobbyMatch === '志同道合一起玩') {
    explanations.push('兴趣匹配权重+2（希望一起玩）');
  } else if (hobbyMatch === '各有各的爱好互相尊重') {
    explanations.push('兴趣匹配权重-2（容忍差异）');
  }
  
  const travelMatch = answers.travelMatchPreference;
  if (travelMatch === '跟我一致') {
    explanations.push('生活方式权重+2（旅行节奏要一致）');
  } else if (travelMatch === '不一样但能互相迁就') {
    explanations.push('生活方式权重-2（可以互相迁就）');
  }
  
  const socialCircle = answers.socialCirclePreference;
  if (socialCircle === '社交活跃型（圈子大）') {
    explanations.push('社交偏好权重+2（希望圈子大）');
  } else if (socialCircle === '社交精简型（圈子小）') {
    explanations.push('社交偏好权重-2（希望圈子小）');
  }
  
  const socialRole = answers.socialRolePreference;
  if (socialRole === '跟我角色相似') {
    explanations.push('社交偏好权重+2（角色要相似）');
  } else if (socialRole === '互补搭配') {
    explanations.push('社交偏好权重-2（可以互补）');
  }
  
  return explanations;
}
