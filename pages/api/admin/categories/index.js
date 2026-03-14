import { sql } from '../../../lib/db';
import { validateSession } from './login';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
      const result = await sql`
        SELECT * FROM question_categories 
        WHERE is_active = true
        ORDER BY sort_order, id
      `;
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    if (req.method === 'PUT') {
      const { categories } = req.body;
      
      if (!Array.isArray(categories)) {
        return res.status(400).json({ error: '无效的数据格式' });
      }
      
      // 批量更新
      for (const cat of categories) {
        await sql`
          UPDATE question_categories SET
            default_weight = ${cat.default_weight},
            sort_order = ${cat.sort_order},
            updated_at = NOW()
          WHERE category_key = ${cat.category_key}
        `;
      }
      
      return res.json({
        success: true,
        message: '更新成功'
      });
    }
    
    return res.status(405).json({ error: '方法不允许' });
    
  } catch (error) {
    console.error('分类API错误:', error);
    res.status(500).json({ error: '服务器错误', message: error.message });
  }
}