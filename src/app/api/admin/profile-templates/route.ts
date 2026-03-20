import { sql } from '@/lib/db';

// GET /api/admin/profile-templates
export async function GET() {
  try {
    const result = await sql.query(
      'SELECT * FROM profile_templates WHERE is_active = true ORDER BY created_at DESC'
    );
    
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}