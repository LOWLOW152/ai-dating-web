'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BeautyResult {
  photoshop_level: number;
  beauty_type: string;
  beauty_score: number;
  ai_comment: string;
  details: {
    body_shape: number;
    skin_quality: number;
    symmetry: number;
    face_age: number;
    hairline: number;
    eye_bags: number;
    teeth: number;
    nose_bridge: number;
    photoshop_deduction: number;
  };
  raw_score?: number;
}

interface ApiResponse {
  success: boolean;
  data?: BeautyResult;
  source?: 'mock' | 'ai';
  debug?: string[];
  error?: string;
}

const BEAUTY_LEVELS = [
  { min: 9, max: 10, label: '明星级', color: 'text-yellow-600', bg: 'bg-yellow-50', desc: '极少数，扛得住镜头' },
  { min: 8, max: 8.9, label: '班草/班花', color: 'text-purple-600', bg: 'bg-purple-50', desc: '很出众，前3%' },
  { min: 7, max: 7.9, label: '小帅/小美', color: 'text-blue-600', bg: 'bg-blue-50', desc: '有亮点，前15%' },
  { min: 6, max: 6.9, label: '顺眼', color: 'text-green-600', bg: 'bg-green-50', desc: '比普通人好一点' },
  { min: 4.5, max: 5.9, label: '普通人', color: 'text-gray-600', bg: 'bg-gray-50', desc: '大街上一抓一大把，70%' },
  { min: 3, max: 4.4, label: '略差', color: 'text-orange-600', bg: 'bg-orange-50', desc: '有明显问题' },
  { min: 0, max: 2.9, label: '需改善', color: 'text-red-600', bg: 'bg-red-50', desc: '有明显硬伤' },
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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem('inviteCode');
    if (!code) {
      router.push('/');
      return;
    }
    setInviteCode(code);
    
    // 先检查邀请码是否已使用过颜值打分
    checkInviteUsed(code).then(used => {
      if (used) {
        // 已使用过，显示已有结果
        checkExistingScore(code);
      }
      // 没使用过，正常显示上传界面
    });
  }, [router]);

  async function checkInviteUsed(code: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/invite/check-used?code=${code}&project=beauty-score`);
      const data = await res.json();
      return data.success && data.used;
    } catch {
      return false;
    }
  }

  async function checkExistingScore(code: string) {
    try {
      const res = await fetch(`/api/beauty-score/check?code=${code}`);
      const data = await res.json();
      if (data.success && data.data) {
        // 已经评分过，直接显示结果（不能重新评分）
        setResult(data.data);
        setDataSource('ai');
        setLoading(false);
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
      const data: ApiResponse = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
        setDataSource(data.source || 'mock');
        setDebugLogs(data.debug || []);
      } else {
        setError(data.error || '评分失败');
        setDebugLogs(data.debug || []);
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
                    {dataSource === 'ai' ? '🤖 AI真实评分' : '⚠️ 模拟数据'}
                  </span>
                )}
              </div>
              
              {result.details && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">客观指标评分</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">体型肥胖</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${(result.details.body_shape / 4) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.body_shape}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">皮肤状况</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(result.details.skin_quality / 3) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.skin_quality}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">五官对称</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(result.details.symmetry / 3) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.symmetry}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">脸部年龄</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(result.details.face_age / 3) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.face_age}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">发际线</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(result.details.hairline / 2) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.hairline}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">黑眼圈</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(result.details.eye_bags / 2) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.eye_bags}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">牙齿嘴型</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(result.details.teeth / 2) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.teeth}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">鼻梁高度</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(result.details.nose_bridge / 2) * 100}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{result.details.nose_bridge}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-600">P图扣分</span>
                      <span className="font-medium text-red-600">-{result.details.photoshop_deduction}</span>
                    </div>
                  </div>
                  {result.raw_score !== undefined && (
                    <div className="mt-3 pt-2 border-t text-xs text-gray-400">
                      原始分: {result.raw_score.toFixed(2)} → 映射分: {result.beauty_score}
                    </div>
                  )}
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
              
              {/* 调试信息 */}
              {debugLogs.length > 0 && (
                <div className="mb-6">
                  <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="w-full text-left text-xs text-gray-400 hover:text-gray-600 flex items-center justify-between"
                  >
                    <span>{showDebug ? '隐藏调试信息' : '查看调试信息'}</span>
                    <span>{showDebug ? '▲' : '▼'}</span>
                  </button>
                  {showDebug && (
                    <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{debugLogs.join('\n')}</pre>
                    </div>
                  )}
                </div>
              )}
              
              <button 
                onClick={() => {
                  localStorage.removeItem('inviteCode');
                  router.push('/');
                }} 
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
              >
                使用新邀请码
              </button>
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
                <p className="text-sm text-gray-500">AI分析9项客观指标</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-xl shadow p-6">
                  <input type="file" name="photo" accept="image/*" required className="w-full" />
                  <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG，最大 5MB</p>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button type="submit" disabled={loading} className="w-full bg-pink-500 text-white py-4 rounded-lg font-medium hover:bg-pink-600 disabled:bg-gray-400">
                  {loading ? 'AI分析中...' : '开始颜值打分'}
                </button>

                <p className="text-xs text-gray-400 text-center">基于9项客观指标 · 正态分布评分</p>
              </form>

              <div className="mt-8 bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">评分等级</h3>
                <div className="space-y-1.5 text-xs">
                  {BEAUTY_LEVELS.map((lvl) => (
                    <div key={lvl.label} className={`flex items-center gap-2 p-1.5 rounded ${lvl.bg}`}>
                      <span className={`font-bold ${lvl.color} w-14`}>{lvl.label}</span>
                      <span className="text-gray-500 w-16">{lvl.min}-{lvl.max}分</span>
                      <span className="text-gray-600 truncate">{lvl.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
