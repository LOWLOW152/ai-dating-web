'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  inviteCodes: {
    total: number;
    active: number;
    used: number;
    expired: number;
  };
  profiles: {
    total: number;
    completed: number;
    pending: number;
    deleted: number;
  };
  aiEvaluation: {
    completed: number;
    pending: number;
    failed: number;
  };
  level1: {
    completed: number;
    pending: number;
    failed: number;
  };
  level2: {
    completed: number;
    pending: number;
    failed: number;
  };
  level3: {
    completed: number;
    pending: number;
    failed: number;
  };
  recentActivity: {
    new_profiles: number;
    completed_today: number;
    l1_today: number;
    l2_today: number;
    l3_today: number;
  };
  failedProfiles: FailedProfile[];
}

interface FailedProfile {
  id: string;
  nickname: string | null;
  ai_failed: boolean;
  l1_failed: boolean;
  l2_failed: boolean;
  l3_failed: boolean;
  match_error: string | null;
  failed_at: string;
}

interface ErrorDetail {
  message: string;
  status?: number;
  statusText?: string;
  responseText?: string;
  detail?: string;
  errorType?: string;
  type: 'network' | 'http' | 'api' | 'unknown';
  timestamp: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetail | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // 获取响应文本用于调试
      const responseText = await res.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = null;
      }
      
      if (!res.ok) {
        setError({
          message: `HTTP ${res.status}: ${res.statusText}`,
          status: res.status,
          statusText: res.statusText,
          responseText: JSON.stringify(result, null, 2) || responseText.slice(0, 500),
          type: 'http',
          timestamp: new Date().toLocaleString('zh-CN')
        });
        return;
      }
      
      if (result?.success) {
        setData(result.data);
      } else {
        setError({
          message: result?.error || 'API返回失败状态',
          detail: result?.detail,
          errorType: result?.type,
          responseText: JSON.stringify(result, null, 2) || responseText.slice(0, 500),
          type: 'api',
          timestamp: new Date().toLocaleString('zh-CN')
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知网络错误';
      setError({
        message: errorMsg,
        type: err instanceof TypeError ? 'network' : 'unknown',
        timestamp: new Date().toLocaleString('zh-CN')
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // 自动刷新（每30秒）
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">流程卡控管理</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">流程卡控管理</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
        
        {/* 错误详情卡片 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-800 mb-2">数据加载失败</h2>
              <p className="text-red-600 mb-4">{error.message}</p>
              
              {/* 错误类型标签 */}
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  error.type === 'network' ? 'bg-orange-100 text-orange-700' :
                  error.type === 'http' ? 'bg-blue-100 text-blue-700' :
                  error.type === 'api' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  错误类型: {error.type === 'network' ? '网络错误' : 
                           error.type === 'http' ? 'HTTP错误' :
                           error.type === 'api' ? 'API错误' : '未知错误'}
                </span>
                {error.status && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-medium">
                    状态码: {error.status}
                  </span>
                )}
                {error.errorType && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                    异常类型: {error.errorType}
                  </span>
                )}
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  时间: {error.timestamp}
                </span>
              </div>

              {/* 后端返回的详细错误信息 */}
              {(error.detail || error.errorType) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">📋 后端错误详情</h4>
                  {error.detail && (
                    <p className="text-sm text-yellow-700 font-mono break-all">{error.detail}</p>
                  )}
                </div>
              )}

              {/* 排查建议 */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-red-100">
                <h3 className="font-medium text-gray-800 mb-2">🔧 排查建议</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {error.type === 'network' ? (
                    <>
                      <li>• 检查网络连接是否正常</li>
                      <li>• 确认域名 www.ai-dating.top 可访问</li>
                      <li>• 尝试刷新页面或清除缓存 (Ctrl+F5)</li>
                    </>
                  ) : error.type === 'http' && error.status === 401 ? (
                    <>
                      <li>• 登录会话可能已过期，请重新登录</li>
                      <li>• 检查是否有访问权限</li>
                    </>
                  ) : error.type === 'http' && error.status === 500 ? (
                    <>
                      <li>• 服务器内部错误，可能是数据库连接问题</li>
                      <li>• 检查 Vercel 函数日志</li>
                      <li>• 等待几分钟后重试</li>
                    </>
                  ) : (
                    <>
                      <li>• 刷新页面重试</li>
                      <li>• 检查浏览器控制台(F12)查看详细错误</li>
                      <li>• 如问题持续，请截图联系技术支持</li>
                    </>
                  )}
                </ul>
              </div>

              {/* 响应内容（可展开） */}
              {error.responseText && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    📄 查看原始响应内容（调试用）
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-48">
                    {error.responseText}
                  </pre>
                </details>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  🔄 重新加载
                </button>
                <a
                  href="/admin"
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  ← 返回首页
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 计算进度百分比
  const aiProgress = data.profiles.total > 0 
    ? Math.round((data.aiEvaluation.completed / data.profiles.total) * 100) 
    : 0;
  const l1Progress = data.aiEvaluation.completed > 0
    ? Math.round((data.level1.completed / data.aiEvaluation.completed) * 100)
    : 0;
  const l2Progress = data.level1.completed > 0
    ? Math.round((data.level2.completed / data.level1.completed) * 100)
    : 0;
  const l3Progress = data.level2.completed > 0
    ? Math.round((data.level3.completed / data.level2.completed) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">流程卡控管理</h1>
          <p className="text-sm text-gray-500 mt-1">实时监控相亲匹配流程各环节状态</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 刷新中...' : '🔄 刷新'}
          </button>
          <Link href="/admin" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
      </div>

      {/* 今日活动 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <h2 className="text-lg font-semibold mb-4">📊 今日活动（最近24小时）</h2>
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{data.recentActivity.new_profiles}</p>
            <p className="text-sm opacity-80">新增档案</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{data.recentActivity.completed_today}</p>
            <p className="text-sm opacity-80">完成答题</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{data.recentActivity.l1_today}</p>
            <p className="text-sm opacity-80">完成第一层</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{data.recentActivity.l2_today}</p>
            <p className="text-sm opacity-80">完成第二层</p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{data.recentActivity.l3_today}</p>
            <p className="text-sm opacity-80">完成第三层</p>
          </div>
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/admin/invite-codes" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <p className="text-sm text-gray-500 mb-1">邀请码总数</p>
          <p className="text-3xl font-bold text-blue-600">{data.inviteCodes.total}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">● 可用 {data.inviteCodes.active}</span>
            <span className="text-gray-400">● 已用 {data.inviteCodes.used}</span>
          </div>
        </Link>

        <Link href="/admin/profiles" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <p className="text-sm text-gray-500 mb-1">档案总数</p>
          <p className="text-3xl font-bold text-purple-600">{data.profiles.total}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">● 完成 {data.profiles.completed}</span>
            <span className="text-orange-500">● 待处理 {data.profiles.pending}</span>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">AI评价完成率</p>
          <p className="text-3xl font-bold text-pink-600">{aiProgress}%</p>
          <p className="text-xs text-gray-400 mt-2">{data.aiEvaluation.completed} / {data.profiles.total} 个档案</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">全流程完成率</p>
          <p className="text-3xl font-bold text-green-600">{data.level3.completed}</p>
          <p className="text-xs text-gray-400 mt-2">已完成第三层匹配的档案</p>
        </div>
      </div>

      {/* 流程进度 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">🔄 匹配流程进度</h2>
        
        <div className="space-y-6">
          {/* 第一层 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="font-medium">第一层：硬性条件筛选</span>
              </div>
              <span className="text-sm text-gray-500">{l1Progress}% 完成</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${l1Progress}%` }}></div>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">✓ 已完成 {data.level1.completed}</span>
              <span className="text-orange-500">⏳ 待处理 {data.level1.pending}</span>
              <span className="text-red-600">✗ 失败 {data.level1.failed}</span>
            </div>
          </div>

          {/* 第二层 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <span className="font-medium">第二层：AI初筛</span>
              </div>
              <span className="text-sm text-gray-500">{l2Progress}% 完成</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${l2Progress}%` }}></div>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">✓ 已完成 {data.level2.completed}</span>
              <span className="text-orange-500">⏳ 待处理 {data.level2.pending}</span>
              <span className="text-red-600">✗ 失败 {data.level2.failed}</span>
            </div>
          </div>

          {/* 第三层 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💕</span>
                <span className="font-medium">第三层：AI深度匹配</span>
              </div>
              <span className="text-sm text-gray-500">{l3Progress}% 完成</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-pink-600 h-2 rounded-full" style={{ width: `${l3Progress}%` }}></div>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">✓ 已完成 {data.level3.completed}</span>
              <span className="text-orange-500">⏳ 待处理 {data.level3.pending}</span>
              <span className="text-red-600">✗ 失败 {data.level3.failed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">⚡ 快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/profiles" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
            📁 档案管理
          </Link>
          <Link href="/admin/invite-codes" className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200">
            🔑 邀请码管理
          </Link>
          <Link href="/admin/evaluation" className="px-4 py-2 bg-pink-100 text-pink-700 rounded-md hover:bg-pink-200">
            🤖 AI评价管理
          </Link>
          <Link href="/admin/match" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200">
            🎯 匹配测试
          </Link>
        </div>
      </div>

      {/* 失败档案列表 */}
      {data.failedProfiles && data.failedProfiles.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">⚠️ 失败档案列表（最近20个）</h2>
            <span className="text-sm text-gray-500">共 {data.failedProfiles.length} 个</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">档案ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">昵称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">失败环节</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">失败原因</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.failedProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link 
                        href={`/admin/profiles/${profile.id}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      >
                        {profile.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {profile.nickname || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {profile.ai_failed && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">AI评价</span>
                        )}
                        {profile.l1_failed && (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">第一层</span>
                        )}
                        {profile.l2_failed && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">第二层</span>
                        )}
                        {profile.l3_failed && (
                          <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-700 rounded">第三层</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={profile.match_error || ''}>
                      {profile.match_error || '未知错误'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {profile.failed_at ? new Date(profile.failed_at).toLocaleString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
