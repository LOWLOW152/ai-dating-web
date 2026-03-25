import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { batchRunLevel1, batchRunLevel2, batchRunLevel3, getAutomationStats } from '@/lib/match-automation';

/**
 * 自动化匹配 API
 * POST /api/admin/match/auto-run
 * 
 * 支持操作：
 * - level1: 运行第一层硬性筛选
 * - level2: 运行第二层AI初筛  
 * - level3: 运行第三层AI深度匹配
 * - all: 顺序运行所有层
 * 
 * 定时任务调用此API进行自动化匹配
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'all' } = body;
    
    const results: Record<string, { success: boolean; stats?: { total: number; success: number; failed: number } }> = {};
    
    switch (action) {
      case 'level1':
        results.level1 = await batchRunLevel1();
        break;
        
      case 'level2':
        results.level2 = await batchRunLevel2();
        break;
        
      case 'level3':
        results.level3 = await batchRunLevel3();
        break;
        
      case 'all':
      default:
        // 顺序运行所有层
        results.level1 = await batchRunLevel1();
        results.level2 = await batchRunLevel2();
        results.level3 = await batchRunLevel3();
        break;
    }
    
    // 汇总统计
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + (r.stats?.total || 0), 0);
    const totalSuccess = Object.values(results).reduce((sum, r) => sum + (r.stats?.success || 0), 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + (r.stats?.failed || 0), 0);
    
    return Response.json({
      success: totalFailed === 0,
      data: {
        action,
        results,
        summary: {
          totalProcessed,
          totalSuccess,
          totalFailed
        }
      }
    });
    
  } catch (error) {
    console.error('Auto-run match error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - 获取自动化状态
export async function GET() {
  try {
    const stats = await getAutomationStats();
    
    // 获取最近24小时的日志
    const logsRes = await sql.query(`
      SELECT * FROM match_automation_logs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // 获取当前处理中的档案
    const runningRes = await sql.query(`
      SELECT 
        id, 
        invite_code, 
        match_level1_status,
        match_level2_status,
        match_level3_status,
        match_error
      FROM profiles
      WHERE match_level1_status = 'running' 
         OR match_level2_status = 'running' 
         OR match_level3_status = 'running'
      LIMIT 10
    `);
    
    return Response.json({
      success: true,
      data: {
        stats,
        recentLogs: logsRes.rows,
        running: runningRes.rows
      }
    });
    
  } catch (error) {
    console.error('Get auto-run status error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
