'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BeautyResult {
  photoshop_level: number;
  beauty_type: string;
  beauty_score: number;
  ai_comment: string;
  details?: {
    facial_features: number;
    skin_quality: number;
    temperament: number;
    photoshop_deduction: number;
  };
}

const BEAUTY_LEVELS = [
  { min: 9, max: 10, label: '明星级', color: 'text-yellow-600', bg: 'bg-yellow-50', desc: '素颜能打，镜头扛得住' },
  { min: 8, max: 8.9, label: '小网红', color: 'text-purple-600', bg: 'bg-purple-50', desc: '好看，微调/轻P就能出片' },
  { min: 7, max: 7.9, label: '素人天花板', color: 'text-blue-600', bg: 'bg-blue-50', desc: '底子好，打扮后很亮眼' },
  { min: 6, max: 6.9, label: '好看普通人', color: 'text-green-600', bg: 'bg-green-50', desc: '顺眼，有亮点' },
  { min: 5, max: 5.9, label: '普通', color: 'text-gray-600', bg: 'bg-gray-50', desc: '大街上一抓一大把' },
  { min: 4, max: 4.9, label: '略差', color: 'text-orange-600', bg: 'bg-orange-50', desc: '有明显硬伤' },
  { min: 0, max: 3.9, label: '需要改善', color: 'text-red-600', bg: 'bg-red-50', desc: '严重问题' },
];

function getBeautyLevel(score: number) {
  return BEAUTY_LEVELS.find(l => score >= l.min && score <= l.max) || BEAUTY_LEVELS[4];
}

export default function BeautyScoreUserPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BeautyResult | null>(null);
  const [dataSource, setDataSource] = useState<'mock' | 'ai' | null>(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const code = localStorage.getItem('inviteCode');
    if (!code) {
      router.push('/');
      return;
    }
    setInviteCode(code);
    checkExistingScore(code);
  }, [router]);

  async function checkExistingScore(code: string) {
    try {
      const res = await fetch(`/api/beauty-score/check?code=${code}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
        setDataSource('ai'); // 数据库里存的是之前AI评的
      }
    } catch {
      // ignore
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

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await fetch('/api/beauty-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, photoBase64: base64 }),
      });
      const data = await res.json();
      console.log('[Frontend] Response:', data);
      setDebugInfo(JSON.stringify(data, null, 2));
      if (data.success) {
        setResult(data.data);
        setDataSource(data.source || 'mock');
      } else {
        setError(data.error || '评分失败');
      }
      setLoading(false);
    };
    reader.readAsDataURL(photo);
  }

  if (!inviteCode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">验证中...</p>
      </div>
    );
  }

  const level = result ? getBeautyLevel(result.beauty_score) : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <h1 className="text-lg font-semibold">颜值打分</h1>
        <span className="text-sm text-gray-500">邀请码: {inviteCode}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {result ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🤳</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">颜值评分报告</h2>
                {level && (
                  <div className={`inline-block px-4 py-2 rounded-full ${level.bg} ${level.color} font-semibold mb-2`}>
                    {level.label}
                  </div>
                )}
                <p className="text-sm text-gray-500">{level?.desc}</p>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-pink-600 mb-1">{result.beauty_score}</div>
                <p className="text-sm text-gray-400">满分10分</p>
                {dataSource && (
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                    dataSource === 'ai' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {dataSource === 'ai' ? '🤖 AI真实评分' : '⚠️ 模拟数据（API未配置）'}
                  </span>
                )}
              </div>
              
              {result.details && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">详细评分</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">五官协调度</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(result.details.facial_features / 2) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{result.details.facial_features}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">皮肤状态</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(result.details.skin_quality / 1.5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{result.details.skin_quality}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">气质神态</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(result.details.temperament / 1.5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{result.details.temperament}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P图扣分</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(result.details.photoshop_deduction / 2) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium w-8 text-right text-orange-600">-{result.details.photoshop_deduction}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                    公式：5 + {result.details.facial_features} + {result.details.skin_quality} + {result.details.temperament} - {result.details.photoshop_deduction} = {result.beauty_score}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-pink-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">颜值类型</p>
                  <p className="font-bold text-pink-600">{result.beauty_type}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">P图程度</p>
                  <p className="font-bold text-orange-600">{result.photoshop_level}</p>
                  <p className="text-xs text-gray-400">
                    {Number(result.photoshop_level) <= 0.5 ? '原生感' : 
                     Number(result.photoshop_level) <= 1.0 ? '轻度美颜' : 
                     Number(result.photoshop_level) <= 1.5 ? '明显P图' : '高P'}
                  </p>
                </div>
              </div>
              
              {result.ai_comment && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 italic text-center">&ldquo;{result.ai_comment}&rdquo;</p>
                </div>
              )}
              
              <button onClick={() => router.push('/')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200">
                返回首页
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🤳</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">上传照片</h2>
                <p className="text-sm text-gray-500">AI将分析你的照片并给出评分</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-xl shadow p-6">
                  <input type="file" name="photo" accept="image/*" required className="w-full" />
                  <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，最大 5MB</p>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button type="submit" disabled={loading} className="w-full bg-pink-500 text-white py-4 rounded-lg font-medium hover:bg-pink-600 disabled:bg-gray-400">
                  {loading ? 'AI分析中...' : '开始颜值打分'}
                </button>

                <p className="text-xs text-gray-400 text-center">照片仅用于AI分析，不会被保存</p>
              </form>

              <div className="mt-8 bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">评分等级说明</h3>
                <div className="space-y-2 text-xs">
                  {BEAUTY_LEVELS.slice(0, 5).map((lvl) => (
                    <div key={lvl.label} className={`flex items-center gap-2 p-2 rounded ${lvl.bg}`}>
                      <span className={`font-bold ${lvl.color} w-16`}>{lvl.label}</span>
                      <span className="text-gray-500 w-16">{lvl.min}-{lvl.max}分</span>
                      <span className="text-gray-600">{lvl.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {debugInfo && (
                <div className="mt-4 bg-gray-800 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40">
                  <p className="text-gray-400 mb-1">调试信息:</p>
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
