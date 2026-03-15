// 临时API：重新排序问题
// 执行后请删除此文件

import { sql } from '../../../lib/db';

const ADMIN_PASSWORD = 'lowlow2025'; // 临时密码，执行后改

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 简单密码验证
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    // Part 1: 基础信息 (1-8)
    await sql`UPDATE questions SET part = 1, display_order = 1 WHERE question_key = 'nickname'`;
    await sql`UPDATE questions SET part = 1, display_order = 2 WHERE question_key = 'gender'`;
    await sql`UPDATE questions SET part = 1, display_order = 3 WHERE question_key = 'birth_year'`;
    await sql`UPDATE questions SET part = 1, display_order = 4 WHERE question_key = 'city'`;
    await sql`UPDATE questions SET part = 1, display_order = 5 WHERE question_key = 'occupation'`;
    await sql`UPDATE questions SET part = 1, display_order = 6 WHERE question_key = 'education'`;
    await sql`UPDATE questions SET part = 1, display_order = 7 WHERE question_key = 'accept_long_distance'`;
    await sql`UPDATE questions SET part = 1, display_order = 8 WHERE question_key = 'age_range'`;

    // Part 2: 兴趣爱好 (9-14)
    await sql`UPDATE questions SET part = 2, display_order = 9 WHERE question_key = 'hobby_type'`;
    await sql`UPDATE questions SET part = 2, display_order = 10 WHERE question_key = 'douyin_content_type'`;
    await sql`UPDATE questions SET part = 2, display_order = 11 WHERE question_key = 'travel_style'`;
    await sql`UPDATE questions SET part = 2, display_order = 12 WHERE question_key = 'social_circle'`;
    await sql`UPDATE questions SET part = 2, display_order = 13 WHERE question_key = 'xingge'`;
    await sql`UPDATE questions SET part = 2, display_order = 14 WHERE question_key = 'xinggetwo'`;

    // Part 3: 生活方式 (15-19)
    await sql`UPDATE questions SET part = 3, display_order = 15 WHERE question_key = 'spending_habit'`;
    await sql`UPDATE questions SET part = 3, display_order = 16 WHERE question_key = 'sleep_schedule'`;
    await sql`UPDATE questions SET part = 3, display_order = 17 WHERE question_key = 'tidiness'`;
    await sql`UPDATE questions SET part = 3, display_order = 18 WHERE question_key = 'smoke_drink'`;
    await sql`UPDATE questions SET part = 3, display_order = 19 WHERE question_key = 'time together'`;

    // Part 3: 情感核心 (延续 20-22)
    await sql`UPDATE questions SET part = 3, display_order = 20 WHERE question_key = 'core_need'`;
    await sql`UPDATE questions SET part = 3, display_order = 21 WHERE question_key = 'deal_breakers'`;
    await sql`UPDATE questions SET part = 3, display_order = 22 WHERE question_key = 'conflict_handling'`;

    // 获取更新后的结果
    const result = await sql`
      SELECT question_key, part, display_order, main_text 
      FROM questions 
      WHERE is_active = true
      ORDER BY part, display_order
    `;

    res.status(200).json({
      success: true,
      message: '问题排序完成',
      questions: result.rows
    });

  } catch (error) {
    console.error('排序失败:', error);
    res.status(500).json({
      error: '排序失败',
      message: error.message
    });
  }
}
