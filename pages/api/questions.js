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
    
    let query = 'SELECT * FROM question_bank';
    const conditions = [];
    const params = [];
    
    if (is_active === 'true') {
      conditions.push(`is_active = true`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY part ASC, display_order ASC, id ASC';
    
    const result = await sql.query(query, params);
    
    res.status(200).json({
      success: true,
      questions: result.rows
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
