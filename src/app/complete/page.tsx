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
  }, []);

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
        localStorage.removeItem('inviteCode');
        localStorage.removeItem('profileData');
      } else {
        alert('提交失败：' + (result.error || '未知错误'));
      }
    } catch {
      alert('网络错误，请重试');
    }
    
    setSubmitting(false);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">档案已提交</h1>
          <p className="text-gray-600 mb-8">感谢你的配合！我们会尽快为你匹配合适的对象。</p>
          <p className="text-sm text-gray-400">档案ID: {inviteCode}</p>
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
