import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getProfile(id: string) {
  const result = await sql.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return result.rows[0];
}

async function getProfileTags(id: string) {
  const result = await sql.query('SELECT tags FROM profile_ai_tags WHERE profile_id = $1', [id]);
  return result.rows[0]?.tags || null;
}

// 标签分类配置
const TAG_CATEGORIES = [
  { key: '基础条件', color: 'bg-blue-50 text-blue-700' },
  { key: '生活方式', color: 'bg-green-50 text-green-700' },
  { key: '情感模式', color: 'bg-pink-50 text-pink-700' },
  { key: '价值观', color: 'bg-purple-50 text-purple-700' },
  { key: 'AI综合', color: 'bg-orange-50 text-orange-700' },
];

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  const aiTags = await getProfileTags(params.id);
  
  if (!profile) {
    notFound();
  }

  // 解析标签
  const tags = aiTags || profile.ai_evaluation?.tags || {};
  
  // 按分类分组
  const groupedTags: Record<string, Record<string, string | string[]>> = {};
  Object.entries(tags).forEach(([key, value]) => {
    const [category, name] = key.split('_');
    if (!groupedTags[category]) {
      groupedTags[category] = {};
    }
    groupedTags[category][name] = value;
  });

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

      {/* AI提取标签 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI提取标签</h2>
          <span className={`text-xs px-2 py-1 rounded ${
            Object.keys(tags).length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {Object.keys(tags).length > 0 ? `已提取 ${Object.keys(tags).length} 个标签` : '未提取'}
          </span>
        </div>
        
        {Object.keys(tags).length > 0 ? (
          <div className="space-y-4">
            {TAG_CATEGORIES.map(({ key, color }) => {
              const categoryTags = groupedTags[key];
              if (!categoryTags) return null;
              
              return (
                <div key={key} className="border-b last:border-0 pb-4 last:pb-0">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{key}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(categoryTags).map(([name, value]) => (
                      <div key={name} className={`p-2 rounded ${color}`}>
                        <p className="text-xs opacity-75">{name}</p>
                        <p className="text-sm font-medium truncate">
                          {Array.isArray(value) ? value.join(', ') : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">该档案尚未提取AI标签</p>
            <a 
              href={`/admin/evaluation?profile=${profile.id}`}
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              去评价提取标签
            </a>
          </div>
        )}
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

      {/* 颜值评分 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">颜值评分</h2>
          <Link 
            href={`/admin/beauty-score`}
            className="text-sm text-pink-600 hover:underline"
          >
            去评分 →
          </Link>
        </div>
        
        {profile.beauty_score !== undefined ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-50 p-3 rounded text-center">
                <p className="text-xs text-gray-500">P图程度</p>
                <p className="text-xl font-bold text-orange-600">{profile.photoshop_level}</p>
                <p className="text-xs text-gray-400">
                  {profile.photoshop_level <= 3 ? '原生' : 
                   profile.photoshop_level <= 6 ? '微P' : '重P'}
                </p>
              </div>
              <div className="bg-pink-50 p-3 rounded text-center">
                <p className="text-xs text-gray-500">颜值类型</p>
                <p className="text-sm font-bold text-pink-600">{profile.beauty_type}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <p className="text-xs text-gray-500">颜值评分</p>
                <p className="text-xl font-bold text-purple-600">{profile.beauty_score}</p>
              </div>
            </div>
            
            {profile.beauty_evaluated_at && (
              <p className="text-xs text-gray-400">
                评分时间: {new Date(profile.beauty_evaluated_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">该档案尚未颜值评分</p>
            <Link 
              href={`/admin/beauty-score`}
              className="inline-block px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 text-sm"
            >
              去评分
            </Link>
          </div>
        )}
      </div>

      {/* AI 评价原文 */}
      {profile.ai_evaluation && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">AI 评价原文</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(profile.ai_evaluation, null, 2)}
          </pre>
        </div>
      )}

      {/* 管理备注 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">管理备注</h2>
        <p className="text-gray-500">{profile.admin_notes || '暂无备注'}</p>
      </div>

      {/* 运营标签 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">运营标签</h2>
        {profile.tags && profile.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.tags.map((tag: string, i: number) => (
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
