import { sql } from '../../../lib/db';
import { validateSession } from './login';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
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
    
    const { status, date, page = 1, limit = 20 } = req.query;
    
    let query = sql`SELECT * FROM profiles WHERE 1=1`;
    
    if (status) {
      query = sql`${query} AND status = ${status}`;
    }
    
    if (date) {
      query = sql`${query} AND DATE(created_at) = ${date}`;
    }
    
    query = sql`${query} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`;
    
    const result = await query;
    
    // 获取总数
    const countResult = await sql`SELECT COUNT(*) as total FROM profiles`;
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      profiles: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('获取档案列表错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
