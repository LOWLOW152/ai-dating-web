import { sql } from '../../../../lib/db';
import { validateSession } from '../login';

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
    if (!validateSession(token)) {
      return res.status(401).json({ error: '登录已过期' });
    }
    
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: '缺少档案ID' });
    }
    
    const result = await sql`SELECT * FROM profiles WHERE id = ${id}`;
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '档案不存在' });
    }
    
    res.status(200).json({
      success: true,
      profile: result.rows[0]
    });
    
  } catch (error) {
    console.error('获取档案详情错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
