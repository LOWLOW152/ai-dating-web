import { sql } from '@/lib/db';

// GET /api/admin/migrate/level3-score
// 添加 level_3_score 字段到 match_candidates 表
export async function GET() {
  try {
    // 检查字段是否存在
    const checkResult = await sql.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'match_candidates' AND column_name = 'level_3_score'
    `);
    
    if (checkResult.rows.length > 0) {
      return Response.json({
        success: true,
        message: 'level_3_score 字段已存在'
      });
    }
    
    // 添加字段
    await sql.query(`
      ALTER TABLE match_candidates 
      ADD COLUMN level_3_score INTEGER
    `);
    
    return Response.json({
      success: true,
      message: 'level_3_score 字段添加成功'
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
