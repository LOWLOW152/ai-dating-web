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

  // ========== 第二部分追问：兴趣话题 (interest + social) ==========
  // Q1: 兴趣爱好匹配偏好
  const hobbyMatch = answers.hobbyMatchPreference;
  if (hobbyMatch === '志同道合一起玩') {
    weights.interest += 2;
  } else if (hobbyMatch === '各有各的爱好互相尊重') {
    weights.interest -= 2;
  }

  // Q2: 旅行节奏匹配偏好
  const travelMatch = answers.travelMatchPreference;
  if (travelMatch === '跟我一致') {
    weights.lifestyle += 2;
  } else if (travelMatch === '不一样但能互相迁就') {
    weights.lifestyle -= 2;
  }

  // Q3: 社交圈子偏好
  const socialCircle = answers.socialCirclePreference;
  if (socialCircle === '社交活跃型（圈子大）') {
    weights.social += 2;
  } else if (socialCircle === '社交精简型（圈子小）') {
    weights.social -= 2;
  }

  // Q4: 社交角色匹配偏好
  const socialRole = answers.socialRolePreference;
  if (socialRole === '跟我角色相似') {
    weights.social += 2;
  } else if (socialRole === '互补搭配') {
    weights.social -= 2;
  }

  // ========== 第三部分追问：生活底色 (lifestyle) ==========
  // Q1: 消费观念 - 都接受不了 → 权重+2
  const spendingDealBreaker = answers.spendingDealBreaker;
  if (spendingDealBreaker === '都接受不了') {
    weights.lifestyle += 2;
  } else if (spendingDealBreaker === '都可以接受') {
    weights.lifestyle -= 2;
  }

  // Q2: 作息类型 - 都接受不了 → 权重+2
  const sleepDealBreaker = answers.sleepDealBreaker;
  if (sleepDealBreaker === '都接受不了') {
    weights.lifestyle += 2;
  } else if (sleepDealBreaker === '都可以接受') {
    weights.lifestyle -= 2;
  }

  // Q3: 整洁程度 - 都接受不了 → 权重+2
  const tidinessDealBreaker = answers.tidinessDealBreaker;
  if (tidinessDealBreaker === '都接受不了') {
    weights.lifestyle += 2;
  } else if (tidinessDealBreaker === '都可以接受') {
    weights.lifestyle -= 2;
  }

  // Q4: 压力应对 - 都接受不了 → 权重+2
  const stressDealBreaker = answers.stressDealBreaker;
  if (stressDealBreaker === '都接受不了') {
    weights.lifestyle += 2;
  } else if (stressDealBreaker === '都可以接受') {
    weights.lifestyle -= 2;
  }

  // Q5: 家庭关系 - 都担忧 → 权重+2
  const familyDealBreaker = answers.familyDealBreaker;
  if (familyDealBreaker === '都担忧') {
    weights.values += 2;
  } else if (familyDealBreaker === '都不担忧') {
    weights.values -= 2;
  }

  // Q6: 生活偏好 - 都害怕 → 权重+2
  const lifeDealBreaker = answers.lifeDealBreaker;
  if (lifeDealBreaker === '都害怕') {
    weights.values += 2;
  } else if (lifeDealBreaker === '都不害怕') {
    weights.values -= 2;
  }

  // 限制范围 1-10
  for (let key in weights) {
    weights[key] = Math.max(1, Math.min(10, weights[key]));
  }

  return weights;
}

// 获取权重调整说明（用于档案展示）
export function getWeightExplanation(answers) {
  const explanations = [];

  // 第二部分
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

  // 第三部分 - 喜恶追问
  if (answers.spendingDealBreaker === '都接受不了') {
    explanations.push('生活方式权重+2（对消费观要求高）');
  }
  if (answers.sleepDealBreaker === '都接受不了') {
    explanations.push('生活方式权重+2（对作息要求高）');
  }
  if (answers.tidinessDealBreaker === '都接受不了') {
    explanations.push('生活方式权重+2（对整洁要求高）');
  }
  if (answers.stressDealBreaker === '都接受不了') {
    explanations.push('生活方式权重+2（对压力应对要求高）');
  }
  if (answers.familyDealBreaker === '都担忧') {
    explanations.push('价值观权重+2（对家庭关系要求高）');
  }
  if (answers.lifeDealBreaker === '都害怕') {
    explanations.push('价值观权重+2（对生活稳定性要求高）');
  }

  return explanations;
}
