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

    // 检查邀请码格式（8位字母数字）
    const codePattern = /^[A-Z0-9]{8}$/;
    if (!codePattern.test(code.toUpperCase())) {
      return Response.json(
        { success: false, error: '邀请码格式不正确（8位字母数字）' },
        { status: 400 }
      );
    }

    // 检查是否已存在该档案
    const existing = await sql.query(
      'SELECT id FROM profiles WHERE invite_code = $1',
      [code.toUpperCase()]
    );

    // 如果档案已存在，也允许通过（用于颜值打分或继续答题）
    // 如果档案不存在，首次使用，也允许
    return Response.json({ success: true, exists: existing.rows.length > 0 });
    
  } catch (error) {
    console.error('Validate invite error:', error);
    return Response.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
