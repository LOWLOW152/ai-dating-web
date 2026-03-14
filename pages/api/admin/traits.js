import { sql } from '../../../lib/db';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        // 获取所有特质
        const traits = await sql`
          SELECT * FROM personality_traits 
          ORDER BY id
        `;
        return res.status(200).json({ traits });

      case 'POST':
        // 创建新特质
        const {
          trait_key, trait_name, emoji, description,
          self_label, partner_label, color, is_active
        } = req.body;

        if (!trait_key || !trait_name) {
          return res.status(400).json({ error: '缺少必要字段' });
        }

        try {
          const result = await sql`
            INSERT INTO personality_traits (
              trait_key, trait_name, emoji, description,
              self_label, partner_label, color, is_active
            ) VALUES (
              ${trait_key}, ${trait_name}, ${emoji || '🎯'}, ${description || ''},
              ${self_label || trait_name}, ${partner_label || trait_name}, 
              ${color || '#07c160'}, ${is_active ?? true}
            )
            RETURNING *
          `;
          return res.status(201).json({ trait: result[0] });
        } catch (err) {
          if (err.message?.includes('unique constraint')) {
            return res.status(400).json({ error: '特质标识已存在' });
          }
          throw err;
        }

      case 'PUT':
        // 更新特质
        if (!id) {
          return res.status(400).json({ error: '缺少ID' });
        }

        const updateData = req.body;
        const updateFields = [];
        const updateValues = [];

        Object.entries(updateData).forEach(([key, value]) => {
          if (value !== undefined && key !== 'id') {
            updateFields.push(`${key} = $${updateValues.length + 1}`);
            updateValues.push(value);
          }
        });

        if (updateFields.length === 0) {
          return res.status(400).json({ error: '没有要更新的字段' });
        }

        updateValues.push(id);
        const updateQuery = `
          UPDATE personality_traits 
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${updateValues.length}
          RETURNING *
        `;

        const updated = await sql.unsafe(updateQuery, updateValues);
        return res.status(200).json({ trait: updated[0] });

      case 'DELETE':
        // 删除特质
        if (!id) {
          return res.status(400).json({ error: '缺少ID' });
        }

        await sql`DELETE FROM personality_traits WHERE id = ${id}`;
        return res.status(204).end();

      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (err) {
    console.error('API错误:', err);
    return res.status(500).json({ error: '服务器错误', message: err.message });
  }
}
