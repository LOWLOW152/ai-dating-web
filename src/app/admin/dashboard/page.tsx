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
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err) {
      setError('网络请求失败');
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            重试
          </button>
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
    </div>
  );
}
