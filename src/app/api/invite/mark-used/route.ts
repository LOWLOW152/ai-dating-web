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

    // 查询当前邀请码 - 尝试查询 project_usages，如果不存在会报错
    let inviteResult;
    let useNewSchema = false;
    
    try {
      inviteResult = await sql.query(
        'SELECT project_usages, use_count, max_uses FROM invite_codes WHERE code = $1',
        [upperCode]
      );
      useNewSchema = true;
    } catch {
      // 字段不存在，使用旧方式查询
      inviteResult = await sql.query(
        'SELECT use_count, max_uses FROM invite_codes WHERE code = $1',
        [upperCode]
      );
      useNewSchema = false;
    }

    if (inviteResult.rows.length === 0) {
      return Response.json({ success: true, message: '无需更新' });
    }

    const invite = inviteResult.rows[0];

    if (useNewSchema) {
      // 新项目方式：使用 project_usages
      const projectUsages = invite.project_usages || {};
      
      projectUsages[project] = {
        used: true,
        used_at: new Date().toISOString(),
        profile_id: profileId || null
      };

      const useCount = Object.values(projectUsages).filter((u) => u && (u as { used?: boolean }).used).length;
      const status = useCount >= invite.max_uses ? 'used' : 'partial';

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
    } else {
      // 旧项目方式：只更新 use_count
      const newUseCount = (invite.use_count || 0) + 1;
      const status = newUseCount >= invite.max_uses ? 'used' : 'partial';
      
      await sql.query(
        `UPDATE invite_codes 
         SET use_count = $1, 
             status = $2,
             used_by = COALESCE(used_by, $3),
             used_at = COALESCE(used_at, NOW())
         WHERE code = $4`,
        [newUseCount, status, profileId, upperCode]
      );

      return Response.json({ 
        success: true, 
        message: '使用记录已更新',
        useCount: newUseCount
      });
    }
    
  } catch (error) {
    console.error('Mark invite used error:', error);
    return Response.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
