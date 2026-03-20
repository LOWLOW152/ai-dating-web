import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    console.log('Update question request:', { id: params.id, body });
    
    const {
      category,
      type,
      order,
      question_text,
      field_type,
      ai_prompt,
      closing_message,
      hierarchy,
      is_active,
      is_required,
    } = body;

    await sql.query(
      `UPDATE questions 
       SET category = $1, type = $2, "order" = $3, question_text = $4, 
           field_type = $5, ai_prompt = $6, closing_message = $7, hierarchy = $8, is_active = $9, is_required = $10,
           updated_at = NOW()
       WHERE id = $11`,
      [
        category,
        type,
        order,
        question_text,
        field_type,
        ai_prompt,
        closing_message,
        hierarchy ? (typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy)) : null,
        is_active,
        is_required,
        params.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json({ success: false, error: '更新失败: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 先检查是否有模板在使用这道题
    const inUse = await sql.query(
      'SELECT template_id FROM template_weights WHERE question_id = $1 LIMIT 1',
      [params.id]
    );
    
    if (inUse.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该题目正在被资料库使用，无法删除' },
        { status: 400 }
      );
    }

    await sql.query('DELETE FROM questions WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}