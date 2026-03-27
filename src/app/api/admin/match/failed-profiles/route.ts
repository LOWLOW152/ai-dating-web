import { sql } from '@/lib/db';

/**
 * 检查失败档案详情
 * GET /api/admin/match/failed-profiles
 */
export async function GET() {
  try {
    // 1. 获取所有失败档案
    const failedRes = await sql.query(`
      SELECT 
        id,
        invite_code,
        answers->>'nickname' as nickname,
        ai_evaluation_status,
        match_level1_status,
        match_level2_status,
        match_level3_status,
        match_error,
        level2_max_score,
        created_at,
        updated_at
      FROM profiles
      WHERE ai_evaluation_status = 'failed'
         OR match_level1_status = 'failed'
         OR match_level2_status = 'failed'
         OR match_level3_status = 'failed'
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    // 2. 统计各层失败数量
    const statsRes = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE ai_evaluation_status = 'failed') as ai_failed,
        COUNT(*) FILTER (WHERE match_level1_status = 'failed') as l1_failed,
        COUNT(*) FILTER (WHERE match_level2_status = 'failed') as l2_failed,
        COUNT(*) FILTER (WHERE match_level3_status = 'failed') as l3_failed,
        COUNT(*) FILTER (WHERE match_error LIKE '%integer%' OR match_error LIKE '%decimal%' OR match_error LIKE '%85.00%') as decimal_errors
      FROM profiles
    `);

    // 3. 检查match_candidates表中是否有小数分数
    const decimalScoresRes = await sql.query(`
      SELECT COUNT(*) as count
      FROM match_candidates
      WHERE level_2_score::text LIKE '%.%'
    `);

    // 4. 检查profiles表中是否有小数level2_max_score
    const decimalMaxScoresRes = await sql.query(`
      SELECT COUNT(*) as count
      FROM profiles
      WHERE level2_max_score::text LIKE '%.%'
    `);

    return Response.json({
      success: true,
      data: {
        stats: statsRes.rows[0],
        decimalScoresInCandidates: decimalScoresRes.rows[0].count,
        decimalMaxScoresInProfiles: decimalMaxScoresRes.rows[0].count,
        failedProfiles: failedRes.rows.map(row => ({
          id: row.id,
          invite_code: row.invite_code,
          nickname: row.nickname,
          failed_layers: [
            row.ai_evaluation_status === 'failed' ? 'AI评价' : null,
            row.match_level1_status === 'failed' ? '第一层' : null,
            row.match_level2_status === 'failed' ? '第二层' : null,
            row.match_level3_status === 'failed' ? '第三层' : null,
          ].filter(Boolean),
          error: row.match_error,
          level2_max_score: row.level2_max_score,
          updated_at: row.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Failed profiles check error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
