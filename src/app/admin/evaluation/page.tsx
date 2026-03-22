'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EvaluationStats {
  status: string;
  count: number;
}

interface EvaluationLog {
  id: string;
  invite_code: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

export default function EvaluationPage() {
  const [stats, setStats] = useState<EvaluationStats[]>([]);
  const [logs, setLogs] = useState<EvaluationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; results: { id: string; status: string; error?: string }[] } | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/admin/evaluation/run');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLogs(data.recentLogs);
      }
    } catch (error) {
      console.error('Fetch status error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runEvaluation() {
    setRunning(true);
    setRunResult(null);
    
    try {
      const res = await fetch('/api/admin/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 })
      });
      
      const data = await res.json();
      if (data.success) {
        setRunResult(data);
        fetchStatus(); // 刷新状态
      } else {
        alert('执行失败: ' + data.error);
      }
    } catch (error) {
      console.error('Run evaluation error:', error);
      alert('执行出错');
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const pendingCount = stats.find(s => s.status === 'pending')?.count || 0;
  const completedCount = stats.find(s => s.status === 'completed')?.count || 0;
  const failedCount = stats.find(s => s.status === 'failed')?.count || 0;
  const processingCount = stats.find(s => s.status === 'processing')?.count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/profiles" className="text-blue-600 hover:underline text-sm">
            ← 返回档案管理
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">AI评价管理</h1>
        </div>
        <button
          onClick={runEvaluation}
          disabled={running || pendingCount === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
        >
          {running ? '评价中...' : `开始评价 (${pendingCount}个待处理)`}
        </button>
      </div>

      {/* 统计卡片 */}
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">待评价</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">评价中</p>
              <p className="text-2xl font-bold text-blue-600">{processingCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">失败</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
          </div>

          {/* 执行结果 */}
          {runResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="font-medium text-blue-800">本次处理: {runResult.processed} 个档案</p>
              <div className="mt-2 space-y-1">
                {runResult.results.map((r, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {r.status === 'success' ? '✓' : '✗'}
                    </span>
                    <Link href={`/admin/profiles/${r.id}`} className="font-mono text-blue-600 hover:underline">
                      {r.id}
                    </Link>
                    {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最近日志 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold">最近评价记录</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">档案ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">邀请码</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">时间</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">错误</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={`${log.id}-${log.created_at}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono">
                      <Link href={`/admin/profiles/${log.id}`} className="text-blue-600 hover:underline">
                        {log.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm">{log.invite_code}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-500 max-w-xs truncate">
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                暂无评价记录
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
