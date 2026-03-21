'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BeautyResult {
  photoshop_level: number;
  beauty_type: string;
  beauty_score: number;
  ai_comment: string;
}

export default function BeautyScoreUserPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BeautyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = localStorage.getItem('inviteCode');
    if (!code) {
      router.push('/');
      return;
    }
    setInviteCode(code);
    
    // 检查是否已有评分
    checkExistingScore(code);
  }, [router]);

  async function checkExistingScore(code: string) {
    try {
      const res = await fetch(`/api/beauty-score/check?code=${code}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      }
    } catch (error) {
      console.error('Check existing score error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const photo = formData.get('photo') as File;

    if (!photo) {
      setError('请选择照片');
      setLoading(false);
      return;
    }

    if (photo.size > 5 * 1024 * 1024) {
      setError('照片大小不能超过5MB');
      setLoading(false);
      return;
    }

    try {
      // 转换为 base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/beauty-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode,
            photoBase64: base64,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setResult(data.data);
        } else {
          setError(data.error || '评分失败');
        }
        setLoading(false);
      };
      reader.readAsDataURL(photo);
    } catch (_) {
      setError('上传出错，请重试');
      setLoading(false);
    }
  }

  if (!inviteCode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">验证中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部 */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <h1 className="text-lg font-semibold">颜值打分</h1>
        <span className="text-sm text-gray-500">邀请码: {inviteCode}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {result ? (
            /* 评分结果 */
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🤳</span>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6">颜值评分报告</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">P图程度</p>
                  <p className="text-2xl font-bold text-orange-600">{result.photoshop_level}</p>
                  <p className="text-xs text-gray-400">
                    {result.photoshop_level <= 3 ? '原生感' : 
                     result.photoshop_level <= 6 ? '微P' : '重P'}
                  </p>
                </div>
                <div className="bg-pink-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">颜值类型</p>
                  <p className="text-lg font-bold text-pink-600">{result.beauty_type}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">颜值评分</p>
                  <p className="text-2xl font-bold text-purple-600">{result.beauty_score}</p>
                  <p className="text-xs text-gray-400">满分10分</p>
                </div>
              </div>

              {result.ai_comment && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 italic">&ldquo;{result.ai_comment}&rdquo;</p>
                </div>
              )}

              <div className="text-xs text-gray-400">
                <p>此评分将用于匹配推荐</p>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full mt-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
              >
                返回首页
              </button>
            </div>
          ) : (
            /* 上传照片 */
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🤳</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">上传照片</h2>
                <p className="text-sm text-gray-500">AI将分析你的照片并给出评分</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-xl shadow p-6">
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，最大 5MB</p>
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-500 text-white py-4 rounded-lg font-medium hover:bg-pink-600 disabled:bg-gray-400"
                >
                  {loading ? 'AI分析中...' : '开始颜值打分'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  照片仅用于AI分析，不会被保存
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
