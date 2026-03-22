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

    // 查询颜值打分
    const beautyRes = await sql.query(
      `SELECT beauty_score, beauty_type, photoshop_level, ai_comment,
        body_shape, skin_quality, symmetry, face_age, hairline, eye_bags, teeth, nose_bridge, photoshop_deduction,
        created_at as evaluated_at
       FROM beauty_scores WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [profile.id]
    );

    // 查询AI评价标签
    const tagsRes = await sql.query(
      `SELECT tags FROM profile_ai_tags WHERE profile_id = $1`,
      [profile.id]
    );

    // 构建结果
    const result = {
      profile: {
        id: profile.id,
        invite_code: profile.invite_code,
        status: profile.status,
        created_at: profile.created_at,
        completed_at: profile.completed_at,
      },
      beautyScore: beautyRes.rows.length > 0 ? {
        beauty_score: parseFloat(beautyRes.rows[0].beauty_score),
        beauty_type: beautyRes.rows[0].beauty_type,
        photoshop_level: parseFloat(beautyRes.rows[0].photoshop_level),
        ai_comment: beautyRes.rows[0].ai_comment,
        details: beautyRes.rows[0].body_shape ? {
          body_shape: parseFloat(beautyRes.rows[0].body_shape),
          skin_quality: parseFloat(beautyRes.rows[0].skin_quality),
          symmetry: parseFloat(beautyRes.rows[0].symmetry),
          face_age: parseFloat(beautyRes.rows[0].face_age),
          hairline: parseFloat(beautyRes.rows[0].hairline),
          eye_bags: parseFloat(beautyRes.rows[0].eye_bags),
          teeth: parseFloat(beautyRes.rows[0].teeth),
          nose_bridge: parseFloat(beautyRes.rows[0].nose_bridge),
          photoshop_deduction: parseFloat(beautyRes.rows[0].photoshop_deduction),
        } : undefined,
        evaluated_at: beautyRes.rows[0].evaluated_at,
      } : null,
      questionnaire: profile.answers ? {
        answers_count: Object.keys(profile.answers).length,
        completed_at: profile.completed_at,
      } : null,
      aiEvaluation: profile.ai_evaluation_status ? {
        status: profile.ai_evaluation_status,
        tags: tagsRes.rows[0]?.tags || null,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Check score error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
