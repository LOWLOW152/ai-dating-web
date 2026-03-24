import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 第二层AI初筛 - 相似度评分
 * 从第一层通过的候选人中选Top 20%进入第三层
 * POST /api/admin/match/level2-calculate
 * Body: { profileId: string, templateId?: string }
 */

// 第二层AI评分提示词 - 简单相似度打分
const LEVEL2_PROMPT = `你是相亲匹配助手。请比较两个人的以下5个维度，给出相似度评分（0-100分）。

【评分维度】
1. 兴趣爱好 - 兴趣重叠度越高分数越高
2. 作息习惯 - 作息越接近分数越高  
3. 社交模式 - 社交偏好越一致分数越高
4. 话题偏好 - 喜欢聊的话题重叠度越高分数越高
5. 运动习惯 - 运动习惯越接近分数越高

【评分规则】
- 90-100分：非常相似，几乎完全一致
- 70-89分：比较相似，有较多共同点
- 50-69分：一般相似，部分匹配
- 30-49分：差异较大
- 0-29分：差异很大

【输出格式】
只返回JSON，不要任何其他文字：
{
  "overall_score": 数字0-100,
  "dimension_scores": {
    "interests": 数字0-100,
    "sleep_schedule": 数字0-100,
    "social_mode": 数字0-100,
    "topics": 数字0-100,
    "exercise": 数字0-100
  },
  "brief_reason": "一句话说明为什么是这个分数"
}

【档案A】
`;

// 执行第二层评分
async function evaluateLevel2(
  profileA: Record<string, unknown>,
  profileB: Record<string, unknown>,
  config: { question_keys: string[] }
): Promise<{
  success: boolean;
  score?: number;
  dimensionScores?: Record<string, number>;
  reason?: string;
  tokens?: { request: number; response: number; total: number };
  error?: string;
}> {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'AI API未配置' };
  }

  // 提取5个维度的答案
  const extractDimensions = (profile: Record<string, unknown>) => {
    const answers = profile.answers as Record<string, unknown> || {};
    return {
      interests: answers.interests || answers.hobbies || '未回答',
      sleep_schedule: answers.sleep_schedule || answers.sleep || '未回答',
      social_mode: answers.social_mode || answers.social || '未回答',
      topics: answers.topics || answers.chat_topics || '未回答',
      exercise: answers.exercise || answers.sports || '未回答'
    };
  };

  const dimA = extractDimensions(profileA);
  const dimB = extractDimensions(profileB);

  const prompt = LEVEL2_PROMPT + 
    JSON.stringify(dimA, null, 2) + 
    '\n\n【档案B】\n' + 
    JSON.stringify(dimB, null, 2);

  try {
    const requestTokens = Math.ceil(prompt.length / 4);
    
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL || 'doubao-1-5-pro-32k-250115',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      throw new Error(`API请求失败: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    const responseTokens = Math.ceil(reply.length / 4);
    
    // 提取JSON
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      score: result.overall_score,
      dimensionScores: result.dimension_scores,
      reason: result.brief_reason,
      tokens: { request: requestTokens, response: responseTokens, total: requestTokens + responseTokens }
    };
    
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : '未知错误' 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profileId, templateId = 'v1_default' } = await request.json();

    if (!profileId) {
      return Response.json({ success: false, error: '缺少profileId' }, { status: 400 });
    }

    // 获取第二层配置
    const configRes = await sql.query(
      'SELECT * FROM level2_config WHERE template_id = $1 AND is_enabled = true',
      [templateId]
    );

    if (configRes.rows.length === 0) {
      return Response.json({ success: false, error: '第二层配置不存在' }, { status: 404 });
    }

    const config = configRes.rows[0];

    // 获取档案A信息
    const profileRes = await sql.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '档案不存在' }, { status: 404 });
    }
    const profileA = profileRes.rows[0];

    // 获取第一层通过但未计算第二层的候选人
    const candidatesRes = await sql.query(
      `SELECT mc.candidate_id, p.*
       FROM match_candidates mc
       JOIN profiles p ON mc.candidate_id = p.id
       WHERE mc.profile_id = $1 
         AND mc.passed_level_1 = true
         AND (mc.level_2_calculated_at IS NULL OR mc.level_2_score IS NULL)
       ORDER BY mc.calculated_at ASC
       LIMIT 20`, // 一次最多处理20个，避免超时
      [profileId]
    );

    const candidates = candidatesRes.rows;

    if (candidates.length === 0) {
      // 所有候选人都已计算过第二层，直接返回当前Top 20%
      const topCandidatesRes = await sql.query(
        `SELECT candidate_id, level_2_score
         FROM match_candidates
         WHERE profile_id = $1 AND passed_level_1 = true
         ORDER BY level_2_score DESC NULLS LAST
         LIMIT (SELECT GREATEST(1, COUNT(*) / 5) FROM match_candidates WHERE profile_id = $1 AND passed_level_1 = true)`,
        [profileId]
      );
      
      return Response.json({
        success: true,
        message: '所有候选人已评分',
        topCandidates: topCandidatesRes.rows,
        totalCalculated: 0
      });
    }

    // 逐个评分
    const results = [];
    let totalTokens = 0;

    for (const profileB of candidates) {
      const evalResult = await evaluateLevel2(profileA, profileB, config);
      
      if (evalResult.success && evalResult.score !== undefined) {
        // 更新match_candidates表
        await sql.query(
          `UPDATE match_candidates 
           SET level_2_score = $1,
               level_2_calculated_at = NOW()
           WHERE profile_id = $2 AND candidate_id = $3`,
          [evalResult.score, profileId, profileB.id]
        );

        // 记录token使用
        if (evalResult.tokens) {
          const costCny = (evalResult.tokens.total / 1000) * 0.008;
          await sql.query(
            `INSERT INTO token_usage (profile_id, api_endpoint, request_tokens, response_tokens, total_tokens, cost_cny)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [profileId, '/api/admin/match/level2-calculate', 
             evalResult.tokens.request, evalResult.tokens.response, 
             evalResult.tokens.total, costCny]
          );
          totalTokens += evalResult.tokens.total;
        }

        results.push({
          candidateId: profileB.id,
          score: evalResult.score,
          status: 'success'
        });
      } else {
        results.push({
          candidateId: profileB.id,
          status: 'failed',
          error: evalResult.error
        });
      }

      // 间隔避免限流
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 标记Top 20%通过第二层
    await sql.query(
      `WITH ranked AS (
        SELECT candidate_id,
               ROW_NUMBER() OVER (ORDER BY level_2_score DESC) as rank,
               COUNT(*) OVER () as total
        FROM match_candidates
        WHERE profile_id = $1 AND passed_level_1 = true AND level_2_score IS NOT NULL
      )
      UPDATE match_candidates mc
      SET level_2_passed = true
      FROM ranked r
      WHERE mc.profile_id = $1 
        AND mc.candidate_id = r.candidate_id
        AND r.rank <= GREATEST(1, r.total * 0.2)`,
      [profileId]
    );

    // 获取统计
    const statsRes = await sql.query(
      `SELECT 
        COUNT(*) FILTER (WHERE level_2_score IS NOT NULL) as calculated,
        COUNT(*) FILTER (WHERE level_2_passed = true) as passed,
        AVG(level_2_score) as avg_score
       FROM match_candidates
       WHERE profile_id = $1 AND passed_level_1 = true`,
      [profileId]
    );

    return Response.json({
      success: true,
      data: {
        profileId,
        processed: candidates.length,
        results,
        totalTokens,
        stats: statsRes.rows[0]
      }
    });

  } catch (error) {
    console.error('Level2 calculate error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - 获取第二层状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return Response.json({ success: false, error: '缺少profileId' }, { status: 400 });
    }

    const statsRes = await sql.query(
      `SELECT 
        COUNT(*) FILTER (WHERE passed_level_1 = true) as level1_passed,
        COUNT(*) FILTER (WHERE level_2_score IS NOT NULL) as level2_calculated,
        COUNT(*) FILTER (WHERE level_2_passed = true) as level2_passed,
        AVG(level_2_score) FILTER (WHERE level_2_score IS NOT NULL) as avg_score
       FROM match_candidates
       WHERE profile_id = $1`,
      [profileId]
    );

    const topCandidatesRes = await sql.query(
      `SELECT mc.candidate_id, mc.level_2_score, p.invite_code,
              p.answers->>'nickname' as nickname
       FROM match_candidates mc
       JOIN profiles p ON mc.candidate_id = p.id
       WHERE mc.profile_id = $1 AND mc.level_2_passed = true
       ORDER BY mc.level_2_score DESC`,
      [profileId]
    );

    return Response.json({
      success: true,
      data: {
        stats: statsRes.rows[0],
        topCandidates: topCandidatesRes.rows
      }
    });

  } catch (error) {
    console.error('Get level2 status error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
