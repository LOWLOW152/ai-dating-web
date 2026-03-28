'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompletePage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem('inviteCode');
    const data = localStorage.getItem('profileData');
    
    if (!code || !data) {
      router.push('/');
      return;
    }
    
    setInviteCode(code);
    setProfileData(JSON.parse(data));
  }, [router]);

  async function handleSubmit() {
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/profile/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode,
          data: profileData,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setSubmitted(true);
        localStorage.removeItem('profileData');
        // 保留 inviteCode 用于查分
      } else {
        alert('提交失败：' + (result.error || '未知错误'));
        setSubmitting(false);
      }
    } catch {
      alert('网络错误，请重试');
      setSubmitting(false);
    }
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 提交成功后的等待页面
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* 顶部 */}
        <div className="bg-white px-4 py-4 flex items-center justify-center border-b">
          <h1 className="text-lg font-semibold">档案提交成功</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-sm">
            {/* 动画图标 */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-2 bg-purple-300 rounded-full animate-pulse opacity-40"></div>
              <div className="absolute inset-4 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">🤖</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">等待AI评价中...</h2>            
            <p className="text-gray-500 mb-2">
              你的档案已提交，AI正在分析你的性格、需求和匹配标签
            </p>
            <p className="text-sm text-purple-600 font-medium mb-6">
              由于AI正在阅读您的资料与匹配，请明天再来查看匹配结果吧~
            </p>

            {/* 邀请码卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <p className="text-sm text-gray-500 mb-2">你的邀请码（查分凭证）</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-purple-600">{inviteCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    alert('已复制邀请码');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  复制
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                请截图保存此页面，或记住邀请码
              </p>
            </div>

            {/* 查分按钮 */}
            <button
              onClick={() => router.push('/check-score')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 mb-3"
            >
              去查分系统查看
            </button>

            <p className="text-xs text-gray-400">
              颜值打分和问卷结果都在查分系统中
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 border-b">
        <h1 className="text-lg font-semibold text-center">档案确认</h1>
      </div>

      {/* 内容 */}
      <div className="p-4">
        <div className="bg-white rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">已收集的信息</h2>
          <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">提示：</span> 
            确认提交后，你的档案将进入匹配池。管理员会人工审核后为你推荐合适的对象。
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400"
        >
          {submitting ? '提交中...' : '确认提交档案'}
        </button>
      </div>
    </div>
  );
}
