'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Question {
  id: string;
  order: number;
  question_text: string;
  category: string;
  type: string;
  is_active: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-green-100 text-green-700',
  emotion: 'bg-pink-100 text-pink-700',
  values: 'bg-purple-100 text-purple-700',
};

const CATEGORY_NAMES: Record<string, string> = {
  basic: '基础条件',
  lifestyle: '生活方式',
  emotion: '情感核心',
  values: '价值观',
};

export default function QuestionOrderPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Question | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    try {
      const res = await fetch('/api/questions?t=' + Date.now());
      const data = await res.json();
      if (data.success) {
        // 按当前order排序
        const sorted = data.data.sort((a: Question, b: Question) => a.order - b.order);
        setQuestions(sorted);
      }
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载题库失败');
    } finally {
      setLoading(false);
    }
  }

  // 拖拽开始
  function handleDragStart(item: Question) {
    setDraggedItem(item);
  }

  // 拖拽经过
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== questions[index].id) {
      setDragOverIndex(index);
    }
  }

  // 放置
  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (!draggedItem) return;

    const dragIndex = questions.findIndex(q => q.id === draggedItem.id);
    if (dragIndex === dropIndex) {
      setDragOverIndex(null);
      setDraggedItem(null);
      return;
    }

    // 重新排序
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, removed);

    // 重新分配order（从1开始）
    const reordered = newQuestions.map((q, idx) => ({
      ...q,
      order: idx + 1
    }));

    setQuestions(reordered);
    setDragOverIndex(null);
    setDraggedItem(null);
  }

  // 保存顺序
  async function saveOrder() {
    setSaving(true);
    try {
      const updates = questions.map(q => ({
        id: q.id,
        order: q.order
      }));

      const res = await fetch('/api/admin/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const data = await res.json();
      if (data.success) {
        alert('保存成功！');
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

  // 上移
  function moveUp(index: number) {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    
    const reordered = newQuestions.map((q, idx) => ({
      ...q,
      order: idx + 1
    }));
    setQuestions(reordered);
  }

  // 下移
  function moveDown(index: number) {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    
    const reordered = newQuestions.map((q, idx) => ({
      ...q,
      order: idx + 1
    }));
    setQuestions(reordered);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">题库顺序管理</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">题库顺序管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            拖拽题目调整顺序，或点击上下箭头移动。共 {questions.length} 题。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveOrder}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存顺序'}
          </button>
          <Link href="/admin" className="text-blue-600 hover:underline">← 返回首页</Link>
        </div>
      </div>

      {/* 分类图例 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
          <span key={key} className={`px-2 py-1 rounded text-xs ${CATEGORY_COLORS[key]}`}>
            {name}
          </span>
        ))}
      </div>

      {/* 题目列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-100">
          {questions.map((q, index) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => handleDragStart(q)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                flex items-center gap-4 p-4 hover:bg-gray-50 cursor-move
                transition-colors
                ${dragOverIndex === index ? 'bg-blue-50 border-t-2 border-blue-400' : ''}
                ${draggedItem?.id === q.id ? 'opacity-50' : ''}
              `}
            >
              {/* 拖拽手柄 */}
              <div className="text-gray-400 select-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* 序号 */}
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                {q.order}
              </div>

              {/* 分类标签 */}
              <span className={`px-2 py-1 rounded text-xs ${CATEGORY_COLORS[q.category] || 'bg-gray-100 text-gray-600'}`}>
                {CATEGORY_NAMES[q.category] || q.category}
              </span>

              {/* 类型标签 */}
              <span className={`px-2 py-1 rounded text-xs ${
                q.type === 'auto' ? 'bg-blue-50 text-blue-600' :
                q.type === 'semi' ? 'bg-green-50 text-green-600' :
                'bg-pink-50 text-pink-600'
              }`}>
                {q.type === 'auto' ? '自动' : q.type === 'semi' ? '半自动' : '深度'}
              </span>

              {/* 题目内容 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${q.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                  {q.question_text}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ID: {q.id}</p>
              </div>

              {/* 状态 */}
              {!q.is_active && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                  已禁用
                </span>
              )}

              {/* 移动按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="上移"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === questions.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="下移"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 提示 */}
      <div className="mt-4 text-sm text-gray-500">
        <p>💡 提示：</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>拖拽题目可以调整顺序</li>
          <li>点击上下箭头可以微调位置</li>
          <li>调整完成后点击「保存顺序」生效</li>
          <li>禁用的题目（灰色）也会参与排序</li>
        </ul>
      </div>
    </div>
  );
}
