'use client';

import { useState } from 'react';

interface ProfileDetail {
  profile: {
    id: string;
    invite_code: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    updated_at: string;
    ai_evaluation_status: string;
    answer_count: number;
  };
  answers: Record<string, unknown> | null;
  beauty_score: {
    beauty_score: number;
    beauty_type: string;
    photoshop_level: number;
    ai_comment: string;
    scored_at: string;
  } | null;
  ai_tags: Record<string, unknown> | null;
}

export default function ProfileQueryPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileDetail | null>(null);
  const [error, setError] = useState('');

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/admin/profile-detail?code=${inviteCode.trim().toUpperCase()}`);
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '查询失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '无';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">档案查询</h1>

        {/* 搜索框 */}
        <form onSubmit={handleQuery} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="输入邀请码，如：PQMU4BUK"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '查询中...' : '查询'}
            </button>
          </div>
          {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
        </form>

        {/* 查询结果 */}
        {result && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">档案ID：</span>
                  <span className="font-mono">{result.profile.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">邀请码：</span>
                  <span className="font-bold text-blue-600">{result.profile.invite_code}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态：</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    result.profile.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {result.profile.status === 'completed' ? '已完成' : '进行中'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">答题数：</span>
                  <span>{result.profile.answer_count} 题</span>
                </div>
                <div>
                  <span className="text-gray-500">创建时间：</span>
                  <span>{formatDate(result.profile.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">完成时间：</span>
                  <span>{formatDate(result.profile.completed_at)}</span>
                </div>
              </div>
            </div>

            {/* 颜值打分 */}
            {result.beauty_score ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">颜值打分</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-pink-50 rounded-lg">
                    <div className="text-3xl font-bold text-pink-600">{result.beauty_score.beauty_score}</div>
                    <div className="text-xs text-gray-500 mt-1">总分</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{result.beauty_score.beauty_type}</div>
                    <div className="text-xs text-gray-500 mt-1">类型</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{result.beauty_score.photoshop_level}</div>
                    <div className="text-xs text-gray-500 mt-1">P图程度</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">{formatDate(result.beauty_score.scored_at)}</div>
                    <div className="text-xs text-gray-500 mt-1">评分时间</div>
                  </div>
                </div>
                {result.beauty_score.ai_comment && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500 text-sm">AI评语：</span>
                    <p className="text-gray-700 mt-1">{result.beauty_score.ai_comment}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">颜值打分</h2>
                <p className="text-gray-500">暂无评分记录</p>
              </div>
            )}

            {/* 答题详情 */}
            {result.answers && Object.keys(result.answers).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  答题详情 ({Object.keys(result.answers).length} 题)
                </h2>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(result.answers, null, 2)}
                </pre>
              </div>
            )}

            {/* AI评价标签 */}
            {result.ai_tags && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">AI评价标签</h2>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(result.ai_tags, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
