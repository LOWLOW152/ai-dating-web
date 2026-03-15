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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
  
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  return res.status(405).json({ error: '方法不允许' });
}

// GET: 获取某个档案的所有匹配列表
async function handleGet(req, res) {
  try {
    const { profileId } = req.query;
    
    if (!profileId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        code: 'MISSING_PARAMS',
        message: '需要提供 profileId'
      });
    }
    
    // 获取档案信息
    const profileRes = await sql`
      SELECT * FROM profiles WHERE id = ${profileId}
    `;
    
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: '档案不存在' });
    }
    
    const profile = profileRes.rows[0];
    
    // 获取所有其他档案
    const allProfilesRes = await sql`
      SELECT id, nickname, gender, birth_year, city, occupation, education, status
      FROM profiles 
      WHERE id != ${profileId}
      AND status = 'active'
      ORDER BY created_at DESC
    `;
    
    // 计算与每个档案的匹配
    const matches = [];
    for (const target of allProfilesRes.rows) {
      // 检查缓存
      let matchResult = await getMatchResultFromCache(profileId, target.id);
      
      if (!matchResult) {
        try {
          matchResult = await calculateMatch(profileId, target.id);
          await saveMatchResult(profileId, target.id, matchResult);
        } catch (err) {
          console.error(`计算匹配失败 ${profileId} vs ${target.id}:`, err);
          continue;
        }
      }
      
      matches.push({
        profile: target,
        match: matchResult
      });
    }
    
    // 按总分排序
    matches.sort((a, b) => b.match.total_score - a.match.total_score);
    
    return res.json({
      success: true,
      profile: profile,
      matches: matches
    });
    
  } catch (error) {
    console.error('获取匹配列表错误:', error);
    res.status(500).json({
      error: '获取匹配列表失败',
      code: 'LIST_ERROR',
      message: error.message
    });
  }
}

// POST: 计算两个档案的匹配 或 保存权重
async function handlePost(req, res) {
  try {
    const { profile_a_id, profile_b_id, profileId, weights, force_recalculate } = req.body;
    
    // 如果是保存权重
    if (profileId && weights) {
      return handleSaveWeights(req, res);
    }
    
    // 否则是计算匹配
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

// 保存权重
async function handleSaveWeights(req, res) {
  try {
    const { profileId, weights } = req.body;
    
    if (!profileId || !weights) {
      return res.status(400).json({
        error: '缺少必要参数',
        code: 'MISSING_PARAMS',
        message: '需要提供 profileId 和 weights'
      });
    }
    
    // 保存到 profiles 表
    await sql`
      UPDATE profiles 
      SET match_weights = ${JSON.stringify(weights)},
          updated_at = NOW()
      WHERE id = ${profileId}
    `;
    
    // 清空该档案的匹配缓存，强制重新计算
    await sql`DELETE FROM match_results WHERE profile_a_id = ${profileId} OR profile_b_id = ${profileId}`;
    
    return res.json({
      success: true,
      message: '权重已更新'
    });
    
  } catch (error) {
    console.error('保存权重错误:', error);
    res.status(500).json({
      error: '保存权重失败',
      code: 'SAVE_ERROR',
      message: error.message
    });
  }
}