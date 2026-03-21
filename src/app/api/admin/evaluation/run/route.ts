import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface Profile {
  id: string;
  invite_code: string;
  answers: Record<string, unknown>;
  ai_summary: Record<string, unknown> | null;
}

// AI评价提示词模板
const EVALUATION_PROMPT = `你是狗蛋，一个专业的相亲档案分析师。

【任务】
分析用户的相亲档案，生成一份结构化评价报告，用于后续的匹配推荐。

【分析维度】
1. 性格画像（3-5个关键词）
2. 情感需求等级（高/中/低）
3. 相处模式偏好（主动型/被动型/平衡型）
4. 匹配建议标签（给潜在匹配对象看的标签）
5. 可能适合的伴侣类型（2-3种）
6. 红旗预警（如果有明显问题）

【输出格式】
必须用JSON格式返回，不要有任何其他文字：

{
  "personality": ["关键词1", "关键词2", ...],
  "emotional_needs": "高/中/低",
  "interaction_style": "主动型/被动型/平衡型",
  "match_tags": ["标签1", "标签2", ...],
  "suitable_types": ["类型1", "类型2", ...],
  "red_flags": ["如果有问题写这里，没有就空数组"],
  "summary": "50字以内的整体评价"
}

【档案数据】
`;

// 执行AI评价
async function evaluateProfile(profile: Profile): Promise<{
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}> {
  const apiKey = process.env.DOUBAO_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'AI API未配置' 
    };
  }

  // 构建提示词
  const prompt = EVALUATION_PROMPT + JSON.stringify({
    answers: profile.answers,
    ai_summary: profile.ai_summary
  }, null, 2);

  try {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL || 'doubao-1-5-pro-32k-250115',
        messages: [
          { role: 'system', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      throw new Error(`API请求失败: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    // 提取JSON
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确，未找到JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return { success: true, result };
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return { success: false, error: errorMessage };
  }
}

// POST /api/admin/evaluation/run - 执行评价任务
export async function POST(request: NextRequest) {
  try {
    // 获取请求参数
    const body = await request.json().catch(() => ({}));
    const { profileId, batchSize = 10 } = body;
    
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
      
      // 更新为处理中
      await sql.query(
        'UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2',
        ['processing', profileId]
      );
      
      // 执行评价
      const evalResult = await evaluateProfile(profile);
      
      if (evalResult.success && evalResult.result) {
        // 更新档案
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation = $1, 
               ai_evaluated_at = NOW(),
               ai_evaluation_status = $2
           WHERE id = $3`,
          [JSON.stringify(evalResult.result), 'completed', profileId]
        );
        
        // 记录日志
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, evaluation_result)
           VALUES ($1, $2, $3)`,
          [profileId, 'success', JSON.stringify(evalResult.result)]
        );
        
        return NextResponse.json({ 
          success: true, 
          data: evalResult.result 
        });
      } else {
        // 更新失败状态
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation_status = $1
           WHERE id = $2`,
          ['failed', profileId]
        );
        
        // 记录失败日志
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, error_message)
           VALUES ($1, $2, $3)`,
          [profileId, 'failed', evalResult.error]
        );
        
        return NextResponse.json(
          { success: false, error: evalResult.error },
          { status: 500 }
        );
      }
    }
    
    // 批量模式：获取未评价的档案
    const pendingRes = await sql.query(
      `SELECT * FROM profiles 
       WHERE ai_evaluation_status IN ('pending', 'failed')
          OR ai_evaluation IS NULL
       ORDER BY created_at ASC
       LIMIT $1`,
      [batchSize]
    );
    
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
      
      if (evalResult.success && evalResult.result) {
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation = $1, 
               ai_evaluated_at = NOW(),
               ai_evaluation_status = $2
           WHERE id = $3`,
          [JSON.stringify(evalResult.result), 'completed', profile.id]
        );
        
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, evaluation_result)
           VALUES ($1, $2, $3)`,
          [profile.id, 'success', JSON.stringify(evalResult.result)]
        );
        
        results.push({ id: profile.id, status: 'success' });
      } else {
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation_status = $1
           WHERE id = $2`,
          ['failed', profile.id]
        );
        
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, error_message)
           VALUES ($1, $2, $3)`,
          [profile.id, 'failed', evalResult.error]
        );
        
        results.push({ id: profile.id, status: 'failed', error: evalResult.error });
      }
      
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
        el.error_message
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
