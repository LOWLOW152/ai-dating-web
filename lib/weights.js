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

  // ========== 第三部分追问：生活底色一致性 (lifestyle + values) ==========
  // Q1: 消费观念一致性
  const spendingConsistency = answers.spendingConsistency;
  if (spendingConsistency === '挺在意的，希望一致') {
    weights.lifestyle += 2;
  } else if (spendingConsistency === '有点在意，但可以沟通') {
    weights.lifestyle += 1;
  } else if (spendingConsistency === '不太在意，可以不一样') {
    weights.lifestyle -= 1;
  } else if (spendingConsistency === '完全无所谓') {
    weights.lifestyle -= 2;
  }

  // Q2: 作息一致性
  const sleepConsistency = answers.sleepConsistency;
  if (sleepConsistency === '需要调整，希望一致') {
    weights.lifestyle += 2;
  } else if (sleepConsistency === '可以商量着来') {
    weights.lifestyle += 1;
  } else if (sleepConsistency === '不用调整，各睡各的') {
    weights.lifestyle -= 1;
  } else if (sleepConsistency === '完全无所谓') {
    weights.lifestyle -= 2;
  }

  // Q3: 整洁一致性
  const tidinessConsistency = answers.tidinessConsistency;
  if (tidinessConsistency === '会别扭，希望一致') {
    weights.lifestyle += 2;
  } else if (tidinessConsistency === '有点别扭，但可以忍') {
    weights.lifestyle += 1;
  } else if (tidinessConsistency === '不会别扭，各管各的') {
    weights.lifestyle -= 1;
  } else if (tidinessConsistency === '完全无所谓') {
    weights.lifestyle -= 2;
  }

  // Q4: 压力应对一致性
  const stressConsistency = answers.stressConsistency;
  if (stressConsistency === '会有隔阂，希望一致') {
    weights.lifestyle += 2;
  } else if (stressConsistency === '会有点，但能理解') {
    weights.lifestyle += 1;
  } else if (stressConsistency === '不会，尊重差异') {
    weights.lifestyle -= 1;
  } else if (stressConsistency === '完全无所谓') {
    weights.lifestyle -= 2;
  }

  // Q5: 家庭关系一致性
  const familyConsistency = answers.familyConsistency;
  if (familyConsistency === '会觉得是问题') {
    weights.values += 2;
  } else if (familyConsistency === '有点介意，但可以接受') {
    weights.values += 1;
  } else if (familyConsistency === '不太介意，各家有各家的过法') {
    weights.values -= 1;
  } else if (familyConsistency === '完全无所谓') {
    weights.values -= 2;
  }

  // Q6: 生活偏好一致性
  const lifeConsistency = answers.lifeConsistency;
  if (lifeConsistency === '不太能接受，希望一致') {
    weights.values += 2;
  } else if (lifeConsistency === '有点难，但可以磨合') {
    weights.values += 1;
  } else if (lifeConsistency === '能接受，互相尊重') {
    weights.values -= 1;
  } else if (lifeConsistency === '完全无所谓') {
    weights.values -= 2;
  }

  // 限制范围 1-10
  for (let key in weights) {
    weights[key] = Math.max(1, Math.min(10, weights[key]));
  }

  return weights;
}

// 获取第二部分（兴趣话题）权重调整说明
export function getWeightExplanationPart2(answers) {
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

// 获取第三部分（生活底色）权重调整说明
export function getWeightExplanationPart3(answers) {
  const explanations = [];

  const spendingConsistency = answers.spendingConsistency;
  if (spendingConsistency === '挺在意的，希望一致') {
    explanations.push('生活方式权重+2（对消费观一致性要求高）');
  } else if (spendingConsistency === '有点在意，但可以沟通') {
    explanations.push('生活方式权重+1（对消费观有点在意）');
  } else if (spendingConsistency === '不太在意，可以不一样') {
    explanations.push('生活方式权重-1（对消费观不太在意）');
  } else if (spendingConsistency === '完全无所谓') {
    explanations.push('生活方式权重-2（对消费观完全无所谓）');
  }

  const sleepConsistency = answers.sleepConsistency;
  if (sleepConsistency === '需要调整，希望一致') {
    explanations.push('生活方式权重+2（对作息一致性要求高）');
  } else if (sleepConsistency === '可以商量着来') {
    explanations.push('生活方式权重+1（对作息可以商量）');
  } else if (sleepConsistency === '不用调整，各睡各的') {
    explanations.push('生活方式权重-1（对作息不太在意）');
  } else if (sleepConsistency === '完全无所谓') {
    explanations.push('生活方式权重-2（对作息完全无所谓）');
  }

  const tidinessConsistency = answers.tidinessConsistency;
  if (tidinessConsistency === '会别扭，希望一致') {
    explanations.push('生活方式权重+2（对整洁一致性要求高）');
  } else if (tidinessConsistency === '有点别扭，但可以忍') {
    explanations.push('生活方式权重+1（对整洁有点在意）');
  } else if (tidinessConsistency === '不会别扭，各管各的') {
    explanations.push('生活方式权重-1（对整洁不太在意）');
  } else if (tidinessConsistency === '完全无所谓') {
    explanations.push('生活方式权重-2（对整洁完全无所谓）');
  }

  const stressConsistency = answers.stressConsistency;
  if (stressConsistency === '会有隔阂，希望一致') {
    explanations.push('生活方式权重+2（对压力应对一致性要求高）');
  } else if (stressConsistency === '会有点，但能理解') {
    explanations.push('生活方式权重+1（对压力应对有点在意）');
  } else if (stressConsistency === '不会，尊重差异') {
    explanations.push('生活方式权重-1（对压力应对不太在意）');
  } else if (stressConsistency === '完全无所谓') {
    explanations.push('生活方式权重-2（对压力应对完全无所谓）');
  }

  const familyConsistency = answers.familyConsistency;
  if (familyConsistency === '会觉得是问题') {
    explanations.push('价值观权重+2（对家庭关系一致性要求高）');
  } else if (familyConsistency === '有点介意，但可以接受') {
    explanations.push('价值观权重+1（对家庭关系有点介意）');
  } else if (familyConsistency === '不太介意，各家有各家的过法') {
    explanations.push('价值观权重-1（对家庭关系不太介意）');
  } else if (familyConsistency === '完全无所谓') {
    explanations.push('价值观权重-2（对家庭关系完全无所谓）');
  }

  const lifeConsistency = answers.lifeConsistency;
  if (lifeConsistency === '不太能接受，希望一致') {
    explanations.push('价值观权重+2（对生活偏好一致性要求高）');
  } else if (lifeConsistency === '有点难，但可以磨合') {
    explanations.push('价值观权重+1（对生活偏好有点在意）');
  } else if (lifeConsistency === '能接受，互相尊重') {
    explanations.push('价值观权重-1（对生活偏好不太在意）');
  } else if (lifeConsistency === '完全无所谓') {
    explanations.push('价值观权重-2（对生活偏好完全无所谓）');
  }

  return explanations;
}

// 获取所有权重调整说明（兼容旧代码）
export function getWeightExplanation(answers) {
  return [
    ...getWeightExplanationPart2(answers),
    ...getWeightExplanationPart3(answers)
  ];
}
