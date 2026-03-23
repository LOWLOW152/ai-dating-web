import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/admin/questions
// 获取所有题目（包括禁用的），用于管理后台
export async function GET() {
  try {
    const result = await sql.query(
      'SELECT id, "order", question_text, category, type, is_active FROM questions ORDER BY "order" ASC'
    );
    
    // 确保 is_active 是布尔值
    const questions = result.rows.map(row => ({
      id: row.id,
      order: row.order,
      question_text: row.question_text,
      category: row.category,
      type: row.type,
      is_active: Boolean(row.is_active)
    }));
    
    return NextResponse.json(
      { success: true, data: questions },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { success: false, error: '获取题目失败' },
      { status: 500 }
    );
  }
}
