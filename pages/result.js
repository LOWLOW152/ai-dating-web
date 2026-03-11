import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ResultCard from '../components/ResultCard';
import { generateTags } from '../lib/logic';

export default function Result() {
  const router = useRouter();
  const [answers, setAnswers] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (router.query.answers) {
      try {
        const parsed = JSON.parse(router.query.answers);
        setAnswers(parsed);
        generateProfile(parsed);
      } catch (e) {
        console.error('解析答案失败:', e);
      }
    }
  }, [router.query]);

  const generateProfile = (data) => {
    // 生成标签
    const tags = generateTags(data);
    
    // 生成档案内容（简化版，实际可接Kimi API生成更丰富的内容）
    const generatedProfile = {
      tags,
      basicInfo: {
        nickname: data.nickname || '神秘用户',
        age: data.birthYear ? new Date().getFullYear() - parseInt(data.birthYear) : '未知',
        city: data.city || '未知',
        occupation: data.occupation || '未知',
      },
      personality: generatePersonalityDescription(data),
      needs: generateNeedsDescription(data),
      compatibility: generateCompatibilityDescription(data),
      summary: generateSummary(data),
    };

    setProfile(generatedProfile);
    setLoading(false);
  };

  const generatePersonalityDescription = (data) => {
    const parts = [];
    if (data.sleepSchedule === '夜猫子') parts.push('你是个夜猫子');
    if (data.sleepSchedule === '早睡早起') parts.push('你作息规律，是个晨型人');
    if (data.planningStyle === '计划控') parts.push('喜欢把事情安排得井井有条');
    if (data.planningStyle === '随性派') parts.push('更喜欢随性而为的生活态度');
    if (data.solitudeFeeling === '充电回血') parts.push('独处对你来说是充电的方式');
    
    return parts.length > 0 
      ? parts.join('，') + '。'
      : '你的性格多元而独特，需要更多的相处才能了解真实的你。';
  };

  const generateNeedsDescription = (data) => {
    const needs = [];
    if (data.coreNeed) needs.push(`最看重：${data.coreNeed}`);
    if (data.contactFrequency) needs.push(`理想的联系频率：${data.contactFrequency}`);
    if (data.conflictHandling) needs.push(`处理冲突的方式：${data.conflictHandling}`);
    
    return needs.length > 0
      ? needs.join('；') + '。'
      : '你对亲密关系有自己的理解和期待。';
  };

  const generateCompatibilityDescription = (data) => {
    const suggestions = [];
    if (data.dealBreakers) suggestions.push(`不能接受：${data.dealBreakers}`);
    if (data.acceptLongDistance) suggestions.push(`异地恋：${data.acceptLongDistance}`);
    if (data.idealRelationship) suggestions.push(`理想关系特质：${data.idealRelationship}`);
    
    return suggestions.length > 0
      ? `适合你的人应该：${suggestions.join('；')}。`
      : '适合你的人会理解并尊重你的生活方式。';
  };

  const generateSummary = (data) => {
    return `一个${data.city || ' somewhere '}的${data.occupation || '有趣的灵魂'}，正在寻找${data.idealRelationship ? '能' + data.idealRelationship + '的人' : '真正懂TA的人'}。`;
  };

  const handleShare = () => {
    // 复制到剪贴板
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板！');
    });
  };

  const generateShareText = () => {
    if (!profile) return '';
    return `【AI相亲档案】\n\n我是${profile.basicInfo.nickname}，来自${profile.basicInfo.city}。\n\n个人标签：${profile.tags.join('、')}\n\n${profile.summary}\n\n——由狗蛋AI生成`;
  };

  const handleRestart = () => {
    router.push('/');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-warm-200 border-t-warm-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">狗蛋正在生成你的档案...✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-warm-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
            🐶
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {profile.basicInfo.nickname} 的相亲档案
          </h1>
          <p className="text-gray-500">
            由狗蛋AI生成
          </p>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {profile.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-warm-100 text-warm-700 px-4 py-1 rounded-full text-sm font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 档案内容 */}
        <ResultCard
          title="基础信息"
          icon="👤"
          content={
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">年龄：</span> {profile.basicInfo.age}岁</div>
              <div><span className="text-gray-400">城市：</span> {profile.basicInfo.city}</div>
              <div><span className="text-gray-400">职业：</span> {profile.basicInfo.occupation}</div>
              <div><span className="text-gray-400">学历：</span> {answers?.education || '未填写'}</div>
            </div>
          }
        />

        <ResultCard
          title="性格画像"
          icon="🎨"
          content={profile.personality}
        />

        <ResultCard
          title="情感需求"
          icon="💝"
          content={profile.needs}
        />

        <ResultCard
          title="相处建议"
          icon="🤝"
          content={profile.compatibility}
        />

        <div className="bg-gradient-to-r from-warm-400 to-warm-500 rounded-2xl p-6 text-white mb-8">
          <h3 className="text-lg font-semibold mb-3">💫 一句话总结</h3>
          <p className="leading-relaxed">{profile.summary}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleShare}
            className="btn-primary flex-1"
          >
            复制分享文案
          </button>
          <button
            onClick={handleRestart}
            className="btn-secondary flex-1"
          >
            重新测试
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          档案仅供参考，真实的你需要在相处中被发现 💕
        </p>
      </div>
    </div>
  );
}