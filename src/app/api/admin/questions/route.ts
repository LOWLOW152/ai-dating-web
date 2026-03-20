import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      category,
      type,
      order,
      question_text,
      field_type,
      validation,
      options,
      ai_prompt,
      closing_message,
      hierarchy,
      is_active,
      is_required,
    } = body;

    // 检查ID是否已存在
    const existing = await sql.query('SELECT id FROM questions WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: '题目ID已存在' }, { status: 400 });
    }

    await sql.query(
      `INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, closing_message, hierarchy, is_active, is_required)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        category,
        type,
        order,
        question_text,
        field_type,
        JSON.stringify(validation || {}),
        options ? JSON.stringify(options) : null,
        ai_prompt,
        closing_message,
        hierarchy ? JSON.stringify(hierarchy) : null,
        is_active,
        is_required,
      ]
    );

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}