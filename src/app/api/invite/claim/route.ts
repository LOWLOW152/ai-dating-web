import { sql } from '@/lib/db';
import { verifyCaptcha } from '../captcha/route';

// POST /api/invite/claim
// Body: { phone: string, captcha: string }
// Cookie: captcha_id
export async function POST(request: Request) {
  try {
    const { phone, captcha } = await request.json();
    
    // 1. 验证手机号格式
    if (!phone || typeof phone !== 'string') {
      return Response.json(
        { success: false, error: '请输入手机号' },
        { status: 400 }
      );
    }
    
    const phonePattern = /^1[3-9]\d{9}$/;
    if (!phonePattern.test(phone)) {
      return Response.json(
        { success: false, error: '手机号格式不正确' },
        { status: 400 }
      );
    }
    
    // 2. 验证图形验证码
    const cookieHeader = request.headers.get('cookie') || '';
    const captchaIdMatch = cookieHeader.match(/captcha_id=([^;]+)/);
    const captchaId = captchaIdMatch ? captchaIdMatch[1] : null;
    
    if (!captchaId || !verifyCaptcha(captchaId, captcha)) {
      return Response.json(
        { success: false, error: '验证码错误或已过期', code: 'INVALID_CAPTCHA' },
        { status: 400 }
      );
    }
    
    // 3. 检查该手机号24小时内是否领过
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const existingClaim = await sql.query(
      `SELECT code, created_at FROM invite_codes 
       WHERE phone = $1 AND source = 'user_claim' AND created_at > $2
       ORDER BY created_at DESC LIMIT 1`,
      [phone, twentyFourHoursAgo.toISOString()]
    );
    
    if (existingClaim.rows.length > 0) {
      const lastClaim = existingClaim.rows[0];
      const hoursLeft = Math.ceil(
        (new Date(lastClaim.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)
      );
      return Response.json(
        { 
          success: false, 
          error: `该手机号24小时内已领取过邀请码，请${hoursLeft}小时后再试`,
          code: 'ALREADY_CLAIMED',
          hoursLeft
        },
        { status: 400 }
      );
    }
    
    // 4. 获取每日配额
    const quotaResult = await sql.query(
      "SELECT value FROM system_configs WHERE key = 'daily_invite_quota'"
    );
    const dailyQuota = parseInt(quotaResult.rows[0]?.value || '100');
    
    // 5. 检查今日名额
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await sql.query(
      `SELECT COUNT(*) FROM invite_codes 
       WHERE source = 'user_claim' AND created_at >= $1 AND created_at < $2`,
      [today.toISOString(), tomorrow.toISOString()]
    );
    
    const claimedToday = parseInt(todayCount.rows[0].count);
    const remaining = dailyQuota - claimedToday;
    
    if (remaining <= 0) {
      return Response.json(
        { 
          success: false, 
          error: '今日邀请码已发放完毕，请明天再来',
          code: 'QUOTA_EXHAUSTED'
        },
        { status: 400 }
      );
    }
    
    // 6. 生成邀请码
    const code = await generateUniqueCode();
    
    // 7. 插入数据库（30天过期）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await sql.query(
      `INSERT INTO invite_codes (code, max_uses, expires_at, source, phone, notes, project_usages) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        code, 
        2, // max_uses
        expiresAt.toISOString(), 
        'user_claim', 
        phone, 
        `用户自助领取: ${phone}`,
        JSON.stringify({})
      ]
    );
    
    return Response.json({
      success: true,
      code,
      remaining: remaining - 1,
      total: dailyQuota,
      message: '邀请码领取成功'
    });
    
  } catch (error) {
    console.error('Claim invite code error:', error);
    return Response.json(
      { success: false, error: '领取失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// GET /api/invite/claim - 获取今日剩余名额
export async function GET() {
  try {
    // 获取每日配额
    const quotaResult = await sql.query(
      "SELECT value FROM system_configs WHERE key = 'daily_invite_quota'"
    );
    const dailyQuota = parseInt(quotaResult.rows[0]?.value || '100');
    
    // 统计今日已领取
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await sql.query(
      `SELECT COUNT(*) FROM invite_codes 
       WHERE source = 'user_claim' AND created_at >= $1 AND created_at < $2`,
      [today.toISOString(), tomorrow.toISOString()]
    );
    
    const claimedToday = parseInt(todayCount.rows[0].count);
    
    return Response.json({
      success: true,
      total: dailyQuota,
      claimed: claimedToday,
      remaining: Math.max(0, dailyQuota - claimedToday)
    });
    
  } catch (error) {
    console.error('Get quota error:', error);
    return Response.json(
      { success: false, error: '获取配额失败' },
      { status: 500 }
    );
  }
}

// 生成唯一邀请码
async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // 检查是否已存在
    const existing = await sql.query(
      'SELECT code FROM invite_codes WHERE code = $1',
      [code]
    );
    
    if (existing.rows.length === 0) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('无法生成唯一邀请码');
  }
  
  return code;
}
