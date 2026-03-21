import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 火山引擎 ARK API 配置
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'ep-20260321224626-zxbvl'; // 豆包视觉模型 endpoint ID

// 调试日志（返回给前端）
let debugLogs: string[] = [];
function log(msg: string) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  debugLogs.push(line);
  console.log(line);
}

// 获取环境变量（运行时）
function getArkApiKey(): string | undefined {
  const key = process.env.ARK_API_KEY;
  log(`环境变量 ARK_API_KEY: ${key ? '已设置' : '未设置'}`);
  return key;
}

// 正态分布映射函数
function normalMapping(rawScore: number): number {
  // 原始分范围大约 -3 ~ 9.4
  // 目标：均值 5.5，标准差 1.8
  const mu = 5.5;
  const sigma = 1.8;
  
  // 线性映射到正态分布的分位数
  // 原始分 4 分 → 5 分（普通人）
  // 原始分 6 分 → 6.5 分
  // 原始分 2 分 → 3.5 分
  
  const normalized = (rawScore - 4) / 2.5; // 归一化
  const mapped = mu + normalized * sigma;
  
  // 限制在 0-10
  return Math.max(0, Math.min(10, Math.round(mapped * 10) / 10));
}

// AI 分析结果类型
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

// 调用火山引擎视觉模型
async function analyzeBeauty(imageBase64: string, apiKey: string): Promise<AiAnalysisResult> {
  const prompt = `你是一位严格的形象分析师。请客观分析这张照片中的人物，给出9项具体分数。

【必须分析的9项指标】

1. **体型肥胖** (0-4分)
   - 0-0.5: 严重肥胖/大胃袋，轮廓严重变形
   - 0.5-1.5: 微胖/双下巴明显
   - 2-2.5: 正常体型
   - 2.5-3.5: 偏瘦/轮廓清晰
   - 3.5-4: 健美/线条好

2. **皮肤状况** (0-3分)
   - 0-0.5: 很差（满脸痘/油光/暗沉发黄）
   - 0.5-1.0: 较差（有痘/油光）
   - 1.0-1.5: 一般（小问题，大多数人）
   - 1.5-2.0: 正常
   - 2.0-3.0: 细腻光滑

3. **五官对称性** (0-3分)
   - 0-0.5: 明显不对称（大小眼/歪嘴）
   - 0.5-1.5: 轻微不对称
   - 1.5-2.5: 基本对称（大多数人）
   - 2.5-3.0: 很对称

4. **脸部年龄评分** (0-3分) - 以22岁为最优
   - 0-0.5: <15岁或>35岁
   - 0.5-1.5: 15-18岁或30-35岁
   - 1.5-2.0: 19-21岁或26-29岁
   - 2.0-3.0: 22-25岁（最优）

5. **发际线/发量** (0-2分)
   - 0-0.3: 秃顶/严重脱发
   - 0.3-0.8: 发际线明显后移
   - 0.8-1.2: 轻微后移
   - 1.2-1.8: 正常
   - 1.8-2.0: 浓密完美

6. **黑眼圈/眼袋** (0-2分)
   - 0-0.3: 严重（眼袋下垂/黑眼圈很深）
   - 0.3-0.8: 明显疲态
   - 0.8-1.5: 轻微
   - 1.5-2.0: 无/精神

7. **牙齿/嘴型** (0-2分)
   - 0-0.5: 严重问题（龅牙/地包天/严重不齐）
   - 0.5-1.0: 轻微问题
   - 1.0-1.5: 正常
   - 1.5-2.0: 整齐洁白

8. **鼻梁高度** (0-2分)
   - 0-0.5: 塌鼻梁/蒜头鼻
   - 0.5-1.0: 偏低
   - 1.0-1.5: 正常
   - 1.5-2.0: 挺拔

9. **P图程度** (0-3分，扣分项)
   - 0: 原图
   - 0.5-1.0: 轻度美颜
   - 1.0-2.0: 明显P图（磨皮瘦脸）
   - 2.0-3.0: 高P/换头

【计算方式】
加权基础分 = 体型×0.9 + 皮肤×0.7 + 对称×0.7 + 年龄×0.6 + 发际线×0.5 + 黑眼圈×0.5 + 牙齿×0.5 + 鼻梁×0.5
原始总分 = 加权基础分 - P图扣分
最终分 = 原始总分映射到正态分布（普通人5分左右，极少7分以上）

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
  "beauty_score": 映射后的最终分,
  "beauty_type": "类型",
  "ai_comment": "评语"
}`;

  log('开始调用火山引擎 API...');
  
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

  log(`请求模型: ${ARK_MODEL}`);
  log(`图片大小: ${Math.round(imageBase64.length / 1024)}KB`);

  try {
    const response = await fetch(ARK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    log(`API 响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log(`API 错误响应: ${errorText.slice(0, 500)}`);
      throw new Error(`API error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    log(`API 返回数据 keys: ${Object.keys(data).join(', ')}`);
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      log('错误: AI 返回内容为空');
      throw new Error('Empty response from AI');
    }

    log(`AI 原始返回: ${content.slice(0, 500)}...`);

    // 解析JSON
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);
    log(`JSON 解析成功: ${JSON.stringify(result).slice(0, 300)}...`);
    
    return result;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`analyzeBeauty 错误: ${errorMsg}`);
    throw error;
  }
}

// POST /api/beauty-score
export async function POST(request: NextRequest) {
  // 重置调试日志
  debugLogs = [];
  log('开始处理颜值打分请求');
  
  try {
    const body = await request.json();
    const { inviteCode, photoBase64 } = body;

    if (!inviteCode || !photoBase64) {
      log('错误: 缺少参数');
      return NextResponse.json(
        { success: false, error: '缺少参数', debug: debugLogs },
        { status: 400 }
      );
    }

    log(`邀请码: ${inviteCode}`);
    log(`照片数据长度: ${photoBase64?.length || 0}`);

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
      log(`创建新档案: ${profileId}`);
    } else {
      profileId = profileRes.rows[0].id;
      log(`使用现有档案: ${profileId}`);
    }

    const arkApiKey = getArkApiKey();
    
    let result: {
      photoshop_level: string;
      beauty_type: string;
      beauty_score: string;
      ai_comment: string;
      details: {
        body_shape: number;
        skin_quality: number;
        symmetry: number;
        face_age: number;
        hairline: number;
        eye_bags: number;
        teeth: number;
        nose_bridge: number;
        photoshop_deduction: number;
      };
      raw_score?: number;
    };

    if (!arkApiKey) {
      log('警告: 未配置 ARK_API_KEY，使用模拟数据');
      result = {
        photoshop_level: '0.5',
        beauty_type: '成熟型',
        beauty_score: '5.2',
        ai_comment: '基于9项客观指标的综合评分（模拟数据）',
        details: {
          body_shape: 2.0,
          skin_quality: 1.5,
          symmetry: 2.0,
          face_age: 2.5,
          hairline: 1.5,
          eye_bags: 1.2,
          teeth: 1.3,
          nose_bridge: 1.2,
          photoshop_deduction: 0.5,
        },
        raw_score: 4.2,
      };
    } else {
      try {
        log('开始 AI 分析...');
        const aiResult = await analyzeBeauty(photoBase64, arkApiKey);
        log('AI 分析完成');
        
        // 计算原始分（如果AI没算）
        const weights = {
          body_shape: 0.9,
          skin_quality: 0.7,
          symmetry: 0.7,
          face_age: 0.6,
          hairline: 0.5,
          eye_bags: 0.5,
          teeth: 0.5,
          nose_bridge: 0.5,
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

        result = {
          photoshop_level: details.photoshop_deduction.toFixed(1),
          beauty_type: aiResult.beauty_type || '成熟型',
          beauty_score: Math.max(0, Math.min(10, finalScore)).toFixed(1),
          ai_comment: aiResult.ai_comment || '综合9项客观指标的评分结果',
          details,
          raw_score: Math.round(rawScore * 100) / 100,
        };
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`AI分析失败: ${errorMsg}`);
        // fallback 到模拟数据
        result = {
          photoshop_level: '0.5',
          beauty_type: '成熟型',
          beauty_score: '5.2',
          ai_comment: `AI服务暂时不可用: ${errorMsg.slice(0, 100)}`,
          details: {
            body_shape: 2.0,
            skin_quality: 1.5,
            symmetry: 2.0,
            face_age: 2.5,
            hairline: 1.5,
            eye_bags: 1.2,
            teeth: 1.3,
            nose_bridge: 1.2,
            photoshop_deduction: 0.5,
          },
          raw_score: 4.2,
        };
      }
    }

    // 保存到数据库（兼容旧表结构）
    try {
      await sql.query(
        `INSERT INTO beauty_scores 
        (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment,
         body_shape, skin_quality, symmetry, face_age, hairline, eye_bags, teeth, nose_bridge, photoshop_deduction, evaluator)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ai')`,
        [profileId, result.photoshop_level, result.beauty_type, result.beauty_score, result.ai_comment,
         result.details.body_shape, result.details.skin_quality, result.details.symmetry, result.details.face_age,
         result.details.hairline, result.details.eye_bags, result.details.teeth, result.details.nose_bridge, result.details.photoshop_deduction]
      );
      log('数据库保存成功');
    } catch (dbError: unknown) {
      const dbErrorMsg = dbError instanceof Error ? dbError.message : String(dbError);
      log(`数据库插入失败: ${dbErrorMsg}`);
      // 如果新字段不存在，只插入基本字段
      await sql.query(
        `INSERT INTO beauty_scores 
        (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment, evaluator)
        VALUES ($1, $2, $3, $4, $5, 'ai')`,
        [profileId, result.photoshop_level, result.beauty_type, result.beauty_score, result.ai_comment]
      );
    }

    await sql.query(
      `UPDATE profiles 
      SET photoshop_level = $1, beauty_type = $2, beauty_score = $3, beauty_evaluated_at = NOW()
      WHERE id = $4`,
      [result.photoshop_level, result.beauty_type, result.beauty_score, profileId]
    );

    log(`打分完成: ${result.beauty_score}分`);

    return NextResponse.json({
      success: true,
      data: result,
      source: !arkApiKey ? 'mock' : 'ai',
      debug: debugLogs,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`服务器错误: ${errorMsg}`);
    return NextResponse.json(
      { success: false, error: '服务器错误', debug: debugLogs },
      { status: 500 }
    );
  }
}

// GET /api/beauty-score/check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少邀请码' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
