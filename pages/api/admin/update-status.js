import { sql } from '../../../lib/db';
import { validateSession } from './login';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
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
    
    const { id, status, notes } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 验证状态值
    const validStatuses = ['待处理', '已联系', '已匹配', '不合适', '深度沟通'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    await sql`
      UPDATE profiles 
      SET status = ${status}, 
          notes = ${notes || null},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    
    res.status(200).json({
      success: true,
      message: '状态已更新'
    });
    
  } catch (error) {
    console.error('更新档案状态错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
