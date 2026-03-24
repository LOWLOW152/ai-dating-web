import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 获取第一层筛选配置
 * GET /api/admin/match/level1-config?templateId=v1_default
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId') || 'v1_default';

    // 获取当前配置
    const configRes = await sql.query(
      `SELECT l1.*, q.question_text, q.category
       FROM level1_filter_config l1
       JOIN questions q ON l1.question_id = q.id
       WHERE l1.template_id = $1
       ORDER BY q.category, q."order"`,
      [templateId]
    );

    // 获取所有可用于硬性筛选的题目
    const availableQuestionsRes = await sql.query(
      `SELECT id, question_text, category, field_type
       FROM questions
       WHERE category IN ('basic', 'lifestyle', 'values')
       ORDER BY category, "order"`
    );

    return Response.json({
      success: true,
      data: {
        templateId,
        filters: configRes.rows,
        availableQuestions: availableQuestionsRes.rows
      }
    });

  } catch (error) {
    console.error('Get level1 config error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 更新第一层筛选配置
 * PUT /api/admin/match/level1-config
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, filters } = body;

    if (!templateId || !Array.isArray(filters)) {
      return Response.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    // 事务处理
    const client = await sql.query('BEGIN');

    try {
      for (const filter of filters) {
        await sql.query(
          `INSERT INTO level1_filter_config 
           (template_id, question_id, filter_type, filter_rule, is_enabled, params)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (template_id, question_id, filter_rule) DO UPDATE SET
           filter_type = EXCLUDED.filter_type,
           is_enabled = EXCLUDED.is_enabled,
           params = EXCLUDED.params,
           updated_at = NOW()`,
          [
            templateId,
            filter.questionId,
            filter.filterType,
            filter.filterRule,
            filter.isEnabled,
            JSON.stringify(filter.params || {})
          ]
        );
      }

      await sql.query('COMMIT');

      return Response.json({
        success: true,
        message: '配置已更新'
      });

    } catch (error) {
      await sql.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Update level1 config error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 删除筛选配置
 * DELETE /api/admin/match/level1-config
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { success: false, error: '缺少id' },
        { status: 400 }
      );
    }

    await sql.query(
      'DELETE FROM level1_filter_config WHERE id = $1',
      [id]
    );

    return Response.json({
      success: true,
      message: '配置已删除'
    });

  } catch (error) {
    console.error('Delete level1 config error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
