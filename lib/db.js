import { sql } from '@vercel/postgres';

export { sql };

// 生成随机邀请码 (8位 alphanumeric，去掉容易混淆的字符)
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 0,O,I,L,1
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成今日邀请码（10个）
export async function generateDailyCodes() {
  const today = new Date().toISOString().split('T')[0];
  
  // 检查今天是否已生成
  const existing = await sql`
    SELECT COUNT(*) as count FROM invite_codes 
    WHERE created_at = ${today}
  `;
  
  if (existing.rows[0].count > 0) {
    // 返回今天已存在的码
    const codes = await sql`
      SELECT code, used FROM invite_codes 
      WHERE created_at = ${today}
      ORDER BY code
    `;
    return codes.rows;
  }
  
  // 生成10个新码
  const codes = [];
  for (let i = 0; i < 10; i++) {
    let code;
    let exists = true;
    
    // 确保唯一
    while (exists) {
      code = generateInviteCode();
      const check = await sql`SELECT 1 FROM invite_codes WHERE code = ${code}`;
      exists = check.rows.length > 0;
    }
    
    await sql`
      INSERT INTO invite_codes (code, created_at, used)
      VALUES (${code}, ${today}, false)
    `;
    codes.push({ code, used: false });
  }
  
  return codes;
}

// 验证邀请码
export async function validateInviteCode(code) {
  const upperCode = code?.toUpperCase().trim();
  
  // 管理员专属码
  if (upperCode === 'LOWLOW') {
    return { valid: true, isVip: true, message: '管理员专属码验证通过' };
  }
  
  const result = await sql`
    SELECT * FROM invite_codes 
    WHERE code = ${upperCode}
  `;
  
  if (result.rows.length === 0) {
    return { valid: false, message: '无效的邀请码' };
  }
  
  const record = result.rows[0];
  
  if (record.used) {
    return { valid: false, message: '该邀请码已被使用' };
  }
  
  // 标记为已使用
  await sql`
    UPDATE invite_codes 
    SET used = true, used_at = NOW()
    WHERE code = ${upperCode}
  `;
  
  return { valid: true, message: '验证通过', code: upperCode };
}

// 获取今日剩余邀请码数量
export async function getRemainingCodes() {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await sql`
    SELECT COUNT(*) as count FROM invite_codes 
    WHERE created_at = ${today} AND used = false
  `;
  
  return parseInt(result.rows[0].count);
}

// 获取今日所有邀请码
export async function getTodayCodes() {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await sql`
    SELECT code, used, used_at, profile_id 
    FROM invite_codes 
    WHERE created_at = ${today}
    ORDER BY code
  `;
  
  return result.rows;
}
