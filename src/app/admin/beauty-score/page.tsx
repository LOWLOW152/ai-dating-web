'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Profile {
  id: string;
  invite_code: string;
  photoshop_level?: number;
  beauty_type?: string;
  beauty_score?: number;
  beauty_evaluated_at?: string;
}

interface BeautyScore {
  id: number;
  photoshop_level: number;
  beauty_type: string;
  beauty_score: number;
  ai_comment: string | null;
  evaluator: string;
  scored_at: string;
}

const BEAUTY_TYPES = [
  '清纯型', '御姐型', '知性型', '甜美型', '冷艳型',
  '阳光型', '成熟型', '可爱型', '优雅型', '时尚型',
  '知性优雅型', '甜美可爱型', '成熟御姐型'
];

export default function BeautyScorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<BeautyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单状态
  const [photoshopLevel, setPhotoshopLevel] = useState(5);
  const [beautyType, setBeautyType] = useState('');
  const [beautyScore, setBeautyScore] = useState(7);
  const [comment, setComment] = useState('');

  async function fetchProfiles() {
    try {
      const res = await fetch('/api/admin/profiles');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data || []);
      }
    } catch (error) {
      console.error('Fetch profiles error:', error);
    }
  }

  async function fetchScores(profileId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/beauty-score?profileId=${profileId}`);
      const data = await res.json();
      if (data.success) {
        setScores(data.data);
      }
    } catch (error) {
      console.error('Fetch scores error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/beauty-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          photoshopLevel,
          beautyType,
          beautyScore,
          aiComment: comment
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // 刷新列表
        fetchScores(selectedProfile.id);
        fetchProfiles();
        // 清空评语
        setComment('');
        alert('评价已保存');
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交出错');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchScores(selectedProfile.id);
      // 如果有已有评分，填充表单
      if (selectedProfile.beauty_score !== undefined) {
        setPhotoshopLevel(selectedProfile.photoshop_level || 5);
        setBeautyType(selectedProfile.beauty_type || '');
        setBeautyScore(selectedProfile.beauty_score);
      }
    }
  }, [selectedProfile]);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin" className="text-blue-600 hover:underline text-sm">
            ← 返回首页
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">颜值打分 🤳</h1>
          <p className="text-sm text-gray-500">三个维度：P图程度 / 颜值类型 / 颜值评分</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧：选择档案和评价表单 */}
        <div className="space-y-6">
          {/* 选择档案 */}
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择档案</label>
            <select
              value={selectedProfile?.id || ''}
              onChange={(e) => {
                const profile = profiles.find(p => p.id === e.target.value);
                setSelectedProfile(profile || null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">请选择档案...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.invite_code} 
                  {p.beauty_score !== undefined && ` (已评分: ${p.beauty_score}分)`}
                </option>
              ))}
            </select>
          </div>

          {selectedProfile && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="font-semibold text-lg">颜值评价</h2>
              
              {/* P图程度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  P图程度 <span className="text-pink-600 font-bold">{photoshopLevel}</span>
                  <span className="text-xs text-gray-400 ml-2">(0=完全没P, 10=P得妈都不认识)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={photoshopLevel}
                  onChange={(e) => setPhotoshopLevel(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>原生</span>
                  <span>微P</span>
                  <span>重P</span>
                </div>
              </div>

              {/* 颜值类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜值类型</label>
                <select
                  value={beautyType}
                  onChange={(e) => setBeautyType(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">请选择类型...</option>
                  {BEAUTY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* 颜值评分 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  颜值评分 <span className="text-pink-600 font-bold">{beautyScore}</span>
                  <span className="text-xs text-gray-400 ml-2">(0-10分)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={beautyScore}
                  onChange={(e) => setBeautyScore(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              {/* 评语（可选） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">评语（可选）</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="写下你的评价..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !beautyType}
                className="w-full py-3 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-400 font-medium"
              >
                {submitting ? '保存中...' : '💾 保存评价'}
              </button>
            </form>
          )}
        </div>

        {/* 右侧：评价历史 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">评价历史</h2>
          
          {!selectedProfile ? (
            <p className="text-gray-500 text-center py-8">请先选择档案</p>
          ) : loading ? (
            <p className="text-gray-500">加载中...</p>
          ) : scores.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无评价记录</p>
          ) : (
            <div className="space-y-4">
              {scores.map((s) => (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">
                      {new Date(s.scored_at).toLocaleString()}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{s.evaluator}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-orange-50 p-2 rounded">
                      <p className="text-xs text-gray-500">P图程度</p>
                      <p className="font-bold text-orange-600">{s.photoshop_level}</p>
                    </div>
                    <div className="bg-pink-50 p-2 rounded">
                      <p className="text-xs text-gray-500">颜值类型</p>
                      <p className="font-bold text-pink-600 text-sm">{s.beauty_type}</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <p className="text-xs text-gray-500">颜值评分</p>
                      <p className="font-bold text-purple-600">{s.beauty_score}</p>
                    </div>
                  </div>
                  
                  {s.ai_comment && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      "{s.ai_comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
