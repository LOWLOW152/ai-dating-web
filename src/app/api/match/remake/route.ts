import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

/**
 * 重新匹配（需要管理员权限或验证邀请码）
 * POST /api/match/remake
 * Body: { inviteCode }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return Response.json({ success: false, error: '缺少邀请码' }, { status: 400 });
    }

    // 1. 查找用户档案（不区分大小写）
    const profileRes = await sql.query(
      'SELECT id, match_level3_status FROM profiles WHERE LOWER(invite_code) = LOWER($1)',
      [inviteCode]
    );

    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '邀请码不存在' }, { status: 404 });
    }

    const profileId = profileRes.rows[0].id;

    // 2. 检查当前选择状态
    const selectionRes = await sql.query(
      `SELECT remake_count, max_remake_count 
       FROM user_match_selections 
       WHERE profile_id = $1 AND status = 'active'`,
      [profileId]
    );

    if (selectionRes.rows.length === 0) {
      return Response.json({ 
        success: false, 
        error: '您还没有做出选择，无需重新匹配' 
      }, { status: 400 });
    }

    const selection = selectionRes.rows[0];

    // 3. 检查重新匹配次数
    if (selection.remake_count >= selection.max_remake_count) {
      return Response.json({ 
        success: false, 
        error: '重新匹配次数已用完，请联系管理员' 
      }, { status: 403 });
    }

    // 4. 删除当前的第三层报告缓存，触发重新计算
    await sql.query(
      'DELETE FROM user_match_reports WHERE profile_id = $1',
      [profileId]
    );

    // 4.5 重置候选人的第三层计算状态，允许重新分析
    await sql.query(
      `UPDATE match_candidates 
       SET level_3_calculated_at = NULL, 
           level_3_score = NULL, 
           level_3_report = NULL
       WHERE profile_id = $1`,
      [profileId]
    );

    // 4.6 删除旧的 level3_reports
    await sql.query(
      'DELETE FROM level3_reports WHERE profile_id = $1',
      [profileId]
    );

    // 4.7 检查第二层是否有通过的候选人
    const level2Res = await sql.query(
      `SELECT COUNT(*) as count 
       FROM match_candidates 
       WHERE profile_id = $1 AND level_2_passed = true`,
      [profileId]
    );
    
    const hasLevel2Candidates = parseInt(level2Res.rows[0].count) > 0;

    // 5. 重置第三层状态（让自动化任务重新处理）
    await sql.query(
      `UPDATE profiles 
       SET match_level3_status = 'pending',
           match_level3_at = NULL
       WHERE id = $1`,
      [profileId]
    );

    // 6. 将当前选择标记为 replaced，同时增加 remake_count
    await sql.query(
      `UPDATE user_match_selections 
       SET status = 'replaced', updated_at = NOW(), remake_count = remake_count + 1
       WHERE profile_id = $1 AND status = 'active'`,
      [profileId]
    );

    // 7. 触发第三层重新计算（异步，不等待结果）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ai-dating.top';
    
    // 使用 setImmediate 确保在响应发送后再触发
    setTimeout(async () => {
      try {
        console.log('[Remake] Triggering level3-calculate for profile:', profileId);
        const level3Res = await fetch(
          `${siteUrl}/api/admin/match/level3-calculate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId })
          }
        );
        const level3Result = await level3Res.json();
        console.log('[Remake] level3-calculate result:', JSON.stringify(level3Result));
      } catch (err) {
        console.error('[Remake] level3-calculate error:', err);
      }
    }, 100);

    return Response.json({
      success: true,
      data: {
        message: hasLevel2Candidates 
          ? '重新匹配已启动，请稍后再查看结果（约需30秒）' 
          : '重新匹配已启动，但第二层筛选尚未完成，请先完成第二层筛选',
        remakeCount: selection.remake_count + 1,
        maxRemakeCount: selection.max_remake_count,
        hasLevel2Candidates
      }
    });

  } catch (error) {
    console.error('Remake match error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
