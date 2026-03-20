import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/profiles/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql.query('SELECT * FROM profiles WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return Response.json(
        { success: false, error: '档案不存在' },
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

// POST /api/profiles - 创建档案
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, answers } = body;
    
    const profileId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${inviteCode}`;
    
    await sql.query(
      `INSERT INTO profiles (id, invite_code, answers, status, created_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [profileId, inviteCode, JSON.stringify(answers)]
    );
    
    await sql.query(
      `UPDATE invite_codes SET status = 'used', used_by = $1, used_at = NOW()
       WHERE code = $2`,
      [profileId, inviteCode]
    );
    
    return Response.json({ success: true, data: { profileId } });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}