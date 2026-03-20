import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql.query('SELECT * FROM questions WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '题目不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get question error:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}