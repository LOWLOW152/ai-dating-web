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

      {/* AI 评价 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI 评价</h2>
          <span className={`text-xs px-2 py-1 rounded ${
            profile.ai_evaluation_status === 'completed' ? 'bg-green-100 text-green-700' :
            profile.ai_evaluation_status === 'processing' ? 'bg-blue-100 text-blue-700' :
            profile.ai_evaluation_status === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {profile.ai_evaluation_status === 'completed' ? '已完成' :
             profile.ai_evaluation_status === 'processing' ? '评价中' :
             profile.ai_evaluation_status === 'failed' ? '失败' : '待评价'}
          </span>
        </div>
        
        {profile.ai_evaluation ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-xs text-gray-500">性格画像</p>
                <p className="text-sm font-medium">{profile.ai_evaluation.personality?.join(', ') || '-'}</p>
              </div>
              <div className="bg-pink-50 p-3 rounded">
                <p className="text-xs text-gray-500">情感需求</p>
                <p className="text-sm font-medium">{profile.ai_evaluation.emotional_needs || '-'}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-500">相处模式</p>
                <p className="text-sm font-medium">{profile.ai_evaluation.interaction_style || '-'}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-500">适合类型</p>
                <p className="text-sm font-medium">{profile.ai_evaluation.suitable_types?.join(', ') || '-'}</p>
              </div>
            </div>
            
            {profile.ai_evaluation.match_tags && (
              <div>
                <p className="text-xs text-gray-500 mb-2">匹配标签</p>
                <div className="flex flex-wrap gap-2">
                  {profile.ai_evaluation.match_tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {profile.ai_evaluation.summary && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500">整体评价</p>
                <p className="text-sm">{profile.ai_evaluation.summary}</p>
              </div>
            )}
            
            {profile.ai_evaluation.red_flags && profile.ai_evaluation.red_flags.length > 0 && (
              <div className="bg-red-50 p-3 rounded">
                <p className="text-xs text-red-500 font-medium">⚠️ 红旗预警</p>
                <ul className="text-sm text-red-700 mt-1">
                  {profile.ai_evaluation.red_flags.map((flag: string, i: number) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {profile.ai_evaluated_at && (
              <p className="text-xs text-gray-400">评价时间: {new Date(profile.ai_evaluated_at).toLocaleString()}</p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">该档案尚未进行AI评价</p>
            <a 
              href={`/admin/evaluation?profile=${profile.id}`}
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              去评价
            </a>
          </div>
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
