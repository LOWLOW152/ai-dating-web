import { sql } from '@/lib/db';

// POST /api/invite/mark-used
// Body: { code: string, project: 'beauty-score' | 'questionnaire', profileId?: string }
export async function POST(request: Request) {
  try {
    const { code, project, profileId } = await request.json();
    
    if (!code || !project) {
      return Response.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();

    // 查询当前邀请码
    const inviteResult = await sql.query(
      'SELECT project_usages, use_count, max_uses FROM invite_codes WHERE code = $1',
      [upperCode]
    );

    if (inviteResult.rows.length === 0) {
      // 邀请码不存在，可能是旧数据，直接返回成功
      return Response.json({ success: true, message: '无需更新' });
    }

    const invite = inviteResult.rows[0];
    const projectUsages = invite.project_usages || {};

    // 更新该项目使用状态
    projectUsages[project] = {
      used: true,
      used_at: new Date().toISOString(),
      profile_id: profileId || null
    };

    // 计算总使用次数
    const useCount = Object.values(projectUsages).filter((u: any) => u.used).length;
    const status = useCount >= invite.max_uses ? 'used' : 'partial';

    // 更新数据库
    await sql.query(
      `UPDATE invite_codes 
       SET project_usages = $1, 
           use_count = $2, 
           status = $3,
           used_by = COALESCE(used_by, $4),
           used_at = COALESCE(used_at, NOW())
       WHERE code = $5`,
      [JSON.stringify(projectUsages), useCount, status, profileId, upperCode]
    );

    return Response.json({ 
      success: true, 
      message: '使用记录已更新',
      projectUsages,
      useCount
    });
    
  } catch (error) {
    console.error('Mark invite used error:', error);
    return Response.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
