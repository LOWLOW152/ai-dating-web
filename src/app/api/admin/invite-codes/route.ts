import { sql } from '@/lib/db';

// GET /api/admin/invite-codes
// Query: { page?: number, limit?: number, status?: 'all' | 'unused' | 'used' | 'expired' }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'all';
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = '';
    const params: string[] = [];
    
    if (status === 'unused') {
      whereClause = "WHERE status = 'unused' AND (expires_at IS NULL OR expires_at > NOW())";
    } else if (status === 'used') {
      whereClause = "WHERE status = 'used'";
    } else if (status === 'expired') {
      whereClause = "WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND status = 'unused'";
    }
    
    // 获取总数
    const countResult = await sql.query(
      `SELECT COUNT(*) FROM invite_codes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // 获取列表 - 兼容旧表结构（可能没有 project_usages 字段）
    let result;
    try {
      result = await sql.query(
        `SELECT 
          code,
          status,
          max_uses,
          use_count,
          project_usages,
          used_by,
          used_at,
          expires_at,
          created_at
        FROM invite_codes 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );
    } catch {
      // 如果 project_usages 字段不存在，使用兼容查询
      result = await sql.query(
        `SELECT 
          code,
          status,
          max_uses,
          use_count,
          used_by,
          used_at,
          expires_at,
          created_at
        FROM invite_codes 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );
    }
    
    return Response.json({
      success: true,
      codes: result.rows.map(row => {
        const projectUsages = row.project_usages || {};
        // 兼容旧数据：如果没有 project_usages，用 use_count 估算
        const useCount = row.use_count || 0;
        const hasProjectUsages = Object.keys(projectUsages).length > 0;
        
        return {
          ...row,
          project_usages: projectUsages,
          // 如果有详细数据用详细数据，否则用 use_count 模拟显示
          beauty_score_used: hasProjectUsages 
            ? projectUsages['beauty-score']?.used || false
            : useCount >= 1, // 旧数据：用过一次就认为颜值打分用了
          questionnaire_used: hasProjectUsages 
            ? projectUsages['questionnaire']?.used || false
            : useCount >= 2, // 旧数据：用过两次就认为问卷也用了
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get invite codes error:', error);
    return Response.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
