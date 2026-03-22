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
  const [errorDetail, setErrorDetail] = useState('');

  // 使用 XMLHttpRequest (安卓兼容性更好)
  const makeRequest = (code: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        // 使用完整URL避免308重定向问题
        const url = 'https://www.ai-dating.top/api/check-score?code=' + encodeURIComponent(code) + '&_t=' + Date.now();
        
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000; // 10秒超时
        
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (parseErr) {
                reject(new Error('JSON解析失败: ' + String(parseErr) + '\n原始响应: ' + xhr.responseText.slice(0, 100)));
              }
            } else if (xhr.status === 0) {
              reject(new Error('无法连接到服务器 (状态0)\n可能原因:\n1. 网络断开\n2. 浏览器拦截了请求\n3. HTTPS证书问题\n4. 跨域被阻止'));
            } else if (xhr.status === 404) {
              reject(new Error('接口不存在 (404)\n可能原因: API路径错误或部署问题'));
            } else if (xhr.status === 500) {
              reject(new Error('服务器内部错误 (500)\n请稍后重试'));
            } else if (xhr.status === 502) {
              reject(new Error('网关错误 (502)\n服务器暂时不可用，请稍后重试'));
            } else if (xhr.status === 503) {
              reject(new Error('服务不可用 (503)\n服务器过载或维护中'));
            } else {
              reject(new Error('HTTP错误: ' + xhr.status + ' ' + xhr.statusText));
            }
          }
        };
        
        xhr.onerror = () => {
          const errorInfo = {
            readyState: xhr.readyState,
            status: xhr.status,
            statusText: xhr.statusText,
            url: url,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
          };
          reject(new Error('网络请求失败\n调试信息: ' + JSON.stringify(errorInfo, null, 2) + 
            '\n常见原因:\n1. CORS跨域被阻止\n2. HTTPS证书不受信任\n3. 企业网络/防火墙拦截\n4. 微信内置浏览器限制'));
        };
        xhr.ontimeout = () => reject(new Error('请求超时 (10秒)\n网络连接较慢或服务器响应慢'));
        xhr.onabort = () => reject(new Error('请求被用户取消'));
        
        xhr.send();
      } catch (setupErr) {
        reject(new Error('XHR初始化失败: ' + String(setupErr)));
      }
    });
  };

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrorDetail('');
    setLoading(true);
    setResult(null);

    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      setLoading(false);
      return;
    }

    const code = inviteCode.trim().toUpperCase();

    try {
      const data = await makeRequest(code) as { success: boolean; data?: QueryResult; error?: string };

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || '查询失败');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setError('网络错误，请重试');
      setErrorDetail(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm text-center font-medium">{error}</p>
                    {errorDetail && (
                      <p className="mt-2 text-xs text-red-500 text-center">{errorDetail}</p>
                    )}
                  </div>
                )}

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
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← 重新查询
              </button>

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
                      <p className="text-sm text-gray-600 italic text-center">&ldquo;{result.beautyScore.ai_comment}&rdquo;</p>
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
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">问卷档案</h3>
                  <p className="text-sm text-gray-500">暂无答题记录</p>
                </div>
              )}

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
