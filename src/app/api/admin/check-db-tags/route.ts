import { sql } from '@/lib/db';

// GET /api/admin/check-db-tags?code=XXX
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || 'PQMU4BUK';
    
    // 直接查数据库
    const dbRes = await sql.query(
      'SELECT id, invite_code, tags FROM profiles WHERE invite_code = $1',
      [code]
    );
    
    if (dbRes.rows.length === 0) {
      return Response.json({ error: '未找到' }, { status: 404 });
    }
    
    const row = dbRes.rows[0];
    
    return Response.json({
      from: 'database_direct',
      id: row.id,
      invite_code: row.invite_code,
      tags: row.tags,
      tagsType: typeof row.tags,
      isArray: Array.isArray(row.tags)
    });
    
  } catch (error) {
    console.error('Check error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
