import { sql } from '@/lib/db';

// GET /api/admin/profiles
export async function GET() {
  try {
    const result = await sql.query(
      `SELECT 
        p.id, p.invite_code, p.status, p.tags, p.created_at,
        p.ai_evaluation_status,
        p.match_level1_status, p.match_level2_status, p.match_level3_status,
        p.match_level1_at, p.match_level2_at, p.match_level3_at,
        p.match_error,
        p.level2_max_score,
        COALESCE(mc_stats.total_candidates, 0) as l2_total_candidates,
        COALESCE(mc_stats.scored_candidates, 0) as l2_scored_candidates,
        COALESCE(mc_stats.passed_candidates, 0) as l2_passed_candidates
       FROM profiles p
       LEFT JOIN (
         SELECT 
           profile_id,
           COUNT(*) as total_candidates,
           COUNT(*) FILTER (WHERE level_2_score IS NOT NULL) as scored_candidates,
           COUNT(*) FILTER (WHERE level_2_passed = true) as passed_candidates
         FROM match_candidates
         WHERE passed_level_1 = true
         GROUP BY profile_id
       ) mc_stats ON mc_stats.profile_id = p.id
       ORDER BY p.created_at DESC`
    );

    return Response.json({
      success: true,
      profiles: result.rows.map(row => {
        let tags = row.tags;
        if (!Array.isArray(tags)) {
          tags = [];
        }
        
        // 计算第二层评分成功率
        const l2SuccessRate = row.l2_total_candidates > 0 
          ? Math.round((row.l2_scored_candidates / row.l2_total_candidates) * 100)
          : null;
        
        return {
          id: row.id,
          invite_code: row.invite_code,
          status: row.status,
          tags: tags,
          created_at: row.created_at,
          // 匹配状态
          ai_evaluation_status: row.ai_evaluation_status,
          match_level1_status: row.match_level1_status,
          match_level2_status: row.match_level2_status,
          match_level3_status: row.match_level3_status,
          match_level1_at: row.match_level1_at,
          match_level2_at: row.match_level2_at,
          match_level3_at: row.match_level3_at,
          match_error: row.match_error,
          level2_max_score: row.level2_max_score,
          // 第二层统计
          l2_total_candidates: row.l2_total_candidates,
          l2_scored_candidates: row.l2_scored_candidates,
          l2_passed_candidates: row.l2_passed_candidates,
          l2_success_rate: l2SuccessRate
        };
      })
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return Response.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
