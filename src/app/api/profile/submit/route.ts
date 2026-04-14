import { sql } from '@/lib/db';
import { evaluateProfile, saveEvaluationResult } from '@/lib/evaluation';

// POST /api/profile/submit
export async function POST(request: Request) {
  try {
    const { inviteCode, data } = await request.json();
    
    if (!inviteCode || !data) {
      return Response.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const upperCode = inviteCode.toUpperCase();

    // 生成档案ID：日期-邀请码
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const profileId = `${today}-${upperCode}`;

    // 保存档案（使用 UPSERT：存在则更新，不存在则插入）
    await sql.query(
      `INSERT INTO profiles (id, invite_code, answers, status, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, 'completed', NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         answers = EXCLUDED.answers,
         status = 'completed',
         updated_at = NOW(),
         completed_at = NOW()`,
      [profileId, upperCode, JSON.stringify(data)]
    );

    // 标记邀请码在问卷项目中已使用
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ai-dating.top'}/api/invite/mark-used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: upperCode, project: 'questionnaire', profileId })
      });
    } catch (e) {
      console.log('邀请码状态更新失败（非关键错误）:', e);
    }

    // 自动触发AI评价（同步，但设置超时保护）
    let evaluationResult = null;
    let evaluationError = null;
    try {
      const profile = { id: profileId, invite_code: upperCode, answers: data, ai_summary: null };
      const evalRes = await evaluateProfile(profile);
      const saveRes = await saveEvaluationResult(profileId, evalRes);
      
      if (saveRes.success) {
        evaluationResult = evalRes.result;
      } else {
        evaluationError = saveRes.error;
      }
    } catch (evalErr) {
      console.error('自动AI评价失败:', evalErr);
      evaluationError = evalErr instanceof Error ? evalErr.message : '未知错误';
      await sql.query(
        `UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2`,
        ['failed', profileId]
      );
      await sql.query(
        `INSERT INTO evaluation_logs (profile_id, status, error_message)
         VALUES ($1, $2, $3)`,
        [profileId, 'failed', evaluationError]
      );
    }

    return Response.json({ 
      success: true, 
      profileId,
      evaluation: evaluationResult ? { success: true, data: evaluationResult } : { success: false, error: evaluationError },
      message: '档案提交成功' 
    });
    
  } catch (error) {
    console.error('Submit profile error:', error);
    return Response.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}
