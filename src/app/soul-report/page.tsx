'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { generateSoulIdCard, getTagDisplay, colorMap } from '@/lib/tagDisplay';

interface EvaluationData {
  tags: Record<string, string | string[]>;
  summary: string;
  standardized_answers?: Record<string, unknown>;
}

export default function SoulReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [soulId, setSoulId] = useState('');

  useEffect(() => {
    const code = searchParams.get('code') || localStorage.getItem('inviteCode') || '';
    if (!code) {
      setError('缺少邀请码，请重新验证');
      setLoading(false);
      return;
    }
    setInviteCode(code);
    loadReport(code);
  }, [searchParams]);

  async function loadReport(code: string) {
    try {
      const res = await fetch(`/api/profile/soul-report?code=${code}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '加载失败');
        setLoading(false);
        return;
      }

      if (data.needEvaluation || data.profile.status === 'processing') {
        // 需要等待评价完成，轮询
        setTimeout(() => loadReport(code), 3000);
        return;
      }

      if (data.evaluation && data.tags) {
        setEvaluation({
          tags: data.tags,
          summary: data.evaluation.summary || '',
          standardized_answers: data.evaluation.standardized_answers,
        });
        // 生成灵魂ID卡
        setSoulId(generateSoulIdCard(data.tags));
      }

      setLoading(false);
    } catch (err) {
      console.error('Load report error:', err);
      setError('加载失败，请刷新重试');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              狗
            </div>
            <span className="font-bold text-gray-900">狗蛋AI相亲</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-5xl">✨</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">生成你的灵魂画像中...</h2>
          <p className="text-gray-500">AI正在深度分析你的30道答题</p>
          <p className="text-sm text-gray-400 mt-2">大约需要3-5秒</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              狗
            </div>
            <span className="font-bold text-gray-900">狗蛋AI相亲</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{error}</h2>
          <button
            onClick={() => router.push('/verify')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium"
          >
            重新验证邀请码
          </button>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              狗
            </div>
            <span className="font-bold text-gray-900">狗蛋AI相亲</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-gray-500">暂无评价数据</p>
        </div>
      </div>
    );
  }

  const tags = evaluation.tags;
  const advantages = tags["AI综合_匹配优势"] as string[] || [];
  const risks = tags["AI综合_匹配风险"] as string[] || [];

  // 获取几个核心维度的有趣化展示
  const weekend = getTagDisplay("生活方式_周末偏好", tags["生活方式_周末偏好"] as string || "未提及");
  const consumption = getTagDisplay("生活方式_消费观", tags["生活方式_消费观"] as string || "未提及");
  const attachment = getTagDisplay("情感模式_依恋类型", tags["情感模式_依恋类型"] as string || "未明确");
  const emotion = getTagDisplay("情感模式_情感需求等级", tags["情感模式_情感需求等级"] as string || "未提及");
  const interest = getTagDisplay("生活方式_兴趣爱好大类", tags["生活方式_兴趣爱好大类"] as string || "未提及");

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            狗
          </div>
          <span className="font-bold text-gray-900">狗蛋AI相亲</span>
        </Link>
        <div className="text-sm text-gray-500">
          邀请码: <span className="font-mono font-medium">{inviteCode}</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🎭</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">你的AI灵魂画像</h1>
          <p className="text-sm text-gray-500 mt-2">基于30道深度答题的AI分析</p>
        </div>

        {/* 灵魂ID卡 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-amber-100">
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">灵魂ID</p>
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full">
              <h2 className="text-xl font-bold text-gray-900">{soulId}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-3">{evaluation.summary}</p>
          </div>

          {/* 核心标签展示 */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${colorMap[weekend.color].lightBg} ${colorMap[weekend.color].text}`}>
              <span>{weekend.emoji}</span>
              <span>{weekend.text}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${colorMap[consumption.color].lightBg} ${colorMap[consumption.color].text}`}>
              <span>{consumption.emoji}</span>
              <span>{consumption.text}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${colorMap[attachment.color].lightBg} ${colorMap[attachment.color].text}`}>
              <span>{attachment.emoji}</span>
              <span>{attachment.text}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${colorMap[emotion.color].lightBg} ${colorMap[emotion.color].text}`}>
              <span>{emotion.emoji}</span>
              <span>{emotion.text}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${colorMap[interest.color].lightBg} ${colorMap[interest.color].text}`}>
              <span>{interest.emoji}</span>
              <span>{interest.text}</span>
            </span>
          </div>
        </div>

        {/* AI锐评 - 优势 */}
        {advantages.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">✅</span>
              <h3 className="font-semibold text-green-800">让人想靠近的特质</h3>
            </div>
            <ul className="space-y-2">
              {advantages.map((adv, idx) => (
                <li key={idx} className="flex items-start gap-2 text-green-700 text-sm">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI锐评 - 风险 */}
        {risks.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-semibold text-amber-800">需要注意的小bug</h3>
            </div>
            <ul className="space-y-2">
              {risks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-amber-700 text-sm">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 底部CTA */}
        <div className="space-y-3 mt-8">
          <button
            onClick={() => router.push('/my-matches')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            🎯 查看我的匹配推荐
          </button>
          
          <button
            onClick={() => router.push('/check-score')}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            📊 查看完整档案详情
          </button>

          <Link
            href="/"
            className="block w-full text-center text-gray-500 py-3 hover:text-gray-700 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>

        {/* 底部提示 */}
        <p className="text-xs text-gray-400 text-center mt-6">
          💡 请截图保存此页面，或记住您的邀请码 {inviteCode}
        </p>
      </div>
    </div>
  );
}
