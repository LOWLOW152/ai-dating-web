import { sql } from '@/lib/db';

/**
 * 用户提交匹配选择（三选一）
 * POST /api/match/select
 * Body: { inviteCode, candidateId }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviteCode, candidateId } = body;

    if (!inviteCode || !candidateId) {
      return Response.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 1. 查找用户档案
    const profileRes = await sql.query(
      'SELECT id, match_level3_status FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );

    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '邀请码不存在' }, { status: 404 });
    }

    const profileId = profileRes.rows[0].id;

    // 2. 检查是否已有有效选择
    const existingRes = await sql.query(
      `SELECT id, remake_count, max_remake_count 
       FROM user_match_selections 
       WHERE profile_id = $1 AND status = 'active'`,
      [profileId]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      // 检查是否允许重新匹配
      if (existing.remake_count >= existing.max_remake_count) {
        return Response.json({ 
          success: false, 
          error: '您已经做出选择，如需重新匹配请联系管理员' 
        }, { status: 400 });
      }
      // 允许重新匹配，将旧选择标记为 replaced
      await sql.query(
        `UPDATE user_match_selections 
         SET status = 'replaced', updated_at = NOW()
         WHERE id = $1`,
        [existing.id]
      );
    }

    // 3. 验证候选人在Top 3中
    const candidateRes = await sql.query(
      `SELECT level_3_score, level_3_report 
       FROM match_candidates 
       WHERE profile_id = $1 AND candidate_id = $2 AND level_3_score IS NOT NULL`,
      [profileId, candidateId]
    );

    if (candidateRes.rows.length === 0) {
      return Response.json({ success: false, error: '无效的匹配对象' }, { status: 400 });
    }

    const candidate = candidateRes.rows[0];
    let report = candidate.level_3_report;
    if (typeof report === 'string') {
      try {
        report = JSON.parse(report);
      } catch {
        report = null;
      }
    }

    // 4. 创建新选择
    const remakeCount = existingRes.rows.length > 0 ? existingRes.rows[0].remake_count + 1 : 0;
    const maxRemakeCount = existingRes.rows.length > 0 ? existingRes.rows[0].max_remake_count : 0;

    await sql.query(
      `INSERT INTO user_match_selections 
       (profile_id, selected_candidate_id, selection_score, selection_report, status, remake_count, max_remake_count)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
      [
        profileId,
        candidateId,
        candidate.level_3_score,
        JSON.stringify(report),
        remakeCount,
        maxRemakeCount
      ]
    );

    // 5. 获取被选中的候选人信息用于返回
    const selectedRes = await sql.query(
      `SELECT invite_code, answers->>'nickname' as nickname 
       FROM profiles WHERE id = $1`,
      [candidateId]
    );

    return Response.json({
      success: true,
      data: {
        message: '选择成功',
        selected: {
          candidateId,
          inviteCode: selectedRes.rows[0]?.invite_code,
          nickname: selectedRes.rows[0]?.nickname
        },
        remakeCount,
        maxRemakeCount
      }
    });

  } catch (error) {
    console.error('Select match error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
