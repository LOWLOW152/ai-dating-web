import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 获取第一层筛选后的候选人列表
 * GET /api/admin/match/level1-candidates?profileId=xxx&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!profileId) {
      return Response.json(
        { success: false, error: '缺少profileId' },
        { status: 400 }
      );
    }

    // 检查档案是否已完成第一层计算
    const profileRes = await sql.query(
      'SELECT level1_calculated_at FROM profiles WHERE id = $1',
      [profileId]
    );

    if (profileRes.rows.length === 0) {
      return Response.json(
        { success: false, error: '档案不存在' },
        { status: 404 }
      );
    }

    const { level1_calculated_at } = profileRes.rows[0];

    // 获取通过的候选人（包含基础信息）
    const candidatesRes = await sql.query(
      `SELECT 
        mc.candidate_id,
        mc.calculated_at,
        p.invite_code,
        p.answers->>'nickname' as nickname,
        p.answers->>'gender' as gender,
        p.answers->>'birth_year' as birth_year,
        p.answers->>'city' as city,
        p.answers->>'education' as education
       FROM match_candidates mc
       JOIN profiles p ON mc.candidate_id = p.id
       WHERE mc.profile_id = $1 AND mc.passed_level_1 = true
       ORDER BY mc.calculated_at DESC
       LIMIT $2`,
      [profileId, limit]
    );

    // 获取统计信息
    const statsRes = await sql.query(
      `SELECT 
        COUNT(*) FILTER (WHERE passed_level_1 = true) as passed,
        COUNT(*) FILTER (WHERE passed_level_1 = false) as failed,
        COUNT(*) FILTER (WHERE passed_level_1 = false AND failed_reason = 'gender') as failed_gender,
        COUNT(*) FILTER (WHERE passed_level_1 = false AND failed_reason = 'age') as failed_age,
        COUNT(*) FILTER (WHERE passed_level_1 = false AND failed_reason = 'location') as failed_location,
        COUNT(*) FILTER (WHERE passed_level_1 = false AND failed_reason = 'education') as failed_education,
        COUNT(*) FILTER (WHERE passed_level_1 = false AND failed_reason = 'diet') as failed_diet
       FROM match_candidates
       WHERE profile_id = $1`,
      [profileId]
    );

    return Response.json({
      success: true,
      data: {
        profileId,
        calculated: !!level1_calculated_at,
        calculatedAt: level1_calculated_at,
        candidates: candidatesRes.rows.map(row => ({
          id: row.candidate_id,
          inviteCode: row.invite_code,
          nickname: row.nickname,
          gender: row.gender,
          birthYear: row.birth_year,
          city: row.city,
          education: row.education,
          matchedAt: row.calculated_at
        })),
        stats: statsRes.rows[0]
      }
    });

  } catch (error) {
    console.error('Get level1 candidates error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
