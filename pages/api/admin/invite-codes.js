import { sql } from '../../../lib/db';
import { validateSession } from './login';

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
    // GET: 获取邀请码列表
    if (req.method === 'GET') {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // 获取指定日期的邀请码
      const codesResult = await sql`
        SELECT 
          ic.code,
          ic.used,
          ic.used_at,
          ic.profile_id,
          p.nickname,
          p.gender
        FROM invite_codes ic
        LEFT JOIN profiles p ON ic.profile_id = p.id
        WHERE ic.created_at = ${targetDate}
        ORDER BY ic.used, ic.code
      `;
      
      // 获取统计
      const statsResult = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN used = true THEN 1 END) as used,
          COUNT(CASE WHEN used = false THEN 1 END) as remaining
        FROM invite_codes
        WHERE created_at = ${targetDate}
      `;
      
      // 获取最近7天的使用趋势
      const trendResult = await sql`
        SELECT 
          created_at as date,
          COUNT(*) as total,
          COUNT(CASE WHEN used = true THEN 1 END) as used
        FROM invite_codes
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY created_at
        ORDER BY created_at DESC
      `;
      
      return res.status(200).json({
        success: true,
        date: targetDate,
        codes: codesResult.rows,
        stats: statsResult.rows[0],
        trend: trendResult.rows
      });
    }
    
    // POST: 生成新的邀请码
    if (req.method === 'POST') {
      const { count = 1, date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const newCodes = [];
      
      for (let i = 0; i < count; i++) {
        let code;
        let exists = true;
        
        // 确保唯一
        while (exists) {
          code = '';
          for (let j = 0; j < 8; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const check = await sql`SELECT 1 FROM invite_codes WHERE code = ${code}`;
          exists = check.rows.length > 0;
        }
        
        await sql`
          INSERT INTO invite_codes (code, created_at, used)
          VALUES (${code}, ${targetDate}, false)
        `;
        
        newCodes.push(code);
      }
      
      return res.status(200).json({
        success: true,
        message: `成功生成 ${count} 个邀请码`,
        codes: newCodes
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('邀请码API错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
