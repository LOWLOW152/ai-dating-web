import { sql } from '@/lib/db';

// POST /api/invite/validate
export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    
    if (!code || typeof code !== 'string') {
      return Response.json(
        { success: false, error: '请输入邀请码' },
        { status: 400 }
      );
    }

    // 检查邀请码是否有效
    // 这里简单实现：检查数据库中是否存在该邀请码，且未被使用
    // 实际项目中可能需要更复杂的验证逻辑
    
    // 先检查是否已存在该档案
    const existing = await sql.query(
      'SELECT id FROM profiles WHERE invite_code = $1',
      [code.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return Response.json(
        { success: false, error: '该邀请码已被使用' },
        { status: 400 }
      );
    }

    // 邀请码有效
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Validate invite error:', error);
    return Response.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
