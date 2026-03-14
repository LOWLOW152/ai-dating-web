import { validateSession } from './login';
import { listAlgorithms, getAlgorithm } from '../../../lib/match-algorithms';
import { applyPreferenceModifier } from '../../../lib/match-logic/preference';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  if (!await validateSession(token)) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  try {
    if (req.method === 'GET') {
      // 获取所有可用算法
      const algorithms = listAlgorithms();
      
      return res.json({
        success: true,
        data: algorithms
      });
    }
    
    if (req.method === 'POST') {
      // 测试算法
      const { algorithm, config, answerA, answerB, preferenceA } = req.body;
      
      if (!algorithm || !answerA || !answerB) {
        return res.status(400).json({ error: '缺少必要参数' });
      }
      
      const algo = getAlgorithm(algorithm);
      const baseResult = await algo(answerA, answerB, config || {});
      
      // 应用偏好调整
      let finalScore = baseResult.score;
      let preferenceApplied = null;
      
      if (preferenceA) {
        finalScore = applyPreferenceModifier(baseResult.score, preferenceA);
        preferenceApplied = {
          preference: preferenceA,
          baseScore: baseResult.score,
          finalScore,
          explanation: getExplanation(baseResult.score, preferenceA)
        };
      }
      
      return res.json({
        success: true,
        result: {
          baseScore: baseResult.score,
          finalScore: Math.round(finalScore),
          isDealBreaker: baseResult.isDealBreaker || false,
          details: baseResult.details,
          preference: preferenceApplied
        }
      });
    }
    
    return res.status(405).json({ error: '方法不允许' });
    
  } catch (error) {
    console.error('算法测试API错误:', error);
    res.status(500).json({ error: '服务器错误', message: error.message });
  }
}

function getExplanation(baseScore, preference) {
  const explanations = {
    same: {
      high: '你们很相似，正如你所期望的',
      medium: '你们有一些共同点',
      low: '你们差异较大，而你希望找到相似的'
    },
    complementary: {
      high: '你们太相似了，而你希望找到互补的',
      medium: '你们的差异恰到好处，形成良好的互补',
      low: '你们差异较大，可能需要更多磨合'
    },
    dontcare: {
      high: '你们很相似',
      medium: '你们有一定差异',
      low: '你们差异较大'
    }
  };
  
  let level;
  if (preference === 'complementary') {
    level = (baseScore >= 40 && baseScore <= 70) ? 'medium' : (baseScore > 70 ? 'high' : 'low');
  } else {
    level = baseScore >= 70 ? 'high' : (baseScore >= 40 ? 'medium' : 'low');
  }
  
  return explanations[preference]?.[level] || '';
}