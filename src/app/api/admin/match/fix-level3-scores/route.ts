import { sql } from '@/lib/db';

/**
 * 修复第三层评分缺失的 level_3_score
 * 从 level_3_report JSON 中提取 overall_score 并更新到 level_3_score 字段
 * POST /api/admin/match/fix-level3-scores
 */
export async function POST() {
  try {
    // 1. 找出有 report 但没有 score 的记录
    const missingRes = await sql.query(`
      SELECT profile_id, candidate_id, level_3_report
      FROM match_candidates
      WHERE level_3_report IS NOT NULL
        AND level_3_score IS NULL
    `);

    let fixed = 0;
    const errors: string[] = [];

    // 2. 逐个修复
    for (const row of missingRes.rows) {
      try {
        let report = row.level_3_report;
        
        // 如果是字符串，先解析
        if (typeof report === 'string') {
          report = JSON.parse(report);
        }
        
        // 提取 overall_score
        const score = report?.overall_score || report?.score;
        
        if (score !== undefined && score !== null) {
          await sql.query(`
            UPDATE match_candidates
            SET level_3_score = $1
            WHERE profile_id = $2 AND candidate_id = $3
          `, [Math.round(Number(score)), row.profile_id, row.candidate_id]);
          fixed++;
        } else {
          errors.push(`${row.profile_id}/${row.candidate_id}: 报告中没有分数字段`);
        }
      } catch (err) {
        errors.push(`${row.profile_id}/${row.candidate_id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return Response.json({
      success: true,
      data: {
        found: missingRes.rows.length,
        fixed,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Fix level3 scores error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
