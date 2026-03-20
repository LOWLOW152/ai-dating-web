'use client';

import { useState } from 'react';

export default function MatchPage() {
  const [profileA, setProfileA] = useState('');
  const [profileB, setProfileB] = useState('');
  const [templateId, setTemplateId] = useState('v1_default');
  const [result, setResult] = useState<{ success?: boolean; data?: { overallScore: number; categoryScores: { basic: number; lifestyle: number; emotion: number }; vetoFlags: string[] }; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMatch() {
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
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">匹配测试</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
              <div className="text-2xl font-semibold">{result.data.categoryScores.basic}</div>
              <div className="text-sm text-gray-500">基础条件</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-semibold">{result.data.categoryScores.lifestyle}</div>
              <div className="text-sm text-gray-500">生活方式</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-semibold">{result.data.categoryScores.emotion}</div>
              <div className="text-sm text-gray-500">情感核心</div>
            </div>
          </div>

          {result.data.vetoFlags.length > 0 && (
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