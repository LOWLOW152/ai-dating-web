import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 定时任务：自动运行第二层和第三层匹配
 * 每天晚上执行所有未处理的档案
 * POST /api/admin/match/auto-run
 * （由Vercel Cron调用或手动触发）
 */

export async function POST(request: NextRequest) {
  // 验证Cron密钥（如果通过Cron调用）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // 允许本地调用（无密钥或开发环境）
    const { searchParams } = new URL(request.url);
    const isManual = searchParams.get('manual') === 'true';
    if (!isManual) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    level2: { processed: 0, errors: [] as string[] },
    level3: { processed: 0, errors: [] as string[] }
  };

  try {
    // === 第一层 → 第二层 ===
    // 获取所有已完成第一层但未完成第二层的档案
    const needLevel2Res = await sql.query(
      `SELECT DISTINCT p.id, p.invite_code
       FROM profiles p
       JOIN match_candidates mc ON p.id = mc.profile_id
       WHERE mc.passed_level_1 = true
         AND mc.level_2_calculated_at IS NULL
         AND p.status = 'completed'
       LIMIT 10` // 每晚最多处理10个档案，避免超时和费用过高
    );

    // 逐个调用第二层API
    for (const profile of needLevel2Res.rows) {
      try {
        const res = await fetch(`${process.env.VERCEL_URL || 'https://www.ai-dating.top'}/api/admin/match/level2-calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id })
        });
        
        if (res.ok) {
          results.level2.processed++;
        } else {
          const error = await res.text();
          results.level2.errors.push(`${profile.invite_code}: ${error}`);
        }
      } catch (err) {
        results.level2.errors.push(`${profile.invite_code}: ${String(err)}`);
      }
      
      // 间隔避免限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // === 第二层 → 第三层 ===
    // 获取所有已通过第二层但未完成第三层的档案
    const needLevel3Res = await sql.query(
      `SELECT DISTINCT p.id, p.invite_code
       FROM profiles p
       JOIN match_candidates mc ON p.id = mc.profile_id
       WHERE mc.level_2_passed = true
         AND mc.level_3_calculated_at IS NULL
         AND p.status = 'completed'
       LIMIT 5` // 每晚最多处理5个档案，第三层比较贵
    );

    // 逐个调用第三层API
    for (const profile of needLevel3Res.rows) {
      try {
        const res = await fetch(`${process.env.VERCEL_URL || 'https://www.ai-dating.top'}/api/admin/match/level3-calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id })
        });
        
        if (res.ok) {
          results.level3.processed++;
        } else {
          const error = await res.text();
          results.level3.errors.push(`${profile.invite_code}: ${error}`);
        }
      } catch (err) {
        results.level3.errors.push(`${profile.invite_code}: ${String(err)}`);
      }
      
      // 间隔避免限流
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return Response.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto run error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - 查看待处理队列
export async function GET() {
  try {
    // 待处理第二层
    const level2QueueRes = await sql.query(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM profiles p
       JOIN match_candidates mc ON p.id = mc.profile_id
       WHERE mc.passed_level_1 = true
         AND mc.level_2_calculated_at IS NULL
         AND p.status = 'completed'`
    );

    // 待处理第三层
    const level3QueueRes = await sql.query(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM profiles p
       JOIN match_candidates mc ON p.id = mc.profile_id
       WHERE mc.level_2_passed = true
         AND mc.level_3_calculated_at IS NULL
         AND p.status = 'completed'`
    );

    // 今日已处理（简化统计）
    const todayRes = await sql.query(
      `SELECT 
        COUNT(*) FILTER (WHERE api_endpoint = '/api/admin/match/level2-calculate' 
                         AND created_at > NOW() - INTERVAL '24 hours') as level2_today,
        COUNT(*) FILTER (WHERE api_endpoint = '/api/admin/match/level3-calculate'
                         AND created_at > NOW() - INTERVAL '24 hours') as level3_today
       FROM token_usage`
    );

    return Response.json({
      success: true,
      data: {
        queue: {
          level2: parseInt(level2QueueRes.rows[0].count),
          level3: parseInt(level3QueueRes.rows[0].count)
        },
        processedToday: {
          level2: parseInt(todayRes.rows[0].level2_today),
          level3: parseInt(todayRes.rows[0].level3_today)
        }
      }
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
