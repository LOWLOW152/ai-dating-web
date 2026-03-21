import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 颜值评分提示词
const BEAUTY_SCORE_PROMPT = `你是一个专业的形象分析师，擅长客观评价照片。

【任务】
分析用户上传的照片，从多个维度给出评分（0-10分）和评语。

【评分维度】
1. overall_score: 整体颜值印象（0-10）
2. facial_features: 五官立体度/协调性（0-10）
3. temperament: 气质/气场（0-10）
4. expression: 表情自然度（0-10）
5. photo_quality: 照片质量（光线/清晰度）（0-10）

【输出要求】
必须用JSON格式返回：

{
  "overall_score": 7.5,
  "facial_features": 7.0,
  "temperament": 8.0,
  "expression": 7.5,
  "photo_quality": 6.5,
  "comment": "50字以内的评语，既要真诚又要给人信心",
  "tags": ["标签1", "标签2", "标签3"]
}

注意：
- 评分要客观但友善，不要打击人
- 标签是形象关键词，如"阳光"、"知性"、"亲和"等
- 评语要温暖，同时指出可以改进的地方`;

// POST /api/admin/beauty-score - 给照片打分
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, photoId, imageBase64 } = body;
    
    if (!profileId || !imageBase64) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.DOUBAO_API_KEY;
    
    // 如果没有配置API，返回模拟评分（用于测试）
    if (!apiKey) {
      const mockScore = {
        overall_score: (6.5 + Math.random() * 2.5).toFixed(1),
        facial_features: (6.0 + Math.random() * 2.5).toFixed(1),
        temperament: (6.5 + Math.random() * 2.5).toFixed(1),
        expression: (7.0 + Math.random() * 2.0).toFixed(1),
        photo_quality: (6.0 + Math.random() * 2.5).toFixed(1),
        comment: "整体形象不错，表情自然，给人感觉很亲和。建议多尝试不同风格的照片。",
        tags: ["阳光", "亲和", "自然"]
      };
      
      await saveScore(profileId, photoId, mockScore);
      
      return NextResponse.json({ 
        success: true, 
        data: mockScore,
        mock: true 
      });
    }
    
    // 调用豆包多模态API（如果有的话）
    // 目前豆包可能不支持图片，这里先返回模拟数据
    // 后续可以接入其他图像识别API
    
    return NextResponse.json({
      success: false,
      error: '图片评分API暂未配置，请先配置豆包多模态API'
    });
    
  } catch (error) {
    console.error('Beauty score error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/beauty-score?profileId=xxx - 获取评分
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: '缺少profileId' },
        { status: 400 }
      );
    }
    
    // 获取照片和评分
    const photosRes = await sql.query(`
      SELECT 
        p.id, p.url, p.is_main, p.uploaded_at,
        bs.overall_score, bs.facial_features, bs.temperament,
        bs.expression, bs.photo_quality, bs.ai_comment, bs.ai_tags
      FROM photos p
      LEFT JOIN beauty_scores bs ON p.id = bs.photo_id
      WHERE p.profile_id = $1
      ORDER BY p.is_main DESC, p.uploaded_at DESC
    `, [profileId]);
    
    return NextResponse.json({
      success: true,
      data: photosRes.rows
    });
    
  } catch (error) {
    console.error('Get beauty scores error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 保存评分到数据库
async function saveScore(profileId: string, photoId: number, score: any) {
  await sql.query(`
    INSERT INTO beauty_scores 
    (profile_id, photo_id, overall_score, facial_features, temperament, expression, photo_quality, ai_comment, ai_tags)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (photo_id) DO UPDATE SET
      overall_score = EXCLUDED.overall_score,
      facial_features = EXCLUDED.facial_features,
      temperament = EXCLUDED.temperament,
      expression = EXCLUDED.expression,
      photo_quality = EXCLUDED.photo_quality,
      ai_comment = EXCLUDED.ai_comment,
      ai_tags = EXCLUDED.ai_tags,
      scored_at = NOW()
  `, [
    profileId,
    photoId,
    score.overall_score,
    score.facial_features,
    score.temperament,
    score.expression,
    score.photo_quality,
    score.comment,
    score.tags
  ]);
  
  // 更新档案的平均分
  await sql.query(`
    UPDATE profiles 
    SET avg_beauty_score = (
      SELECT AVG(overall_score) FROM beauty_scores WHERE profile_id = $1
    )
    WHERE id = $1
  `, [profileId]);
}
