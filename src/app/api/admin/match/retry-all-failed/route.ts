import { sql } from '@/lib/db';

/**
 * 批量重试所有失败档案
 * 将所有失败状态的档案重置为pending，等待自动任务重新处理
 * POST /api/admin/match/retry-all-failed
 */
export async function POST() {
  try {
    // 1. 重置AI评价失败的档案
    const aiResult = await sql.query(`
      UPDATE profiles 
      SET ai_evaluation_status = 'pending',
          ai_evaluation_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE ai_evaluation_status = 'failed'
      RETURNING id
    `);

    // 2. 重置第一层失败的档案
    const l1Result = await sql.query(`
      UPDATE profiles 
      SET match_level1_status = 'pending',
          match_level1_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level1_status = 'failed'
      RETURNING id
    `);

    // 3. 重置第二层失败的档案
    const l2Result = await sql.query(`
      UPDATE profiles 
      SET match_level2_status = 'pending',
          match_level2_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level2_status = 'failed'
      RETURNING id
    `);

    // 4. 重置第三层失败的档案
    const l3Result = await sql.query(`
      UPDATE profiles 
      SET match_level3_status = 'pending',
          match_level3_at = NULL,
          match_error = NULL,
          updated_at = NOW()
      WHERE match_level3_status = 'failed'
      RETURNING id
    `);

    const total = 
      (aiResult.rowCount || 0) + 
      (l1Result.rowCount || 0) + 
      (l2Result.rowCount || 0) + 
      (l3Result.rowCount || 0);

    return Response.json({
      success: true,
      data: {
        ai: aiResult.rowCount || 0,
        l1: l1Result.rowCount || 0,
        l2: l2Result.rowCount || 0,
        l3: l3Result.rowCount || 0,
        total,
        message: `已重置 ${total} 个失败档案：AI评价 ${aiResult.rowCount || 0} 个，第一层 ${l1Result.rowCount || 0} 个，第二层 ${l2Result.rowCount || 0} 个，第三层 ${l3Result.rowCount || 0} 个。系统将在下次自动任务时重新处理。`
      }
    });

  } catch (error) {
    console.error('Retry all failed error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
