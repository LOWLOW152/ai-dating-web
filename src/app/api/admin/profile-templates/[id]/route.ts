import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

// GET /api/admin/profile-templates/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql.query(
      'SELECT * FROM profile_templates WHERE id = $1',
      [params.id]
    );
    
    if (result.rows.length === 0) {
      return Response.json(
        { success: false, error: '资料库不存在' },
        { status: 404 }
      );
    }
    
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
