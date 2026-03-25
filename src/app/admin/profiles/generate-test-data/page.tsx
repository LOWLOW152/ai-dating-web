'use client';

import { useState, useEffect } from 'react';

export default function GenerateTestDataPage() {
  const [count, setCount] = useState(20);
  const [gender, setGender] = useState<'mixed' | '男' | '女'>('mixed');
  const [stats, setStats] = useState<{ total: number; male_count: number; female_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: Array<{ id: string; invite_code: string; nickname: string; gender: string }> } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profiles/generate-test-data');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!confirm(`确定生成 ${count} 个测试档案吗？`)) {
      return;
    }

    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/profiles/generate-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, gender }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        loadStats();
      }
    } catch (error) {
      console.error('Generate error:', error);
      setResult({ success: false, message: '生成失败' });
    }
    setGenerating(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">生成测试档案数据</h1>

      {/* 当前统计 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">当前档案统计</h3>
        {loading ? (
          <p className="text-blue-700">加载中...</p>
        ) : stats ? (
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">总档案</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.male_count}</div>
              <div className="text-sm text-gray-600">男性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.female_count}</div>
              <div className="text-sm text-gray-600">女性</div>
            </div>
          </div>
        ) : (
          <p className="text-blue-700">暂无数据</p>
        )}
      </div>

      {/* 生成配置 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-medium text-gray-800 mb-4">生成配置</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生成数量</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">每次最多生成100个</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别分布</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'mixed' | '男' | '女')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="mixed">混合（随机男女各半）</option>
              <option value="男">仅男性</option>
              <option value="女">仅女性</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 font-medium"
        >
          {generating ? '生成中...' : `生成 ${count} 个测试档案`}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium">{result.message}</p>
            {result.data && result.data.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto">
                <p className="text-sm mb-2">生成的档案（部分）：</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.data.slice(0, 10).map((p) => (
                    <div key={p.id} className="bg-white px-2 py-1 rounded">
                      {p.invite_code} - {p.nickname} ({p.gender})
                    </div>
                  ))}
                  {result.data.length > 10 && (
                    <div className="text-gray-500">...还有 {result.data.length - 10} 个</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 数据特点说明 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">生成的数据特点</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>年龄：1988-1998年出生（28-38岁）</li>
          <li>城市：随机20个一二线城市</li>
          <li>学历：高中到博士随机分布</li>
          <li>兴趣爱好：从30个选项中随机选3-6个</li>
          <li>包含标准化答案，可直接用于匹配测试</li>
          <li>档案状态为 completed</li>
        </ul>
      </div>
    </div>
  );
}
