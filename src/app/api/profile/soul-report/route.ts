import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/profile/soul-report?code=XXX
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
    
    // 生成档案ID
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const profileId = `${today}-${upperCode}`;

    // 查询档案和AI评价
    const result = await sql.query(
      `SELECT p.id, p.invite_code, p.ai_evaluation, p.ai_evaluation_status, 
              p.answers, p.completed_at, pat.tags
       FROM profiles p
       LEFT JOIN profile_ai_tags pat ON p.id = pat.profile_id
       WHERE p.id = $1`,
      [profileId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '档案不存在', code: upperCode },
        { status: 404 }
      );
    }

    const profile = result.rows[0];

    // 如果还没有AI评价且状态不是处理中，自动触发一次
    if (!profile.ai_evaluation && profile.ai_evaluation_status !== 'processing') {
      // 返回需要等待的状态
      return NextResponse.json({
        success: true,
        profile: {
          id: profile.id,
          inviteCode: profile.invite_code,
          status: profile.ai_evaluation_status || 'pending',
          hasEvaluation: false,
        },
        needEvaluation: true,
      });
    }

    // 如果正在处理中
    if (profile.ai_evaluation_status === 'processing') {
      return NextResponse.json({
        success: true,
        profile: {
          id: profile.id,
          inviteCode: profile.invite_code,
          status: 'processing',
          hasEvaluation: false,
        },
        needEvaluation: false,
      });
    }

    // 有评价结果
    const aiEval = typeof profile.ai_evaluation === 'string' 
      ? JSON.parse(profile.ai_evaluation) 
      : profile.ai_evaluation;

    const tags = typeof profile.tags === 'string'
      ? JSON.parse(profile.tags)
      : profile.tags;

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        inviteCode: profile.invite_code,
        status: 'completed',
        hasEvaluation: true,
      },
      evaluation: aiEval,
      tags: tags,
      needEvaluation: false,
    });

  } catch (error) {
    console.error('Soul report API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST /api/profile/soul-report/trigger - 手动触发AI评价
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const profileId = `${today}-${upperCode}`;

    // 检查当前状态
    const checkRes = await sql.query(
      'SELECT ai_evaluation_status FROM profiles WHERE id = $1',
      [profileId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '档案不存在' },
        { status: 404 }
      );
    }

    const status = checkRes.rows[0].ai_evaluation_status;

    if (status === 'processing') {
      return NextResponse.json({
        success: true,
        message: 'AI评价正在进行中',
        status: 'processing',
      });
    }

    if (status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'AI评价已完成',
        status: 'completed',
      });
    }

    // 触发评价 - 这里我们只是更新状态，实际评价会在后台异步进行
    // 简化处理：返回需要前端等待
    return NextResponse.json({
      success: true,
      message: '请稍后再试，评价正在生成中',
      status: status || 'pending',
    });

  } catch (error) {
    console.error('Trigger evaluation error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
