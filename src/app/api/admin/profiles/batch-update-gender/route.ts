import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 批量修改档案性别（开发测试用）
 * POST /api/admin/profiles/batch-update-gender
 * Body: { profileIds: string[], gender: '男' | '女' }
 */

export async function POST(request: NextRequest) {
  try {
    const { profileIds, gender } = await request.json();

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return Response.json({ success: false, error: '缺少profileIds' }, { status: 400 });
    }

    if (!gender || !['男', '女'].includes(gender)) {
      return Response.json({ success: false, error: 'gender必须是"男"或"女"' }, { status: 400 });
    }

    // 更新档案性别
    const updateRes = await sql.query(
      `UPDATE profiles 
       SET answers = answers || jsonb_build_object('gender', $1),
           standardized_answers = CASE 
             WHEN standardized_answers IS NOT NULL 
             THEN standardized_answers || jsonb_build_object('gender', $1)
             ELSE NULL 
           END
       WHERE id = ANY($2)
       RETURNING id, invite_code`,
      [gender, profileIds]
    );

    return Response.json({
      success: true,
      message: `成功更新 ${updateRes.rows.length} 个档案`,
      data: updateRes.rows
    });

  } catch (error) {
    console.error('Batch update gender error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET - 获取所有档案列表（方便选择）
export async function GET() {
  try {
    const res = await sql.query(
      `SELECT id, invite_code, answers->>'nickname' as nickname, 
              answers->>'gender' as gender,
              answers->>'birthYear' as birthYear,
              answers->>'city' as city
       FROM profiles 
       WHERE status = 'completed'
       ORDER BY invite_code`
    );

    return Response.json({
      success: true,
      data: res.rows
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
