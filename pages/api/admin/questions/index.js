import { sql } from '@vercel/postgres';
import { validateSession } from '../login';

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
  
  // 检查环境变量
  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({ 
      error: '数据库连接未配置', 
      code: 'NO_DB_URL',
      message: '请在 Vercel 环境变量中添加 POSTGRES_URL'
    });
  }
  
  try {
    if (req.method === 'GET') {
      const { category, part, search, active } = req.query;
      
      // 先检查数据库连接
      try {
        await sql`SELECT 1`;
      } catch (dbErr) {
        return res.status(500).json({
          error: '数据库连接失败',
          code: 'DB_CONNECTION_ERROR',
          message: dbErr.message
        });
      }
      
      // 检查表是否存在
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'questions'
        )
      `;
      
      if (!tableCheck.rows[0].exists) {
        return res.status(500).json({
          error: '题库表不存在',
          code: 'TABLE_MISSING',
          message: '请先执行数据库迁移'
        });
      }
      
      let query = sql`
        SELECT q.*, qc.category_name 
        FROM questions q
        JOIN question_categories qc ON q.category_key = qc.category_key
        WHERE 1=1
      `;
      
      if (category) query = sql`${query} AND q.category_key = ${category}`;
      if (part) query = sql`${query} AND q.part = ${parseInt(part)}`;
      if (active !== undefined) query = sql`${query} AND q.is_active = ${active === 'true'}`;
      if (search) query = sql`${query} AND (q.question_key ILIKE ${`%${search}%`} OR q.main_text ILIKE ${`%${search}%`})`;
      
      query = sql`${query} ORDER BY q.part, q.display_order, q.id`;
      
      const result = await query;
      
      return res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        debug: {
          env_url_exists: !!process.env.POSTGRES_URL,
          table_exists: true
        }
      });
    }
    
    if (req.method === 'POST') {
      const data = req.body;
      
      // 验证必填字段
      if (!data.question_key || !data.main_text || !data.category_key) {
        return res.status(400).json({ error: '缺少必填字段' });
      }
      
      // 检查question_key是否已存在
      const existing = await sql`SELECT id FROM questions WHERE question_key = ${data.question_key}`;
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: '问题标识已存在' });
      }
      
      const result = await sql`
        INSERT INTO questions (
          question_key, category_key, part, display_order,
          main_text, main_type, main_options, main_placeholder, main_required,
          ai_enabled, ai_prompt,
          match_algorithm, match_config, is_deal_breaker,
          has_preference, preference_text, preference_required, preference_default
        ) VALUES (
          ${data.question_key}, ${data.category_key}, ${data.part || 1}, ${data.display_order || 0},
          ${data.main_text}, ${data.main_type || 'text'}, ${data.main_options ? JSON.stringify(data.main_options) : null}, 
          ${data.main_placeholder || null}, ${data.main_required !== false},
          ${data.ai_enabled || false}, ${data.ai_prompt || null},
          ${data.match_algorithm || 'no_match'}, ${data.match_config ? JSON.stringify(data.match_config) : '{}'},
          ${data.is_deal_breaker || false},
          ${data.has_preference || false}, ${data.preference_text || null},
          ${data.preference_required || false}, ${data.preference_default || 'dontcare'}
        )
        RETURNING *
      `;
      
      return res.json({
        success: true,
        data: result.rows[0],
        message: '创建成功'
      });
    }
    
    return res.status(405).json({ error: '方法不允许' });
    
  } catch (error) {
    console.error('题库API错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      message: error.message,
      code: 'SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}