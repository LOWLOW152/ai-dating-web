'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QueryResult {
  profile: {
    id: string;
    invite_code: string;
    status: string;
    created_at: string;
    completed_at?: string;
  };
  beautyScore: {
    beauty_score: number;
    beauty_type: string;
    photoshop_level: number;
    ai_comment: string;
    details?: {
      body_shape: number;
      skin_quality: number;
      symmetry: number;
      face_age: number;
      hairline: number;
      eye_bags: number;
      teeth: number;
      nose_bridge: number;
      photoshop_deduction: number;
    };
    evaluated_at: string;
  } | null;
  questionnaire: {
    answers_count: number;
    completed_at?: string;
  } | null;
  aiEvaluation: {
    tags?: Record<string, string | string[]>;
    summary?: string;
    status: 'pending' | 'processing' | 'completed' | 'not_started';
  } | null;
}

const BEAUTY_LEVELS = [
  { min: 9, max: 10, label: '明星级', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { min: 8, max: 8.9, label: '班草/班花', color: 'text-purple-600', bg: 'bg-purple-50' },
  { min: 7, max: 7.9, label: '小帅/小美', color: 'text-blue-600', bg: 'bg-blue-50' },
  { min: 6, max: 6.9, label: '顺眼', color: 'text-green-600', bg: 'bg-green-50' },
  { min: 4.5, max: 5.9, label: '普通人', color: 'text-gray-600', bg: 'bg-gray-50' },
  { min: 3, max: 4.4, label: '略差', color: 'text-orange-600', bg: 'bg-orange-50' },
  { min: 0, max: 2.9, label: '需改善', color: 'text-red-600', bg: 'bg-red-50' },
];

function getBeautyLevel(score: number) {
  return BEAUTY_LEVELS.find(l => score >= l.min && score <= l.max) || BEAUTY_LEVELS[4];
}

export default function CheckScorePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResult(null);

    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/check-score?code=${inviteCode.trim().toUpperCase()}`);
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '查询失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
        <h1 className="text-lg font-semibold">查分系统</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {!result ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🔍</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">查询我的分数</h2>
                <p className="text-sm text-gray-500">输入邀请码查看颜值打分和问卷档案</p>
              </div>

              <form onSubmit={handleQuery} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邀请码</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="如：X7K9M2P4"
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '查询中...' : '查询'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 返回首页
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 返回按钮 */}
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← 重新查询
              </button>

              {/* 档案ID */}
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">档案ID</p>
                    <p className="font-mono text-sm font-semibold">{result.profile.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">邀请码</p>
                    <p className="font-mono text-sm font-semibold">{result.profile.invite_code}</p>
                  </div>
                </div>
              </div>

              {/* AI评价状态 */}
              {result.aiEvaluation && result.aiEvaluation.status !== 'not_started' && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">AI评价状态</h3>
                  <div className="flex items-center gap-3">
                    {result.aiEvaluation.status === 'completed' ? (
                      <>
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span className="text-green-600 font-medium">已完成</span>
                        <span className="text-xs text-gray-500">管理员可查看详细评价</span>
                      </>
                    ) : result.aiEvaluation.status === 'processing' ? (
                      <>
                        <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                        <span className="text-yellow-600 font-medium">评价中...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-600">等待评价</span>
                      </>
                    )}
                  </div>                
                </div>
              )}

              {/* 颜值打分结果 */}
              {result.beautyScore ? (
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">颜值评分</h3>
                    {(() => {
                      const level = getBeautyLevel(result.beautyScore!.beauty_score);
                      return (
                        <div className={`inline-block mt-2 px-3 py-1 rounded-full ${level.bg} ${level.color} text-sm font-medium`}>
                          {level.label}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-pink-600">{result.beautyScore.beauty_score}</div>
                    <p className="text-xs text-gray-400">满分10分</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-pink-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500">颜值类型</p>
                      <p className="font-bold text-pink-600">{result.beautyScore.beauty_type}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-500">P图程度</p>
                      <p className="font-bold text-orange-600">{result.beautyScore.photoshop_level}</p>
                    </div>
                  </div>

                  {result.beautyScore.ai_comment && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 italic text-center">"{result.beautyScore.ai_comment}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl">📷</span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">颜值打分</h3>
                  <p className="text-sm text-gray-500">暂无评分记录</p>
                </div>
              )}

              {/* 问卷档案 */}
              {result.questionnaire ? (
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">问卷档案</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-600">已答题目</span>
                      <span className="font-bold text-green-600">{result.questionnaire.answers_count} 题</span>
                    </div>

                    {result.questionnaire.completed_at ? (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-600">完成状态</span>
                        <span className="font-bold text-blue-600">已完成</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="text-sm text-gray-600">完成状态</span>
                        <span className="font-bold text-yellow-600">进行中</span>
                      </div>
                    )}
                  </div>

                  {!result.questionnaire.completed_at && (
                    <button
                      onClick={() => {
                        localStorage.setItem('inviteCode', result.profile.invite_code);
                        router.push('/chat');
                      }}
                      className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                    >
                      继续答题
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">问卷档案</h3>
                  <p className="text-sm text-gray-500">暂无答题记录</p>
                  <button
                    onClick={() => {
                      localStorage.setItem('inviteCode', result.profile.invite_code);
                      router.push('/chat');
                    }}
                    className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                  >
                    开始答题
                  </button>
                </div>
              )}

              {/* 提示信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 请截图保存此页面，或记住您的邀请码 <span className="font-mono font-bold">{result.profile.invite_code}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
