import { sql } from '@/lib/db';

// POST /api/invite/validate
// Body: { code: string, project: 'beauty-score' | 'questionnaire' }
export async function POST(request: Request) {
  try {
    const { code, project = 'questionnaire' } = await request.json();
    
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

    const upperCode = code.toUpperCase();

    // 查询邀请码
    const inviteResult = await sql.query(
      `SELECT code, status, max_uses, use_count, project_usages, expires_at 
       FROM invite_codes WHERE code = $1`,
      [upperCode]
    );

    // 邀请码不存在 - 也允许通过（兼容旧逻辑，只检查 profiles）
    if (inviteResult.rows.length === 0) {
      // 检查是否已有档案
      const existing = await sql.query(
        'SELECT id FROM profiles WHERE invite_code = $1',
        [upperCode]
      );
      
      return Response.json({ 
        success: true, 
        exists: existing.rows.length > 0,
        valid: true,
        message: '邀请码可用'
      });
    }

    const invite = inviteResult.rows[0];
    const projectUsages = invite.project_usages || {};

    // 检查是否过期
    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      return Response.json(
        { success: false, error: '邀请码已过期' },
        { status: 400 }
      );
    }

    // 检查该项目的使用状态
    const projectUsage = projectUsages[project];
    if (projectUsage?.used) {
      // 该项目已使用，但可能已有档案（允许继续访问）
      const existing = await sql.query(
        'SELECT id FROM profiles WHERE invite_code = $1',
        [upperCode]
      );
      
      if (existing.rows.length > 0) {
        return Response.json({ 
          success: true, 
          exists: true,
          valid: true,
          profileId: existing.rows[0].id,
          message: '该项目已使用过，继续访问现有档案'
        });
      }
      
      return Response.json(
        { success: false, error: '该邀请码在此项目中已使用' },
        { status: 400 }
      );
    }

    // 检查总使用次数
    if (invite.use_count >= invite.max_uses) {
      return Response.json(
        { success: false, error: '邀请码使用次数已达上限' },
        { status: 400 }
      );
    }

    // 邀请码有效
    return Response.json({ 
      success: true, 
      exists: false,
      valid: true,
      code: upperCode,
      message: '邀请码验证成功'
    });
    
  } catch (error) {
    console.error('Validate invite error:', error);
    return Response.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
