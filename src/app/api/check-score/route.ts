import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/check-score?code=XXX
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();

    // 查询档案基本信息
    const profileRes = await sql.query(
      `SELECT id, invite_code, status, created_at, completed_at, answers, ai_evaluation_status
       FROM profiles WHERE invite_code = $1`,
      [upperCode]
    );

    if (profileRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到该邀请码的档案' },
        { status: 404 }
      );
    }

    const profile = profileRes.rows[0];

    // 查询颜值打分（兼容可能没有评分的情况）
    let beautyScore = null;
    try {
      const beautyRes = await sql.query(
        `SELECT beauty_score, beauty_type, photoshop_level, ai_comment,
          body_shape, skin_quality, symmetry, face_age, hairline, eye_bags, teeth, nose_bridge, photoshop_deduction,
          created_at as evaluated_at
         FROM beauty_scores WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [profile.id]
      );

      if (beautyRes.rows.length > 0) {
        const row = beautyRes.rows[0];
        beautyScore = {
          beauty_score: parseFloat(row.beauty_score) || 0,
          beauty_type: row.beauty_type || '未知',
          photoshop_level: parseFloat(row.photoshop_level) || 0,
          ai_comment: row.ai_comment || '',
          details: row.body_shape ? {
            body_shape: parseFloat(row.body_shape) || 0,
            skin_quality: parseFloat(row.skin_quality) || 0,
            symmetry: parseFloat(row.symmetry) || 0,
            face_age: parseFloat(row.face_age) || 0,
            hairline: parseFloat(row.hairline) || 0,
            eye_bags: parseFloat(row.eye_bags) || 0,
            teeth: parseFloat(row.teeth) || 0,
            nose_bridge: parseFloat(row.nose_bridge) || 0,
            photoshop_deduction: parseFloat(row.photoshop_deduction) || 0,
          } : undefined,
          evaluated_at: row.evaluated_at,
        };
      }
    } catch (e) {
      console.error('Beauty score query error:', e);
      // 颜值打分查询失败不影响整体返回
    }

    // 查询AI评价标签（兼容可能没有的情况）
    let aiEvaluation = null;
    try {
      const tagsRes = await sql.query(
        `SELECT tags FROM profile_ai_tags WHERE profile_id = $1`,
        [profile.id]
      );
      
      aiEvaluation = profile.ai_evaluation_status ? {
        status: profile.ai_evaluation_status,
        tags: tagsRes.rows[0]?.tags || null,
      } : null;
    } catch (e) {
      console.error('Tags query error:', e);
      // 标签查询失败不影响整体返回
    }

    // 构建结果
    const result = {
      profile: {
        id: profile.id,
        invite_code: profile.invite_code,
        status: profile.status,
        created_at: profile.created_at,
        completed_at: profile.completed_at,
      },
      beautyScore,
      questionnaire: profile.answers ? {
        answers_count: Object.keys(profile.answers).length,
        completed_at: profile.completed_at,
      } : null,
      aiEvaluation,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Check score error:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: '服务器错误: ' + errorMsg },
      { status: 500 }
    );
  }
}
