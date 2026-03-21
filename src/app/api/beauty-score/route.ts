import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// AI颜值评分提示词
const BEAUTY_SCORE_PROMPT = `你是一个专业的形象分析师，擅长客观评价照片。

【任务】
分析用户上传的照片，给出三个维度的评分。

【评分维度】
1. photoshop_level: P图程度 0-10（0=完全没P，10=P得认不出来）
2. beauty_type: 颜值类型（从以下选一个最符合的：清纯型、御姐型、知性型、甜美型、冷艳型、阳光型、成熟型、可爱型、优雅型、时尚型）
3. beauty_score: 颜值评分 0-10（综合打分）

【输出要求】
必须用JSON格式返回，不要有任何其他文字：

{
  "photoshop_level": 5.5,
  "beauty_type": "清纯型",
  "beauty_score": 7.5,
  "ai_comment": "50字以内的评语，既要真诚又要给人信心"
}

注意：
- 评分要客观但友善
- ai_comment要温暖，同时可以提一点建议`;

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

    // 查找档案
    const profileRes = await sql.query(
      'SELECT id FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );

    if (profileRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '档案不存在' },
        { status: 404 }
      );
    }

    const profileId = profileRes.rows[0].id;

    const apiKey = process.env.DOUBAO_API_KEY;

    // 如果没有配置API，返回模拟评分
    if (!apiKey) {
      const mockScore = {
        photoshop_level: (3 + Math.random() * 4).toFixed(1),
        beauty_type: ['清纯型', '甜美型', '知性型', '优雅型'][Math.floor(Math.random() * 4)],
        beauty_score: (6 + Math.random() * 3).toFixed(1),
        ai_comment: '整体形象不错，气质自然，给人感觉很舒服。建议保持自信！'
      };

      // 保存评分
      await saveScore(profileId, mockScore);

      return NextResponse.json({
        success: true,
        data: mockScore,
        mock: true
      });
    }

    // TODO: 调用豆包多模态API进行真实评分
    // 目前豆包可能不支持图片，先返回模拟数据

    return NextResponse.json({
      success: false,
      error: 'AI评分服务暂未配置'
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

    // 从profiles表获取最新评分
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
async function saveScore(profileId: string, score: any) {
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
