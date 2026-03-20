import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

// GET /api/admin/profile-templates/:id/weights
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql.query(
      `SELECT 
        id,
        question_id,
        match_enabled,
        match_algorithm,
        match_weight,
        is_veto,
        algorithm_params
      FROM template_weights 
      WHERE template_id = $1`,
      [params.id]
    );
    
    return Response.json({ 
      success: true, 
      data: result.rows.map(row => ({
        ...row,
        algorithm_params: row.algorithm_params || {},
      }))
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/profile-templates/:id/weights
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { weights } = await request.json();
    const templateId = params.id;

    // 开启事务
    await sql.query('BEGIN');

    try {
      // 删除旧配置
      await sql.query(
        'DELETE FROM template_weights WHERE template_id = $1',
        [templateId]
      );

      // 插入新配置
      for (const w of weights) {
        await sql.query(
          `INSERT INTO template_weights 
           (template_id, question_id, match_enabled, match_algorithm, match_weight, is_veto, algorithm_params)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            templateId,
            w.question_id,
            w.match_enabled,
            w.match_algorithm,
            w.match_weight || 10,
            w.is_veto || false,
            JSON.stringify(w.algorithm_params || {}),
          ]
        );
      }

      await sql.query('COMMIT');
      return Response.json({ success: true });
    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Save weights error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
