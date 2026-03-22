import { sql } from '@/lib/db';

// GET /api/admin/debug-tags?code=XXX
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || 'PQMU4BUK';
    
    // 查询指定档案
    const res = await sql.query(
      `SELECT id, invite_code, tags, 
              pg_typeof(tags) as pg_type,
              jsonb_typeof(tags) as jsonb_type
       FROM profiles 
       WHERE invite_code = $1`,
      [code]
    );
    
    if (res.rows.length === 0) {
      return Response.json({ error: '未找到' }, { status: 404 });
    }
    
    const row = res.rows[0];
    
    return Response.json({
      id: row.id,
      invite_code: row.invite_code,
      tags: row.tags,
      pg_type: row.pg_type,
      jsonb_type: row.jsonb_type,
      tags_is_array: Array.isArray(row.tags),
      tags_json: JSON.stringify(row.tags)
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
