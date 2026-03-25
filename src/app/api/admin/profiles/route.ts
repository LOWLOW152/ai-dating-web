import { sql } from '@/lib/db';

// GET /api/admin/profiles
export async function GET() {
  try {
    const result = await sql.query(
      `SELECT 
        id, invite_code, status, tags, created_at,
        ai_evaluation_status,
        match_level1_status, match_level2_status, match_level3_status,
        match_level1_at, match_level2_at, match_level3_at,
        match_error,
        level2_max_score
       FROM profiles 
       ORDER BY created_at DESC`
    );

    return Response.json({
      success: true,
      profiles: result.rows.map(row => {
        let tags = row.tags;
        if (!Array.isArray(tags)) {
          tags = [];
        }
        
        return {
          id: row.id,
          invite_code: row.invite_code,
          status: row.status,
          tags: tags,
          created_at: row.created_at,
          // 匹配状态
          ai_evaluation_status: row.ai_evaluation_status,
          match_level1_status: row.match_level1_status,
          match_level2_status: row.match_level2_status,
          match_level3_status: row.match_level3_status,
          match_level1_at: row.match_level1_at,
          match_level2_at: row.match_level2_at,
          match_level3_at: row.match_level3_at,
          match_error: row.match_error,
          level2_max_score: row.level2_max_score
        };
      })
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return Response.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
