import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

/**
 * 临时修复API：修复user_match_selections唯一约束问题
 * POST /api/admin/fix-selection-constraint
 * 只允许管理员访问（生产环境用密码或IP白名单）
 */
export async function POST(request: NextRequest) {
  // 简单验证：检查是否有admin标识或特定header（生产环境建议更严格）
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader !== 'fix-constraint-2026') {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 删除旧约束
    await sql.query(
      'ALTER TABLE user_match_selections DROP CONSTRAINT IF EXISTS user_match_selections_profile_id_status_key'
    );

    // 2. 删除旧索引（如果存在）
    await sql.query('DROP INDEX IF EXISTS idx_unique_active_selection');

    // 3. 创建部分唯一索引，只限制 active 状态唯一
    await sql.query(
      "CREATE UNIQUE INDEX idx_unique_active_selection ON user_match_selections(profile_id) WHERE status = 'active'"
    );

    // 4. 添加普通索引方便查询
    await sql.query('DROP INDEX IF EXISTS idx_ums_profile_status');
    await sql.query(
      'CREATE INDEX idx_ums_profile_status ON user_match_selections(profile_id, status)'
    );

    return Response.json({
      success: true,
      message: '约束修复完成，现在可以多次重新匹配了',
      details: {
        removed: 'user_match_selections_profile_id_status_key',
        added: 'idx_unique_active_selection (partial unique on active)'
      }
    });
  } catch (error) {
    console.error('Fix constraint error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
