import { sql } from '@/lib/db';

/**
 * 获取用户的匹配选择信息（后台管理用）
 * GET /api/admin/match/selections?profileId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return Response.json({ success: false, error: '缺少档案ID' }, { status: 400 });
    }

    // 1. 获取用户已选择的信息
    const selectedRes = await sql.query(
      `SELECT 
        s.selected_candidate_id,
        s.selection_score,
        s.selection_report,
        s.status,
        s.remake_count,
        s.max_remake_count,
        s.created_at,
        p.invite_code as selected_invite_code,
        p.answers->>'nickname' as selected_nickname
      FROM user_match_selections s
      JOIN profiles p ON p.id = s.selected_candidate_id
      WHERE s.profile_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [profileId]
    );

    // 2. 获取用户被选择的信息
    const selectedByRes = await sql.query(
      `SELECT 
        s.profile_id as selector_id,
        s.selection_score,
        s.status,
        s.created_at,
        p.invite_code as selector_invite_code,
        p.answers->>'nickname' as selector_nickname
      FROM user_match_selections s
      JOIN profiles p ON p.id = s.profile_id
      WHERE s.selected_candidate_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC`,
      [profileId]
    );

    return Response.json({
      success: true,
      data: {
        profileId,
        // 已选择
        hasSelection: selectedRes.rows.length > 0,
        selection: selectedRes.rows.length > 0 ? {
          candidateId: selectedRes.rows[0].selected_candidate_id,
          inviteCode: selectedRes.rows[0].selected_invite_code,
          nickname: selectedRes.rows[0].selected_nickname,
          score: selectedRes.rows[0].selection_score,
          status: selectedRes.rows[0].status,
          remakeCount: selectedRes.rows[0].remake_count,
          maxRemakeCount: selectedRes.rows[0].max_remake_count,
          createdAt: selectedRes.rows[0].created_at,
          report: selectedRes.rows[0].selection_report
        } : null,
        // 被选择
        selectedByCount: selectedByRes.rows.length,
        selectedBy: selectedByRes.rows.map(row => ({
          selectorId: row.selector_id,
          inviteCode: row.selector_invite_code,
          nickname: row.selector_nickname,
          score: row.selection_score,
          createdAt: row.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Get match selections error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 增加用户重新匹配次数（后台管理用）
 * POST /api/admin/match/selections
 * Body: { profileId, addCount }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profileId, addCount = 1 } = body;

    if (!profileId) {
      return Response.json({ success: false, error: '缺少档案ID' }, { status: 400 });
    }

    // 检查是否有现有选择记录
    const existingRes = await sql.query(
      `SELECT id, max_remake_count 
       FROM user_match_selections 
       WHERE profile_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [profileId]
    );

    if (existingRes.rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: '该用户还没有做出选择' 
      }, { status: 404 });
    }

    const newMaxCount = existingRes.rows[0].max_remake_count + addCount;

    // 更新最大重新匹配次数
    await sql.query(
      `UPDATE user_match_selections 
       SET max_remake_count = $1, updated_at = NOW()
       WHERE id = $2`,
      [newMaxCount, existingRes.rows[0].id]
    );

    return Response.json({
      success: true,
      data: {
        message: `已增加 ${addCount} 次重新匹配机会`,
        newMaxRemakeCount: newMaxCount
      }
    });

  } catch (error) {
    console.error('Update remake count error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
