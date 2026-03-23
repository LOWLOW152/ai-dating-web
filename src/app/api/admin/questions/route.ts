import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/admin/questions
// 获取所有题目（包括禁用的），用于管理后台
export async function GET() {
  try {
    const result = await sql.query(
      'SELECT id, "order", question_text, category, type, is_active FROM questions ORDER BY "order" ASC'
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { success: false, error: '获取题目失败' },
      { status: 500 }
    );
  }
}
