import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，使用 Node.js runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/admin/system-configs
export async function GET() {
  try {
    console.log('GET /api/admin/system-configs called');
    const result = await sql.query('SELECT key, value FROM system_configs');
    
    const configs: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => {
      configs[row.key] = row.value;
    });
    
    console.log('GET system_configs success, count:', Object.keys(configs).length);
    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('GET system_configs error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/system-configs
export async function PUT(request: NextRequest) {
  try {
    console.log('PUT /api/admin/system-configs called');
    
    let body;
    try {
      body = await request.json();
      console.log('Request body keys:', Object.keys(body));
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { success: false, error: '请求体解析失败: ' + String(e) },
        { status: 400 }
      );
    }
    
    const { system_prompt, progress_template, data_format_template, context_limit, coordinator_prompt } = body;

    // 更新或插入配置
    console.log('Executing SQL...');
    await sql.query(
      `INSERT INTO system_configs (key, value, updated_at) VALUES
       ('system_prompt', $1, NOW()),
       ('progress_template', $2, NOW()),
       ('data_format_template', $3, NOW()),
       ('context_limit', $4, NOW()),
       ('coordinator_prompt', $5, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [system_prompt, progress_template, data_format_template, String(context_limit), coordinator_prompt || '']
    );
    console.log('SQL executed successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update system configs error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
