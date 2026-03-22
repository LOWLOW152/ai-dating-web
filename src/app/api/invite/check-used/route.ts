import { sql } from '@/lib/db';

// GET /api/invite/check-used?code=XXX&project=beauty-score
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const project = searchParams.get('project') || 'beauty-score';

    if (!code) {
      return Response.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();

    // 查询邀请码
    const result = await sql.query(
      'SELECT project_usages, use_count, max_uses, status FROM invite_codes WHERE code = $1',
      [upperCode]
    );

    if (result.rows.length === 0) {
      // 邀请码不存在，可能是旧方式生成的，检查 profiles 表
      const profileRes = await sql.query(
        `SELECT id FROM profiles 
         WHERE invite_code = $1 
         AND beauty_score IS NOT NULL`,
        [upperCode]
      );
      
      if (profileRes.rows.length > 0) {
        return Response.json({
          success: true,
          used: true,
          message: '该邀请码已使用过颜值打分功能',
        });
      }
      
      return Response.json({
        success: true,
        used: false,
        message: '邀请码未使用',
      });
    }

    const invite = result.rows[0];
    
    // 检查特定项目是否已使用
    const projectUsages = invite.project_usages || {};
    const projectUsed = projectUsages[project]?.used === true;
    
    // 兼容旧数据：如果没有 project_usages，用 use_count 判断
    const hasProjectUsages = Object.keys(projectUsages).length > 0;
    const used = hasProjectUsages 
      ? projectUsed 
      : (invite.use_count || 0) >= 1;

    return Response.json({
      success: true,
      used,
      project,
      useCount: invite.use_count || 0,
      maxUses: invite.max_uses || 2,
      message: used ? `该邀请码已使用过${project === 'beauty-score' ? '颜值打分' : '此项目'}功能` : '邀请码可用',
    });

  } catch (error) {
    console.error('Check invite used error:', error);
    return Response.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}
