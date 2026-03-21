import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

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
