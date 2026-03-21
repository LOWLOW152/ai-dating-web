'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);

  async function handleValidate(e: React.FormEvent) {
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
        setValidated(true);
      } else {
        setError(data.error || '邀请码无效');
      }
    } catch {
      setError('网络错误，请重试');
    }
    
    setLoading(false);
  }

  function goToChat() {
    router.push('/chat');
  }

  function goToBeautyScore() {
    router.push('/beauty-score');
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
        <h1 className="text-lg font-semibold">狗蛋相亲实验室</h1>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo区域 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🐕</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">欢迎</h2>
            <p className="text-sm text-gray-500">我是狗蛋，帮你找到合适的另一半</p>
          </div>

          {!validated ? (
            /* 邀请码输入 */
            <form onSubmit={handleValidate} className="space-y-4">
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
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
              >
                {loading ? '验证中...' : '验证邀请码'}
              </button>
            </form>
          ) : (
            /* 两个入口 */
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-500 mb-4">
                邀请码验证成功，请选择功能
              </p>
              
              <button
                onClick={goToChat}
                className="w-full bg-purple-600 text-white py-4 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <span className="text-xl">💬</span>
                <div className="text-left">
                  <div className="font-semibold">开始答题</div>
                  <div className="text-xs opacity-80">30题深入了解你</div>
                </div>
              </button>

              <button
                onClick={goToBeautyScore}
                className="w-full bg-pink-500 text-white py-4 rounded-lg font-medium hover:bg-pink-600 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🤳</span>
                <div className="text-left">
                  <div className="font-semibold">颜值打分</div>
                  <div className="text-xs opacity-80">上传照片获取评价</div>
                </div>
              </button>

              <button
                onClick={() => setValidated(false)}
                className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
              >
                ← 更换邀请码
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">
            邀请码由管理员提供
          </p>
        </div>
      </div>
    </div>
  );
}
