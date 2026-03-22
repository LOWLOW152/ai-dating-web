import { sql } from '@/lib/db';

// GET /api/admin/profiles
export async function GET() {
  try {
    const result = await sql.query(
      'SELECT id, invite_code, status, tags, created_at FROM profiles ORDER BY created_at DESC'
    );

    return Response.json({
      success: true,
      profiles: result.rows.map(row => ({
        ...row,
        tags: row.tags || []
      }))
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return Response.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
