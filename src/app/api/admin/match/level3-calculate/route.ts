import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 第三层AI深度匹配 - 差异分析与互补建议
 * 分析两人的差异，给出相处建议（不按相似原则）
 * POST /api/admin/match/level3-calculate
 * Body: { profileId: string, candidateId?: string, templateId?: string }
 */

// 第三层AI深度分析提示词 - 差异分析+互补建议
const LEVEL3_PROMPT = `你是专业的情感分析师。请深入分析这两个人的档案，重点分析：

【分析维度】（19道软性题目全量分析）
1. 性格差异 - 内向vs外向、感性vs理性等
2. 价值观差异 - 对金钱、事业、家庭的看法
3. 生活方式差异 - 消费习惯、作息、社交
4. 情感需求差异 - 需要多少陪伴、如何表达爱意
5. 冲突处理差异 - 吵架风格、沟通方式

【分析原则】
- 不要只看相似度，重点看互补性
- 例如：内向的人可能需要一个开朗的人带动
- 例如：冲动的人可能需要一个冷静的人平衡
- 差异不一定是坏事，关键看是否能互补

【输出格式】
只返回JSON，不要任何其他文字：
{
  "similarity_score": 数字0-100, // 相似度
  "complement_score": 数字0-100, // 互补度（越互补分数越高）
  "overall_score": 数字0-100, // 综合匹配度
  "strengths": ["优势1", "优势2", "优势3"], // 你们在一起的优势
  "risks": ["风险1", "风险2"], // 需要警惕的问题
  "advice": "相处建议：具体说明未来可能遇到什么困难，如何克服，这段关系是否值得尝试"
}

【档案A】
`;

// 执行第三层深度分析
async function evaluateLevel3(
  profileA: Record<string, unknown>,
  profileB: Record<string, unknown>
): Promise<{
  success: boolean;
  result?: {
    similarity_score: number;
    complement_score: number;
    overall_score: number;
    strengths: string[];
    risks: string[];
    advice: string;
  };
  tokens?: { request: number; response: number; total: number };
  error?: string;
}> {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'AI API未配置' };
  }

  // 获取完整的档案数据
  const getFullProfile = (profile: Record<string, unknown>) => ({
    answers: profile.answers || {},
    ai_summary: profile.ai_summary || {},
    ai_evaluation: profile.ai_evaluation || {}
  });

  const prompt = LEVEL3_PROMPT + 
    JSON.stringify(getFullProfile(profileA), null, 2) + 
    '\n\n【档案B】\n' + 
    JSON.stringify(getFullProfile(profileB), null, 2);

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
        temperature: 0.4,
        max_tokens: 1500,
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
      result: {
        similarity_score: Math.round(Number(result.similarity_score)),
        complement_score: Math.round(Number(result.complement_score)),
        overall_score: Math.round(Number(result.overall_score)),
        strengths: result.strengths || [],
        risks: result.risks || [],
        advice: result.advice
      },
      tokens: { request: requestTokens, response: responseTokens, total: requestTokens + responseTokens }
    };
    
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : '未知错误' 
    };
  }
}

// 从已有计算结果生成Top3报告
async function generateTop3Reports(profileId: string) {
  // 获取已计算的Top3结果
  const top3Res = await sql.query(
    `SELECT 
      mc.candidate_id,
      mc.level_3_score as overall_score,
      mc.level_3_report,
      p.invite_code as candidate_invite_code,
      p.answers->>'nickname' as candidate_nickname,
      p.answers->>'gender' as candidate_gender,
      p.answers->>'birth_year' as candidate_birth_year,
      p.answers->>'city' as candidate_city,
      bs.beauty_score,
      bs.photoshop_level,
      bs.beauty_type
    FROM match_candidates mc
    JOIN profiles p ON mc.candidate_id = p.id
    LEFT JOIN beauty_scores bs ON bs.profile_id = mc.candidate_id
    WHERE mc.profile_id = $1 
      AND mc.level_3_score IS NOT NULL
    ORDER BY mc.level_3_score DESC
    LIMIT 3`,
    [profileId]
  );

  if (top3Res.rows.length === 0) {
    return { success: false, error: '没有可用的计算结果' };
  }

  // 删除旧报告
  await sql.query(
    'DELETE FROM user_match_reports WHERE profile_id = $1',
    [profileId]
  );

  // 插入新报告
  for (let i = 0; i < top3Res.rows.length; i++) {
    const row = top3Res.rows[i];
    let report = row.level_3_report;
    if (typeof report === 'string') {
      try {
        report = JSON.parse(report);
      } catch {
        report = {};
      }
    }

    await sql.query(
      `INSERT INTO user_match_reports 
       (profile_id, candidate_id, rank, overall_score, similarity_score, complement_score, 
        strengths_summary, risks_summary, full_report, is_top3, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())`,
      [
        profileId,
        row.candidate_id,
        i + 1,
        row.overall_score,
        report?.similarity_score || 0,
        report?.complement_score || 0,
        Array.isArray(report?.strengths) ? report.strengths.join('；') : '',
        Array.isArray(report?.risks) ? report.risks.join('；') : '',
        row.level_3_report
      ]
    );
  }

  return { success: true, count: top3Res.rows.length };
}

export async function POST(request: NextRequest) {
  console.log('[Level3] Starting calculation...');
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profileId, candidateId, templateId: _templateId } = await request.json();
    console.log('[Level3] ProfileId:', profileId, 'CandidateId:', candidateId);

    if (!profileId) {
      return Response.json({ success: false, error: '缺少profileId' }, { status: 400 });
    }

    // 获取档案A
    const profileRes = await sql.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '档案不存在' }, { status: 404 });
    }
    const profileA = profileRes.rows[0];
    console.log('[Level3] Found profile:', profileA.invite_code);

    // 如果指定了candidateId，只分析这一个
    if (candidateId) {
      const candidateRes = await sql.query('SELECT * FROM profiles WHERE id = $1', [candidateId]);
      if (candidateRes.rows.length === 0) {
        return Response.json({ success: false, error: '候选人不存在' }, { status: 404 });
      }

      const evalResult = await evaluateLevel3(profileA, candidateRes.rows[0]);
      
      if (evalResult.success && evalResult.result) {
        // 保存报告
        await sql.query(
          `INSERT INTO level3_reports (profile_id, candidate_id, overall_score, similarity_score, complement_score, strengths, risks, advice)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (profile_id, candidate_id) 
           DO UPDATE SET overall_score = $3, similarity_score = $4, complement_score = $5, 
                        strengths = $6, risks = $7, advice = $8, created_at = NOW()`,
          [
            profileId, candidateId,
            evalResult.result.overall_score,
            evalResult.result.similarity_score,
            evalResult.result.complement_score,
            evalResult.result.strengths,
            evalResult.result.risks,
            evalResult.result.advice
          ]
        );

        // 更新match_candidates
        await sql.query(
          `UPDATE match_candidates 
           SET level_3_score = $1, level_3_report = $2, level_3_calculated_at = NOW()
           WHERE profile_id = $3 AND candidate_id = $4`,
          [evalResult.result.overall_score, JSON.stringify(evalResult.result), profileId, candidateId]
        );

        // 记录token
        if (evalResult.tokens) {
          const costCny = (evalResult.tokens.total / 1000) * 0.008;
          await sql.query(
            `INSERT INTO token_usage (profile_id, api_endpoint, request_tokens, response_tokens, total_tokens, cost_cny)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [profileId, '/api/admin/match/level3-calculate', 
             evalResult.tokens.request, evalResult.tokens.response, 
             evalResult.tokens.total, costCny]
          );
        }

        // 生成Top3报告（单个也需要更新）
        console.log('[Level3] Generating Top3 reports for single candidate...');
        await generateTop3Reports(profileId);

        // 更新档案第三层状态
        console.log('[Level3] Updating profile status to completed...');
        await sql.query(
          `UPDATE profiles 
           SET match_level3_status = 'completed',
               match_level3_at = NOW()
           WHERE id = $1`,
          [profileId]
        );
        console.log('[Level3] Status updated to completed');

        return Response.json({
          success: true,
          data: evalResult.result
        });
      } else {
        return Response.json(
          { success: false, error: evalResult.error },
          { status: 500 }
        );
      }
    }

    // 批量模式：分析所有第二层通过的候选人
    console.log('[Level3] Querying candidates for batch mode...');
    const candidatesRes = await sql.query(
      `SELECT mc.candidate_id, p.*
       FROM match_candidates mc
       JOIN profiles p ON mc.candidate_id = p.id
       WHERE mc.profile_id = $1 
         AND mc.level_2_passed = true
         AND mc.level_3_calculated_at IS NULL
       ORDER BY mc.level_2_score DESC
       LIMIT 5`, // 最多分析前5个
      [profileId]
    );

    const candidates = candidatesRes.rows;
    console.log('[Level3] Found', candidates.length, 'candidates to process');

    if (candidates.length === 0) {
      // 检查是否已经有计算过的结果
      console.log('[Level3] No new candidates, checking existing results...');
      const existingRes = await sql.query(
        `SELECT COUNT(*) as count 
         FROM match_candidates 
         WHERE profile_id = $1 AND level_3_calculated_at IS NOT NULL`,
        [profileId]
      );
      
      const existingCount = parseInt(existingRes.rows[0].count);
      console.log('[Level3] Existing calculated:', existingCount);
      
      if (existingCount > 0) {
        // 已经有计算过的结果，直接生成 Top3 报告
        console.log('[Level3] Generating Top3 from existing results...');
        await generateTop3Reports(profileId);
        
        // 更新状态为完成
        console.log('[Level3] Updating status to completed...');
        await sql.query(
          `UPDATE profiles 
           SET match_level3_status = 'completed',
               match_level3_at = NOW()
           WHERE id = $1`,
          [profileId]
        );
        console.log('[Level3] Status updated to completed');
        
        return Response.json({
          success: true,
          message: '使用已有计算结果生成Top3报告',
          processed: 0,
          existingCount
        });
      }
      
      return Response.json({
        success: false,
        error: '没有待分析的候选人，且没有历史计算结果',
        processed: 0
      }, { status: 400 });
    }

    // 逐个分析
    const results = [];
    let totalTokens = 0;

    for (const profileB of candidates) {
      console.log('[Level3] Processing candidate:', profileB.id);
      const evalResult = await evaluateLevel3(profileA, profileB);
      
      if (evalResult.success && evalResult.result) {
        // 保存到level3_reports
        await sql.query(
          `INSERT INTO level3_reports (profile_id, candidate_id, overall_score, similarity_score, complement_score, strengths, risks, advice)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (profile_id, candidate_id) 
           DO UPDATE SET overall_score = $3, similarity_score = $4, complement_score = $5, 
                        strengths = $6, risks = $7, advice = $8, created_at = NOW()`,
          [
            profileId, profileB.id,
            evalResult.result.overall_score,
            evalResult.result.similarity_score,
            evalResult.result.complement_score,
            evalResult.result.strengths,
            evalResult.result.risks,
            evalResult.result.advice
          ]
        );

        // 更新match_candidates
        await sql.query(
          `UPDATE match_candidates 
           SET level_3_score = $1, level_3_report = $2, level_3_calculated_at = NOW()
           WHERE profile_id = $3 AND candidate_id = $4`,
          [evalResult.result.overall_score, JSON.stringify(evalResult.result), profileId, profileB.id]
        );

        if (evalResult.tokens) {
          const costCny = (evalResult.tokens.total / 1000) * 0.008;
          await sql.query(
            `INSERT INTO token_usage (profile_id, api_endpoint, request_tokens, response_tokens, total_tokens, cost_cny)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [profileId, '/api/admin/match/level3-calculate', 
             evalResult.tokens.request, evalResult.tokens.response, 
             evalResult.tokens.total, costCny]
          );
          totalTokens += evalResult.tokens.total;
        }

        results.push({
          candidateId: profileB.id,
          overallScore: evalResult.result.overall_score,
          status: 'success'
        });
        console.log('[Level3] Candidate processed successfully:', profileB.id);
      } else {
        results.push({
          candidateId: profileB.id,
          status: 'failed',
          error: evalResult.error
        });
        console.log('[Level3] Candidate processing failed:', profileB.id, evalResult.error);
      }

      // 间隔避免限流
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 生成Top3报告
    console.log('[Level3] Generating Top3 reports...');
    const top3Result = await generateTop3Reports(profileId);
    console.log('Generated Top3 reports:', top3Result);

    // 更新档案第三层状态
    console.log('[Level3] Updating profile status to completed...');
    await sql.query(
      `UPDATE profiles 
       SET match_level3_status = 'completed',
           match_level3_at = NOW()
       WHERE id = $1`,
      [profileId]
    );
    console.log('[Level3] Status updated to completed');

    return Response.json({
      success: true,
      data: {
        profileId,
        processed: candidates.length,
        results,
        totalTokens
      }
    });

  } catch (error) {
    console.error('[Level3] Fatal error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - 获取第三层报告
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const candidateId = searchParams.get('candidateId');

    if (!profileId) {
      return Response.json({ success: false, error: '缺少profileId' }, { status: 400 });
    }

    // 如果指定了candidateId，返回单个报告
    if (candidateId) {
      const reportRes = await sql.query(
        `SELECT * FROM level3_reports WHERE profile_id = $1 AND candidate_id = $2`,
        [profileId, candidateId]
      );

      if (reportRes.rows.length === 0) {
        return Response.json({ success: false, error: '报告不存在' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: reportRes.rows[0]
      });
    }

    // 返回所有已完成的报告
    const reportsRes = await sql.query(
      `SELECT r.*, p.invite_code, p.answers->>'nickname' as nickname
       FROM level3_reports r
       JOIN profiles p ON r.candidate_id = p.id
       WHERE r.profile_id = $1
       ORDER BY r.overall_score DESC`,
      [profileId]
    );

    return Response.json({
      success: true,
      data: reportsRes.rows
    });

  } catch (error) {
    console.error('Get level3 reports error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
