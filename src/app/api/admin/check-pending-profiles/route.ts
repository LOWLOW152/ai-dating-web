import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/check-pending-profiles
// 查询所有 pending 状态但有答题数据的档案

export async function GET() {
  try {
    // 查询所有 pending 状态的档案
    const res = await sql.query(`
      SELECT 
        id, 
        invite_code, 
        status, 
        created_at, 
        completed_at,
        answers
      FROM profiles 
      WHERE status = 'pending' 
        AND answers IS NOT NULL
      ORDER BY created_at DESC
    `);
    
    // 统计每个档案的答题数
    const profiles = res.rows.map(row => {
      const answerCount = row.answers ? Object.keys(row.answers).length : 0;
      return {
        id: row.id,
        invite_code: row.invite_code,
        status: row.status,
        created_at: row.created_at,
        completed_at: row.completed_at,
        answer_count: answerCount
      };
    }).filter(p => p.answer_count > 0); // 只保留有答题数据的
    
    return NextResponse.json({
      success: true,
      count: profiles.length,
      profiles: profiles
    });
    
  } catch (error) {
    console.error('Check pending profiles error:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      error: '查询失败: ' + errorMsg
    }, { status: 500 });
  }
}
