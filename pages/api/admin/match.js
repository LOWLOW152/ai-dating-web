import { sql } from '../../../lib/db';
import { validateSession } from './login';
import { calculateMatch, findBestMatches, DEFAULT_WEIGHTS, calculateBidirectionalMatch, calculateRelationshipCurve } from '../../../lib/match';
import { getWeightExplanationPart2, getWeightExplanationPart3 } from '../../../lib/weights';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 验证登录
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  const isValid = await validateSession(token);
  if (!isValid) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  try {
    // GET: 获取某档案的匹配推荐
    if (req.method === 'GET') {
      const { profileId, limit = 5 } = req.query;
      
      if (!profileId) {
        return res.status(400).json({ error: '缺少档案ID' });
      }
      
      // 获取目标档案
      const profileRes = await sql`SELECT * FROM profiles WHERE id = ${profileId}`;
      if (profileRes.rows.length === 0) {
        return res.status(404).json({ error: '档案不存在' });
      }
      
      const profile = profileRes.rows[0];
      
      // 使用档案中存储的权重，如果没有则使用默认权重
      let weights = profile.match_weights;
      
      // 如果是字符串则解析，如果是 null/undefined 则使用默认
      if (typeof weights === 'string') {
        try {
          weights = JSON.parse(weights);
        } catch (e) {
          weights = DEFAULT_WEIGHTS;
        }
      }
      if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
        weights = DEFAULT_WEIGHTS;
      }
      
      // 确保所有维度都有值
      const validDimensions = ['basic', 'emotion', 'values', 'lifestyle', 'interest', 'social'];
      for (const dim of validDimensions) {
        if (weights[dim] === undefined || weights[dim] === null) {
          weights[dim] = DEFAULT_WEIGHTS[dim];
        }
      }
      
      console.log('DEBUG: weights =', JSON.stringify(weights));
      
      // 获取所有候选（异性、同城市或能接受异地）
      let candidatesRes;
      try {
        candidatesRes = await sql`
          SELECT * FROM profiles 
          WHERE id != ${profileId} 
          AND gender != ${profile.gender}
          AND status != '不合适'
        `;
      } catch (dbErr) {
        console.error('数据库查询错误:', dbErr);
        return res.status(500).json({ error: '数据库查询失败', message: dbErr.message });
      }
      
      const candidates = candidatesRes.rows;
      console.log('DEBUG: candidates count =', candidates.length);
      
      // 计算匹配度
      let matches;
      try {
        matches = findBestMatches(profile, candidates, parseInt(limit), weights);
      } catch (matchErr) {
        console.error('匹配计算错误:', matchErr);
        return res.status(500).json({ 
          error: '匹配计算失败', 
          message: matchErr.message,
          stack: matchErr.stack 
        });
      }
      
      // 转换 snake_case 为 camelCase 用于权重说明
      const answers = {
        hobbyMatchPreference: profile.hobby_match_preference,
        travelMatchPreference: profile.travel_match_preference,
        socialCirclePreference: profile.social_circle_preference,
        socialRolePreference: profile.social_role_preference,
        spendingConsistency: profile.spending_consistency,
        sleepConsistency: profile.sleep_consistency,
        tidinessConsistency: profile.tidiness_consistency,
        stressConsistency: profile.stress_consistency,
        familyConsistency: profile.family_consistency,
        lifeConsistency: profile.life_consistency
      };
      
      return res.status(200).json({
        success: true,
        profile: {
          id: profile.id,
          nickname: profile.nickname,
          gender: profile.gender,
          weights: weights,
          weightExplanations: {
            part2: getWeightExplanationPart2(answers),
            part3: getWeightExplanationPart3(answers)
          }
        },
        matches: matches.map(m => {
          // 计算双向匹配
          const bidirectional = calculateBidirectionalMatch(
            profile, 
            m.profile, 
            weights,
            m.profile.match_weights
          );
          // 计算关系发展曲线
          const relationshipCurve = calculateRelationshipCurve(profile, m.profile);
          
          return {
            profileId: m.profile.id,
            nickname: m.profile.nickname,
            gender: m.profile.gender,
            age: m.profile.birth_year ? new Date().getFullYear() - m.profile.birth_year : null,
            city: m.profile.city,
            // 我的视角分数
            myScore: m.score,
            // 对方视角分数
            theirScore: bidirectional.fromB.score,
            // 双向综合分数
            bidirectionalScore: bidirectional.bidirectionalScore,
            // 各维度详情
            dimensions: m.dimensions,
            // 关系发展曲线数据
            relationshipCurve: relationshipCurve,
            // 匹配洞察
            insights: relationshipCurve.insights
          };
        })
      });
    }
    
    // POST: 更新档案的匹配权重
    if (req.method === 'POST') {
      const { profileId, weights } = req.body;
      
      if (!profileId || !weights) {
        return res.status(400).json({ error: '缺少必要参数' });
      }
      
      // 验证权重格式
      const validDimensions = ['basic', 'emotion', 'values', 'lifestyle', 'interest', 'social'];
      for (const dim of validDimensions) {
        if (weights[dim] < 1 || weights[dim] > 10) {
          return res.status(400).json({ error: `权重${dim}必须在1-10之间` });
        }
      }
      
      await sql`
        UPDATE profiles 
        SET match_weights = ${JSON.stringify(weights)},
            updated_at = NOW()
        WHERE id = ${profileId}
      `;
      
      return res.status(200).json({
        success: true,
        message: '权重已更新'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('匹配API错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
