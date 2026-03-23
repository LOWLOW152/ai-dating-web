import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/admin/questions/[id]/toggle
// 切换题目启用/禁用状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_active 必须是布尔值' },
        { status: 400 }
      );
    }

    await sql.query(
      'UPDATE questions SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [is_active, id]
    );

    return NextResponse.json({
      success: true,
      message: is_active ? '题目已启用' : '题目已禁用',
      is_active,
    });
  } catch (error) {
    console.error('Toggle question status error:', error);
    return NextResponse.json(
      { success: false, error: '切换状态失败' },
      { status: 500 }
    );
  }
}
