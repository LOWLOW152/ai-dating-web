'use client';

import { useState } from 'react';

interface Match {
  rank: number;
  candidateId: string;
  inviteCode: string;
  nickname: string;
  gender: string;
  age: number | null;
  city: string;
  scores: {
    overall: number;
    similarity?: number;
    complement?: number;
  };
  beauty: {
    score: number;
    photoshopLevel: number;
    type: string;
  } | null;
  strengths: string;
  risks: string;
  advice?: string;
}

export default function MyMatchesPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [canRemake, setCanRemake] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSearch = async () => {
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setLoading(true);
    setError('');
    setMatches(null);
    setHasSelection(false);
    setSubmitted(false);

    const url = `/api/match/my-matches?inviteCode=${encodeURIComponent(inviteCode.trim())}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        setMatches(data.data.matches);
        setHasSelection(data.data.hasActiveSelection);
        setCanRemake(data.data.canRemake);
      } else {
        setError(data.error || '查询失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (candidateId: string) => {
    if (!confirm('确定选择这位匹配对象吗？选择后不可更改（除非联系管理员重新匹配）')) {
      return;
    }

    setSubmitting(true);
    setSelectedId(candidateId);

    try {
      const res = await fetch('/api/match/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), candidateId })
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        setHasSelection(true);
        alert('选择成功！');
      } else {
        alert(data.error || '选择失败');
      }
    } catch {
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
      setSelectedId(null);
    }
  };

  const handleRemake = async () => {
    if (!confirm('确定重新匹配吗？这将清空当前选择并重新生成匹配报告')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/match/remake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.data.message);
        setMatches(null);
        setHasSelection(false);
      } else {
        alert(data.error || '重新匹配失败');
      }
    } catch {
      alert('请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🎯 我的AI匹配报告</h1>
          <p className="text-gray-600">输入邀请码，查看AI为你精选的3位匹配对象</p>
        </div>

        {/* 输入框 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="请输入你的邀请码"
              className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {loading ? '查询中...' : '查看匹配'}
            </button>
          </div>
          {error && (
            <div className="mt-3">
              <p className="text-red-600 text-sm font-medium">❌ {error}</p>
            </div>
          )}
        </div>

        {/* 已选择提示 */}
        {hasSelection && !submitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              ✅ 你已经做出过选择。
              {canRemake ? (
                <> 你有重新匹配的机会，<button
                  onClick={handleRemake}
                  className="underline font-medium"
                >点击重新匹配</button>
                </>
              ) : '如需重新匹配请联系管理员'}
            </p>
          </div>
        )}

        {/* 匹配结果 */}
        {matches && matches.length > 0 && !submitted && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-gray-600">AI从数百位候选人中为你精选了以下3位，请仔细阅读分析报告后做出选择</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {matches.map((match, index) => (
                <div
                  key={match.candidateId}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 transition-all ${
                    index === 0 ? 'border-yellow-400' :
                    index === 1 ? 'border-gray-300' :
                    'border-orange-300'
                  }`}
                >
                  {/* 排名标识 */}
                  <div className={`text-center py-2 text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-orange-400'
                  }`}>
                    {index === 0 ? '🥇 最佳匹配' : index === 1 ? '🥈 次选匹配' : '🥉 第三匹配'}
                  </div>

                  <div className="p-5">
                    {/* 基本信息 */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{match.nickname}</h3>
                      <p className="text-sm text-gray-500">
                        {match.gender === 'female' ? '女' : '男'}
                        {match.age && ` · ${match.age}岁`}
                        {match.city && ` · ${match.city}`}
                      </p>
                    </div>

                    {/* 匹配分数 */}
                    <div className="bg-purple-50 rounded-lg p-3 mb-4 text-center">
                      <div className="text-3xl font-bold text-purple-600">{match.scores.overall}</div>
                      <div className="text-xs text-gray-500">综合匹配度</div>
                      <div className="flex justify-center gap-4 mt-2 text-xs">
                        <span className="text-green-600">相似度 {match.scores.similarity || '-'}</span>
                        <span className="text-blue-600">互补度 {match.scores.complement || '-'}</span>
                      </div>
                    </div>

                    {/* 颜值打分 */}
                    <div className="mb-4">
                      {match.beauty ? (
                        <div className="bg-pink-50 rounded p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">颜值评分</span>
                            <span className="font-bold text-pink-600">{match.beauty.score}分</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {match.beauty.type} · 
                            {match.beauty.photoshopLevel <= 3 ? '原生' : 
                             match.beauty.photoshopLevel <= 6 ? '微P' : '重P'}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded p-3 text-center text-sm text-gray-500">
                          对方暂未打分
                        </div>
                      )}
                    </div>

                    {/* 推荐理由 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-green-700 mb-2">✓ 推荐理由</h4>
                      <p className="text-sm text-gray-600 bg-green-50 p-3 rounded">
                        {match.strengths || 'AI分析显示你们在价值观和生活方式上高度契合'}
                      </p>
                    </div>

                    {/* 风险提示 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-orange-700 mb-2">⚠ 潜在冲突点</h4>
                      <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded">
                        {match.risks || '需关注未来在生活节奏上的差异'}
                      </p>
                    </div>

                    {/* 选择按钮 */}
                    <button
                      onClick={() => handleSelect(match.candidateId)}
                      disabled={submitting || hasSelection}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        hasSelection
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {submitting && selectedId === match.candidateId
                        ? '提交中...'
                        : hasSelection
                        ? '已选择'
                        : '选择这位'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="text-center text-sm text-gray-500 mt-6">
              💡 提示：请仔细阅读每位匹配对象的分析报告，理性选择最适合你的人
            </div>
          </div>
        )}

        {/* 选择成功 */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-800 mb-2">选择成功！</h2>
            <p className="text-green-700">
              我们已经收到你的选择，工作人员会尽快与你联系。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
