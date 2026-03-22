import { sql } from '@/lib/db';

// POST /api/admin/invite-codes/generate
// Body: { count?: number, expiresInDays?: number, maxUses?: number }
export async function POST(request: Request) {
  try {
    const { count = 10, expiresInDays = 30, maxUses = 2 } = await request.json();
    
    // 生成指定数量的邀请码
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    for (let i = 0; i < Math.min(count, 50); i++) {
      let code = '';
      let attempts = 0;
      let isUnique = false;
      
      // 确保唯一性
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
      
      if (isUnique) {
        // 插入数据库 - 兼容旧表结构
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        
        try {
          // 先尝试带 project_usages 的插入
          await sql.query(
            `INSERT INTO invite_codes (code, max_uses, expires_at, project_usages) 
             VALUES ($1, $2, $3, $4)`,
            [code, maxUses, expiresAt.toISOString(), JSON.stringify({})]
          );
        } catch {
          // 如果失败，使用旧表结构插入
          await sql.query(
            `INSERT INTO invite_codes (code, max_uses, expires_at) 
             VALUES ($1, $2, $3)`,
            [code, maxUses, expiresAt.toISOString()]
          );
        }
        
        codes.push(code);
      }
    }
    
    return Response.json({ 
      success: true, 
      codes,
      generated: codes.length
    });
    
  } catch (error) {
    console.error('Generate invite codes error:', error);
    return Response.json(
      { success: false, error: '生成失败' },
      { status: 500 }
    );
  }
}
