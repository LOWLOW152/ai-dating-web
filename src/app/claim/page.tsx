'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('/api/captcha');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [quota, setQuota] = useState({ total: 100, claimed: 0, remaining: 100 });
  const [success, setSuccess] = useState<{ code: string; remaining: number; total: number } | null>(null);

  // 获取今日配额
  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/invite/claim');
      const data = await res.json();
      if (data.success) {
        setQuota(data);
      } else {
        console.error('获取配额失败:', data);
      }
    } catch (err) {
      console.error('获取配额错误:', err);
    }
  };

  // 刷新验证码
  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    setCaptcha('');
    
    const newUrl = `/api/captcha?t=${Date.now()}`;
    
    // 预加载图片，检查是否能正常获取
    try {
      const res = await fetch(newUrl);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setCaptchaError(`验证码加载失败: ${res.status} ${errorData.error || ''}`);
        setCaptchaLoading(false);
        return;
      }
      setCaptchaUrl(newUrl);
    } catch {
      setCaptchaError('验证码加载失败，请检查网络');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // 提交领取
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetail('');

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    // 验证验证码
    if (!captcha || captcha.length !== 4) {
      setError('请输入4位验证码');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, captcha }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess({
          code: data.code,
          remaining: data.remaining,
          total: data.total,
        });
      } else {
        setError(data.error || '领取失败');
        if (data.code) {
          setErrorDetail(`错误代码: ${data.code}`);
        }
        // 刷新验证码
        refreshCaptcha();
      }
    } catch (err: Error | unknown) {
      console.error('提交错误:', err);
      setError('网络错误，请重试');
      setErrorDetail(err instanceof Error ? err.message : String(err));
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // 复制邀请码
  const copyCode = async () => {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.code);
      alert('邀请码已复制');
    } catch {
      // 降级方案
      const input = document.createElement('input');
      input.value = success.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('邀请码已复制');
    }
  };

  // 成功状态 - 显示邀请码
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 顶部 */}
        <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
          <h1 className="text-lg font-semibold">狗蛋交友实验室</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            {/* 成功图标 */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">领取成功！</h2>
              <p className="text-sm text-gray-500">请保存好您的邀请码</p>
            </div>

            {/* 邀请码卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-purple-100">
              <p className="text-sm text-gray-500 text-center mb-3">您的邀请码</p>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold font-mono text-purple-600 tracking-wider">
                  {success.code}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="w-full bg-purple-100 text-purple-700 py-2 rounded-lg font-medium hover:bg-purple-200 transition-colors"
              >
                复制邀请码
              </button>
            </div>

            {/* 剩余名额 */}
            <p className="text-center text-sm text-gray-500 mb-6">
              今日剩余名额：<span className="font-medium text-purple-600">{success.remaining}</span> / {success.total}
            </p>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/invite-code')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                去使用邀请码 →
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-white text-gray-700 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 领取表单
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
        <h1 className="text-lg font-semibold">狗蛋交友实验室</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🎫</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">领取今日邀请码</h2>
            <p className="text-sm text-gray-500">
              剩余名额：
              <span className={`font-medium ${quota.remaining > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                {quota.remaining}
              </span>
              <span className="text-gray-400"> / {quota.total}</span>
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 手机号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setPhone(val);
                }}
                placeholder="请输入11位手机号"
                maxLength={11}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 验证码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图形验证码
              </label>
              
              {/* 验证码错误提示 */}
              {captchaError && (
                <div className="bg-red-50 text-red-600 text-xs py-2 px-3 rounded-lg mb-2">
                  {captchaError}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="ml-2 text-purple-600 underline"
                  >
                    重试
                  </button>
                </div>
              )}
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={captcha}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCaptcha(val);
                  }}
                  placeholder="输入4位验证码"
                  maxLength={4}
                  disabled={captchaLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center tracking-widest disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  disabled={captchaLoading}
                  className="flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {captchaLoading ? (
                    <div className="w-28 h-11 flex items-center justify-center text-xs text-gray-500">
                      加载中...
                    </div>
                  ) : (
                    <img
                      src={captchaUrl}
                      alt="验证码"
                      className="w-28 h-11 object-cover"
                      onError={() => {
                        setCaptchaError('验证码图片加载失败');
                      }}
                    />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={captchaLoading}
                className="text-xs text-gray-500 mt-1 hover:text-purple-600 disabled:opacity-50"
              >
                看不清？换一张
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-2 px-3 rounded-lg">
                {error}
                {errorDetail && (
                  <div className="text-xs text-red-400 mt-1">{errorDetail}</div>
                )}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading || quota.remaining <= 0}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '领取中...' : quota.remaining <= 0 ? '今日名额已满' : '获取邀请码'}
            </button>
          </form>

          {/* 说明 */}
          <div className="mt-8 space-y-2 text-xs text-gray-400">
            <p>• 每个手机号24小时内限领1次</p>
            <p>• 邀请码有效期30天</p>
            <p>• 邀请码可用于颜值打分和AI问卷两个功能</p>
          </div>

          {/* 返回首页 */}
          <button
            onClick={() => router.push('/')}
            className="w-full mt-6 text-gray-500 text-sm hover:text-gray-700"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
