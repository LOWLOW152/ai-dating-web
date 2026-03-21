import { sql } from '@/lib/db';

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

    // 生成档案ID：日期-邀请码
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const profileId = `${today}-${inviteCode}`;

    // 保存档案
    await sql.query(
      `INSERT INTO profiles (id, invite_code, answers, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
      [profileId, inviteCode.toUpperCase(), JSON.stringify(data)]
    );

    // TODO: 发送企业微信通知
    // await sendWecomNotification(profileId, inviteCode);

    return Response.json({ 
      success: true, 
      profileId,
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
