import { sql } from '@vercel/postgres';
import { validateSession } from '../login';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
  
  const { id } = req.query;
  
  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT q.*, qc.category_name 
        FROM questions q
        JOIN question_categories qc ON q.category_key = qc.category_key
        WHERE q.id = ${id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '问题不存在' });
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    if (req.method === 'PUT') {
      const data = req.body;
      
      const result = await sql`
        UPDATE questions SET
          category_key = ${data.category_key},
          part = ${data.part},
          display_order = ${data.display_order},
          main_text = ${data.main_text},
          main_type = ${data.main_type},
          main_options = ${data.main_options ? JSON.stringify(data.main_options) : null},
          main_placeholder = ${data.main_placeholder},
          main_required = ${data.main_required},
          ai_enabled = ${data.ai_enabled},
          ai_prompt = ${data.ai_prompt},
          match_algorithm = ${data.match_algorithm},
          match_config = ${data.match_config ? JSON.stringify(data.match_config) : '{}'},
          is_deal_breaker = ${data.is_deal_breaker},
          has_preference = ${data.has_preference},
          preference_text = ${data.preference_text},
          preference_required = ${data.preference_required},
          preference_default = ${data.preference_default},
          is_active = ${data.is_active},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '问题不存在' });
      }
      
      return res.json({
        success: true,
        data: result.rows[0],
        message: '更新成功'
      });
    }
    
    if (req.method === 'DELETE') {
      // 软删除
      const result = await sql`
        UPDATE questions SET is_active = false, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '问题不存在' });
      }
      
      return res.json({
        success: true,
        message: '已删除'
      });
    }
    
    return res.status(405).json({ error: '方法不允许' });
    
  } catch (error) {
    console.error('问题详情API错误:', error);
    res.status(500).json({ error: '服务器错误', message: error.message });
  }
}