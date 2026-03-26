'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MigrationStatus {
  name: string;
  description: string;
  applied: boolean;
}

interface MigrationResult {
  name: string;
  status: string;
  error?: string;
}

interface FixResult {
  updatedCandidates: number;
  updatedProfiles: number;
  message: string;
}

export default function MigratePage() {
  const [status, setStatus] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<MigrationResult[] | null>(null);
  const [fixingScores, setFixingScores] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/migrate');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Fetch status error:', error);
    }
    setLoading(false);
  }

  async function runMigrations() {
    setRunning(true);
    setResults(null);
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        fetchStatus();
      } else {
        alert('迁移失败');
      }
    } catch (error) {
      console.error('Run migration error:', error);
      alert('执行出错');
    }
    setRunning(false);
  }

  async function fixLevel2Scores() {
    if (!confirm('确定要修复第二层分数吗？这会将所有小数分数转换为整数。')) {
      return;
    }
    setFixingScores(true);
    setFixResult(null);
    try {
      const res = await fetch('/api/admin/fix-level2-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setFixResult(data.data);
      } else {
        alert('修复失败: ' + data.error);
      }
    } catch (error) {
      console.error('Fix scores error:', error);
      alert('执行出错');
    }
    setFixingScores(false);
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const allApplied = status.length > 0 && status.every(s => s.applied);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">数据库迁移</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : (
        <>
          {/* 状态卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-semibold mb-4">迁移状态</h2>
            <div className="space-y-3">
              {status.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.description && (
                      <span className="text-gray-500 text-sm ml-2">{item.description}</span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    item.applied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.applied ? '✓ 已应用' : '未应用'}
                  </span>
                </div>
              ))}
            </div>          
          </div>

          {/* 执行按钮 */}
          {!allApplied && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-blue-800 mb-4">
                检测到有需要执行的迁移。点击下方按钮自动执行所有数据库迁移。
              </p>
              <button
                onClick={runMigrations}
                disabled={running}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {running ? '执行中...' : '执行数据库迁移'}
              </button>
            </div>
          )}

          {allApplied && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <p className="text-green-800">
                ✓ 所有迁移已应用。无需执行。
              </p>
            </div>
          )}

          {/* 执行结果 */}
          {results && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">执行结果</h2>
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className={`text-lg ${
                      r.status === 'success' || r.status === 'already_exists'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {r.status === 'success' || r.status === 'already_exists' ? '✓' : '✗'}
                    </span>
                    <span className="font-medium">{r.name}</span>
                    <span className={`text-sm ${
                      r.status === 'success'
                        ? 'text-green-600'
                        : r.status === 'already_exists'
                        ? 'text-gray-500'
                        : 'text-red-600'
                    }`}>
                      {r.status === 'success' && '成功'}
                      {r.status === 'already_exists' && '已存在'}
                      {r.status === 'error' && `错误: ${r.error}`}
                    </span>
                  </div>
                ))}
              </div>            
            </div>
          )}

          {/* 数据修复工具 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mt-6">
            <h2 className="font-semibold mb-2 text-orange-800">🛠️ 数据修复工具</h2>
            <p className="text-sm text-orange-700 mb-4">
              修复第二层评分分数类型（将小数转换为整数）
            </p>
            <button
              onClick={fixLevel2Scores}
              disabled={fixingScores}
              className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
            >
              {fixingScores ? '修复中...' : '修复第二层分数'}
            </button>

            {fixResult && (
              <div className="mt-4 bg-white rounded p-4">
                <p className="text-green-700 font-medium">✓ {fixResult.message}</p>
                <div className="mt-2 text-sm text-gray-600">
                  <p>更新的候选人记录: {fixResult.updatedCandidates} 条</p>
                  <p>更新的档案记录: {fixResult.updatedProfiles} 条</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
