'use client';

import { useState, useEffect } from 'react';

interface FilterConfig {
  id: number;
  question_id: string;
  question_text: string;
  category: string;
  filter_type: 'hard_filter' | 'soft_preference';
  filter_rule: string;
  is_enabled: boolean;
  params: Record<string, unknown>;
}

interface Candidate {
  id: string;
  inviteCode: string;
  nickname: string;
  gender: string;
  birthYear: string;
  city: string;
  education: string;
}

const FILTER_RULES = [
  { key: 'gender_opposite', label: '必须异性', desc: '排除同性' },
  { key: 'age_mutual', label: '年龄互适', desc: '双向年龄接受范围' },
  { key: 'city_or_accept', label: '同城或接受异地', desc: '不接受异地则必须同城' },
  { key: 'education_min', label: '最低学历', desc: '可配置最低学历要求' },
  { key: 'diet_compatible', label: '饮食兼容', desc: '检查饮食限制冲突' },
];

export default function Level1FilterPage() {
  const [profileId, setProfileId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<{
    passed: number;
    failed: number;
    failed_gender: number;
    failed_age: number;
    failed_location: number;
    failed_education: number;
    failed_diet: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // 配置管理
  const [configs, setConfigs] = useState<FilterConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoadingConfigs(true);
    try {
      const res = await fetch('/api/admin/match/level1-config');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data.filters);
      }
    } catch (error) {
      console.error('Load configs error:', error);
    }
    setLoadingConfigs(false);
  }

  async function loadCandidates() {
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
  }

  async function calculateLevel1() {
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
        loadCandidates();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Calculate error:', error);
    }
    setCalculating(false);
  }

  async function toggleFilter(id: number, enabled: boolean) {
    try {
      const config = configs.find(c => c.id === id);
      if (!config) return;

      const res = await fetch('/api/admin/match/level1-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'v1_default',
          filters: [{
            questionId: config.question_id,
            filterType: config.filter_type,
            filterRule: config.filter_rule,
            isEnabled: !enabled,
            params: config.params
          }]
        }),
      });
      
      if (res.ok) {
        loadConfigs();
      }
    } catch (error) {
      console.error('Toggle filter error:', error);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">第一层硬性条件筛选</h1>

      {/* 配置管理 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">筛选条件配置</h2>
        
        {loadingConfigs ? (
          <div className="text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => {
              const ruleInfo = FILTER_RULES.find(r => r.key === config.filter_rule);
              return (
                <div key={config.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.question_text}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        config.filter_type === 'hard_filter' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {config.filter_type === 'hard_filter' ? '硬性' : '软性'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {ruleInfo?.label} · {ruleInfo?.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFilter(config.id, config.is_enabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      config.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      config.is_enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 计算工具 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">计算第一层匹配</h2>
        
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="输入档案ID"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={calculateLevel1}
            disabled={calculating || !profileId}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {calculating ? '计算中...' : '开始计算'}
          </button>
          <button
            onClick={loadCandidates}
            disabled={loading || !profileId}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {loading ? '加载中...' : '查看结果'}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-7 gap-2 text-center">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-xs text-gray-500">通过</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-gray-500">排除</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_gender}</div>
              <div className="text-xs text-gray-500">性别</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_age}</div>
              <div className="text-xs text-gray-500">年龄</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_location}</div>
              <div className="text-xs text-gray-500">地域</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_education}</div>
              <div className="text-xs text-gray-500">学历</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xl font-bold">{stats.failed_diet}</div>
              <div className="text-xs text-gray-500">饮食</div>
            </div>
          </div>
        )}
      </div>

      {/* 候选人列表 */}
      {candidates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">通过筛选的候选人 ({candidates.length})</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">昵称</th>
                  <th className="text-left px-4 py-2">性别</th>
                  <th className="text-left px-4 py-2">出生年</th>
                  <th className="text-left px-4 py-2">城市</th>
                  <th className="text-left px-4 py-2">学历</th>
                  <th className="text-left px-4 py-2">邀请码</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-3">{c.nickname}</td>
                    <td className="px-4 py-3">{c.gender}</td>
                    <td className="px-4 py-3">{c.birthYear}</td>
                    <td className="px-4 py-3">{c.city}</td>
                    <td className="px-4 py-3">{c.education}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.inviteCode}</td>
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
