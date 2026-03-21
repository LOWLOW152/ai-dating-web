import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getProfile(id: string) {
  const result = await sql.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return result.rows[0];
}

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  
  if (!profile) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">档案详情</h1>
        <Link href="/admin/profiles" className="text-blue-600 hover:underline">
          ← 返回列表
        </Link>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-500">档案ID</p>
            <p className="font-mono text-lg">{profile.id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {profile.status}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">邀请码</p>
            <p className="font-medium">{profile.invite_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">创建时间</p>
            <p className="font-medium">{new Date(profile.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">完成时间</p>
            <p className="font-medium">{profile.completed_at ? new Date(profile.completed_at).toLocaleString() : '未完成'}</p>
          </div>
        </div>
      </div>

      {/* 答题数据 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">答题数据</h2>
        {profile.answers && Object.keys(profile.answers).length > 0 ? (
          <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(profile.answers, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">暂无答题数据</p>
        )}
      </div>

      {/* AI 总结 */}
      {profile.ai_summary && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">AI 总结</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(profile.ai_summary, null, 2)}
          </pre>
        </div>
      )}

      {/* 管理备注 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">管理备注</h2>
        <p className="text-gray-500">{profile.admin_notes || '暂无备注'}</p>
      </div>

      {/* 人工标签 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">人工标签</h2>
        {profile.manual_tags && profile.manual_tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.manual_tags.map((tag: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">暂无标签</p>
        )}
      </div>
    </div>
  );
}
