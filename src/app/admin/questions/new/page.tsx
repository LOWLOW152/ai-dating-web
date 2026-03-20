'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuestionForm {
  id: string;
  category: string;
  type: string;
  order: number;
  question_text: string;
  field_type: string;
  ai_prompt: string;
  closing_message: string;
  is_active: boolean;
  is_required: boolean;
}

export default function NewQuestionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState<QuestionForm>({
    id: '',
    category: 'basic',
    type: 'auto',
    order: 1,
    question_text: '',
    field_type: 'text',
    ai_prompt: '',
    closing_message: '',
    is_active: true,
    is_required: true,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!question.id.trim()) {
      setError('请输入题目ID');
      return;
    }
    if (!question.question_text.trim()) {
      setError('请输入题目内容');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...question,
          validation: {},
          options: null,
          hierarchy: null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/questions');
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">新建题目</h1>
        <button
          onClick={() => router.push('/admin/questions')}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          返回
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题目ID *（英文，唯一）</label>
            <input
              type="text"
              value={question.id}
              onChange={(e) => setQuestion({ ...question, id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="例如: hobbies"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">序号</label>
            <input
              type="number"
              value={question.order}
              onChange={(e) => setQuestion({ ...question, order: parseInt(e.target.value) || 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">题目内容 *</label>
          <input
            type="text"
            value={question.question_text}
            onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="例如: 你平时有什么兴趣爱好？"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select
              value={question.category}
              onChange={(e) => setQuestion({ ...question, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="basic">基础条件</option>
              <option value="interests">兴趣话题</option>
              <option value="lifestyle">生活方式</option>
              <option value="values">价值观</option>
              <option value="emotion">情感核心</option>
              <option value="social">社交模式</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={question.type}
              onChange={(e) => setQuestion({ ...question, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="auto">Auto (自动化)</option>
              <option value="semi">Semi (半自动化)</option>
              <option value="dog">Dog (狗蛋主导)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">字段类型</label>
            <select
              value={question.field_type}
              onChange={(e) => setQuestion({ ...question, field_type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="select">单选</option>
              <option value="multi_select">多选</option>
              <option value="multi_text">多文本</option>
              <option value="textarea">长文本</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI提示词</label>
          <textarea
            value={question.ai_prompt}
            onChange={(e) => setQuestion({ ...question, ai_prompt: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="AI追问时的提示词，例如：追问具体的兴趣爱好类型..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">结束语</label>
          <textarea
            value={question.closing_message}
            onChange={(e) => setQuestion({ ...question, closing_message: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="AI结束本话题时使用的话术，例如：这个话题我们就聊到这儿～接下来我们聊聊下一个问题。"
          />
          <p className="text-xs text-gray-500 mt-1">留空则使用默认结束语</p>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={question.is_active}
              onChange={(e) => setQuestion({ ...question, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">启用</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={question.is_required}
              onChange={(e) => setQuestion({ ...question, is_required: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">必填</span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/questions')}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? '创建中...' : '创建'}
          </button>
        </div>
      </form>
    </div>
  );
}