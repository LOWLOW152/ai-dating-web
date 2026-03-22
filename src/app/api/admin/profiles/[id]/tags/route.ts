import { sql } from '@/lib/db';

// PATCH /api/admin/profiles/[id]/tags
// Body: { tags: string[] }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tags } = body;

    if (!id) {
      return Response.json(
        { success: false, error: '缺少档案ID' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tags)) {
      return Response.json(
        { success: false, error: '标签格式错误' },
        { status: 400 }
      );
    }

    // 更新标签 - 使用 to_jsonb 确保正确格式
    await sql.query(
      'UPDATE profiles SET tags = to_jsonb($1::text[]), updated_at = NOW() WHERE id = $2',
      [tags, id]
    );

    return Response.json({
      success: true,
      message: '标签已更新',
      tags
    });

  } catch (error) {
    console.error('Update tags error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return Response.json(
      { success: false, error: '更新失败: ' + errorMessage },
      { status: 500 }
    );
  }
}
