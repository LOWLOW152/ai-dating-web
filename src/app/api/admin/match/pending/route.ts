import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 获取待处理的档案列表
 * GET /api/admin/match/pending?level=1|2|3&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = parseInt(searchParams.get('level') || '1');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    let query = '';
    
    switch (level) {
      case 1:
        // 第一层：AI评价已完成，第一层未开始
        query = `
          SELECT id FROM profiles 
          WHERE ai_evaluation_status = 'completed' 
            AND (match_level1_status IS NULL OR match_level1_status = 'pending')
          ORDER BY ai_evaluated_at ASC
          LIMIT ${limit}
        `;
        break;
        
      case 2:
        // 第二层：第一层已完成，第二层未开始
        query = `
          SELECT id FROM profiles 
          WHERE match_level1_status = 'completed' 
            AND (match_level2_status IS NULL OR match_level2_status = 'pending')
          ORDER BY match_level1_at ASC
          LIMIT ${limit}
        `;
        break;
        
      case 3:
        // 第三层：第二层已完成，有候选人通过且未计算第三层
        query = `
          SELECT DISTINCT ON (p.id) p.id 
          FROM profiles p
          JOIN match_candidates mc ON p.id = mc.profile_id
          WHERE p.match_level2_status = 'completed'
            AND (p.match_level3_status IS NULL OR p.match_level3_status = 'pending')
            AND mc.level_2_passed = true
            AND mc.level_3_calculated_at IS NULL
          ORDER BY p.id, mc.level_2_score DESC
          LIMIT ${limit}
        `;
        break;
        
      default:
        return Response.json(
          { success: false, error: '无效的层级' },
          { status: 400 }
        );
    }
    
    const result = await sql.query(query);
    const profiles = result.rows.map(r => r.id);
    
    return Response.json({
      success: true,
      level,
      count: profiles.length,
      profiles
    });

  } catch (error) {
    console.error('Get pending profiles error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
