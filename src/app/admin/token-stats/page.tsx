'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OverallStats {
  total_requests: number;
  total_request_tokens: number;
  total_response_tokens: number;
  total_tokens: number;
  total_cost: number;
}

interface DailyStat {
  date: string;
  request_count: number;
  request_tokens: number;
  response_tokens: number;
  total_tokens: number;
  cost: number;
}

interface EndpointStat {
  api_endpoint: string;
  request_count: number;
  total_tokens: number;
  total_cost: number;
}

interface RecentUsage {
  id: number;
  api_endpoint: string;
  request_tokens: number;
  response_tokens: number;
  total_tokens: number;
  cost_cny: number;
  created_at: string;
  invite_code: string | null;
}

export default function TokenStatsPage() {
  const [days, setDays] = useState(7);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [byEndpoint, setByEndpoint] = useState<EndpointStat[]>([]);
  const [recent, setRecent] = useState<RecentUsage[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/token-stats?days=${days}`);
      const data = await res.json();
      if (data.success) {
        setOverall(data.overall);
        setDaily(data.daily);
        setByEndpoint(data.byEndpoint);
        setRecent(data.recent);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, [days]);

  function formatNumber(num: number | null | undefined) {
    if (!num) return '0';
    return num.toLocaleString();
  }

  function formatCost(cost: number | null | undefined) {
    if (!cost) return '¥0.0000';
    return `¥${cost.toFixed(4)}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Token 使用统计</h1>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-md text-sm ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              近{d}天
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : (
        <>
          {/* 总体统计卡片 */}
          {overall && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">请求次数</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(overall.total_requests)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">输入 Tokens</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(overall.total_request_tokens)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">输出 Tokens</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(overall.total_response_tokens)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">预估费用</p>
                <p className="text-2xl font-bold text-orange-600">{formatCost(overall.total_cost)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 每日趋势 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold">每日使用趋势</h2>
              </div>
              <div className="p-4">
                {daily.length > 0 ? (
                  <div className="space-y-3">
                    {daily.map((d) => (
                      <div key={d.date} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{d.date}</span>
                        <div className="flex gap-4">
                          <span className="text-blue-600">{formatNumber(d.total_tokens)} tokens</span>
                          <span className="text-orange-600 w-20 text-right">{formatCost(d.cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无数据</p>
                )}
              </div>
            </div>

            {/* 按端点统计 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold">按功能统计</h2>
              </div>
              <div className="p-4">
                {byEndpoint.length > 0 ? (
                  <div className="space-y-3">
                    {byEndpoint.map((e) => (
                      <div key={e.api_endpoint} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 truncate max-w-[200px]">
                          {e.api_endpoint === '/api/chat' ? '💬 聊天' : 
                           e.api_endpoint === '/api/admin/evaluation/run' ? '🤖 AI评价' : 
                           e.api_endpoint}
                        </span>
                        <div className="flex gap-4">
                          <span className="text-blue-600">{formatNumber(e.total_tokens)}</span>
                          <span className="text-orange-600 w-20 text-right">{formatCost(e.total_cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无数据</p>
                )}
              </div>
            </div>
          </div>

          {/* 最近使用记录 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold">最近使用记录</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">时间</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">功能</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">输入</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">输出</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">总计</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">费用</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {r.api_endpoint === '/api/chat' ? '💬 聊天' : 
                       r.api_endpoint === '/api/admin/evaluation/run' ? '🤖 AI评价' : 
                       r.api_endpoint}
                    </td>
                    <td className="px-4 py-2 text-green-600">{formatNumber(r.request_tokens)}</td>
                    <td className="px-4 py-2 text-purple-600">{formatNumber(r.response_tokens)}</td>
                    <td className="px-4 py-2 font-medium">{formatNumber(r.total_tokens)}</td>
                    <td className="px-4 py-2 text-orange-600">{formatCost(r.cost_cny)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {recent.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                暂无使用记录
              </div>
            )}
          </div>

          {/* 费用说明 */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 费用说明</h3>
            <p className="text-sm text-blue-700">
              基于豆包 Pro 32K 模型定价：输入 0.008元/千token，输出 0.008元/千token。
              Token 数按字符数估算（中文 roughly 1 token ≈ 4 字符）。实际费用以火山引擎账单为准。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
