'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  category: string;
  question_text: string;
  field_type: string;
}

interface TemplateWeight {
  id?: number;
  question_id: string;
  match_enabled: boolean;
  match_algorithm: string | null;
  match_weight: number;
  is_veto: boolean;
  algorithm_params: Record<string, unknown>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

const ALGORITHMS = [
  { key: 'must_match', label: '必须一致', desc: '如性别、是否接受异地，不一致直接0分' },
  { key: 'range_compatible', label: '范围兼容', desc: '如年龄差是否在对方接受范围内' },
  { key: 'set_similarity', label: '集合相似度', desc: '如兴趣爱好、性格标签的交集比例' },
  { key: 'level_similarity', label: '等级相似', desc: '如消费观念、生活方式，越接近越好' },
  { key: 'level_complementary', label: '等级互补', desc: '如性格互补，适中差异最好' },
  { key: 'keyword_blocker', label: '关键词拦截', desc: '命中雷区词一票否决' },
  { key: 'semantic_similarity', label: '语义相似', desc: 'AI判断价值观、理想关系的相似度' },
  { key: 'no_match', label: '不参与匹配', desc: '如昵称、备注等不参与计算' },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础条件',
  interests: '兴趣话题',
  lifestyle: '生活方式',
  values: '价值观',
  emotion: '情感核心',
  social: '社交模式',
};

export default function TemplateConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [weights, setWeights] = useState<Record<string, TemplateWeight>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      // 并行获取模板、题库、权重配置
      const [templateRes, questionsRes, weightsRes] = await Promise.all([
        fetch(`/api/admin/profile-templates/${id}`),
        fetch('/api/questions'),
        fetch(`/api/admin/profile-templates/${id}/weights`),
      ]);

      const templateData = await templateRes.json();
      const questionsData = await questionsRes.json();
      const weightsData = await weightsRes.json();

      if (templateData.success) setTemplate(templateData.data);
      if (questionsData.success) {
        const sorted = questionsData.data.sort((a: Question, b: Question) => {
          const catOrder = ['basic', 'interests', 'lifestyle', 'values', 'emotion', 'social'];
          const catDiff = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
          return catDiff !== 0 ? catDiff : a.id.localeCompare(b.id);
        });
        setQuestions(sorted);
        if (sorted.length > 0) setSelectedQuestionId(sorted[0].id);
      }
      if (weightsData.success) {
        const map: Record<string, TemplateWeight> = {};
        weightsData.data.forEach((w: TemplateWeight) => {
          map[w.question_id] = w;
        });
        setWeights(map);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  function getWeightConfig(questionId: string): TemplateWeight {
    return weights[questionId] || {
      question_id: questionId,
      match_enabled: true,
      match_algorithm: null,
      match_weight: 10,
      is_veto: false,
      algorithm_params: {},
    };
  }

  function updateWeight(questionId: string, updates: Partial<TemplateWeight>) {
    setWeights(prev => ({
      ...prev,
      [questionId]: { ...getWeightConfig(questionId), ...updates },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const weightsArray = Object.values(weights);
      const res = await fetch(`/api/admin/profile-templates/${id}/weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: weightsArray }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/profile-templates');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  }

  // 按分类分组题目
  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);
  const currentWeight = selectedQuestionId ? getWeightConfig(selectedQuestionId) : null;

  if (loading) return <div className="p-8">加载中...</div>;
  if (!template) return <div className="p-8">资料库不存在</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">配置资料库: {template.name}</h1>
          <p className="text-xs text-gray-500">{template.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/profile-templates')}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧题目列表 */}
        <div className="w-1/3 border-r overflow-y-auto bg-gray-50">
          {Object.entries(groupedQuestions).map(([category, qs]) => (
            <div key={category} className="mb-2">
              <div className="px-4 py-2 bg-gray-200 text-xs font-medium text-gray-600">
                {CATEGORY_LABELS[category] || category}
              </div>
              {qs.map(q => {
                const w = getWeightConfig(q.id);
                const isSelected = selectedQuestionId === q.id;
                const isConfigured = w.match_algorithm !== null;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-center gap-3 hover:bg-white ${
                      isSelected ? 'bg-white border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      w.match_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{q.question_text}</div>
                      <div className="text-xs text-gray-400">
                        {w.match_enabled ? (isConfigured ? ALGORITHMS.find(a => a.key === w.match_algorithm)?.label : '未配置算法') : '不参与匹配'}
                      </div>
                    </div>
                    {w.is_veto && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">否决</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 右侧配置面板 */}
        <div className="w-2/3 overflow-y-auto p-6">
          {selectedQuestion && currentWeight ? (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold mb-1">{selectedQuestion.question_text}</h2>
              <p className="text-sm text-gray-500 mb-6">ID: {selectedQuestion.id} · 类型: {selectedQuestion.field_type}</p>

              {/* 参与匹配开关 */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">参与匹配计算</h3>
                    <p className="text-xs text-gray-500">关闭则该题目不参与匹配分数计算</p>
                  </div>
                  <button
                    onClick={() => updateWeight(selectedQuestion.id, { match_enabled: !currentWeight.match_enabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      currentWeight.match_enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      currentWeight.match_enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {currentWeight.match_enabled && (
                <>
                  {/* 匹配算法选择 */}
                  <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <h3 className="font-medium mb-3">匹配算法</h3>
                    <div className="space-y-2">
                      {ALGORITHMS.map(algo => (
                        <label
                          key={algo.key}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            currentWeight.match_algorithm === algo.key
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="algorithm"
                            checked={currentWeight.match_algorithm === algo.key}
                            onChange={() => updateWeight(selectedQuestion.id, { match_algorithm: algo.key })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-sm">{algo.label}</div>
                            <div className="text-xs text-gray-500">{algo.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 权重配置 */}
                  <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">权重</h3>
                      <span className="text-2xl font-bold text-blue-600">{currentWeight.match_weight}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={currentWeight.match_weight}
                      onChange={(e) => updateWeight(selectedQuestion.id, { match_weight: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">该题目在总分中的权重占比</p>
                  </div>

                  {/* 一票否决 */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-red-600">一票否决</h3>
                        <p className="text-xs text-gray-500">开启后，若该题匹配失败则整体匹配度为0</p>
                      </div>
                      <button
                        onClick={() => updateWeight(selectedQuestion.id, { is_veto: !currentWeight.is_veto })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          currentWeight.is_veto ? 'bg-red-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          currentWeight.is_veto ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              请选择左侧题目进行配置
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
