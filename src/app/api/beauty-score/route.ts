import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 火山引擎 ARK API 配置
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'doubao-1-5-vision-pro-250328'; // 豆包视觉模型

// 调用火山引擎视觉模型
async function callVisionModel(imageBase64: string): Promise<{
  beauty_type: string;
  beauty_score: number;
  ai_comment: string;
  details: {
    facial_features: number;
    skin_quality: number;
    temperament: number;
    photoshop_deduction: number;
  };
}> {
  if (!ARK_API_KEY) {
    throw new Error('ARK_API_KEY not configured');
  }
  
  const prompt = `你是一位专业的形象分析师，请分析这张照片中的人物。

【分析步骤】
1. 先看性别和年龄：判断是男性还是女性，年轻人/中年人/老年人
2. 按以下维度逐项打分（严格按照标准，不要手松）：

【五官协调度】(0-2分，权重30%)
- 0.0-0.5分: 比例明显不协调，有硬伤
- 0.5-1.0分: 基本正常，有明显瑕疵
- 1.0-1.5分: 比例好，看着舒服，有小亮点
- 1.5-2.0分: 三庭五眼标准，五官精致，耐看

【皮肤状态】(0-1.5分，权重25%)
- 0.0-0.5分: 明显瑕疵多（痘痘、暗沉、粗糙）
- 0.5-1.0分: 一般状态，有些问题但可接受
- 1.0-1.5分: 细腻光滑，状态好，有光泽

【气质神态】(0-1.5分，权重25%)
- 0.0-0.5分: 表情僵硬、眼神空洞、没精神
- 0.5-1.0分: 自然放松，正常状态
- 1.0-1.5分: 有感染力，眼神有光，气场好

【P图程度扣分】(0-2分扣分，权重20%)
- 0分: 原生感，几乎没P
- 0.5分: 轻度美颜，可接受
- 1.0分: 磨皮瘦脸明显，一眼假
- 1.5分: 像换了个人，高P
- 2.0分: 假人感，完全看不出原貌

【总分计算】
基准5分 + 五官 + 皮肤 + 气质 - P图扣分 = 最终得分(0-10)

【颜值类型】（根据性别年龄选择）
- 女性：清纯型、御姐型、知性型、甜美型、冷艳型、阳光型、成熟型、可爱型、优雅型、时尚型
- 男性：阳光型、成熟型、斯文型、硬朗型、儒雅型、清爽型、稳重型、时尚型、痞帅型

【评语要求】
50字以内，真诚但有温度，根据分数调整语气：
- 5分以下：委婉鼓励，提改善建议
- 5-6分：正常评价，找亮点
- 6-7分：肯定优点
- 7分以上：真诚赞美

【输出格式】
必须用纯JSON格式，不要有任何其他文字：

{
  "beauty_type": "成熟型",
  "facial_features": 1.2,
  "skin_quality": 1.0,
  "temperament": 1.1,
  "photoshop_deduction": 0.5,
  "beauty_score": 7.8,
  "ai_comment": "五官端正，气质稳重，整体给人可靠成熟的感觉"
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
      temperature: 0.3,
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
    
    // 计算总分（如果AI没算对，重新算）
    const facial = Math.max(0, Math.min(2, parseFloat(result.facial_features) || 1));
    const skin = Math.max(0, Math.min(1.5, parseFloat(result.skin_quality) || 0.8));
    const temper = Math.max(0, Math.min(1.5, parseFloat(result.temperament) || 0.8));
    const ps = Math.max(0, Math.min(2, parseFloat(result.photoshop_deduction) || 0.5));
    const calculatedScore = 5 + facial + skin + temper - ps;
    const finalScore = Math.max(0, Math.min(10, Math.round(calculatedScore * 10) / 10));
    
    return {
      beauty_type: result.beauty_type || '成熟型',
      beauty_score: finalScore,
      ai_comment: result.ai_comment || '整体形象不错，给人感觉很舒服。',
      details: {
        facial_features: facial,
        skin_quality: skin,
        temperament: temper,
        photoshop_deduction: ps,
      }
    };
  } catch {
    // JSON解析失败，返回默认值
    return {
      beauty_type: '成熟型',
      beauty_score: 5.5,
      ai_comment: content.slice(0, 100),
      details: {
        facial_features: 1.0,
        skin_quality: 0.8,
        temperament: 0.8,
        photoshop_deduction: 0.5,
      }
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
      details: {
        facial_features: number;
        skin_quality: number;
        temperament: number;
        photoshop_deduction: number;
      };
    };

    // 检查是否配置了火山引擎API
    if (!ARK_API_KEY) {
      // 未配置API，使用模拟数据（也包含详细分数）
      const mockFacial = Number((0.8 + Math.random() * 0.8).toFixed(1));
      const mockSkin = Number((0.6 + Math.random() * 0.6).toFixed(1));
      const mockTemper = Number((0.7 + Math.random() * 0.6).toFixed(1));
      const mockPs = Number((Math.random() * 1.5).toFixed(1));
      const mockTotal = Number((5 + mockFacial + mockSkin + mockTemper - mockPs).toFixed(1));
      
      result = {
        photoshop_level: mockPs.toFixed(1),
        beauty_type: ['清纯型', '甜美型', '知性型', '优雅型', '阳光型', '成熟型'][Math.floor(Math.random() * 6)],
        beauty_score: Math.min(10, mockTotal).toFixed(1),
        ai_comment: '整体形象不错，气质自然，给人感觉很舒服。建议保持自信！',
        details: {
          facial_features: mockFacial,
          skin_quality: mockSkin,
          temperament: mockTemper,
          photoshop_deduction: mockPs,
        }
      };
    } else {
      // 调用视觉模型分析颜值
      const visionResult = await callVisionModel(photoBase64);
      
      result = {
        photoshop_level: visionResult.details.photoshop_deduction.toFixed(1),
        beauty_type: visionResult.beauty_type,
        beauty_score: visionResult.beauty_score.toFixed(1),
        ai_comment: visionResult.ai_comment,
        details: visionResult.details
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
  details: {
    facial_features: number;
    skin_quality: number;
    temperament: number;
    photoshop_deduction: number;
  };
}

async function saveScore(profileId: string, score: BeautyScore) {
  // 保存到beauty_scores历史表
  await sql.query(
    `INSERT INTO beauty_scores 
    (profile_id, photoshop_level, beauty_type, beauty_score, ai_comment, evaluator,
     facial_features, skin_quality, temperament, photoshop_deduction)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [profileId, score.photoshop_level, score.beauty_type, score.beauty_score, score.ai_comment, 'ai',
     score.details.facial_features, score.details.skin_quality, score.details.temperament, score.details.photoshop_deduction]
  );

  // 更新profiles表的最新评分
  await sql.query(
    `UPDATE profiles 
    SET 
      photoshop_level = $1,
      beauty_type = $2,
      beauty_score = $3,
      facial_features = $4,
      skin_quality = $5,
      temperament = $6,
      photoshop_deduction = $7,
      beauty_evaluated_at = NOW()
    WHERE id = $8`,
    [score.photoshop_level, score.beauty_type, score.beauty_score,
     score.details.facial_features, score.details.skin_quality, score.details.temperament, score.details.photoshop_deduction,
     profileId]
  );
}
