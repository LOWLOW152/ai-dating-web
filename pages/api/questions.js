import { sql } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { is_active } = req.query;
    
    // 从 questions 表读取，包含偏好题信息
    let query = `
      SELECT 
        q.*,
        qc.name as category_name
      FROM questions q
      LEFT JOIN question_categories qc ON q.category_key = qc.key
    `;
    const conditions = [];
    
    if (is_active === 'true') {
      conditions.push(`q.is_active = true`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY q.part ASC, q.display_order ASC, q.id ASC';
    
    const result = await sql.query(query);
    
    // 转换格式，兼容前端
    const formattedQuestions = result.rows.map(q => ({
      id: q.id,
      question_key: q.question_key,
      category: q.category_key,
      category_name: q.category_name,
      part: q.part,
      display_order: q.display_order,
      question_text: q.main_text,
      question_type: q.main_type,
      options: q.main_options,
      is_required: q.main_required,
      is_ai_monitored: q.ai_enabled,
      ai_prompt: q.ai_prompt,
      // 偏好题信息
      has_preference: q.has_preference,
      preference_text: q.preference_text,
      preference_default: q.preference_default,
      preference_options: q.manual_scoring?.preference_options || null,
      // 评分配置
      manual_scoring: q.manual_scoring,
      match_algorithm: q.match_algorithm,
      is_deal_breaker: q.is_deal_breaker
    }));
    
    res.status(200).json({
      success: true,
      questions: formattedQuestions
    });
  } catch (error) {
    console.error('获取题目失败:', error);
    res.status(500).json({
      success: false,
      error: '获取题目失败',
      message: error.message
    });
  }
}
