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

    // 3. 定义小数分数相关的错误关键词
    const decimalErrorPatterns = `
      match_error LIKE '%integer%' OR
      match_error LIKE '%decimal%' OR
      match_error LIKE '%.%' OR
      match_error LIKE '%85.00%' OR
      match_error LIKE '%numeric%' OR
      match_error LIKE '%分数%' OR
      match_error LIKE '%type%'
    `;

    // 4. 重置AI评价层因小数分数失败的档案
    const resetAIResult = await sql.query(`
      UPDATE profiles 
      SET ai_evaluation_status = 'pending',
          match_error = NULL,
          updated_at = NOW()
      WHERE ai_evaluation_status = 'failed'
        AND (${decimalErrorPatterns})
      RETURNING id
    `);

    // 5. 重置第一层因小数分数失败的档案
    const resetL1Result = await sql.query(`
      UPDATE profiles 
      SET match_level1_status = 'pending',
          match_level1_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level1_status = 'failed'
        AND (${decimalErrorPatterns})
      RETURNING id
    `);

    // 6. 重置第二层因小数分数失败的档案
    const resetL2Result = await sql.query(`
      UPDATE profiles 
      SET match_level2_status = 'pending',
          match_level2_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level2_status = 'failed'
        AND (${decimalErrorPatterns})
      RETURNING id
    `);

    // 7. 重置第三层因小数分数失败的档案
    const resetL3Result = await sql.query(`
      UPDATE profiles 
      SET match_level3_status = 'pending',
          match_level3_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level3_status = 'failed'
        AND (${decimalErrorPatterns})
      RETURNING id
    `);

    const totalReset = 
      (resetAIResult.rowCount || 0) + 
      (resetL1Result.rowCount || 0) + 
      (resetL2Result.rowCount || 0) + 
      (resetL3Result.rowCount || 0);

    return Response.json({
      success: true,
      data: {
        updatedCandidates: candidatesResult.rowCount || 0,
        updatedProfiles: profilesResult.rowCount || 0,
        resetAI: resetAIResult.rowCount || 0,
        resetL1: resetL1Result.rowCount || 0,
        resetL2: resetL2Result.rowCount || 0,
        resetL3: resetL3Result.rowCount || 0,
        totalReset,
        message: `修复完成：更新 ${candidatesResult.rowCount || 0} 条候选人分数，重置 ${totalReset} 个失败档案（AI:${resetAIResult.rowCount || 0}, L1:${resetL1Result.rowCount || 0}, L2:${resetL2Result.rowCount || 0}, L3:${resetL3Result.rowCount || 0}）`
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
