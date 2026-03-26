import { sql } from '@/lib/db';

// POST /api/admin/questions/reorder
export async function POST(request: Request) {
  try {
    const { updates } = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json(
        { success: false, error: '缺少更新数据' },
        { status: 400 }
      );
    }

    // 批量更新order
    for (const update of updates) {
      await sql.query(
        'UPDATE questions SET "order" = $1, updated_at = NOW() WHERE id = $2',
        [update.order, update.id]
      );
    }

    return Response.json({
      success: true,
      message: `已更新 ${updates.length} 道题目的顺序`
    });

  } catch (error) {
    console.error('Reorder error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
