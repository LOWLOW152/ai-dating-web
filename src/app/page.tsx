'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = null | 'chat' | 'beauty';

export default function InvitePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!code.trim()) {
      setError('请输入邀请码');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('inviteCode', code.trim().toUpperCase());
        // 根据选择的功能跳转
        if (mode === 'chat') {
          router.push('/chat');
        } else if (mode === 'beauty') {
          router.push('/beauty-score');
        }
      } else {
        setError(data.error || '邀请码无效');
      }
    } catch {
      setError('网络错误，请重试');
    }
    
    setLoading(false);
  }

  // 选择功能页面
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 顶部 */}
        <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
          <h1 className="text-lg font-semibold">狗蛋相亲实验室</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            {/* Logo区域 */}
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🐕</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">欢迎</h2>
              <p className="text-sm text-gray-500">我是狗蛋，帮你找到合适的另一半</p>
            </div>

            <p className="text-center text-sm text-gray-500 mb-6">请选择功能</p>

            {/* 两个入口 - 上下排列 */}
            <div className="space-y-4">
              <button
                onClick={() => setMode('chat')}
                className="w-full bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100 flex items-center gap-4"
              >
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💬</span>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-800">开始答题</h3>
                  <p className="text-sm text-gray-500">30题深入了解你，生成相亲档案</p>
                </div>
                <span className="text-gray-300">→</span>
              </button>

              <button
                onClick={() => setMode('beauty')}
                className="w-full bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100 flex items-center gap-4"
              >
                <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🤳</span>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-800">颜值打分</h3>
                  <p className="text-sm text-gray-500">上传照片，AI给出颜值评分</p>
                </div>
                <span className="text-gray-300">→</span>
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-8">
              同一个邀请码可以用于两个功能
            </p>

            {/* AI匹配开发中提示 */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">🤖</span>
                <div>
                  <p className="text-sm text-blue-800 font-medium">AI 匹配正在开发中</p>
                  <p className="text-xs text-blue-600 mt-1">
                    请找管理员帮你手动 AI 匹配
                  </p>
                </div>
              </div>
            </div>

            {/* 查分入口 */}
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/check-score')}
                className="text-sm text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto"
              >
                <span>🔍</span>
                <span>已有邀请码？查询我的分数</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 输入邀请码页面
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
        <h1 className="text-lg font-semibold">狗蛋相亲实验室</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* 返回按钮 */}
          <button
            onClick={() => setMode(null)}
            className="text-gray-400 text-sm mb-6 hover:text-gray-600 flex items-center gap-1"
          >
            ← 返回选择
          </button>

          {/* 当前选择的功能 */}
          <div className="bg-white rounded-xl p-4 mb-6 flex items-center gap-3 border border-gray-100">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              mode === 'chat' ? 'bg-purple-100' : 'bg-pink-100'
            }`}>
              <span>{mode === 'chat' ? '💬' : '🤳'}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">已选择</p>
              <p className="font-medium">{mode === 'chat' ? '开始答题' : '颜值打分'}</p>
            </div>
          </div>

          {/* 邀请码输入 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请输入邀请码
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="如：X7K9M2P4"
                maxLength={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3 rounded-lg font-medium disabled:bg-gray-400 ${
                mode === 'chat' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-pink-500 hover:bg-pink-600'
              }`}
            >
              {loading ? '验证中...' : '开始'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            邀请码由管理员提供，可重复使用
          </p>
        </div>
      </div>
    </div>
  );
}
