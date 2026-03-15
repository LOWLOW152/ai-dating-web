import { calculateMatch, saveMatchResult, getMatchResultFromCache } from '../../../lib/match-calculator';
import { sql } from '@vercel/postgres';

// 验证会话
async function validateSession(token) {
  try {
    const result = await sql`
      SELECT * FROM admin_sessions 
      WHERE token = ${token} 
      AND expires_at > NOW()
    `;
    return result.rows.length > 0;
  } catch (err) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 验证登录
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录', code: 'NO_AUTH' });
  }
  
  const token = authHeader.slice(7);
  if (!await validateSession(token)) {
    return res.status(401).json({ error: '登录已过期', code: 'EXPIRED' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }
  
  try {
    const { profile_a_id, profile_b_id, force_recalculate } = req.body;
    
    if (!profile_a_id || !profile_b_id) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        code: 'MISSING_PARAMS',
        message: '需要提供 profile_a_id 和 profile_b_id'
      });
    }
    
    // 检查缓存（除非强制重新计算）
    if (!force_recalculate) {
      const cached = await getMatchResultFromCache(profile_a_id, profile_b_id);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          from_cache: true
        });
      }
    }
    
    // 计算匹配
    const result = await calculateMatch(profile_a_id, profile_b_id);
    
    // 保存到缓存
    await saveMatchResult(profile_a_id, profile_b_id, result);
    
    return res.json({
      success: true,
      data: result,
      from_cache: false
    });
    
  } catch (error) {
    console.error('匹配计算错误:', error);
    res.status(500).json({
      error: '匹配计算失败',
      code: 'CALC_ERROR',
      message: error.message
    });
  }
}