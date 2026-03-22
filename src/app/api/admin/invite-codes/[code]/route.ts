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
// Body: { expiresAt?: string | null, notes?: string }
export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await request.json();
    const { expiresAt, notes } = body;
    
    if (!code) {
      return Response.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();
    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex}`);
      values.push(expiresAt || null);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return Response.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    values.push(upperCode);

    await sql.query(
      `UPDATE invite_codes SET ${updates.join(', ')} WHERE code = $${paramIndex}`,
      values
    );

    return Response.json({
      success: true,
      message: '已更新'
    });

  } catch (error) {
    console.error('Update invite code error:', error);
    return Response.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
