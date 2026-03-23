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
        // pg 库会自动解析 jsonb 为 JavaScript 对象
        let tags = row.tags;
        
        // 防御性处理：如果不是数组，设为空数组
        if (!Array.isArray(tags)) {
          tags = [];
        }
        
        return {
          id: row.id,
          invite_code: row.invite_code,
          status: row.status,
          tags: tags,
          created_at: row.created_at
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
