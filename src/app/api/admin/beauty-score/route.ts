import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/admin/beauty-score - 提交颜值评价
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      profileId, 
      photoshopLevel,  // P图程度 0-10
      beautyType,      // 颜值类型（文字）
      beautyScore,     // 颜值评分 0-10
      aiComment        // 可选评语
    } = body;
    
    if (!profileId || photoshopLevel === undefined || !beautyType || beautyScore === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 验证数值范围
    if (photoshopLevel < 0 || photoshopLevel > 10 || beautyScore < 0 || beautyScore > 10) {
      return NextResponse.json(
        { success: false, error: '评分范围必须是 0-10' },
        { status: 400 }
      );
    }
    
    // 保存评价
    await sql.query(`
      INSERT INTO beauty_scores 
      (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment)
      VALUES ($1, $2, $3, $4, $5)
    `, [profileId, photoshopLevel, beautyType, beautyScore, aiComment || null]);
    
    // 更新档案的最新颜值评分
    await sql.query(`
      UPDATE profiles 
      SET 
        photoshop_level = $1,
        beauty_type = $2,
        beauty_score = $3,
        beauty_evaluated_at = NOW()
      WHERE id = $4
    `, [photoshopLevel, beautyType, beautyScore, profileId]);
    
    return NextResponse.json({ 
      success: true,
      data: {
        photoshop_level: photoshopLevel,
        beauty_type: beautyType,
        beauty_score: beautyScore
      }
    });
    
  } catch (error) {
    console.error('Beauty score error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/beauty-score?profileId=xxx - 获取评价历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: '缺少profileId' },
        { status: 400 }
      );
    }
    
    const result = await sql.query(`
      SELECT 
        id,
        photoshop_level,
        beauty_type,
        beauty_score,
        ai_comment,
        evaluator,
        scored_at
      FROM beauty_scores
      WHERE profile_id = $1
      ORDER BY scored_at DESC
    `, [profileId]);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get beauty scores error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
