import { sql } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getTemplates() {
  const result = await sql.query('SELECT * FROM profile_templates ORDER BY created_at DESC');
  return result.rows;
}

export default async function ProfileTemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">资料库管理</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          + 新建资料库
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              {t.is_default && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">默认</span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-4">{t.description || '无描述'}</p>
            
            <div className="flex gap-4 text-sm flex-wrap">
              <Link
                href={`/admin/profile-templates/${t.id}/prompt`}
                className="text-purple-600 hover:underline"
              >
                配置AI提示词 →
              </Link>
              <Link
                href={`/admin/profile-templates/${t.id}`}
                className="text-blue-600 hover:underline"
              >
                配置权重 →
              </Link>
              <Link
                href={`/admin/profile-templates/${t.id}/level1`}
                className="text-emerald-600 hover:underline"
              >
                第一层筛选 →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}