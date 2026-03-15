import { sql } from '@vercel/postgres';

/**
 * 匹配计算核心
 * 计算两个profile的匹配分数
 */
export async function calculateMatch(profileAId, profileBId) {
  // 1. 获取两人答案
  const [answersA, answersB, weightsA, weightsB] = await Promise.all([
    getUserAnswers(profileAId),
    getUserAnswers(profileBId),
    getUserWeights(profileAId),
    getUserWeights(profileBId)
  ]);
  
  // 2. 获取所有问题配置
  const questions = await getQuestions();
  
  // 3. 检查红线（一票否决）
  const blockReasons = checkDealBreakers(answersA, answersB, questions);
  if (blockReasons.length > 0) {
    return {
      total_score: 0,
      is_blocked: true,
      block_reasons: blockReasons,
      category_scores: {},
      question_scores: [],
      summary: '存在硬性不匹配条件，建议不推荐'
    };
  }
  
  // 4. 计算每道题得分
  const questionScores = [];
  const categoryScores = {};
  const categoryCounts = {};
  
  for (const q of questions) {
    if (q.match_algorithm === 'no_match') continue;
    
    const answerA = answersA.find(a => a.question_key === q.question_key);
    const answerB = answersB.find(a => a.question_key === q.question_key);
    
    if (!answerA || !answerB) continue;
    
    // 计算原始相似度
    const rawSimilarity = calculateSimilarity(
      answerA.main_answer, 
      answerB.main_answer, 
      q.match_algorithm,
      q.match_config
    );
    
    // 应用偏好调整
    const preference = answerA.preference_answer || q.preference_default || 'dontcare';
    const finalScore = applyPreference(rawSimilarity, preference);
    
    questionScores.push({
      question_key: q.question_key,
      question_text: q.main_text,
      category: q.category_key,
      raw_similarity: Math.round(rawSimilarity),
      preference: preference,
      final_score: Math.round(finalScore),
      answer_a: answerA.main_answer,
      answer_b: answerB.main_answer
    });
    
    // 累加分类得分
    if (!categoryScores[q.category_key]) {
      categoryScores[q.category_key] = 0;
      categoryCounts[q.category_key] = 0;
    }
    categoryScores[q.category_key] += finalScore;
    categoryCounts[q.category_key]++;
  }
  
  // 5. 计算分类平均分
  const avgCategoryScores = {};
  for (const cat of Object.keys(categoryScores)) {
    avgCategoryScores[cat] = Math.round(categoryScores[cat] / categoryCounts[cat]);
  }
  
  // 6. 计算总分（按权重加权）
  const weights = mergeWeights(weightsA, weightsB);
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const cat of Object.keys(avgCategoryScores)) {
    const weight = weights[cat] || 5;
    weightedSum += avgCategoryScores[cat] * weight;
    totalWeight += weight;
  }
  
  const totalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
  // 7. 生成总结
  const summary = generateSummary(avgCategoryScores, blockReasons);
  
  return {
    total_score: totalScore,
    is_blocked: false,
    block_reasons: [],
    category_scores: avgCategoryScores,
    question_scores: questionScores,
    summary: summary
  };
}

/**
 * 获取用户答案
 */
async function getUserAnswers(profileId) {
  const result = await sql`
    SELECT ua.*, q.category_key, q.match_algorithm, q.preference_default
    FROM user_answers ua
    JOIN questions q ON ua.question_key = q.question_key
    WHERE ua.profile_id = ${profileId}
    AND q.is_active = true
  `;
  return result.rows;
}

/**
 * 获取用户权重偏好
 */
async function getUserWeights(profileId) {
  // 优先从 profiles.match_weights 读取（JSON格式）
  const profileResult = await sql`
    SELECT match_weights FROM profiles 
    WHERE id = ${profileId}
  `;
  
  if (profileResult.rows.length > 0 && profileResult.rows[0].match_weights) {
    return profileResult.rows[0].match_weights;
  }
  
  // 回退到旧表
  const result = await sql`
    SELECT * FROM user_category_weights 
    WHERE profile_id = ${profileId}
  `;
  const weights = {};
  for (const row of result.rows) {
    weights[row.category_key] = row.custom_weight;
  }
  return weights;
}

/**
 * 获取问题配置
 */
async function getQuestions() {
  const result = await sql`
    SELECT * FROM questions 
    WHERE is_active = true
    ORDER BY part, display_order
  `;
  return result.rows;
}

/**
 * 检查一票否决条件
 */
function checkDealBreakers(answersA, answersB, questions) {
  const reasons = [];
  
  // 获取关键答案
  const cityA = answersA.find(a => a.question_key === 'city')?.main_answer;
  const cityB = answersB.find(a => a.question_key === 'city')?.main_answer;
  const acceptDistanceA = answersA.find(a => a.question_key === 'accept_long_distance')?.main_answer;
  const acceptDistanceB = answersB.find(a => a.question_key === 'accept_long_distance')?.main_answer;
  const birthYearA = answersA.find(a => a.question_key === 'birth_year')?.main_answer;
  const birthYearB = answersB.find(a => a.question_key === 'birth_year')?.main_answer;
  const ageRangeA = answersA.find(a => a.question_key === 'age_range')?.main_answer;
  const ageRangeB = answersB.find(a => a.question_key === 'age_range')?.main_answer;
  
  // 1. 异地检查
  if (acceptDistanceA === 'false' && cityA !== cityB) {
    reasons.push('A不接受异地，但两人城市不同');
  }
  if (acceptDistanceB === 'false' && cityA !== cityB) {
    reasons.push('B不接受异地，但两人城市不同');
  }
  
  // 2. 年龄范围检查
  if (birthYearA && birthYearB && ageRangeA && ageRangeB) {
    const ageA = new Date().getFullYear() - parseInt(birthYearA);
    const ageB = new Date().getFullYear() - parseInt(birthYearB);
    const rangeA = parseInt(ageRangeA) || 5;
    const rangeB = parseInt(ageRangeB) || 5;
    
    if (Math.abs(ageA - ageB) > rangeA) {
      reasons.push(`年龄差${Math.abs(ageA - ageB)}岁，超出A接受范围${rangeA}岁`);
    }
    if (Math.abs(ageA - ageB) > rangeB) {
      reasons.push(`年龄差${Math.abs(ageA - ageB)}岁，超出B接受范围${rangeB}岁`);
    }
  }
  
  // 3. deal_breakers 关键词检查
  const dealBreakersA = answersA.find(a => a.question_key === 'deal_breakers')?.main_answer || '';
  const dealBreakersB = answersB.find(a => a.question_key === 'deal_breakers')?.main_answer || '';
  
  // 简单关键词匹配（后续可优化）
  const checkConflict = (strA, strB, keyword) => {
    return strA.includes(keyword) && !strB.includes(keyword);
  };
  
  return reasons;
}

/**
 * 计算原始相似度
 */
function calculateSimilarity(answerA, answerB, algorithm, config = {}) {
  switch (algorithm) {
    case 'must_match':
      return answerA === answerB ? 100 : 0;
      
    case 'range_compatible': {
      // 年龄差计算
      const diff = Math.abs(parseInt(answerA) - parseInt(answerB));
      const maxDiff = config.maxDiff || 10;
      return Math.max(0, 100 - (diff / maxDiff) * 100);
    }
      
    case 'set_similarity': {
      // 多选Jaccard相似度
      const setA = parseAnswerSet(answerA);
      const setB = parseAnswerSet(answerB);
      const intersection = setA.filter(x => setB.includes(x));
      const union = [...new Set([...setA, ...setB])];
      return union.length === 0 ? 0 : (intersection.length / union.length) * 100;
    }
      
    case 'level_similarity': {
      // 等级相似度（消费观、整洁度）
      const levels = config.levels || {};
      const levelA = levels[answerA] || 0;
      const levelB = levels[answerB] || 0;
      const maxDiff = config.maxDiff || 1;
      const diff = Math.abs(levelA - levelB);
      
      if (diff <= maxDiff) {
        return 100 - (diff * (config.diffPenalty || 30));
      }
      return Math.max(0, 100 - (diff * 40));
    }
      
    case 'semantic_similarity':
      // 语义相似度（简单关键词版，后续可接入AI）
      return calculateKeywordSimilarity(answerA, answerB);
    
    case 'keyword_blocker': {
      // 关键词红线 - 检查双方红线是否冲突
      // deal_breakers 是双方都排斥的事，一致反而是好事
      const setA = parseAnswerSet(answerA);
      const setB = parseAnswerSet(answerB);
      
      // 计算共同红线的比例（双方都不能接受相同的事 = 价值观一致）
      const common = setA.filter(x => setB.includes(x));
      const union = [...new Set([...setA, ...setB])];
      
      if (union.length === 0) return 70;
      // 共同红线越多，说明价值观越一致，分数越高
      return Math.round((common.length / union.length) * 100);
    }
      
    case 'no_match':
    default:
      return 70; // 不参与匹配，固定70分
  }
}

/**
 * 解析答案为数组
 */
function parseAnswerSet(answer) {
  if (!answer) return [];
  if (Array.isArray(answer)) return answer;
  if (typeof answer === 'string') {
    return answer.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  }
  return [String(answer)];
}

/**
 * 简单关键词相似度
 */
function calculateKeywordSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  
  const wordsA = textA.toLowerCase().split(/\s+/);
  const wordsB = textB.toLowerCase().split(/\s+/);
  
  const intersection = wordsA.filter(w => wordsB.includes(w));
  const union = [...new Set([...wordsA, ...wordsB])];
  
  return union.length === 0 ? 50 : (intersection.length / union.length) * 100;
}

/**
 * 应用偏好调整
 */
function applyPreference(similarity, preference) {
  switch (preference) {
    case 'same':
      // 相同：直接映射
      return similarity;
      
    case 'complementary': {
      // 互补：40-70%最佳，映射到70-100分
      if (similarity >= 40 && similarity <= 70) {
        // 在最佳区间内，映射到高分
        return 70 + ((similarity - 40) / 30) * 30;
      } else if (similarity < 40) {
        // 差异太大
        return 30 + (similarity / 40) * 40;
      } else {
        // 太相似
        return 100 - ((similarity - 70) / 30) * 70;
      }
    }
      
    case 'dontcare':
    default:
      return 70;
  }
}

/**
 * 合并两人权重（取平均）
 */
function mergeWeights(weightsA, weightsB) {
  const merged = {};
  const allKeys = new Set([...Object.keys(weightsA), ...Object.keys(weightsB)]);
  
  for (const key of allKeys) {
    const wA = weightsA[key] || 5;
    const wB = weightsB[key] || 5;
    merged[key] = Math.round((wA + wB) / 2);
  }
  
  return merged;
}

/**
 * 生成匹配总结
 */
function generateSummary(categoryScores, blockReasons) {
  if (blockReasons.length > 0) {
    return `存在硬性不匹配：${blockReasons.join('；')}`;
  }
  
  const scores = Object.entries(categoryScores);
  if (scores.length === 0) return '暂无足够数据生成匹配报告';
  
  // 找出最高和最低分类
  scores.sort((a, b) => b[1] - a[1]);
  const best = scores[0];
  const worst = scores[scores.length - 1];
  
  const categoryNames = {
    basic: '基础条件',
    interest: '兴趣爱好',
    lifestyle: '生活方式',
    values: '价值观',
    emotion: '情感核心',
    social: '社交模式'
  };
  
  let summary = '';
  
  if (best[1] >= 80) {
    summary += `${categoryNames[best[0]] || best[0]}匹配优秀(${best[1]}分)；`;
  }
  
  if (worst[1] < 60) {
    summary += `${categoryNames[worst[0]] || worst[0]}差异较大(${worst[1]}分)，需要关注；`;
  }
  
  const avgScore = scores.reduce((sum, s) => sum + s[1], 0) / scores.length;
  
  if (avgScore >= 80) {
    summary += '整体匹配度很高，推荐进一步接触。';
  } else if (avgScore >= 60) {
    summary += '整体匹配度尚可，建议深入了解后再决定。';
  } else {
    summary += '整体匹配度一般，建议谨慎考虑。';
  }
  
  return summary;
}

/**
 * 保存匹配结果到缓存
 */
export async function saveMatchResult(profileAId, profileBId, result) {
  try {
    await sql`
      INSERT INTO match_results (
        profile_a_id, profile_b_id,
        total_score, is_blocked, block_reasons,
        category_scores, question_scores, summary_text,
        calculated_at, expires_at
      ) VALUES (
        ${profileAId}, ${profileBId},
        ${result.total_score}, ${result.is_blocked}, ${JSON.stringify(result.block_reasons)},
        ${JSON.stringify(result.category_scores)}, ${JSON.stringify(result.question_scores)}, ${result.summary},
        NOW(), NOW() + INTERVAL '7 days'
      )
      ON CONFLICT (profile_a_id, profile_b_id) 
      DO UPDATE SET
        total_score = EXCLUDED.total_score,
        is_blocked = EXCLUDED.is_blocked,
        block_reasons = EXCLUDED.block_reasons,
        category_scores = EXCLUDED.category_scores,
        question_scores = EXCLUDED.question_scores,
        summary_text = EXCLUDED.summary_text,
        calculated_at = EXCLUDED.calculated_at,
        expires_at = EXCLUDED.expires_at
    `;
  } catch (err) {
    console.error('保存匹配结果失败:', err);
  }
}

/**
 * 从缓存获取匹配结果
 */
export async function getMatchResultFromCache(profileAId, profileBId) {
  try {
    const result = await sql`
      SELECT * FROM match_results 
      WHERE profile_a_id = ${profileAId} AND profile_b_id = ${profileBId}
      AND expires_at > NOW()
    `;
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        total_score: row.total_score,
        is_blocked: row.is_blocked,
        block_reasons: row.block_reasons,
        category_scores: row.category_scores,
        question_scores: row.question_scores,
        summary: row.summary_text,
        from_cache: true
      };
    }
    
    return null;
  } catch (err) {
    console.error('读取缓存失败:', err);
    return null;
  }
}