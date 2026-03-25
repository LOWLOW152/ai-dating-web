import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 匹配调试 API
 * 查看档案的详细匹配状态
 * GET /api/admin/match/debug?profileId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      // 返回整体统计
      const statsRes = await sql.query(`
        SELECT 
          COUNT(*) FILTER (WHERE match_level2_status = 'completed') as l2_completed,
          COUNT(*) FILTER (WHERE match_level2_status = 'completed' AND level2_max_score > 0) as l2_with_score,
          COUNT(*) FILTER (WHERE match_level3_status = 'completed') as l3_completed
        FROM profiles
        WHERE ai_evaluation_status = 'completed'
      `);
      
      const candidatesRes = await sql.query(`
        SELECT 
          COUNT(DISTINCT profile_id) as profiles_with_candidates,
          COUNT(*) FILTER (WHERE passed_level_1 = true) as l1_passed,
          COUNT(*) FILTER (WHERE level_2_score IS NOT NULL) as l2_scored,
          COUNT(*) FILTER (WHERE level_2_passed = true) as l2_passed,
          COUNT(*) FILTER (WHERE level_3_calculated_at IS NOT NULL) as l3_calculated
        FROM match_candidates
      `);
      
      return Response.json({
        success: true,
        summary: {
          profiles: statsRes.rows[0],
          candidates: candidatesRes.rows[0]
        }
      });
    }

    // 获取单个档案详情
    const profileRes = await sql.query(`
      SELECT 
        id, invite_code, status,
        ai_evaluation_status,
        match_level1_status, match_level1_at,
        match_level2_status, match_level2_at, level2_max_score,
        match_level3_status, match_level3_at
      FROM profiles
      WHERE id = $1
    `, [profileId]);

    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '档案不存在' }, { status: 404 });
    }

    const profile = profileRes.rows[0];

    // 获取候选人详情
    const candidatesRes = await sql.query(`
      SELECT 
        mc.candidate_id,
        p.invite_code as candidate_code,
        mc.passed_level_1,
        mc.failed_reason as l1_failed_reason,
        mc.level_2_score,
        mc.level_2_passed,
        mc.level_2_calculated_at,
        mc.level_3_calculated_at
      FROM match_candidates mc
      JOIN profiles p ON mc.candidate_id = p.id
      WHERE mc.profile_id = $1
      ORDER BY mc.level_2_score DESC NULLS LAST
    `, [profileId]);

    // 获取第三层报告
    const reportsRes = await sql.query(`
      SELECT 
        candidate_id, overall_score, created_at
      FROM level3_reports
      WHERE profile_id = $1
    `, [profileId]);

    return Response.json({
      success: true,
      profile,
      candidates: candidatesRes.rows,
      level3Reports: reportsRes.rows,
      summary: {
        totalCandidates: candidatesRes.rows.length,
        l1Passed: candidatesRes.rows.filter(r => r.passed_level_1).length,
        l2Scored: candidatesRes.rows.filter(r => r.level_2_score !== null).length,
        l2Passed: candidatesRes.rows.filter(r => r.level_2_passed).length,
        l3Calculated: reportsRes.rows.length
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
