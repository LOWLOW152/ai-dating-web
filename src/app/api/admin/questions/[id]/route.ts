import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('PUT /api/admin/questions/[id] called, id:', id);
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json({ success: false, error: '请求体解析失败: ' + String(e) }, { status: 400 });
    }
    
    console.log('Update question request:', { id, body });
    
    const {
      category,
      type,
      order,
      question_text,
      field_type,
      ai_prompt,
      closing_message,
      max_questions,
      use_closing_message,
      hierarchy,
      is_active,
      is_required,
    } = body;

    // 检查必要字段
    if (!category || !type || !question_text || !field_type) {
      console.error('Missing required fields:', { category, type, question_text, field_type });
      return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 });
    }

    console.log('Executing SQL update...');
    
    try {
      await sql.query(
        `UPDATE questions 
         SET category = $1, type = $2, "order" = $3, question_text = $4, 
             field_type = $5, ai_prompt = $6, closing_message = $7, max_questions = $8, use_closing_message = $9, hierarchy = $10, is_active = $11, is_required = $12,
             updated_at = NOW()
         WHERE id = $13`,
        [
          category,
          type,
          order,
          question_text,
          field_type,
          ai_prompt,
          closing_message,
          max_questions ?? 3,
          use_closing_message !== false, // 默认开启
          hierarchy ? (typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy)) : null,
          is_active,
          is_required,
          id,
        ]
      );
      console.log('SQL update successful');
    } catch (sqlErr) {
      console.error('SQL update failed:', sqlErr);
      return NextResponse.json({ success: false, error: '数据库更新失败: ' + (sqlErr instanceof Error ? sqlErr.message : String(sqlErr)) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json({ success: false, error: '更新失败: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先检查是否有模板在使用这道题
    const inUse = await sql.query(
      'SELECT template_id FROM template_weights WHERE question_id = $1 LIMIT 1',
      [id]
    );
    
    if (inUse.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该题目正在被资料库使用，无法删除' },
        { status: 400 }
      );
    }

    await sql.query('DELETE FROM questions WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}