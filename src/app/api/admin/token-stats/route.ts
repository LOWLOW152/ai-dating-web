import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/token-stats - 获取Token使用统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // 总体统计
    const overallRes = await sql.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(request_tokens) as total_request_tokens,
        SUM(response_tokens) as total_response_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_cny) as total_cost
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '${days} days'
    `);
    
    // 每日统计
    const dailyRes = await sql.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as request_count,
        SUM(request_tokens) as request_tokens,
        SUM(response_tokens) as response_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(cost_cny) as cost
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // 按API端点统计
    const endpointRes = await sql.query(`
      SELECT 
        api_endpoint,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(cost_cny) as total_cost
      FROM token_usage
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY api_endpoint
      ORDER BY total_tokens DESC
    `);
    
    // 最近使用记录
    const recentRes = await sql.query(`
      SELECT 
        tu.id,
        tu.api_endpoint,
        tu.request_tokens,
        tu.response_tokens,
        tu.total_tokens,
        tu.cost_cny,
        tu.created_at,
        p.invite_code
      FROM token_usage tu
      LEFT JOIN profiles p ON tu.profile_id = p.id
      ORDER BY tu.created_at DESC
      LIMIT 50
    `);
    
    return NextResponse.json({
      success: true,
      overall: overallRes.rows[0],
      daily: dailyRes.rows,
      byEndpoint: endpointRes.rows,
      recent: recentRes.rows
    });
    
  } catch (error) {
    console.error('Get token stats error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
