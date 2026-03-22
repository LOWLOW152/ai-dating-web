import { sql } from '@/lib/db';

// GET /api/admin/profiles
export async function GET() {
  try {
    const result = await sql.query(
      'SELECT id, invite_code, status, tags, created_at FROM profiles ORDER BY created_at DESC'
    );

    return Response.json({
      success: true,
      profiles: result.rows.map(row => {
        // 确保 tags 是数组（处理数据库可能返回字符串的情况）
        let tags = row.tags;
        if (typeof tags === 'string') {
          try {
            tags = JSON.parse(tags);
          } catch {
            tags = [];
          }
        }
        if (!Array.isArray(tags)) {
          tags = [];
        }
        return {
          ...row,
          tags: tags
        };
      })
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return Response.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
