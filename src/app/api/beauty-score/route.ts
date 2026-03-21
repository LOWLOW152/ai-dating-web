import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 火山引擎 ARK API 配置
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'doubao-1-5-vision-pro-250328'; // 豆包视觉模型

// 获取环境变量（运行时）
function getArkApiKey(): string | undefined {
  // 临时硬编码测试
  const HARDCODED_KEY = '66fe12c6-1a14-4fdc-beda-960abb6b28ad';
  
  const key = process.env.ARK_API_KEY;
  console.log('[Env] ARK_API_KEY present:', !!key);
  
  if (!key && HARDCODED_KEY) {
    console.log('[Env] Using hardcoded key');
    return HARDCODED_KEY;
  }
  
  return key;
}

// 调用火山引擎视觉模型
async function callVisionModel(imageBase64: string, apiKey: string): Promise<{
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
  console.log('[VisionAPI] Starting call to', ARK_API_URL);
  console.log('[VisionAPI] Model:', ARK_MODEL);
  console.log('[VisionAPI] API Key length:', apiKey.length);
  console.log('[VisionAPI] Image base64 length:', imageBase64.length);
  console.log('[VisionAPI] Image base64 starts with:', imageBase64.substring(0, 50));
  
  const prompt = `你是一位极其严格的形象分析师，请冷酷客观地分析这张照片中的人物。你的评分标准必须非常严苛，绝大多数人都是5分左右。

【铁律 - 必须遵守】
- 5分 = 普通人，大街上70%的人都是这个水平
- 5.5分 = 比普通人好一点点，但完全不出众
- 6分 = 小帅/小美，走在路上会有人多看一眼（前30%）
- 6.5分 = 确实好看，但不出挑（前15%）
- 7分 = 班草/班花级别，一个班40人里的TOP 3（前7%）
- 7.5分 = 系草/系花级别，很出众（前3%）
- 8分 = 能当小网红，靠脸吃饭的水平（前1%）
- 8.5分以上 = 明星级别，普通人见不到（前0.1%）
- 4分及以下 = 有明显硬伤（肥胖、严重不对称、皮肤问题严重、油腻猥琐）

【扣分项 - 看到就扣】
- 肥胖/大肚腩：五官最多给0.8分，总分最多5.5
- 皮肤差（痘痘、油光、暗沉）：皮肤最多给0.5分
- 表情油腻/猥琐/呆滞：气质最多给0.5分
- 体态差（驼背、脖子前倾）：气质扣0.3
- 普通人长相：五官1.0分封顶，别想太高

【分析步骤】
1. 先看性别和年龄
2. 严格逐项打分：

【五官协调度】(0-2分，极其严格)
- 0-0.3分: 严重不协调，大胃袋/极胖/五官畸形
- 0.3-0.6分: 明显不协调，大圆脸/小眼睛/塌鼻梁明显
- 0.6-1.0分: 一般，有明显瑕疵（如良子那种水平）
- 1.0-1.2分: 正常普通人，不丑也不帅（大多数人在这里）
- 1.2-1.5分: 五官端正，有点小帅/美（前20%）
- 1.5-1.8分: 五官精致，好看（前5%）
- 1.8-2.0分: 神颜，网红/明星级别（前0.5%）

【皮肤状态】(0-1.5分，极其严格)
- 0-0.3分: 严重皮肤问题（满脸痘、极其油腻、肤色暗沉发黄）
- 0.3-0.6分: 皮肤问题明显（有痘、油光、粗糙）
- 0.6-0.9分: 一般，有些问题但正常（大多数人）
- 0.9-1.2分: 皮肤还行，没大问题
- 1.2-1.5分: 皮肤好，细腻（很少见）

【气质神态】(0-1.5分，极其严格)
- 0-0.3分: 极其油腻、猥琐、眼神呆滞如死鱼、像良子
- 0.3-0.6分: 没精神、眼神空洞、表情僵硬
- 0.6-0.9分: 普通，没特点，路人感（大多数人）
- 0.9-1.2分: 自然放松，有点亲和力
- 1.2-1.5分: 眼神有光，有气场，出众（很少见）

【P图程度扣分】(0-2分)
- 0分: 原图直出
- 0.5分: 轻度美颜
- 1.0分: 磨皮瘦脸明显
- 1.5分: 高P
- 2.0分: 完全不像本人

【总分计算】
基准5分 + 五官 + 皮肤 + 气质 - P图扣分 = 最终得分(0-10)

【颜值类型】
- 女性：清纯型、御姐型、知性型、甜美型、冷艳型、阳光型、成熟型、可爱型、优雅型、时尚型
- 男性：阳光型、成熟型、斯文型、硬朗型、儒雅型、清爽型、稳重型、时尚型、痞帅型

【评语要求】
50字以内，根据分数诚实评价，不要给面子：
- 4-5分：直接说哪里不好（胖、皮肤差、没精神等）
- 5-6分：正常评价，不吹不黑
- 6-7分：确实有点小帅/小美，但也就那样
- 7分以上：确实好看，值得夸

【最后提醒】
- 如果这人看着像良子那种水平，直接4-5分，别给7分
- 如果这人看着像普通路人，5-5.5分，别想太高
- 如果这人确实好看，6分以上
- 绝大多数人都是5分左右，这是正常的
- 必须根据实际照片分析，不要套用示例数据

【输出格式】
纯JSON格式，不要任何其他文字，不要复制示例中的数值，必须根据实际照片给出真实评分：

{
  "beauty_type": "根据实际情况选择类型",
  "facial_features": 0.0-2.0之间的实际分数,
  "skin_quality": 0.0-1.5之间的实际分数,
  "temperament": 0.0-1.5之间的实际分数,
  "photoshop_deduction": 0.0-2.0之间的实际分数,
  "beauty_score": 根据公式计算的实际总分,
  "ai_comment": "根据实际照片特点给出的评语"
}`;

  const response = await fetch(ARK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,  // 火山引擎可能不需要 Bearer 前缀
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
  
  console.log('[VisionAPI] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VisionAPI] HTTP Error:', response.status, errorText);
    throw new Error(`Vision API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('[VisionAPI] Raw response:', JSON.stringify(data, null, 2));
  
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('[VisionAPI] No content in response');
    throw new Error('Invalid API response');
  }
  
  console.log('[VisionAPI] Content:', content);
  
  // 解析JSON
  try {
    // 清理可能的 markdown 代码块
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);
    
    console.log('[VisionAPI] Parsed result:', result);
    
    // 计算总分（如果AI没算对，重新算）
    const facial = Math.max(0, Math.min(2, parseFloat(result.facial_features) || 1));
    const skin = Math.max(0, Math.min(1.5, parseFloat(result.skin_quality) || 0.8));
    const temper = Math.max(0, Math.min(1.5, parseFloat(result.temperament) || 0.8));
    const ps = Math.max(0, Math.min(2, parseFloat(result.photoshop_deduction) || 0.5));
    const calculatedScore = 5 + facial + skin + temper - ps;
    const finalScore = Math.max(0, Math.min(10, Math.round(calculatedScore * 10) / 10));
    console.log('[VisionAPI] Calculated score:', finalScore, '(5 +', facial, '+', skin, '+', temper, '-', ps, ')');
    
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
  } catch (err) {
    // JSON解析失败，返回默认值
    console.error('[VisionAPI] JSON parse error:', err);
    console.log('[VisionAPI] Raw content was:', content);
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

    // 运行时获取 API Key
    const arkApiKey = getArkApiKey();
    console.log(`[BeautyScore] API Key configured: ${!!arkApiKey}`);
    console.log(`[BeautyScore] Profile ID: ${profileId}`);
    console.time('[BeautyScore] Total time');

    // 检查是否配置了火山引擎API
    if (!arkApiKey) {
      console.log('[BeautyScore] Using MOCK data (no API key)');
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
      console.log('[BeautyScore] Mock result:', result);
    } else {
      console.log('[BeautyScore] Calling Vision API...');
      console.time('[BeautyScore] Vision API call');
      
      try {
        // 调用视觉模型分析颜值
        const visionResult = await callVisionModel(photoBase64, arkApiKey);
        
        console.timeEnd('[BeautyScore] Vision API call');
        console.log('[BeautyScore] Vision API result:', visionResult);
        
        result = {
          photoshop_level: visionResult.details.photoshop_deduction.toFixed(1),
          beauty_type: visionResult.beauty_type,
          beauty_score: visionResult.beauty_score.toFixed(1),
          ai_comment: visionResult.ai_comment,
          details: visionResult.details
        };
      } catch (error) {
        console.error('[BeautyScore] Vision API failed:', error);
        console.log('[BeautyScore] Falling back to mock data');
        
        // API调用失败，使用模拟数据作为fallback
        const mockFacial = Number((0.8 + Math.random() * 0.8).toFixed(1));
        const mockSkin = Number((0.6 + Math.random() * 0.6).toFixed(1));
        const mockTemper = Number((0.7 + Math.random() * 0.6).toFixed(1));
        const mockPs = Number((Math.random() * 1.5).toFixed(1));
        const mockTotal = Number((5 + mockFacial + mockSkin + mockTemper - mockPs).toFixed(1));
        
        result = {
          photoshop_level: mockPs.toFixed(1),
          beauty_type: '成熟型',
          beauty_score: Math.min(10, mockTotal).toFixed(1),
          ai_comment: 'AI服务暂时不可用，这是模拟评分。',
          details: {
            facial_features: mockFacial,
            skin_quality: mockSkin,
            temperament: mockTemper,
            photoshop_deduction: mockPs,
          }
        };
      }
    }
    
    console.timeEnd('[BeautyScore] Total time');
    console.log('[BeautyScore] Final result:', result);

    // 保存评分
    await saveScore(profileId, result);

    console.log('[BeautyScore] Saved to database, returning response');

    return NextResponse.json({
      success: true,
      data: result,
      source: !arkApiKey ? 'mock' : 'ai',
      debug: {
        apiKeyConfigured: !!arkApiKey,
        apiKeyLength: arkApiKey?.length || 0,
        imageBase64Length: photoBase64?.length || 0,
      }
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
