import { sql } from '@/lib/db';

// POST /api/admin/profiles/batch-tag
// Body: { tag: string }
// 给所有档案批量添加指定标签

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return Response.json(
        { success: false, error: '缺少标签参数' },
        { status: 400 }
      );
    }

    // 获取所有档案
    const profilesRes = await sql.query(
      'SELECT id, tags FROM profiles'
    );

    let updatedCount = 0;
    
    // 逐个更新，避免标签重复
    for (const profile of profilesRes.rows) {
      const currentTags = profile.tags || [];
      
      // 如果已经有这个标签，跳过
      if (currentTags.includes(tag)) {
        continue;
      }
      
      // 添加新标签
      const newTags = [...currentTags, tag];
      
      await sql.query(
        'UPDATE profiles SET tags = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(newTags), profile.id]
      );
      
      updatedCount++;
    }

    return Response.json({
      success: true,
      message: `成功给 ${updatedCount} 个档案添加了标签 "${tag}"`,
      totalProfiles: profilesRes.rows.length,
      updatedCount: updatedCount
    });

  } catch (error) {
    console.error('Batch tag error:', error);
    return Response.json(
      { success: false, error: '批量更新失败' },
      { status: 500 }
    );
  }
}
