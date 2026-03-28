import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 火山引擎 ARK API 配置
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'ep-20260321224626-zxbvl';

// 正态分布映射
function normalMapping(rawScore: number): number {
  const mu = 5.5;
  const sigma = 1.8;
  const normalized = (rawScore - 4) / 2.5;
  const mapped = mu + normalized * sigma;
  return Math.max(0, Math.min(10, Math.round(mapped * 10) / 10));
}

interface AiAnalysisResult {
  body_shape?: string | number;
  skin_quality?: string | number;
  symmetry?: string | number;
  face_age?: string | number;
  hairline?: string | number;
  eye_bags?: string | number;
  teeth?: string | number;
  nose_bridge?: string | number;
  photoshop_deduction?: string | number;
  raw_score?: string | number;
  beauty_score?: string | number;
  beauty_type?: string;
  ai_comment?: string;
}

// AI分析函数
async function analyzeBeauty(imageBase64: string, apiKey: string): Promise<AiAnalysisResult> {
  const prompt = `你是一位严格的形象分析师。请客观分析这张照片中的人物，给出9项具体分数。

【必须分析的9项指标】

1. **体型肥胖** (0-4分)
   - 0-0.5: 严重肥胖/大胃袋
   - 0.5-1.5: 微胖/双下巴明显
   - 2-2.5: 正常体型
   - 2.5-3.5: 偏瘦/轮廓清晰
   - 3.5-4: 健美/线条好

2. **皮肤状况** (0-3分)
   - 0-0.5: 很差（满脸痘/油光）
   - 0.5-1.0: 较差
   - 1.0-1.5: 一般
   - 1.5-2.0: 正常
   - 2.0-3.0: 细腻光滑

3. **五官对称性** (0-3分)
   - 0-0.5: 明显不对称
   - 0.5-1.5: 轻微不对称
   - 1.5-2.5: 基本对称
   - 2.5-3.0: 很对称

4. **脸部年龄评分** (0-3分) - 以22岁为最优
   - 0-0.5: <15岁或>35岁
   - 0.5-1.5: 15-18岁或30-35岁
   - 1.5-2.0: 19-21岁或26-29岁
   - 2.0-3.0: 22-25岁

5. **发际线/发量** (0-2分)
   - 0-0.3: 秃顶/严重脱发
   - 0.3-0.8: 发际线明显后移
   - 0.8-1.2: 轻微后移
   - 1.2-1.8: 正常
   - 1.8-2.0: 浓密完美

6. **黑眼圈/眼袋** (0-2分)
   - 0-0.3: 严重
   - 0.3-0.8: 明显
   - 0.8-1.5: 轻微
   - 1.5-2.0: 无

7. **牙齿/嘴型** (0-2分)
   - 0-0.5: 严重问题
   - 0.5-1.0: 轻微问题
   - 1.0-1.5: 正常
   - 1.5-2.0: 整齐洁白

8. **鼻梁高度** (0-2分)
   - 0-0.5: 塌鼻梁
   - 0.5-1.0: 偏低
   - 1.0-1.5: 正常
   - 1.5-2.0: 挺拔

9. **P图程度** (0-3分，扣分项)
   - 0: 原图
   - 0.5-1.0: 轻度美颜
   - 1.0-2.0: 明显P图
   - 2.0-3.0: 高P

【计算方式】
加权基础分 = 体型×0.9 + 皮肤×0.7 + 对称×0.7 + 年龄×0.6 + 发际线×0.5 + 黑眼圈×0.5 + 牙齿×0.5 + 鼻梁×0.5
原始总分 = 加权基础分 - P图扣分
最终分 = 映射到正态分布（普通人5分左右）

【输出格式】纯JSON：
{
  "body_shape": 分数,
  "skin_quality": 分数,
  "symmetry": 分数,
  "face_age": 分数,
  "hairline": 分数,
  "eye_bags": 分数,
  "teeth": 分数,
  "nose_bridge": 分数,
  "photoshop_deduction": 分数,
  "raw_score": 原始总分,
  "beauty_score": 最终分,
  "beauty_type": "类型",
  "ai_comment": "评语"
}`;

  const requestBody = {
    model: ARK_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      }
    ],
    temperature: 0.2,
  };

  const response = await fetch(ARK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from AI');
  }

  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(jsonStr);
}

// 异步处理任务
async function processTask(taskId: string, imageBase64: string, inviteCode: string, apiKey: string) {
  try {
    // 更新状态为处理中
    await sql.query(
      "UPDATE beauty_score_tasks SET status = 'processing' WHERE id = $1",
      [taskId]
    );

    // 调用AI分析
    const aiResult = await analyzeBeauty(imageBase64, apiKey);
    
    // 计算分数
    const weights = {
      body_shape: 0.9, skin_quality: 0.7, symmetry: 0.7, face_age: 0.6,
      hairline: 0.5, eye_bags: 0.5, teeth: 0.5, nose_bridge: 0.5,
    };
    
    const details = {
      body_shape: Math.max(0, Math.min(4, parseFloat(String(aiResult.body_shape)) || 2)),
      skin_quality: Math.max(0, Math.min(3, parseFloat(String(aiResult.skin_quality)) || 1.5)),
      symmetry: Math.max(0, Math.min(3, parseFloat(String(aiResult.symmetry)) || 2)),
      face_age: Math.max(0, Math.min(3, parseFloat(String(aiResult.face_age)) || 2)),
      hairline: Math.max(0, Math.min(2, parseFloat(String(aiResult.hairline)) || 1.5)),
      eye_bags: Math.max(0, Math.min(2, parseFloat(String(aiResult.eye_bags)) || 1.2)),
      teeth: Math.max(0, Math.min(2, parseFloat(String(aiResult.teeth)) || 1.3)),
      nose_bridge: Math.max(0, Math.min(2, parseFloat(String(aiResult.nose_bridge)) || 1.2)),
      photoshop_deduction: Math.max(0, Math.min(3, parseFloat(String(aiResult.photoshop_deduction)) || 0)),
    };
    
    const weightedScore = 
      details.body_shape * weights.body_shape +
      details.skin_quality * weights.skin_quality +
      details.symmetry * weights.symmetry +
      details.face_age * weights.face_age +
      details.hairline * weights.hairline +
      details.eye_bags * weights.eye_bags +
      details.teeth * weights.teeth +
      details.nose_bridge * weights.nose_bridge;
    
    const rawScore = weightedScore - details.photoshop_deduction;
    const finalScore = aiResult.beauty_score 
      ? parseFloat(String(aiResult.beauty_score))
      : normalMapping(rawScore);

    const result = {
      photoshop_level: details.photoshop_deduction.toFixed(1),
      beauty_type: aiResult.beauty_type || '成熟型',
      beauty_score: Math.max(0, Math.min(10, finalScore)).toFixed(1),
      ai_comment: aiResult.ai_comment || '综合9项客观指标的评分结果',
      details,
      raw_score: Math.round(rawScore * 100) / 100,
    };

    // 查找或创建档案
    const profileRes = await sql.query(
      'SELECT id FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );

    let profileId: string;
    if (profileRes.rows.length === 0) {
      profileId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${inviteCode}`;
      await sql.query(
        `INSERT INTO profiles (id, invite_code, answers, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())`,
        [profileId, inviteCode, JSON.stringify({})]
      );
    } else {
      profileId = profileRes.rows[0].id;
    }

    // 保存到 beauty_scores
    await sql.query(
      `INSERT INTO beauty_scores 
      (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment,
       body_shape, skin_quality, symmetry, face_age, hairline, eye_bags, teeth, nose_bridge, photoshop_deduction, evaluator)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ai')`,
      [profileId, result.photoshop_level, result.beauty_type, result.beauty_score, result.ai_comment,
       details.body_shape, details.skin_quality, details.symmetry, details.face_age,
       details.hairline, details.eye_bags, details.teeth, details.nose_bridge, details.photoshop_deduction]
    );

    // 更新档案
    await sql.query(
      `UPDATE profiles SET photoshop_level = $1, beauty_type = $2, beauty_score = $3, beauty_evaluated_at = NOW()
       WHERE id = $4`,
      [result.photoshop_level, result.beauty_type, result.beauty_score, profileId]
    );

    // 更新任务状态为完成
    await sql.query(
      `UPDATE beauty_score_tasks SET status = 'completed', result = $1, profile_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(result), profileId, taskId]
    );

    // 标记邀请码已使用
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://ai-dating.top'}/api/invite/mark-used`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode, project: 'beauty-score', profileId })
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await sql.query(
      `UPDATE beauty_score_tasks SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2`,
      [errorMsg, taskId]
    );
  }
}

// POST /api/beauty-score - 创建异步任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, photoBase64 } = body;

    if (!inviteCode || !photoBase64) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }

    // 检查邀请码是否已使用
    const inviteCheckRes = await sql.query(
      `SELECT project_usages->'beauty-score' as beauty_score_used
       FROM invite_codes WHERE code = $1`,
      [inviteCode.toUpperCase()]
    );
    
    if (inviteCheckRes.rows.length > 0) {
      const beautyScoreUsed = inviteCheckRes.rows[0]?.beauty_score_used?.used === true;
      
      if (beautyScoreUsed) {
        return NextResponse.json(
          { success: false, error: '该邀请码已经完成过颜值打分，不能重复评分' },
          { status: 403 }
        );
      }
    }

    // 创建任务
    const taskRes = await sql.query(
      `INSERT INTO beauty_score_tasks (invite_code, image_url, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [inviteCode, photoBase64.substring(0, 100) + '...'] // 只存前100字符作为标识
    );
    
    const taskId = taskRes.rows[0].id;

    // 异步处理（不等待）
    const apiKey = process.env.ARK_API_KEY;
    if (apiKey) {
      // 使用 setImmediate 让请求先返回
      setImmediate(() => {
        processTask(taskId, photoBase64, inviteCode, apiKey).catch(console.error);
      });
    } else {
      // 无API key，直接标记失败
      await sql.query(
        `UPDATE beauty_score_tasks SET status = 'failed', error = '未配置 API Key' WHERE id = $1`,
        [taskId]
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      message: '评分任务已创建，正在后台处理中...'
    });

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: '创建任务失败' },
      { status: 500 }
    );
  }
}

// GET /api/beauty-score?taskId=xxx - 查询任务状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const code = searchParams.get('code');

    // 如果有 taskId，查任务状态
    if (taskId) {
      const taskRes = await sql.query(
        `SELECT id, status, result, error, created_at, updated_at
         FROM beauty_score_tasks WHERE id = $1`,
        [taskId]
      );

      if (taskRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
      }

      const task = taskRes.rows[0];
      return NextResponse.json({
        success: true,
        task: {
          id: task.id,
          status: task.status,
          result: task.result,
          error: task.error,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
        }
      });
    }

    // 如果有 code，查是否已完成过
    if (code) {
      const profileRes = await sql.query(
        `SELECT photoshop_level, beauty_type, beauty_score, beauty_evaluated_at
        FROM profiles WHERE invite_code = $1 AND beauty_score IS NOT NULL`,
        [code]
      );

      if (profileRes.rows.length === 0) {
        return NextResponse.json({ success: true, data: null });
      }

      const row = profileRes.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          photoshop_level: row.photoshop_level,
          beauty_type: row.beauty_type,
          beauty_score: row.beauty_score,
          evaluated_at: row.beauty_evaluated_at,
        },
      });
    }

    return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });

  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
