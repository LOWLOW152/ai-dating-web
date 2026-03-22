import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/complete-profile?code=XXX
// 手动将档案标记为完成（修复答题完成但状态未更新的问题）

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
    
    // 1. 查询当前档案
    const profileRes = await sql.query(
      'SELECT id, answers, status, completed_at FROM profiles WHERE invite_code = $1',
      [code.toUpperCase()]
    );
    
    if (profileRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '档案不存在'
      }, { status: 404 });
    }
    
    const profile = profileRes.rows[0];
    
    // 2. 检查是否有答题数据
    if (!profile.answers || Object.keys(profile.answers).length === 0) {
      return NextResponse.json({
        success: false,
        error: '档案没有答题数据，无法完成'
      }, { status: 400 });
    }
    
    const answerCount = Object.keys(profile.answers).length;
    
    // 3. 更新档案为完成状态
    await sql.query(
      `UPDATE profiles 
       SET status = 'completed', 
           completed_at = COALESCE(completed_at, NOW()),
           updated_at = NOW()
       WHERE invite_code = $1`,
      [code.toUpperCase()]
    );
    
    // 4. 更新邀请码状态
    await sql.query(
      `UPDATE invite_codes 
       SET used = true, 
           used_at = COALESCE(used_at, NOW())
       WHERE code = $1`,
      [code.toUpperCase()]
    );
    
    return NextResponse.json({
      success: true,
      message: '档案已修复为完成状态',
      data: {
        profileId: profile.id,
        inviteCode: code.toUpperCase(),
        answerCount: answerCount,
        previousStatus: profile.status,
        newStatus: 'completed'
      }
    });
    
  } catch (error) {
    console.error('Complete profile error:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      error: '服务器错误: ' + errorMsg
    }, { status: 500 });
  }
}
