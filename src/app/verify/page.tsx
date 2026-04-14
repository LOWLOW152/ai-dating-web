'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    const code = inviteCode.trim().toUpperCase();

    // 格式校验
    const codePattern = /^[A-Z0-9]{8}$/;
    if (!codePattern.test(code)) {
      setError('邀请码格式不正确（8位字母数字）');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, project: 'questionnaire' }),
      });

      const data = await res.json();

      if (data.success) {
        // 验证成功，保存到 localStorage
        localStorage.setItem('inviteCode', code);
        
        // 如果已经有档案，跳到我的档案；否则开始答题
        if (data.exists && data.profileId) {
          router.push('/my-matches');
        } else {
          router.push('/chat');
        }
      } else {
        setError(data.error || '邀请码验证失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
      console.error('Verify error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            狗
          </div>
          <span className="font-bold text-gray-900">狗蛋AI相亲</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {/* 标题区 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">验证邀请码</h2>
            <p className="text-sm text-gray-500">输入您的邀请码，开始AI深度对话</p>
          </div>

          {/* 输入表单 */}
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邀请码
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="如：X7K9M2P4"
                maxLength={8}
                disabled={loading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 uppercase"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                8位字母数字组合，不区分大小写
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '开始AI问卷'}
            </button>
          </form>

          {/* 没有邀请码？ */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-3">还没有邀请码？</p>
            <Link
              href="/claim"
              className="inline-block text-amber-600 hover:text-amber-700 font-medium"
            >
              免费领取今日邀请码 →
            </Link>
          </div>

          {/* 返回首页 */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
