import { sql } from '@/lib/db';

// DELETE /api/admin/invite-codes/[code]
export async function DELETE(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    
    if (!code) {
      return Response.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    // 删除邀请码
    await sql.query('DELETE FROM invite_codes WHERE code = $1', [code.toUpperCase()]);

    return Response.json({
      success: true,
      message: '邀请码已删除'
    });

  } catch (error) {
    console.error('Delete invite code error:', error);
    return Response.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/invite-codes/[code]
// Body: { expiresAt: string | null }
export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const { expiresAt } = body;
    
    if (!code) {
      return Response.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    // 更新过期时间
    await sql.query(
      'UPDATE invite_codes SET expires_at = $1 WHERE code = $2',
      [expiresAt || null, code.toUpperCase()]
    );

    return Response.json({
      success: true,
      message: '过期时间已更新',
      expiresAt: expiresAt || null
    });

  } catch (error) {
    console.error('Update invite code error:', error);
    return Response.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
