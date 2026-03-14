// 匹配算法注册中心 - 支持动态扩展

/**
 * 算法注册表
 */
const algorithms = {};
const algorithmMetadata = {};

/**
 * 注册算法
 * @param {string} name - 算法标识
 * @param {Function} calculator - 计算函数
 * @param {Object} metadata - 算法元数据
 */
export function registerAlgorithm(name, calculator, metadata = {}) {
  algorithms[name] = calculator;
  algorithmMetadata[name] = {
    name,
    displayName: metadata.displayName || name,
    description: metadata.description || '',
    paramsSchema: metadata.paramsSchema || {},
    ...metadata
  };
}

/**
 * 获取算法
 */
export function getAlgorithm(name) {
  return algorithms[name] || algorithms['no_match'];
}

/**
 * 获取算法元数据
 */
export function getAlgorithmMetadata(name) {
  return algorithmMetadata[name] || null;
}

/**
 * 列出所有可用算法
 */
export function listAlgorithms() {
  return Object.values(algorithmMetadata);
}

// ==================== 内置算法 ====================

/**
 * 1. 必须相同 - 用于硬条件
 */
registerAlgorithm('must_match', 
  function mustMatch(answerA, answerB, config = {}) {
    const { partialScore = 30, mismatchScore = 0, caseSensitive = false } = config;
    
    if (!answerA || !answerB) {
      return { score: 50, details: { reason: '数据缺失' } };
    }
    
    const a = String(answerA).trim();
    const b = String(answerB).trim();
    const compareA = caseSensitive ? a : a.toLowerCase();
    const compareB = caseSensitive ? b : b.toLowerCase();
    
    if (compareA === compareB) {
      return { score: 100, details: { match: true, answerA: a, answerB: b } };
    }
    
    // 部分匹配检查
    const partialKeywords = ['视情况而定', '看情况', 'depends', 'flexible'];
    if (partialKeywords.some(k => compareA.includes(k) || compareB.includes(k))) {
      return { score: partialScore, details: { match: 'partial', answerA: a, answerB: b } };
    }
    
    return { score: mismatchScore, details: { match: false, answerA: a, answerB: b } };
  },
  {
    displayName: '必须相同',
    description: '答案必须完全一致，适用于硬条件如异地接受度',
    paramsSchema: {
      partialScore: { type: 'number', default: 30, label: '部分匹配分数' },
      mismatchScore: { type: 'number', default: 0, label: '不匹配分数' },
      caseSensitive: { type: 'boolean', default: false, label: '区分大小写' }
    }
  }
);

/**
 * 2. 集合相似度 - 用于兴趣
 */
registerAlgorithm('set_similarity',
  function setSimilarity(answerA, answerB, config = {}) {
    const { separator = ',', minCommon = 1, useJaccard = false, emptyScore = 50 } = config;
    
    if (!answerA || !answerB) {
      return { score: emptyScore, details: { reason: '数据缺失' } };
    }
    
    const parseSet = (str) => {
      return String(str)
        .split(new RegExp(`[${separator}，、]`))
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    };
    
    const setA = parseSet(answerA);
    const setB = parseSet(answerB);
    
    if (setA.length === 0 || setB.length === 0) {
      return { score: emptyScore, details: { reason: '空集合', setA, setB } };
    }
    
    const intersection = setA.filter(item => setB.includes(item));
    const commonCount = intersection.length;
    
    if (commonCount < minCommon) {
      return {
        score: Math.round((commonCount / minCommon) * 40),
        details: { commonCount, minCommon, setA, setB, intersection, reason: `共同元素不足` }
      };
    }
    
    let similarity;
    if (useJaccard) {
      const union = new Set([...setA, ...setB]).size;
      similarity = union === 0 ? 0 : commonCount / union;
    } else {
      similarity = commonCount / Math.max(setA.length, setB.length);
    }
    
    return {
      score: Math.round(similarity * 100),
      details: { setA, setB, intersection, commonCount, similarity: Math.round(similarity * 100) / 100 }
    };
  },
  {
    displayName: '集合相似度',
    description: '计算两个集合的共同元素比例，适用于兴趣、爱好等',
    paramsSchema: {
      separator: { type: 'string', default: ',', label: '分隔符' },
      minCommon: { type: 'number', default: 1, label: '最少共同元素' },
      useJaccard: { type: 'boolean', default: false, label: '使用Jaccard' },
      emptyScore: { type: 'number', default: 50, label: '空答案默认分' }
    }
  }
);

/**
 * 3. 等级相似 - 等级越近越好
 */
registerAlgorithm('level_similarity',
  function levelSimilarity(answerA, answerB, config = {}) {
    const { levels = {}, maxDiff = 1, diffPenalty = 30, unknownLevel = 2 } = config;
    
    if (!answerA || !answerB) {
      return { score: 50, details: { reason: '数据缺失' } };
    }
    
    const levelA = levels[answerA] ?? unknownLevel;
    const levelB = levels[answerB] ?? unknownLevel;
    const diff = Math.abs(levelA - levelB);
    
    if (diff > maxDiff) {
      return {
        score: Math.max(0, 100 - maxDiff * diffPenalty - (diff - maxDiff) * 20),
        details: { answerA, answerB, levelA, levelB, diff, maxDiff, reason: `差距过大` }
      };
    }
    
    const score = Math.max(0, 100 - diff * diffPenalty);
    return {
      score,
      details: { answerA, answerB, levelA, levelB, diff, reason: diff === 0 ? '完全一致' : `差距${diff}级` }
    };
  },
  {
    displayName: '等级相似',
    description: '等级越接近越好，适用于消费观、整洁度等',
    paramsSchema: {
      levels: { type: 'object', required: true, label: '等级定义', example: '{"节俭型": 1, "平衡型": 2}' },
      maxDiff: { type: 'number', default: 1, label: '最大容忍差距' },
      diffPenalty: { type: 'number', default: 30, label: '每级扣分' }
    }
  }
);

/**
 * 4. 等级互补 - 特定组合最佳
 */
registerAlgorithm('level_complementary',
  function levelComplementary(answerA, answerB, config = {}) {
    const { goodPairs = [], badPairs = [], goodScore = 100, badScore = 30, neutralScore = 60 } = config;
    
    if (!answerA || !answerB) {
      return { score: 50, details: { reason: '数据缺失' } };
    }
    
    const a = String(answerA).trim();
    const b = String(answerB).trim();
    
    for (const [x, y] of goodPairs) {
      if ((a === x && b === y) || (a === y && b === x)) {
        return { score: goodScore, details: { type: 'good_pair', pair: [x, y], reason: `最佳互补组合` } };
      }
    }
    
    for (const [x, y] of badPairs) {
      if ((a === x && b === y) || (a === y && b === x)) {
        return { score: badScore, details: { type: 'bad_pair', pair: [x, y], reason: `冲突组合` } };
      }
    }
    
    return { score: neutralScore, details: { type: 'neutral', reason: '普通组合' } };
  },
  {
    displayName: '等级互补',
    description: '特定组合为最佳配对，适用于社交角色、决策风格等',
    paramsSchema: {
      goodPairs: { type: 'array', label: '最佳组合', example: '[["组织者", "参与者"]]' },
      badPairs: { type: 'array', label: '冲突组合', example: '[["组织者", "组织者"]]' },
      goodScore: { type: 'number', default: 100, label: '最佳组合分数' },
      badScore: { type: 'number', default: 30, label: '冲突组合分数' },
      neutralScore: { type: 'number', default: 60, label: '普通组合分数' }
    }
  }
);

/**
 * 5. 范围相容 - 用于年龄等
 */
registerAlgorithm('range_compatible',
  function rangeCompatible(answerA, answerB, config = {}) {
    const { valueA, valueB, rangeA, rangeB, perfectRange = 0, acceptableRange = 5 } = config;
    
    if (valueA === undefined || valueB === undefined) {
      return { score: 50, details: { reason: '数据缺失' } };
    }
    
    const parseRange = (range) => {
      if (!range) return { min: -5, max: 5 };
      const match = String(range).match(/(\d+)/);
      if (!match) return { min: -5, max: 5 };
      const num = parseInt(match[1]);
      return { min: -num, max: num };
    };
    
    const diff = Math.abs(valueA - valueB);
    const rangeAOBJ = parseRange(rangeA);
    const rangeBOBJ = parseRange(rangeB);
    
    const aAcceptsB = diff <= Math.abs(rangeAOBJ.max);
    const bAcceptsA = diff <= Math.abs(rangeBOBJ.max);
    
    if (!aAcceptsB || !bAcceptsA) {
      return { score: 0, details: { diff, reason: `差距${diff}，超出接受范围` } };
    }
    
    if (diff <= perfectRange) {
      return { score: 100, details: { diff, reason: '完美匹配' } };
    }
    
    const score = Math.max(0, 100 - (diff - perfectRange) * (80 / (acceptableRange - perfectRange)));
    return { score: Math.round(score), details: { diff, reason: `差距${diff}，在范围内` } };
  },
  {
    displayName: '范围相容',
    description: '检查数值是否在双方接受范围内，适用于年龄、身高等',
    paramsSchema: {
      perfectRange: { type: 'number', default: 0, label: '完美匹配差距' },
      acceptableRange: { type: 'number', default: 5, label: '可接受差距' }
    }
  }
);

/**
 * 6. 关键词红线 - 一票否决
 */
registerAlgorithm('keyword_blocker',
  function keywordBlocker(answerA, answerB, config = {}) {
    const { keywords = [], caseSensitive = false, matchMode = 'contains' } = config;
    
    // 检查B是否触发了A的红线
    if (!answerB) {
      return { score: 100, details: { reason: '无数据，不触发' } };
    }
    
    const b = caseSensitive ? String(answerB) : String(answerB).toLowerCase();
    const triggers = [];
    
    for (const keyword of keywords) {
      const kw = caseSensitive ? keyword : keyword.toLowerCase();
      const matched = matchMode === 'exact' ? b === kw : b.includes(kw);
      if (matched) triggers.push(keyword);
    }
    
    if (triggers.length > 0) {
      return { score: 0, isDealBreaker: true, details: { triggers, reason: `触发红线` } };
    }
    
    return { score: 100, details: { reason: '未触发红线' } };
  },
  {
    displayName: '关键词红线',
    description: '触发关键词直接0分，适用于绝对不能接受的事',
    paramsSchema: {
      keywords: { type: 'array', required: true, label: '红线关键词列表' },
      caseSensitive: { type: 'boolean', default: false, label: '区分大小写' },
      matchMode: { type: 'select', options: ['contains', 'exact'], default: 'contains', label: '匹配模式' }
    }
  }
);

/**
 * 7. 语义相似度 - 需要AI (占位)
 */
registerAlgorithm('semantic_similarity',
  async function semanticSimilarity(answerA, answerB, config = {}) {
    // 占位实现，后续接入AI服务
    return { score: 70, details: { reason: '语义相似度待接入AI', answerA, answerB } };
  },
  {
    displayName: '语义相似度',
    description: 'AI语义分析相似度，适用于理想关系、核心需求等开放题',
    paramsSchema: {}
  }
);

/**
 * 8. 不参与匹配
 */
registerAlgorithm('no_match',
  function noMatch() {
    return { score: 50, details: { reason: '不参与匹配' } };
  },
  {
    displayName: '不参与匹配',
    description: '纯信息收集，不参与匹配评分',
    paramsSchema: {}
  }
);

export default { registerAlgorithm, getAlgorithm, getAlgorithmMetadata, listAlgorithms };