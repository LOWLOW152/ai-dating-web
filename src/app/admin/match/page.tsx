'use client';

import { useState } from 'react';

export default function MatchPage() {
  const [activeTab, setActiveTab] = useState<'level1' | 'pair'>('level1');

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">匹配测试</h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('level1')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'level1'
              ? 'bg-white text-emerald-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          第一层筛选
        </button>
        <button
          onClick={() => setActiveTab('pair')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pair'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          两人匹配测试
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'level1' ? <Level1Filter /> : <PairMatch />}
    </div>
  );
}

// 第一层筛选组件
function Level1Filter() {
  const [profileId, setProfileId] = useState('');
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!profileId) return;
    setCalculating(true);
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
        alert(data.error || '计算失败');
      }
    } catch (error) {
      console.error('Calculate error:', error);
      alert('计算出错');
    }
    setCalculating(false);
  };

  const handleLoadCandidates = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/match/level1-candidates?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data.candidates);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Load candidates error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h3 className="font-medium text-emerald-800 mb-2">第一层硬性条件筛选</h3>
        <p className="text-sm text-emerald-700">
          系统自动筛选符合硬性条件的候选人（性别、年龄、地域等），不消耗AI Token
        </p>
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

// 两人匹配测试组件
function PairMatch() {
  const [profileA, setProfileA] = useState('');
  const [profileB, setProfileB] = useState('');
  const [templateId, setTemplateId] = useState('v1_default');
  const [result, setResult] = useState<any>(null);
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
