import { sql } from '@/lib/db';

/**
 * 获取用户的Top 3匹配报告（三选一展示）
 * GET /api/match/my-matches?inviteCode=xxx
 * Cache-bust: v2
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('inviteCode');

    if (!inviteCode) {
      return Response.json({ success: false, error: '缺少邀请码' }, { status: 400 });
    }

    // 1. 查找用户档案（不区分大小写）
    const profileRes = await sql.query(
      'SELECT id, status, match_level3_status FROM profiles WHERE LOWER(invite_code) = LOWER($1)',
      [inviteCode]
    );

    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '邀请码不存在' }, { status: 404 });
    }

    const profile = profileRes.rows[0];

    // 检查是否完成第三层匹配
    if (profile.match_level3_status !== 'completed') {
      // 获取第二层状态，方便诊断
      const level2StatusRes = await sql.query(
        `SELECT 
          COUNT(*) FILTER (WHERE passed_level_1 = true) as level1_passed,
          COUNT(*) FILTER (WHERE level_2_passed = true) as level2_passed,
          COUNT(*) FILTER (WHERE level_2_passed = false) as level2_rejected,
          COUNT(*) FILTER (WHERE level_3_calculated_at IS NOT NULL) as level3_calculated
        FROM match_candidates 
        WHERE profile_id = $1`,
        [profile.id]
      );
      
      const level2Status = level2StatusRes.rows[0];
      
      return Response.json({ 
        success: false, 
        error: '匹配报告尚未生成',
        status: profile.match_level3_status,
        debug: {
          level1Passed: parseInt(level2Status.level1_passed),
          level2Passed: parseInt(level2Status.level2_passed),
          level2Rejected: parseInt(level2Status.level2_rejected),
          level3Calculated: parseInt(level2Status.level3_calculated),
          message: parseInt(level2Status.level2_passed) === 0 
            ? '第二层筛选尚未完成或没有通过候选人，请联系管理员'
            : '第三层匹配计算中，请稍后再试'
        }
      }, { status: 400 });
    }

    // 2. 检查是否已有有效选择
    const selectionRes = await sql.query(
      `SELECT selected_candidate_id, status, remake_count, max_remake_count 
       FROM user_match_selections 
       WHERE profile_id = $1 AND status = 'active'`,
      [profile.id]
    );

    const hasActiveSelection = selectionRes.rows.length > 0;
    const canRemake = hasActiveSelection && 
      selectionRes.rows[0].remake_count < selectionRes.rows[0].max_remake_count;

    // 3. 获取Top 3匹配报告
    // 先从缓存表查，如果没有则从match_candidates实时生成
    let matchesRes = await sql.query(
      `SELECT 
        r.candidate_id,
        r.overall_score,
        r.similarity_score,
        r.complement_score,
        r.strengths_summary,
        r.risks_summary,
        r.full_report,
        p.invite_code as candidate_invite_code,
        p.answers->>'nickname' as candidate_nickname,
        p.answers->>'gender' as candidate_gender,
        p.answers->>'birth_year' as candidate_birth_year,
        p.answers->>'city' as candidate_city,
        bs.beauty_score as beauty_score,
        bs.photoshop_level,
        bs.beauty_type
      FROM user_match_reports r
      JOIN profiles p ON p.id = r.candidate_id
      LEFT JOIN beauty_scores bs ON bs.profile_id = r.candidate_id
      WHERE r.profile_id = $1 AND r.is_top3 = true
      ORDER BY r.rank ASC
      LIMIT 3`,
      [profile.id]
    );

    // 如果缓存表没有，从match_candidates实时查询
    if (matchesRes.rows.length === 0) {
      matchesRes = await sql.query(
        `SELECT 
          mc.candidate_id,
          mc.level_3_score as overall_score,
          mc.level_3_report,
          p.invite_code as candidate_invite_code,
          p.answers->>'nickname' as candidate_nickname,
          p.answers->>'gender' as candidate_gender,
          p.answers->>'birth_year' as candidate_birth_year,
          p.answers->>'city' as candidate_city,
          bs.beauty_score as beauty_score,
          bs.photoshop_level,
          bs.beauty_type
        FROM match_candidates mc
        JOIN profiles p ON p.id = mc.candidate_id
        LEFT JOIN beauty_scores bs ON bs.profile_id = mc.candidate_id
        WHERE mc.profile_id = $1 
          AND mc.level_3_score IS NOT NULL
        ORDER BY mc.level_3_score DESC
        LIMIT 3`,
        [profile.id]
      );
    }

    if (matchesRes.rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: '暂无匹配结果，请稍后再试' 
      }, { status: 404 });
    }

    // 4. 格式化匹配数据
    const matches = matchesRes.rows.map((row, index) => {
      // 解析报告
      let report = row.full_report || row.level_3_report;
      if (typeof report === 'string') {
        try {
          report = JSON.parse(report);
        } catch {
          report = null;
        }
      }

      return {
        rank: index + 1,
        candidateId: row.candidate_id,
        inviteCode: row.candidate_invite_code,
        nickname: row.candidate_nickname || '未知',
        gender: row.candidate_gender,
        age: row.candidate_birth_year ? new Date().getFullYear() - parseInt(row.candidate_birth_year) : null,
        city: row.candidate_city,
        scores: {
          overall: row.overall_score,
          similarity: row.similarity_score || report?.similarity_score,
          complement: row.complement_score || report?.complement_score
        },
        beauty: row.beauty_score ? {
          score: row.beauty_score,
          photoshopLevel: row.photoshop_level,
          type: row.beauty_type
        } : null,
        // AI润色内容
        strengths: row.strengths_summary || (report?.strengths?.join('；')),
        risks: row.risks_summary || (report?.risks?.join('；')),
        advice: report?.advice
      };
    });

    return Response.json({
      success: true,
      data: {
        profileId: profile.id,
        matches,
        hasActiveSelection,
        canRemake,
        remakeCount: hasActiveSelection ? selectionRes.rows[0].remake_count : 0,
        maxRemakeCount: hasActiveSelection ? selectionRes.rows[0].max_remake_count : 0
      }
    });

  } catch (error) {
    console.error('Get my matches error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
