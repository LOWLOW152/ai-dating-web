import { sql } from '../../../lib/db';
import { validateSession } from './login';
import { calculateMatch, findBestMatches, DEFAULT_WEIGHTS } from '../../../lib/match';

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
      profile.match_weights = profile.match_weights || DEFAULT_WEIGHTS;
      
      // 获取所有候选（异性、同城市或能接受异地）
      const candidatesRes = await sql`
        SELECT * FROM profiles 
        WHERE id != ${profileId} 
        AND gender != ${profile.gender}
        AND status != '不合适'
      `;
      
      const candidates = candidatesRes.rows;
      
      // 计算匹配度
      const matches = findBestMatches(profile, candidates, parseInt(limit));
      
      return res.status(200).json({
        success: true,
        profile: {
          id: profile.id,
          nickname: profile.nickname,
          gender: profile.gender,
          weights: profile.match_weights
        },
        matches: matches.map(m => ({
          profileId: m.profile.id,
          nickname: m.profile.nickname,
          gender: m.profile.gender,
          age: m.profile.birth_year ? new Date().getFullYear() - m.profile.birth_year : null,
          city: m.profile.city,
          score: m.score,
          dimensions: m.dimensions
        }))
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
