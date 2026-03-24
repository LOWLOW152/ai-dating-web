'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface FilterConfig {
  id?: number;
  question_id: string;
  question_text: string;
  category: string;
  filter_type: 'hard_filter' | 'soft_preference';
  filter_rule: string;
  is_enabled: boolean;
  params: Record<string, unknown>;
}

interface AvailableQuestion {
  id: string;
  question_text: string;
  category: string;
  field_type: string;
}

const FILTER_RULES = [
  { key: 'gender_opposite', label: '必须异性', desc: '排除同性', applicable: ['gender'] },
  { key: 'age_mutual', label: '年龄互适', desc: '双向年龄接受范围', applicable: ['birth_year', 'age_gap_preference'] },
  { key: 'city_or_accept', label: '同城或接受异地', desc: '不接受异地则必须同城', applicable: ['city', 'long_distance'] },
  { key: 'education_min', label: '最低学历', desc: '可配置最低学历要求', applicable: ['education'] },
  { key: 'diet_compatible', label: '饮食兼容', desc: '检查饮食限制冲突', applicable: ['diet'] },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础条件',
  lifestyle: '生活方式',
  values: '价值观',
  emotion: '情感核心',
  social: '社交模式',
};

export default function TemplateLevel1Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: templateId } = use(params);
  
  const [configs, setConfigs] = useState<FilterConfig[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<AvailableQuestion[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [filterType, setFilterType] = useState<'hard_filter' | 'soft_preference'>('hard_filter');

  useEffect(() => {
    loadData();
  }, [templateId]);

  async function loadData() {
    setLoading(true);
    try {
      // 获取模板信息
      const templateRes = await fetch(`/api/admin/profile-templates/${templateId}`);
      const templateData = await templateRes.json();
      if (templateData.success) {
        setTemplateName(templateData.data.name);
      }

      // 获取第一层配置
      const configRes = await fetch(`/api/admin/match/level1-config?templateId=${templateId}`);
      const configData = await configRes.json();
      if (configData.success) {
        setConfigs(configData.data.filters);
        setAvailableQuestions(configData.data.availableQuestions);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
    setLoading(false);
  }

  async function toggleFilter(configId: number, currentEnabled: boolean) {
    try {
      const config = configs.find(c => c.id === configId);
      if (!config) return;

      const res = await fetch('/api/admin/match/level1-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          filters: [{
            questionId: config.question_id,
            filterType: config.filter_type,
            filterRule: config.filter_rule,
            isEnabled: !currentEnabled,
            params: config.params
          }]
        }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Toggle filter error:', error);
    }
  }

  async function deleteFilter(configId: number) {
    if (!confirm('确定删除这个筛选条件吗？')) return;

    try {
      const res = await fetch(`/api/admin/match/level1-config?id=${configId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Delete filter error:', error);
    }
  }

  async function addFilter() {
    if (!selectedQuestion || !selectedRule) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/match/level1-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          filters: [{
            questionId: selectedQuestion,
            filterType: filterType,
            filterRule: selectedRule,
            isEnabled: true,
            params: {}
          }]
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedQuestion('');
        setSelectedRule('');
        loadData();
      }
    } catch (error) {
      console.error('Add filter error:', error);
    }
    setSaving(false);
  }

  // 获取规则适用的题目
  function getApplicableQuestions(ruleKey: string) {
    const rule = FILTER_RULES.find(r => r.key === ruleKey);
    if (!rule) return [];
    return availableQuestions.filter(q => rule.applicable.includes(q.id));
  }

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">第一层硬性条件筛选</h1>
          <p className="text-gray-500">资料库: {templateName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/profile-templates')}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            + 添加筛选条件
          </button>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-emerald-800 mb-2">💡 第一层筛选说明</h3>
        <ul className="text-sm text-emerald-700 space-y-1">
          <li>• 硬性条件：不满足直接排除（如性别不匹配、年龄超出范围）</li>
          <li>• 软性偏好：不满足扣大分但不直接排除（如学历差距大）</li>
          <li>• 第一层完全免费，不消耗AI Token</li>
          <li>• 通常第一层能筛掉60-70%的候选人</li>
        </ul>
      </div>

      {/* 筛选条件列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">已配置的筛选条件 ({configs.length})</h2>
        </div>

        {configs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无筛选条件，点击&quot;添加筛选条件&quot;开始配置
          </div>
        ) : (
          <div className="divide-y">
            {configs.map((config) => {
              const ruleInfo = FILTER_RULES.find(r => r.key === config.filter_rule);
              return (
                <div key={config.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{config.question_text}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        config.filter_type === 'hard_filter' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {config.filter_type === 'hard_filter' ? '硬性' : '软性'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        config.is_enabled 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {config.is_enabled ? '启用' : '禁用'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {ruleInfo?.label} · {ruleInfo?.desc}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFilter(config.id!, config.is_enabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        config.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        config.is_enabled ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                    <button
                      onClick={() => deleteFilter(config.id!)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold">添加筛选条件</h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 选择规则 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">筛选规则</label>
                <div className="space-y-2">
                  {FILTER_RULES.map(rule => (
                    <label
                      key={rule.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRule === rule.key
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rule"
                        checked={selectedRule === rule.key}
                        onChange={() => {
                          setSelectedRule(rule.key);
                          setSelectedQuestion('');
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm">{rule.label}</div>
                        <div className="text-xs text-gray-500">{rule.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 选择题目 */}
              {selectedRule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联题目</label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">请选择题目</option>
                    {getApplicableQuestions(selectedRule).map(q => (
                      <option key={q.id} value={q.id}>
                        [{CATEGORY_LABELS[q.category] || q.category}] {q.question_text}
                      </option>
                    ))}
                  </select>
                  {getApplicableQuestions(selectedRule).length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      题库中没有适用于此规则的题目，请先去题库添加相关题目
                    </p>
                  )}
                </div>
              )}

              {/* 类型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">条件类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filterType"
                      checked={filterType === 'hard_filter'}
                      onChange={() => setFilterType('hard_filter')}
                    />
                    <span>硬性条件（不满足直接排除）</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filterType"
                      checked={filterType === 'soft_preference'}
                      onChange={() => setFilterType('soft_preference')}
                    />
                    <span>软性偏好（扣大分但不排除）</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={addFilter}
                disabled={saving || !selectedQuestion}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-300"
              >
                {saving ? '保存中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
