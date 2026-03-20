import { sql } from '@/lib/db';

// GET /api/admin/system-configs
export async function GET() {
  try {
    const result = await sql.query('SELECT key, value FROM system_configs');
    
    const configs: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => {
      configs[row.key] = row.value;
    });
    
    return Response.json({ success: true, data: configs });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/system-configs
export async function PUT(request: Request) {
  try {
    const { system_prompt, progress_template, data_format_template, context_limit } = await request.json();

    // 更新或插入配置
    await sql.query(
      `INSERT INTO system_configs (key, value, updated_at) VALUES
       ('system_prompt', $1, NOW()),
       ('progress_template', $2, NOW()),
       ('data_format_template', $3, NOW()),
       ('context_limit', $4, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [system_prompt, progress_template, data_format_template, String(context_limit)]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update system configs error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
