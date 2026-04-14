import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { evaluateProfile, saveEvaluationResult } from '@/lib/evaluation';

interface Profile {
  id: string;
  invite_code: string;
  answers: Record<string, unknown>;
  ai_summary: Record<string, unknown> | null;
}

// POST /api/admin/evaluation/run - 执行评价任务
export async function POST(request: NextRequest) {
  try {
    // 获取请求参数
    const body = await request.json().catch(() => ({}));
    const { profileId, batchSize = 10, reEvaluate = false } = body;
    
    // 如果指定了profileId，只评价这一个
    if (profileId) {
      const profileRes = await sql.query(
        'SELECT * FROM profiles WHERE id = $1',
        [profileId]
      );
      
      if (profileRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '档案不存在' },
          { status: 404 }
        );
      }
      
      const profile = profileRes.rows[0];
      
      // 检查是否有答题数据
      if (!profile.answers || typeof profile.answers !== 'object' || Object.keys(profile.answers).length === 0) {
        return NextResponse.json(
          { success: false, error: '该档案未完成答题，无法评价' },
          { status: 400 }
        );
      }
      
      // 更新为处理中
      await sql.query(
        'UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2',
        ['processing', profileId]
      );
      
      // 执行评价
      const evalResult = await evaluateProfile(profile);
      const saveResult = await saveEvaluationResult(profileId, evalResult);
      
      if (saveResult.success) {
        return NextResponse.json({ 
          success: true, 
          data: evalResult.result,
          tokens: evalResult.tokens
        });
      } else {
        return NextResponse.json(
          { success: false, error: saveResult.error },
          { status: 500 }
        );
      }
    }
    
    // 批量模式：获取档案
    let pendingRes;
    if (reEvaluate) {
      // 重新评价：获取所有已完成的档案
      pendingRes = await sql.query(
        `SELECT * FROM profiles 
         WHERE ai_evaluation_status = 'completed'
         AND (tags IS NULL OR NOT (tags @> '["deleted"]'::jsonb))
         AND (answers IS NOT NULL AND jsonb_typeof(answers) = 'object' AND answers != '{}'::jsonb)
         ORDER BY ai_evaluated_at ASC NULLS FIRST
         LIMIT $1`,
        [batchSize]
      );
    } else {
      // 正常模式：只获取未评价的档案
      pendingRes = await sql.query(
        `SELECT * FROM profiles 
         WHERE (ai_evaluation_status IN ('pending', 'failed')
            OR ai_evaluation IS NULL)
         AND (tags IS NULL OR NOT (tags @> '["deleted"]'::jsonb))
         AND (answers IS NOT NULL AND jsonb_typeof(answers) = 'object' AND answers != '{}'::jsonb)
         ORDER BY created_at ASC
         LIMIT $1`,
        [batchSize]
      );
    }
    
    const pendingProfiles = pendingRes.rows;
    
    if (pendingProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待评价的档案',
        processed: 0
      });
    }
    
    // 逐个处理
    const results = [];
    for (const profile of pendingProfiles) {
      // 更新为处理中
      await sql.query(
        'UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2',
        ['processing', profile.id]
      );
      
      const evalResult = await evaluateProfile(profile);
      const saveResult = await saveEvaluationResult(profile.id, evalResult);
      
      results.push({ 
        id: profile.id, 
        status: saveResult.success ? 'success' : 'failed', 
        tokens: evalResult.tokens,
        error: saveResult.error 
      });
      
      // 间隔一下避免API限流
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return NextResponse.json({
      success: true,
      processed: pendingProfiles.length,
      results
    });
    
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/evaluation/status - 获取评价状态统计
export async function GET() {
  try {
    const statsRes = await sql.query(`
      SELECT 
        ai_evaluation_status as status,
        COUNT(*) as count
      FROM profiles
      GROUP BY ai_evaluation_status
    `);
    
    const recentLogsRes = await sql.query(`
      SELECT 
        p.id,
        p.invite_code,
        el.status,
        el.created_at,
        el.error_message,
        el.evaluation_result
      FROM evaluation_logs el
      JOIN profiles p ON el.profile_id = p.id
      ORDER BY el.created_at DESC
      LIMIT 20
    `);
    
    return NextResponse.json({
      success: true,
      stats: statsRes.rows,
      recentLogs: recentLogsRes.rows
    });
    
  } catch (error) {
    console.error('Get evaluation status error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
