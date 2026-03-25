'use client';

import { useState } from 'react';

export default function MatchPage() {
  const [activeTab, setActiveTab] = useState<'level1' | 'level2' | 'level3' | 'pair'>('level1');

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">匹配测试</h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('level1')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'level1'
              ? 'bg-white text-emerald-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          第一层筛选
        </button>
        <button
          onClick={() => setActiveTab('level2')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'level2'
              ? 'bg-white text-purple-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          第二层AI初筛
        </button>
        <button
          onClick={() => setActiveTab('level3')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'level3'
              ? 'bg-white text-orange-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          第三层深度匹配
        </button>
        <button
          onClick={() => setActiveTab('pair')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pair'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          两人匹配测试
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'level1' && <Level1Filter />}
      {activeTab === 'level2' && <Level2Filter />}
      {activeTab === 'level3' && <Level3Match />}
      {activeTab === 'pair' && <PairMatch />}
    </div>
  );
}

// 第一层筛选组件
function Level1Filter() {
  const [profileId, setProfileId] = useState('');
  const [candidates, setCandidates] = useState<Array<Record<string, string>> | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ status: number; message: string; details?: string } | null>(null);

  // 批量匹配相关
  const [batchCount, setBatchCount] = useState(10);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; success: number; failed: number } | null>(null);
  const [batchResult, setBatchResult] = useState<{ success: string[]; failed: { id: string; error: string }[] } | null>(null);

  const handleCalculate = async () => {
    if (!profileId) return;
    setCalculating(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/match/level1-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`计算完成！共检查 ${data.data.totalChecked} 人，通过 ${data.data.passed} 人`);
        handleLoadCandidates();
      } else {
        setError(data.error || '计算失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Calculate error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setCalculating(false);
  };

  const handleLoadCandidates = async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch(`/api/admin/match/level1-candidates?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data.candidates);
        setStats(data.data.stats);
      } else {
        setError(data.error || '加载失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Load candidates error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setLoading(false);
  };

  // 批量自动匹配
  const handleBatchMatch = async () => {
    setBatchRunning(true);
    setBatchProgress({ current: 0, total: batchCount, success: 0, failed: 0 });
    setBatchResult(null);
    setError(null);
    setApiError(null);
    
    try {
      // 1. 获取待处理的档案列表
      const pendingRes = await fetch(`/api/admin/match/pending?level=1&limit=${batchCount}`);
      const pendingData = await pendingRes.json();
      
      if (!pendingData.success || !pendingData.profiles || pendingData.profiles.length === 0) {
        setError('没有待处理的第一层档案');
        setBatchRunning(false);
        return;
      }
      
      const profiles = pendingData.profiles;
      const successList: string[] = [];
      const failedList: { id: string; error: string }[] = [];
      
      // 2. 逐个处理
      for (let i = 0; i < profiles.length; i++) {
        const pid = profiles[i];
        setBatchProgress({ current: i + 1, total: profiles.length, success: successList.length, failed: failedList.length });
        
        try {
          const res = await fetch('/api/admin/match/level1-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: pid }),
          });
          const data = await res.json();
          if (data.success) {
            successList.push(pid);
          } else {
            failedList.push({ id: pid, error: data.error || '未知错误' });
          }
        } catch (err) {
          failedList.push({ id: pid, error: err instanceof Error ? err.message : String(err) });
        }
        
        // 间隔避免限流
        await new Promise(r => setTimeout(r, 500));
      }
      
      setBatchProgress({ current: profiles.length, total: profiles.length, success: successList.length, failed: failedList.length });
      setBatchResult({ success: successList, failed: failedList });
    } catch (error) {
      console.error('Batch match error:', error);
      setError(`批量匹配失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setBatchRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h3 className="font-medium text-emerald-800 mb-2">第一层硬性条件筛选</h3>
        <p className="text-sm text-emerald-700 mb-2">
          系统自动筛选符合硬性条件的候选人，不消耗AI Token
        </p>
        <div className="text-xs text-emerald-600 bg-emerald-100/50 rounded p-2">
          <strong>匹配内容：</strong>
          异性、双向年龄互适（在彼此接受范围内）、同城或接受异地、学历满足最低要求、饮食兼容
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* 单档案操作 */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="输入档案ID"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={handleCalculate}
            disabled={calculating || !profileId}
            className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 disabled:bg-gray-300"
          >
            {calculating ? '计算中...' : '开始筛选'}
          </button>
          <button
            onClick={handleLoadCandidates}
            disabled={loading || !profileId}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {loading ? '加载中...' : '查看结果'}
          </button>
        </div>

        {/* 批量自动匹配 */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">批量自动匹配</h4>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">匹配数量:</label>
              <input
                type="number"
                min={1}
                max={50}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center"
              />
            </div>
            <button
              onClick={handleBatchMatch}
              disabled={batchRunning}
              className="bg-emerald-500 text-white px-6 py-2 rounded-md hover:bg-emerald-600 disabled:bg-gray-300"
            >
              {batchRunning ? '批量匹配中...' : '一键批量匹配'}
            </button>
            {batchRunning && batchProgress && (
              <span className="text-sm text-gray-600">
                进度: {batchProgress.current}/{batchProgress.total} (成功{batchProgress.success}/失败{batchProgress.failed})
              </span>
            )}
          </div>
        </div>

        {/* 批量匹配结果 */}
        {batchResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3">批量匹配结果</h4>
            
            {batchResult.success.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-green-700 mb-2">✓ 成功 ({batchResult.success.length})</h5>
                <div className="flex flex-wrap gap-2">
                  {batchResult.success.map(id => (
                    <span key={id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono">{id}</span>
                  ))}
                </div>
              </div>
            )}
            
            {batchResult.failed.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">✗ 失败 ({batchResult.failed.length})</h5>
                <div className="space-y-1">
                  {batchResult.failed.map(item => (
                    <details key={item.id} className="text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        {item.id}
                      </summary>
                      <p className="text-xs text-red-500 mt-1 pl-4">{item.error}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误显示 */}
        {(error || apiError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-1">第一层筛选出错</h4>
                {error && <p className="text-red-700 text-sm mb-2">{error}</p>}
                {apiError && (
                  <div className="mt-2">
                    <p className="text-red-600 text-sm">
                      状态码: {apiError.status} | {apiError.message}
                    </p>
                    {apiError.details && (
                      <details className="mt-2">
                        <summary className="text-red-500 text-xs cursor-pointer">查看详细错误</summary>
                        <pre className="mt-2 bg-red-100 p-2 rounded text-xs text-red-800 overflow-auto max-h-40">
                          {apiError.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-7 gap-2 text-center mb-6">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.passed || 0}</div>
              <div className="text-xs text-gray-500">通过</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
              <div className="text-xs text-gray-500">排除</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_gender || 0}</div>
              <div className="text-xs text-gray-500">性别</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_age || 0}</div>
              <div className="text-xs text-gray-500">年龄</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_location || 0}</div>
              <div className="text-xs text-gray-500">地域</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_education || 0}</div>
              <div className="text-xs text-gray-500">学历</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_diet || 0}</div>
              <div className="text-xs text-gray-500">饮食</div>
            </div>
          </div>
        )}

        {candidates && candidates.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">通过筛选的候选人 ({candidates.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">昵称</th>
                    <th className="text-left px-4 py-2">性别</th>
                    <th className="text-left px-4 py-2">出生年</th>
                    <th className="text-left px-4 py-2">城市</th>
                    <th className="text-left px-4 py-2">学历</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="px-4 py-3">{c.nickname || '-'}</td>
                      <td className="px-4 py-3">{c.gender || '-'}</td>
                      <td className="px-4 py-3">{c.birthYear || '-'}</td>
                      <td className="px-4 py-3">{c.city || '-'}</td>
                      <td className="px-4 py-3">{c.education || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            暂无通过第一层筛选的候选人
          </div>
        )}
      </div>
    </div>
  );
}

// 第二层AI初筛组件
function Level2Filter() {
  const [profileId, setProfileId] = useState('');
  const [stats, setStats] = useState<{ level1_passed: number; level2_calculated: number; level2_passed: number; avg_score: number } | null>(null);
  const [topCandidates, setTopCandidates] = useState<Array<{ candidate_id: string; level_2_score: number; invite_code: string; nickname: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{ processed: number; totalTokens: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ status: number; message: string; details?: string } | null>(null);

  // 批量匹配相关
  const [batchCount, setBatchCount] = useState(10);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; success: number; failed: number } | null>(null);
  const [batchResult, setBatchResult] = useState<{ success: string[]; failed: { id: string; error: string }[] } | null>(null);

  const handleCalculate = async () => {
    if (!profileId) return;
    setCalculating(true);
    setResult(null);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/match/level2-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          processed: data.data?.processed || 0,
          totalTokens: data.data?.totalTokens || 0
        });
        handleLoadStatus();
      } else {
        setError(data.error || '计算失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Calculate error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setCalculating(false);
  };

  const handleLoadStatus = async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch(`/api/admin/match/level2-calculate?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setTopCandidates(data.data.topCandidates || []);
      } else {
        setError(data.error || '加载失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Load status error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setLoading(false);
  };

  // 批量自动匹配
  const handleBatchMatch = async () => {
    setBatchRunning(true);
    setBatchProgress({ current: 0, total: batchCount, success: 0, failed: 0 });
    setBatchResult(null);
    setError(null);
    setApiError(null);

    try {
      // 1. 获取待处理的档案列表
      const pendingRes = await fetch(`/api/admin/match/pending?level=2&limit=${batchCount}`);
      const pendingData = await pendingRes.json();

      if (!pendingData.success || !pendingData.profiles || pendingData.profiles.length === 0) {
        setError('没有待处理的第二层档案');
        setBatchRunning(false);
        return;
      }

      const profiles = pendingData.profiles;
      const successList: string[] = [];
      const failedList: { id: string; error: string }[] = [];

      // 2. 逐个处理
      for (let i = 0; i < profiles.length; i++) {
        const pid = profiles[i];
        setBatchProgress({ current: i + 1, total: profiles.length, success: successList.length, failed: failedList.length });

        try {
          const res = await fetch('/api/admin/match/level2-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: pid }),
          });
          const data = await res.json();
          if (data.success) {
            successList.push(pid);
          } else {
            failedList.push({ id: pid, error: data.error || '未知错误' });
          }
        } catch (err) {
          failedList.push({ id: pid, error: err instanceof Error ? err.message : String(err) });
        }

        // 间隔避免限流（第二层AI调用需要更长的间隔）
        await new Promise(r => setTimeout(r, 2000));
      }

      setBatchProgress({ current: profiles.length, total: profiles.length, success: successList.length, failed: failedList.length });
      setBatchResult({ success: successList, failed: failedList });
    } catch (error) {
      console.error('Batch match error:', error);
      setError(`批量匹配失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    setBatchRunning(false);
  };

  // 重试失败的档案
  const handleRetryFailed = async () => {
    setBatchRunning(true);
    setBatchProgress({ current: 0, total: batchCount, success: 0, failed: 0 });
    setBatchResult(null);
    setError(null);
    setApiError(null);

    try {
      // 1. 获取失败的档案列表
      const failedRes = await fetch(`/api/admin/match/pending?level=2&status=failed&limit=${batchCount}`);
      const failedData = await failedRes.json();

      if (!failedData.success || !failedData.profiles || failedData.profiles.length === 0) {
        setError('没有需要重试的失败档案');
        setBatchRunning(false);
        return;
      }

      const profiles = failedData.profiles;
      const successList: string[] = [];
      const failedList: { id: string; error: string }[] = [];

      // 2. 逐个重试
      for (let i = 0; i < profiles.length; i++) {
        const pid = profiles[i];
        setBatchProgress({ current: i + 1, total: profiles.length, success: successList.length, failed: failedList.length });

        try {
          const res = await fetch('/api/admin/match/level2-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: pid }),
          });
          const data = await res.json();
          if (data.success) {
            successList.push(pid);
          } else {
            failedList.push({ id: pid, error: data.error || '未知错误' });
          }
        } catch (err) {
          failedList.push({ id: pid, error: err instanceof Error ? err.message : String(err) });
        }

        // 间隔避免限流
        await new Promise(r => setTimeout(r, 2000));
      }

      setBatchProgress({ current: profiles.length, total: profiles.length, success: successList.length, failed: failedList.length });
      setBatchResult({ success: successList, failed: failedList });
    } catch (error) {
      console.error('Retry failed error:', error);
      setError(`重试失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    setBatchRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-medium text-purple-800 mb-2">第二层AI初筛 - 相似度评分</h3>
        <p className="text-sm text-purple-700 mb-2">
          AI对第一层通过的候选人进行相似度评分，取Top 20%进入第三层
        </p>
        <div className="text-xs text-purple-600 bg-purple-100/50 rounded p-2">
          <strong>评分维度：</strong>
          兴趣爱好（重叠度）、作息习惯（一致性）、社交模式（偏好匹配）、话题偏好（共同话题）、运动习惯（活跃程度）
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="输入档案ID"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={handleCalculate}
            disabled={calculating || !profileId}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-300"
          >
            {calculating ? '评分中...' : '开始评分'}
          </button>
          <button
            onClick={handleLoadStatus}
            disabled={loading || !profileId}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {loading ? '加载中...' : '查看状态'}
          </button>
        </div>

        {/* 批量自动匹配 */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">批量自动匹配</h4>
          <div className="flex flex-wrap gap-4 items-center mb-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">匹配数量:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 10)))}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center"
              />
            </div>
            <button
              onClick={handleBatchMatch}
              disabled={batchRunning}
              className="bg-purple-500 text-white px-6 py-2 rounded-md hover:bg-purple-600 disabled:bg-gray-300"
            >
              {batchRunning ? '批量匹配中...' : '一键批量匹配'}
            </button>
            <button
              onClick={handleRetryFailed}
              disabled={batchRunning}
              className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-300"
            >
              {batchRunning ? '重试中...' : '重试失败档案'}
            </button>
            {batchRunning && batchProgress && (
              <span className="text-sm text-gray-600">
                进度: {batchProgress.current}/{batchProgress.total} (成功{batchProgress.success}/失败{batchProgress.failed})
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">注：第二层AI调用较慢，建议每次不超过20个</p>
        </div>

        {/* 批量匹配结果 */}
        {batchResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3">批量匹配结果</h4>

            {batchResult.success.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-green-700 mb-2">✓ 成功 ({batchResult.success.length})</h5>
                <div className="flex flex-wrap gap-2">
                  {batchResult.success.map(id => (
                    <span key={id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono">{id}</span>
                  ))}
                </div>
              </div>
            )}

            {batchResult.failed.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">✗ 失败 ({batchResult.failed.length})</h5>
                <div className="space-y-1">
                  {batchResult.failed.map(item => (
                    <details key={item.id} className="text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        {item.id}
                      </summary>
                      <p className="text-xs text-red-500 mt-1 pl-4">{item.error}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">
              本次评分完成！处理了 {result.processed} 个候选人，消耗 {result.totalTokens} Token
            </p>
          </div>
        )}

        {/* 第二层错误显示 */}
        {(error || apiError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-1">第二层AI初筛出错</h4>
                {error && <p className="text-red-700 text-sm mb-2">{error}</p>}
                {apiError && (
                  <div className="mt-2">
                    <p className="text-red-600 text-sm">
                      状态码: {apiError.status} | {apiError.message}
                    </p>
                    {apiError.details && (
                      <details className="mt-2">
                        <summary className="text-red-500 text-xs cursor-pointer">查看详细错误</summary>
                        <pre className="mt-2 bg-red-100 p-2 rounded text-xs text-red-800 overflow-auto max-h-40">
                          {apiError.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.level1_passed || 0}</div>
              <div className="text-xs text-gray-500">第一层通过</div>
            </div>
            <div className="bg-purple-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.level2_calculated || 0}</div>
              <div className="text-xs text-gray-500">已评分</div>
            </div>
            <div className="bg-orange-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.level2_passed || 0}</div>
              <div className="text-xs text-gray-500">Top 20%通过</div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.avg_score ? Math.round(stats.avg_score) : '-'}</div>
              <div className="text-xs text-gray-500">平均分</div>
            </div>
          </div>
        )}

        {topCandidates.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 text-purple-800">Top 20% 候选人 ({topCandidates.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="text-left px-4 py-2">邀请码</th>
                    <th className="text-left px-4 py-2">昵称</th>
                    <th className="text-left px-4 py-2">相似度分数</th>
                  </tr>
                </thead>
                <tbody>
                  {topCandidates.map((c) => (
                    <tr key={c.candidate_id} className="border-b">
                      <td className="px-4 py-3 font-mono">{c.invite_code || '-'}</td>
                      <td className="px-4 py-3">{c.nickname || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${c.level_2_score >= 80 ? 'text-green-600' : c.level_2_score >= 60 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {c.level_2_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {topCandidates.length === 0 && stats && (
          <div className="text-center text-gray-500 py-8">
            暂无通过第二层评分的候选人，点击&ldquo;开始评分&rdquo;运行AI初筛
          </div>
        )}
      </div>
    </div>
  );
}

// 第三层深度匹配组件
function Level3Match() {
  const [profileId, setProfileId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [reports, setReports] = useState<Array<{
    candidate_id: string;
    invite_code: string;
    nickname: string;
    overall_score: number;
    similarity_score: number;
    complement_score: number;
    strengths: string[];
    risks: string[];
    advice: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof reports[0] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ status: number; message: string; details?: string } | null>(null);

  // 批量匹配相关
  const [batchCount, setBatchCount] = useState(5);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; success: number; failed: number } | null>(null);
  const [batchResult, setBatchResult] = useState<{ success: string[]; failed: { id: string; error: string }[] } | null>(null);

  const handleCalculateAll = async () => {
    if (!profileId) return;
    setCalculating(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/match/level3-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`深度分析完成！分析了 ${data.data.processed} 个候选人，消耗 ${data.data.totalTokens} Token`);
        handleLoadReports();
      } else {
        setError(data.error || '分析失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Calculate error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setCalculating(false);
  };

  const handleCalculateSingle = async () => {
    if (!profileId || !candidateId) return;
    setCalculating(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/match/level3-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, candidateId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('深度分析完成！');
        handleLoadReports();
      } else {
        setError(data.error || '分析失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Calculate error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setCalculating(false);
  };

  const handleLoadReports = async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    setApiError(null);
    try {
      const res = await fetch(`/api/admin/match/level3-calculate?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      } else {
        setError(data.error || '加载失败');
        if (res.status !== 200) {
          setApiError({
            status: res.status,
            message: data.error || '服务器返回错误',
            details: JSON.stringify(data, null, 2)
          });
        }
      }
    } catch (error) {
      console.error('Load reports error:', error);
      setError(`请求异常: ${error instanceof Error ? error.message : String(error)}`);
      setApiError({
        status: 0,
        message: '网络请求失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    setLoading(false);
  };

  // 批量自动匹配 - 第三层
  const handleBatchMatch = async () => {
    setBatchRunning(true);
    setBatchProgress({ current: 0, total: batchCount, success: 0, failed: 0 });
    setBatchResult(null);
    setError(null);
    setApiError(null);

    try {
      // 1. 获取待处理的档案列表
      const pendingRes = await fetch(`/api/admin/match/pending?level=3&limit=${batchCount}`);
      const pendingData = await pendingRes.json();

      if (!pendingData.success || !pendingData.profiles || pendingData.profiles.length === 0) {
        setError('没有待处理的第三层档案');
        setBatchRunning(false);
        return;
      }

      const profiles = pendingData.profiles;
      const successList: string[] = [];
      const failedList: { id: string; error: string }[] = [];

      // 2. 逐个处理
      for (let i = 0; i < profiles.length; i++) {
        const pid = profiles[i];
        setBatchProgress({ current: i + 1, total: profiles.length, success: successList.length, failed: failedList.length });

        try {
          const res = await fetch('/api/admin/match/level3-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: pid }),
          });
          const data = await res.json();
          if (data.success) {
            successList.push(pid);
          } else {
            failedList.push({ id: pid, error: data.error || '未知错误' });
          }
        } catch (err) {
          failedList.push({ id: pid, error: err instanceof Error ? err.message : String(err) });
        }

        // 间隔避免限流（第三层AI调用最慢，需要更长间隔）
        await new Promise(r => setTimeout(r, 3000));
      }

      setBatchProgress({ current: profiles.length, total: profiles.length, success: successList.length, failed: failedList.length });
      setBatchResult({ success: successList, failed: failedList });
    } catch (error) {
      console.error('Batch match error:', error);
      setError(`批量匹配失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    setBatchRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-medium text-orange-800 mb-2">第三层AI深度匹配 - 差异分析与建议</h3>
        <p className="text-sm text-orange-700">
          分析两人的性格差异、价值观差异、情感需求差异，给出相处建议。重点看互补性而非相似性。
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">档案ID</label>
            <input
              type="text"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="输入档案ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">候选人ID（可选，单选分析）</label>
            <input
              type="text"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="留空则分析所有通过第二层的候选人"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={candidateId ? handleCalculateSingle : handleCalculateAll}
            disabled={calculating || !profileId}
            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-300"
          >
            {calculating ? '分析中...' : candidateId ? '分析单个' : '批量分析'}
          </button>
          <button
            onClick={handleLoadReports}
            disabled={loading || !profileId}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {loading ? '加载中...' : '查看报告'}
          </button>
        </div>

        {/* 批量自动匹配 */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">批量自动匹配</h4>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">匹配数量:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 text-center"
              />
            </div>
            <button
              onClick={handleBatchMatch}
              disabled={batchRunning}
              className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 disabled:bg-gray-300"
            >
              {batchRunning ? '批量匹配中...' : '一键批量匹配'}
            </button>
            {batchRunning && batchProgress && (
              <span className="text-sm text-gray-600">
                进度: {batchProgress.current}/{batchProgress.total} (成功{batchProgress.success}/失败{batchProgress.failed})
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">注：第三层AI调用最慢且消耗Token较多，建议每次不超过10个</p>
        </div>

        {/* 批量匹配结果 */}
        {batchResult && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3">批量匹配结果</h4>
            
            {batchResult.success.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-green-700 mb-2">✓ 成功 ({batchResult.success.length})</h5>
                <div className="flex flex-wrap gap-2">
                  {batchResult.success.map(id => (
                    <span key={id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-mono">{id}</span>
                  ))}
                </div>
              </div>
            )}
            
            {batchResult.failed.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">✗ 失败 ({batchResult.failed.length})</h5>
                <div className="space-y-1">
                  {batchResult.failed.map(item => (
                    <details key={item.id} className="text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        {item.id}
                      </summary>
                      <p className="text-xs text-red-500 mt-1 pl-4">{item.error}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 第三层错误显示 */}
        {(error || apiError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-1">第三层深度匹配出错</h4>
                {error && <p className="text-red-700 text-sm mb-2">{error}</p>}
                {apiError && (
                  <div className="mt-2">
                    <p className="text-red-600 text-sm">
                      状态码: {apiError.status} | {apiError.message}
                    </p>
                    {apiError.details && (
                      <details className="mt-2">
                        <summary className="text-red-500 text-xs cursor-pointer">查看详细错误</summary>
                        <pre className="mt-2 bg-red-100 p-2 rounded text-xs text-red-800 overflow-auto max-h-40">
                          {apiError.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-orange-800">深度匹配报告 ({reports.length})</h4>
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <div
                  key={report.candidate_id}
                  className="border rounded-lg p-4 hover:bg-orange-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedReport(selectedReport?.candidate_id === report.candidate_id ? null : report)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{report.nickname || report.invite_code}</span>
                      <span className="text-sm text-gray-500 ml-2">({report.invite_code})</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-600">相似度: {report.similarity_score}</span>
                      <span className="text-purple-600">互补度: {report.complement_score}</span>
                      <span className={`font-bold ${report.overall_score >= 80 ? 'text-green-600' : report.overall_score >= 60 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        综合: {report.overall_score}
                      </span>
                    </div>
                  </div>

                  {selectedReport?.candidate_id === report.candidate_id && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      {report.strengths && report.strengths.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-700 mb-1">优势互补</h5>
                          <ul className="list-disc list-inside text-sm text-gray-700">
                            {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                      {report.risks && report.risks.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-red-700 mb-1">潜在风险</h5>
                          <ul className="list-disc list-inside text-sm text-gray-700">
                            {report.risks.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {report.advice && (
                        <div className="bg-white rounded p-3">
                          <h5 className="text-sm font-medium text-orange-700 mb-1">相处建议</h5>
                          <p className="text-sm text-gray-700">{report.advice}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            暂无深度匹配报告，请先完成第二层评分，然后点击&ldquo;批量分析&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// 两人匹配测试组件
function PairMatch() {
  const [profileA, setProfileA] = useState('');
  const [profileB, setProfileB] = useState('');
  const [templateId, setTemplateId] = useState('v1_default');
  const [result, setResult] = useState<{ success?: boolean; data?: { overallScore: number; categoryScores: { basic: number; lifestyle: number; emotion: number }; vetoFlags: string[] }; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    if (!profileA || !profileB) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, profileA, profileB }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">两人匹配测试</h3>
        <p className="text-sm text-blue-700">
          测试两个特定档案之间的匹配度，基于资料库权重算法计算
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">档案 A ID</label>
            <input
              type="text"
              value={profileA}
              onChange={(e) => setProfileA(e.target.value)}
              placeholder="例如: 20250320-ABC12345"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">档案 B ID</label>
            <input
              type="text"
              value={profileB}
              onChange={(e) => setProfileB(e.target.value)}
              placeholder="例如: 20250320-DEF67890"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">资料库版本</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="v1_default">默认版本</option>
          </select>
        </div>

        <button
          onClick={handleMatch}
          disabled={loading || !profileA || !profileB}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? '计算中...' : '开始匹配'}
        </button>
      </div>

      {result?.success && result.data && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">匹配结果</h2>

          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-blue-600">{result.data.overallScore}</div>
            <div className="text-gray-500">总分</div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-semibold">{result.data.categoryScores?.basic || 0}</div>
              <div className="text-sm text-gray-500">基础条件</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-semibold">{result.data.categoryScores?.lifestyle || 0}</div>
              <div className="text-sm text-gray-500">生活方式</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-semibold">{result.data.categoryScores?.emotion || 0}</div>
              <div className="text-sm text-gray-500">情感核心</div>
            </div>
          </div>

          {result.data.vetoFlags?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="text-red-700 font-medium mb-2">一票否决项</h3>
              <ul className="list-disc list-inside text-red-600">
                {result.data.vetoFlags.map((flag: string, i: number) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {result.error}
        </div>
      )}
    </div>
  );
}
