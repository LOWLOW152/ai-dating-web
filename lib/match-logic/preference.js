// 偏好调整逻辑

/**
 * 根据用户偏好调整基础分数
 * @param {number} baseScore - 基础相似度 (0-100)
 * @param {string} preference - same/complementary/dontcare
 * @returns {number} 调整后分数
 */
export function applyPreferenceModifier(baseScore, preference) {
  switch (preference) {
    case 'same':
      // 希望相同：相似度越高越好
      return baseScore;
      
    case 'complementary':
      // 希望互补：40-70分范围最理想
      if (baseScore >= 80) {
        // 太相似，不是互补
        return 50;
      } else if (baseScore <= 20) {
        // 差异太大，可能冲突
        return 40;
      } else {
        // 40-70分的差异是理想的互补，映射到70-100
        return 70 + (70 - baseScore);
      }
      
    case 'dontcare':
    default:
      // 无所谓：中等偏上分
      return 70;
  }
}

/**
 * 获取偏好解释
 */
export function getPreferenceExplanation(baseScore, preference) {
  const explanations = {
    same: {
      high: { text: '你们很相似，正如你所期望的', emoji: '✨' },
      medium: { text: '你们有一些共同点，但还有提升空间', emoji: '🤝' },
      low: { text: '你们差异较大，而你希望找到相似的', emoji: '⚠️' }
    },
    complementary: {
      high: { text: '你们太相似了，而你希望找到互补的', emoji: '🤔' },
      medium: { text: '你们的差异恰到好处，形成良好的互补', emoji: '✨' },
      low: { text: '你们差异较大，可能需要更多磨合', emoji: '⚠️' }
    },
    dontcare: {
      high: { text: '你们很相似', emoji: '' },
      medium: { text: '你们有一定差异', emoji: '' },
      low: { text: '你们差异较大', emoji: '' }
    }
  };
  
  let level;
  if (preference === 'complementary') {
    level = (baseScore >= 40 && baseScore <= 70) ? 'medium' : (baseScore > 70 ? 'high' : 'low');
  } else {
    level = baseScore >= 70 ? 'high' : (baseScore >= 40 ? 'medium' : 'low');
  }
  
  return explanations[preference || 'dontcare'][level];
}

/**
 * 偏好选项定义
 */
export const PREFERENCE_OPTIONS = [
  { value: 'same', label: '相同，有共同话题', description: '希望对方与你有相似的特点' },
  { value: 'complementary', label: '互补，互相带对方体验', description: '希望对方能弥补你的不足' },
  { value: 'dontcare', label: '无所谓，各自有空间', description: '对此没有特别偏好' }
];

/**
 * 验证偏好值
 */
export function isValidPreference(value) {
  return ['same', 'complementary', 'dontcare'].includes(value);
}