import { sql } from '../../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { id } = req.query;
  const { is_active } = req.body;

  if (!id) {
    return res.status(400).json({ error: '缺少ID' });
  }

  try {
    const result = await sql`
      UPDATE trait_verify_questions 
      SET is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: '印证题不存在' });
    }

    return res.status(200).json({ 
      question: result[0],
      message: is_active ? '已启用' : '已禁用'
    });
  } catch (err) {
    console.error('切换状态错误:', err);
    return res.status(500).json({ error: '服务器错误', message: err.message });
  }
}
