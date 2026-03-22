import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/profile-detail?code=XXX
// 获取单个档案的完整详情

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请码参数'
      }, { status: 400 });
    }
    
    const upperCode = code.toUpperCase();
    
    // 1. 查询档案基本信息
    const profileRes = await sql.query(
      `SELECT id, invite_code, status, answers, ai_evaluation_status, 
              created_at, completed_at, updated_at
       FROM profiles 
       WHERE invite_code = $1`,
      [upperCode]
    );
    
    if (profileRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到该邀请码的档案'
      }, { status: 404 });
    }
    
    const profile = profileRes.rows[0];
    
    // 2. 查询颜值打分
    let beautyScore = null;
    try {
      const beautyRes = await sql.query(
        `SELECT beauty_score, beauty_type, photoshop_level, ai_comment,
          body_shape, skin_quality, symmetry, face_age, hairline, eye_bags, 
          teeth, nose_bridge, photoshop_deduction, scored_at
         FROM beauty_scores 
         WHERE profile_id = $1 
         ORDER BY scored_at DESC LIMIT 1`,
        [profile.id]
      );
      if (beautyRes.rows.length > 0) {
        beautyScore = beautyRes.rows[0];
      }
    } catch {
      // ignore
    }
    
    // 3. 查询AI评价标签
    let aiTags = null;
    try {
      const tagsRes = await sql.query(
        'SELECT tags FROM profile_ai_tags WHERE profile_id = $1',
        [profile.id]
      );
      if (tagsRes.rows.length > 0) {
        aiTags = tagsRes.rows[0].tags;
      }
    } catch {
      // ignore
    }
    
    // 4. 统计答题数
    const answerCount = profile.answers ? Object.keys(profile.answers).length : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          invite_code: profile.invite_code,
          status: profile.status,
          created_at: profile.created_at,
          completed_at: profile.completed_at,
          updated_at: profile.updated_at,
          ai_evaluation_status: profile.ai_evaluation_status,
          answer_count: answerCount
        },
        answers: profile.answers,
        beauty_score: beautyScore,
        ai_tags: aiTags
      }
    });
    
  } catch (error) {
    console.error('Profile detail error:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      error: '服务器错误: ' + errorMsg
    }, { status: 500 });
  }
}
