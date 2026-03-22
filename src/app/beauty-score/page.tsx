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

interface TaskStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: BeautyResult | null;
  error: string | null;
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
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [result, setResult] = useState<BeautyResult | null>(null);
  const [error, setError] = useState('');
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    const code = localStorage.getItem('inviteCode');
    if (!code) {
      router.push('/');
      return;
    }
    setInviteCode(code);
    
    // 检查是否已使用过
    checkInviteUsed(code).then(used => {
      if (used) {
        setAlreadyUsed(true);
        checkExistingScore(code);
      }
    });
  }, [router]);

  // 轮询查询任务状态
  useEffect(() => {
    if (!taskId || result) return;

    const poll = () => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/beauty-score?taskId=${taskId}&_t=${Date.now()}`, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.success && data.task) {
                setTaskStatus(data.task);
                setPollingCount(prev => prev + 1);
                
                if (data.task.status === 'completed' && data.task.result) {
                  router.push('/check-score');
                } else if (data.task.status === 'failed') {
                  setError(data.task.error || '评分失败，请重试');
                  setLoading(false);
                }
              }
            } catch {
              // ignore parse error
            }
          }
        };
        
        xhr.onerror = () => {
          // 轮询失败继续
        };
        
        xhr.send();
      } catch {
        // 轮询失败继续
      }
    };

    // 立即查一次
    poll();
    
    // 每3秒轮询
    const interval = setInterval(poll, 3000);
    
    // 60秒后停止轮询（防止无限等待）
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!result) {
        // 超时也跳转到查分页面
        router.push('/check-score');
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [taskId, result]);

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
      const res = await fetch(`/api/beauty-score?code=${code}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
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
      
      // 使用 XMLHttpRequest 提高安卓兼容性
      const xhr = new XMLHttpRequest();
      const url = `/api/beauty-score?_t=${Date.now()}`;
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 30000; // 30秒超时
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.taskId) {
              setTaskId(data.taskId);
            } else {
              setError(data.error || '创建评分任务失败\n可能原因: 邀请码无效或已使用');
              setLoading(false);
            }
          } catch (parseErr) {
            setError('解析响应失败\n调试信息: ' + String(parseErr) + '\n原始响应: ' + xhr.responseText.slice(0, 100));
            setLoading(false);
          }
        } else if (xhr.status === 0) {
          setError('无法连接到服务器 (状态0)\n可能原因:\n1. 网络断开\n2. 浏览器拦截了请求\n3. HTTPS证书问题\n4. 微信内置浏览器限制\n\n建议:\n- 换Chrome浏览器试试\n- 切换到4G/5G网络\n- 关闭夸克的"智能省流"');
          setLoading(false);
        } else if (xhr.status === 413) {
          setError('图片太大 (413)\n请压缩图片后再试');
          setLoading(false);
        } else if (xhr.status === 429) {
          setError('请求太频繁 (429)\n请稍后再试');
          setLoading(false);
        } else if (xhr.status === 500) {
          setError('服务器内部错误 (500)\nAI服务暂时不可用，请稍后重试');
          setLoading(false);
        } else {
          setError(`服务器错误: ${xhr.status} ${xhr.statusText}\n请稍后重试或联系管理员`);
          setLoading(false);
        }
      };
      
      xhr.onerror = () => {
        const errorInfo = {
          readyState: xhr.readyState,
          status: xhr.status,
          statusText: xhr.statusText,
          url: url,
          photoSize: photo.size,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        };
        setError('网络请求失败\n调试信息: ' + JSON.stringify(errorInfo, null, 2) + 
          '\n\n常见原因:\n1. 微信内置浏览器限制POST请求\n2. CORS跨域被阻止\n3. HTTPS证书不受信任\n4. 企业网络/防火墙拦截\n\n建议:\n- 用Chrome浏览器打开\n- 关闭WiFi用4G试试\n- 复制链接到浏览器打开');
        setLoading(false);
      };
      
      xhr.ontimeout = () => {
        setError('请求超时 (30秒)\n网络连接较慢，请检查网络后重试');
        setLoading(false);
      };
      
      xhr.send(JSON.stringify({ inviteCode, photoBase64: base64 }));
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

  // 评分中状态
  if (loading && taskId && !result) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
          <h1 className="text-lg font-semibold">颜值打分</h1>
          <span className="text-sm text-gray-500">邀请码: {inviteCode}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center">
            {/* 动画图标 */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-pink-200 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-2 bg-pink-300 rounded-full animate-pulse opacity-40"></div>
              <div className="absolute inset-4 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">🤖</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {taskStatus?.status === 'processing' ? 'AI分析中...' : '排队中...'}
            </h2>
            
            <p className="text-gray-500 mb-4">
              {taskStatus?.status === 'processing' 
                ? '正在分析9项客观指标，约需10-30秒' 
                : '任务已提交，等待AI处理'}
            </p>
            
            {/* 进度条动画 */}
            <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden mb-4">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-1000"
                style={{ 
                  width: taskStatus?.status === 'processing' ? '60%' : '30%',
                  animation: 'pulse 2s infinite'
                }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-400">
              已等待 {pollingCount * 3} 秒 · 请勿关闭页面
            </p>
            
            {/* 查分提示 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                💡 评分完成后可前往查分系统查看
              </p>
              <button
                onClick={() => router.push('/check-score')}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                立即去查分 →
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
                <button 
                  onClick={() => window.location.reload()}
                  className="block mt-2 text-pink-600 hover:underline"
                >
                  刷新页面查看结果
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <h1 className="text-lg font-semibold">颜值打分</h1>
        <span className="text-sm text-gray-500">邀请码: {inviteCode}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {alreadyUsed && !result ? (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">该邀请码已使用</h2>
              <p className="text-gray-500 mb-6">此邀请码已经完成过颜值打分，不能重复评分。</p>
              <button 
                onClick={() => {
                  localStorage.removeItem('inviteCode');
                  router.push('/');
                }} 
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
              >
                使用新邀请码
              </button>
            </div>
          ) : result ? (
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
                <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                  🤖 AI真实评分
                </span>
              </div>
              
              {result.details && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">客观指标评分</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: '体型肥胖', value: result.details.body_shape, max: 4, color: 'bg-red-500' },
                      { label: '皮肤状况', value: result.details.skin_quality, max: 3, color: 'bg-orange-500' },
                      { label: '五官对称', value: result.details.symmetry, max: 3, color: 'bg-yellow-500' },
                      { label: '脸部年龄', value: result.details.face_age, max: 3, color: 'bg-green-500' },
                      { label: '发际线', value: result.details.hairline, max: 2, color: 'bg-teal-500' },
                      { label: '黑眼圈', value: result.details.eye_bags, max: 2, color: 'bg-blue-500' },
                      { label: '牙齿嘴型', value: result.details.teeth, max: 2, color: 'bg-indigo-500' },
                      { label: '鼻梁高度', value: result.details.nose_bridge, max: 2, color: 'bg-purple-500' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-gray-600">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                          </div>
                          <span className="font-medium w-8 text-right">{item.value}</span>
                        </div>
                      </div>
                    ))}
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
              
              <button 
                onClick={() => {
                  localStorage.removeItem('inviteCode');
                  router.push('/');
                }} 
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
              >
                使用新邀请码
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">🤳</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">上传照片</h2>
                <p className="text-sm text-gray-500">AI分析9项客观指标 · 约需10-30秒</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white rounded-xl shadow p-6">
                  <input type="file" name="photo" accept="image/*" required className="w-full" />
                  <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG，最大 5MB</p>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button type="submit" disabled={loading} className="w-full bg-pink-500 text-white py-4 rounded-lg font-medium hover:bg-pink-600 disabled:bg-gray-400">
                  开始颜值打分
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
