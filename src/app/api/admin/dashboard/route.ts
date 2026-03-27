import { sql } from '@/lib/db';

// GET /api/admin/dashboard
export async function GET() {
  try {
    // 1. 邀请码统计
    const inviteCodesRes = await sql.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COUNT(*) FILTER (WHERE status = 'expired') as expired
      FROM invite_codes
    `);

    // 2. 档案统计
    const profilesRes = await sql.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'deleted') as deleted
      FROM profiles
    `);

    // 3. AI评价统计
    const aiEvalRes = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ai_evaluation_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE ai_evaluation_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE ai_evaluation_status = 'failed') as failed
      FROM profiles
    `);

    // 4. 第一层匹配统计
    const level1Res = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE match_level1_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE match_level1_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE match_level1_status = 'failed') as failed
      FROM profiles
      WHERE ai_evaluation_status = 'completed'
    `);

    // 5. 第二层匹配统计
    const level2Res = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE match_level2_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE match_level2_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE match_level2_status = 'failed') as failed
      FROM profiles
      WHERE match_level1_status = 'completed'
    `);

    // 6. 第三层匹配统计
    const level3Res = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE match_level3_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE match_level3_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE match_level3_status = 'failed') as failed
      FROM profiles
      WHERE match_level2_status = 'completed'
    `);

    // 7. 最近活动（最近24小时）
    const recentActivityRes = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_profiles,
        COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '24 hours') as completed_today,
        COUNT(*) FILTER (WHERE match_level1_at > NOW() - INTERVAL '24 hours') as l1_today,
        COUNT(*) FILTER (WHERE match_level2_at > NOW() - INTERVAL '24 hours') as l2_today,
        COUNT(*) FILTER (WHERE match_level3_at > NOW() - INTERVAL '24 hours') as l3_today
      FROM profiles
    `);

    // 8. 失败档案详情（最近20个）
    const failedProfilesRes = await sql.query(`
      SELECT 
        id,
        answers->>'nickname' as nickname,
        COALESCE(ai_evaluation_status = 'failed', false) as ai_failed,
        COALESCE(match_level1_status = 'failed', false) as l1_failed,
        COALESCE(match_level2_status = 'failed', false) as l2_failed,
        COALESCE(match_level3_status = 'failed', false) as l3_failed,
        match_error,
        GREATEST(
          CASE WHEN ai_evaluation_status = 'failed' THEN ai_evaluation_at END,
          CASE WHEN match_level1_status = 'failed' THEN match_level1_at END,
          CASE WHEN match_level2_status = 'failed' THEN match_level2_at END,
          CASE WHEN match_level3_status = 'failed' THEN match_level3_at END
        ) as failed_at
      FROM profiles
      WHERE ai_evaluation_status = 'failed'
         OR match_level1_status = 'failed'
         OR match_level2_status = 'failed'
         OR match_level3_status = 'failed'
      ORDER BY failed_at DESC NULLS LAST
      LIMIT 20
    `);

    return Response.json({
      success: true,
      data: {
        inviteCodes: inviteCodesRes.rows[0],
        profiles: profilesRes.rows[0],
        aiEvaluation: aiEvalRes.rows[0],
        level1: level1Res.rows[0],
        level2: level2Res.rows[0],
        level3: level3Res.rows[0],
        recentActivity: recentActivityRes.rows[0],
        failedProfiles: failedProfilesRes.rows
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知数据库错误';
    return Response.json(
      { 
        success: false, 
        error: '获取统计数据失败',
        detail: errorMessage,
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
      },
      { status: 500 }
    );
  }
}
