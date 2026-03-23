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

export const dynamic = 'force-dynamic';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      const res = await fetch('/api/admin/questions', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await res.json();
      if (data.success !== false) {
        setQuestions(data.data || data);
      }
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(question: Question) {
    setTogglingId(question.id);
    try {
      const res = await fetch(`/api/admin/questions/${question.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !question.is_active }),
      });
      
      if (res.ok) {
        // 本地更新状态
        setQuestions(questions.map(q => 
          q.id === question.id ? { ...q, is_active: !q.is_active } : q
        ));
      } else {
        alert('切换状态失败');
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      alert('切换状态失败');
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">题库管理</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">题库管理</h1>
        <div className="flex gap-2">
          <Link 
            href="/admin/questions/prompt"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            全局AI提示词
          </Link>
          <Link 
            href="/admin/questions/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 新建题目
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">序号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">题目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{q.order}</td>
                <td className="px-4 py-3 text-sm font-medium">{q.question_text}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    q.category === 'basic' ? 'bg-blue-100 text-blue-700' :
                    q.category === 'lifestyle' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {q.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{q.type}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => toggleActive(q)}
                    disabled={togglingId === q.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      q.is_active ? 'bg-green-500' : 'bg-gray-300'
                    } ${togglingId === q.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        q.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`ml-2 text-xs ${q.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                    {q.is_active ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link href={`/admin/questions/${q.id}`} className="text-blue-600 hover:underline">编辑</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}