import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 火山引擎 ARK API 配置
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'doubao-1-5-vision-pro-250328'; // 豆包视觉模型

// 技术指标分析P图程度
function analyzePhotoshopLevel(imageBase64: string): number {
  // 从 base64 提取图片数据
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // 文件大小分析（P过的图通常压缩率异常）
  const fileSizeKB = buffer.length / 1024;
  
  // 基础分数
  let score = 5;
  
  // 文件大小异常检测
  // 正常手机照片: 500KB-3MB
  // 微信压缩后: 100-500KB
  // P得很厉害的图（多次压缩/保存）: 可能异常小或异常大
  if (fileSizeKB < 50) {
    // 文件太小，可能是多次压缩或截图
    score += 2;
  } else if (fileSizeKB > 3000) {
    // 文件太大，可能是原图未压缩，P图概率较低
    score -= 1;
  }
  
  // 分析 base64 数据特征（简单启发式）
  // P过的图常有这些特征：
  // 1. 平滑区域过多（磨皮）
  // 2. 高频噪点异常（锐化过度）
  
  // 这里用熵值估算（简单版）
  const entropy = calculateEntropy(buffer);
  if (entropy < 7) {
    // 熵值低，可能过度平滑（磨皮）
    score += 1.5;
  } else if (entropy > 7.8) {
    // 熵值高，细节丰富，原生概率大
    score -= 1;
  }
  
  // 限制在 0-10 范围
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

// 计算熵值（信息论）
function calculateEntropy(buffer: Buffer): number {
  const freq = new Array(256).fill(0);
  for (let i = 0; i < buffer.length; i++) {
    freq[buffer[i]]++;
  }
  
  let entropy = 0;
  const len = buffer.length;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / len;
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

// 调用火山引擎视觉模型
async function callVisionModel(imageBase64: string): Promise<{
  beauty_type: string;
  beauty_score: number;
  ai_comment: string;
}> {
  if (!ARK_API_KEY) {
    throw new Error('ARK_API_KEY not configured');
  }
  
  const prompt = `你是一位专业的形象分析师，请分析这张照片中的人物。

【分析要求】
1. 判断颜值类型（从以下选一个最符合的）：清纯型、御姐型、知性型、甜美型、冷艳型、阳光型、成熟型、可爱型、优雅型、时尚型
2. 给出颜值评分（0-10分，客观但有温度）
3. 写一句50字以内的评语，既要真诚又要给人信心

【输出格式】
必须用纯JSON格式返回，不要有任何其他文字：

{
  "beauty_type": "清纯型",
  "beauty_score": 7.5,
  "ai_comment": "整体形象清新自然，五官协调，给人很舒服的感觉"
}`;

  const response = await fetch(ARK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ARK_API_KEY}`,
    },
    body: JSON.stringify({
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
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error: ${error}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Invalid API response');
  }
  
  // 解析JSON
  try {
    // 清理可能的 markdown 代码块
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    return {
      beauty_type: result.beauty_type || '知性型',
      beauty_score: Math.max(0, Math.min(10, parseFloat(result.beauty_score) || 7)),
      ai_comment: result.ai_comment || '整体形象不错，给人感觉很舒服。'
    };
  } catch {
    // JSON解析失败，返回默认值
    return {
      beauty_type: '知性型',
      beauty_score: 7,
      ai_comment: content.slice(0, 100)
    };
  }
}

// POST /api/beauty-score - 用户提交照片获取评分
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

    // 查找或创建档案
    const profileRes = await sql.query(
      'SELECT id FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );

    let profileId: string;

    if (profileRes.rows.length === 0) {
      // 档案不存在，自动创建
      profileId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${inviteCode}`;
      
      await sql.query(
        `INSERT INTO profiles (id, invite_code, answers, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())`,
        [profileId, inviteCode, JSON.stringify({})]
      );
    } else {
      profileId = profileRes.rows[0].id;
    }

    let result: {
      photoshop_level: string;
      beauty_type: string;
      beauty_score: string;
      ai_comment: string;
    };

    // 检查是否配置了火山引擎API
    if (!ARK_API_KEY) {
      // 未配置API，使用模拟数据
      result = {
        photoshop_level: (3 + Math.random() * 4).toFixed(1),
        beauty_type: ['清纯型', '甜美型', '知性型', '优雅型'][Math.floor(Math.random() * 4)],
        beauty_score: (6 + Math.random() * 3).toFixed(1),
        ai_comment: '整体形象不错，气质自然，给人感觉很舒服。建议保持自信！'
      };
    } else {
      // 技术指标分析P图程度
      const photoshopLevel = analyzePhotoshopLevel(photoBase64);
      
      // 调用视觉模型分析颜值
      const visionResult = await callVisionModel(photoBase64);
      
      result = {
        photoshop_level: photoshopLevel.toFixed(1),
        beauty_type: visionResult.beauty_type,
        beauty_score: visionResult.beauty_score.toFixed(1),
        ai_comment: visionResult.ai_comment
      };
    }

    // 保存评分
    await saveScore(profileId, result);

    return NextResponse.json({
      success: true,
      data: result,
      mock: !ARK_API_KEY
    });

  } catch (error) {
    console.error('Beauty score error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/beauty-score/check - 检查是否已有评分
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

    // 从profiles表获取最新评分（档案可能不存在，不报错）
    const profileRes = await sql.query(
      `SELECT 
        photoshop_level,
        beauty_type,
        beauty_score,
        beauty_evaluated_at
      FROM profiles 
      WHERE invite_code = $1 
      AND beauty_score IS NOT NULL`,
      [code]
    );

    if (profileRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    const row = profileRes.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        photoshop_level: row.photoshop_level,
        beauty_type: row.beauty_type,
        beauty_score: row.beauty_score,
        evaluated_at: row.beauty_evaluated_at
      }
    });

  } catch (error) {
    console.error('Check beauty score error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 保存评分到数据库
interface BeautyScore {
  photoshop_level: string;
  beauty_type: string;
  beauty_score: string;
  ai_comment: string;
}

async function saveScore(profileId: string, score: BeautyScore) {
  // 保存到beauty_scores历史表
  await sql.query(
    `INSERT INTO beauty_scores 
    (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment, evaluator)
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [profileId, score.photoshop_level, score.beauty_type, score.beauty_score, score.ai_comment, 'ai']
  );

  // 更新profiles表的最新评分
  await sql.query(
    `UPDATE profiles 
    SET 
      photoshop_level = $1,
      beauty_type = $2,
      beauty_score = $3,
      beauty_evaluated_at = NOW()
    WHERE id = $4`,
    [score.photoshop_level, score.beauty_type, score.beauty_score, profileId]
  );
}
