import { sql } from '@/lib/db';
import { NextRequest } from 'next/server';

// PUT /api/admin/profile-templates/:id/prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { system_prompt, progress_template, data_format_template, context_limit } = await request.json();

    await sql.query(
      `UPDATE profile_templates 
       SET system_prompt = $1, 
           progress_template = $2, 
           data_format_template = $3, 
           context_limit = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [system_prompt, progress_template, data_format_template, context_limit, params.id]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update prompt error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
