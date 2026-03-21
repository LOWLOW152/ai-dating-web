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
      tone_config,
    } = body;

    // 检查必要字段
    if (!category || !type || !question_text || !field_type) {
      console.error('Missing required fields:', { category, type, question_text, field_type });
      return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 });
    }

    console.log('Executing SQL update...');
    
    try {
      // 先检查字段是否存在（兼容旧数据库）
      const columnCheck = await sql.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'use_closing_message'
      `);
      const hasClosingMessageColumn = columnCheck.rows.length > 0;
      
      if (hasClosingMessageColumn) {
        // 检查 tone_config 字段是否存在
        const toneConfigCheck = await sql.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'questions' AND column_name = 'tone_config'
        `);
        const hasToneConfigColumn = toneConfigCheck.rows.length > 0;
        
        if (hasToneConfigColumn) {
          // 两个新字段都存在
          await sql.query(
            `UPDATE questions 
             SET category = $1, type = $2, "order" = $3, question_text = $4, 
                 field_type = $5, ai_prompt = $6, closing_message = $7, max_questions = $8, use_closing_message = $9, hierarchy = $10, is_active = $11, is_required = $12, tone_config = $13,
                 updated_at = NOW()
             WHERE id = $14`,
            [
              category,
              type,
              order,
              question_text,
              field_type,
              ai_prompt,
              closing_message,
              max_questions ?? 3,
              use_closing_message !== false,
              hierarchy ? (typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy)) : null,
              is_active,
              is_required,
              tone_config ? JSON.stringify(tone_config) : null,
              id,
            ]
          );
        } else {
          // 只有 use_closing_message 字段存在
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
              use_closing_message !== false,
              hierarchy ? (typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy)) : null,
              is_active,
              is_required,
              id,
            ]
          );
        }
      } else {
        // 字段不存在，跳过该字段
        await sql.query(
          `UPDATE questions 
           SET category = $1, type = $2, "order" = $3, question_text = $4, 
               field_type = $5, ai_prompt = $6, closing_message = $7, max_questions = $8, hierarchy = $9, is_active = $10, is_required = $11,
               updated_at = NOW()
           WHERE id = $12`,
          [
            category,
            type,
            order,
            question_text,
            field_type,
            ai_prompt,
            closing_message,
            max_questions ?? 3,
            hierarchy ? (typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy)) : null,
            is_active,
            is_required,
            id,
          ]
        );
      }
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