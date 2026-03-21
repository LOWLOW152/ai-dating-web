import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/admin/photos - 上传照片
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, imageBase64 } = body;
    
    if (!profileId || !imageBase64) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }
    
    // 检查 base64 大小（限制 2MB）
    const base64Size = Buffer.byteLength(imageBase64, 'utf8');
    if (base64Size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '图片大小超过2MB限制' },
        { status: 400 }
      );
    }
    
    // 保存到数据库
    // 使用 data URL 格式存储，可以直接在 img 标签使用
    const result = await sql.query(`
      INSERT INTO photos (profile_id, storage_path, url, is_main)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      profileId,
      `db://photos/${profileId}/${Date.now()}`,
      imageBase64,
      false
    ]);
    
    // 更新档案 has_photos 标记
    await sql.query(`
      UPDATE profiles SET has_photos = true WHERE id = $1
    `, [profileId]);
    
    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id }
    });
    
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/photos?profileId=xxx - 获取照片列表
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
    
    const result = await sql.query(`
      SELECT id, url, is_main, uploaded_at
      FROM photos
      WHERE profile_id = $1
      ORDER BY is_main DESC, uploaded_at DESC
    `, [profileId]);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/photos?id=xxx - 删除照片
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少照片ID' },
        { status: 400 }
      );
    }
    
    await sql.query('DELETE FROM photos WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
