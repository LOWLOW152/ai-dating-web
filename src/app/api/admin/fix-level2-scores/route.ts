import { sql } from '@/lib/db';

/**
 * 修复第二层评分分数类型
 * 将所有小数分数转换为整数，并重置因小数分数而失败的档案状态
 * POST /api/admin/fix-level2-scores
 */
export async function POST() {
  try {
    // 1. 修复 match_candidates 表中的分数
    const candidatesResult = await sql.query(`
      UPDATE match_candidates 
      SET level_2_score = ROUND(level_2_score::numeric)
      WHERE level_2_score IS NOT NULL 
        AND level_2_score::text LIKE '%.%'
      RETURNING candidate_id
    `);

    // 2. 修复 profiles 表中的最高分
    const profilesResult = await sql.query(`
      UPDATE profiles 
      SET level2_max_score = ROUND(level2_max_score::numeric)
      WHERE level2_max_score IS NOT NULL 
        AND level2_max_score::text LIKE '%.%'
      RETURNING id
    `);

    // 3. 重置因小数分数而失败的档案状态
    const resetResult = await sql.query(`
      UPDATE profiles 
      SET match_level2_status = 'pending',
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level2_status = 'failed'
        AND (
          match_error LIKE '%integer%'
          OR match_error LIKE '%decimal%'
          OR match_error LIKE '%.%'
          OR match_error LIKE '%85.00%'
          OR match_error LIKE '%numeric%'
          OR match_error LIKE '%分数%'
        )
      RETURNING id
    `);

    return Response.json({
      success: true,
      data: {
        updatedCandidates: candidatesResult.rowCount || 0,
        updatedProfiles: profilesResult.rowCount || 0,
        resetFailedProfiles: resetResult.rowCount || 0,
        message: `修复完成：更新了 ${candidatesResult.rowCount || 0} 条候选人记录，${profilesResult.rowCount || 0} 条档案记录，重置了 ${resetResult.rowCount || 0} 个失败档案状态`
      }
    });

  } catch (error) {
    console.error('Fix level2 scores error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
