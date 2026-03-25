'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Profile {
  id: string;
  invite_code: string;
  status: string;
  tags: string[];
  created_at: string;
  ai_evaluation_status?: string;
  match_level1_status?: string;
  match_level2_status?: string;
  match_level3_status?: string;
  match_error?: string;
  level2_max_score?: number;
}

const PREDEFINED_TAGS = [
  { value: 'deleted', label: '🗑️ 已删除', color: 'bg-red-100 text-red-700' },
  { value: 'vip', label: '⭐ VIP', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'suspicious', label: '⚠️ 可疑', color: 'bg-orange-100 text-orange-700' },
  { value: 'completed', label: '✅ 已完成', color: 'bg-green-100 text-green-700' },
  { value: 'pending', label: '⏳ 待处理', color: 'bg-blue-100 text-blue-700' },
  { value: '测试', label: '🧪 测试', color: 'bg-purple-100 text-purple-700' },
];

// 获取匹配状态显示
function getMatchStatusDisplay(profile: Profile) {
  const levels = [
    { key: 'ai_evaluation_status', label: 'AI评价', status: profile.ai_evaluation_status },
    { key: 'match_level1_status', label: '第一层', status: profile.match_level1_status },
    { key: 'match_level2_status', label: '第二层', status: profile.match_level2_status },
    { key: 'match_level3_status', label: '第三层', status: profile.match_level3_status },
  ];
  
  return levels.map(level => {
    const status = level.status || 'pending';
    let color = 'bg-gray-100 text-gray-400'; // pending
    let icon = '○';
    
    if (status === 'completed') {
      color = 'bg-green-100 text-green-700';
      icon = '✓';
    } else if (status === 'running') {
      color = 'bg-blue-100 text-blue-700';
      icon = '⟳';
    } else if (status === 'failed') {
      color = 'bg-red-100 text-red-700';
      icon = '✗';
    }
    
    return { ...level, color, icon, status };
  });
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMatchStatus, setShowMatchStatus] = useState(true);

  // 加载档案列表
  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profiles');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  // 筛选档案（支持标签和邀请码搜索）
  const filteredProfiles = profiles.filter(p => {
    // 标签筛选
    if (tagFilter !== 'all') {
      if (tagFilter === 'no-tags') {
        if (p.tags && p.tags.length > 0) return false;
      } else if (!p.tags?.includes(tagFilter)) {
        return false;
      }
    }
    // 邀请码或ID搜索
    if (searchCode.trim()) {
      const search = searchCode.toLowerCase();
      return p.invite_code.toLowerCase().includes(search) || 
             p.id.toLowerCase().includes(search);
    }
    return true;
  });

  // 开始编辑标签
  function startEditTags(profile: Profile) {
    setEditingTags(profile.id);
    setSelectedTags(profile.tags || []);
  }

  // 保存标签
  async function saveTags(profileId: string) {
    try {
      const res = await fetch(`/api/admin/profiles/${profileId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTags })
      });
      const data = await res.json();
      if (data.success) {
        await loadProfiles();
        setEditingTags(null);
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch {
      alert('保存失败');
    }
  }

  // 切换标签选择
  function toggleTag(tagValue: string) {
    setSelectedTags(prev => 
      prev.includes(tagValue) 
        ? prev.filter(t => t !== tagValue)
        : [...prev, tagValue]
    );
  }

  // 获取标签显示
  function getTagDisplay(tagValue: string) {
    const tag = PREDEFINED_TAGS.find(t => t.value === tagValue);
    return tag || { label: tagValue, color: 'bg-gray-100 text-gray-600' };
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">档案管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {profiles.length} 条档案
            {searchCode.trim() && `，搜索 "${searchCode}" 找到 ${filteredProfiles.length} 条`}
            {!searchCode.trim() && tagFilter !== 'all' && '（已筛选）'}
          </p>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowMatchStatus(!showMatchStatus)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showMatchStatus 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showMatchStatus ? '👁️ 显示匹配进度' : '🙈 隐藏匹配进度'}
          </button>
          
          {/* 刷新按钮 */}
          <button
            onClick={loadProfiles}
            disabled={loading}
            className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🔄 刷新中...' : '🔄 刷新'}
          </button>
          
          {/* 邀请码搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="搜索邀请码或ID..."
              className="px-3 py-2 border rounded-md text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchCode && (
              <button
                onClick={() => setSearchCode('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          <span className="text-sm text-gray-600">筛选:</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">全部档案</option>
            <option value="no-tags">无标签</option>
            <option value="deleted">🗑️ 已删除</option>
            <option value="vip">⭐ VIP</option>
            <option value="suspicious">⚠️ 可疑</option>
            <option value="completed">✅ 已完成</option>
            <option value="pending">⏳ 待处理</option>
            <option value="测试">🧪 测试</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">暂无符合条件的档案</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">邀请码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">标签</th>
                {showMatchStatus && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">匹配进度</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.map((p) => {
                const matchStatuses = getMatchStatusDisplay(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{p.id}</td>
                    <td className="px-4 py-3 text-sm">{p.invite_code}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingTags === p.id ? (
                        <div className="flex flex-wrap gap-1">
                          {PREDEFINED_TAGS.map(tag => (
                            <button
                              key={tag.value}
                              onClick={() => toggleTag(tag.value)}
                              className={`px-2 py-1 rounded text-xs border ${
                                selectedTags.includes(tag.value)
                                  ? tag.color + ' border-transparent'
                                  : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              {selectedTags.includes(tag.value) ? '✓ ' : ''}{tag.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.tags?.length > 0 ? (
                            p.tags.map(tag => {
                              const display = getTagDisplay(tag);
                              return (
                                <span key={tag} className={`px-2 py-1 rounded text-xs ${display.color}`}>
                                  {display.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 text-xs">无标签</span>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {showMatchStatus && (
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {matchStatuses.map((status) => (
                            <span
                              key={status.key}
                              className={`px-2 py-1 rounded text-xs ${status.color}`}
                              title={status.status === 'failed' ? p.match_error : undefined}
                            >
                              {status.icon} {status.label}
                            </span>
                          ))}
                        </div>
                        {p.level2_max_score && p.level2_max_score > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            第二层最高分: {p.level2_max_score}
                          </div>
                        )}
                      </td>
                    )}
                    
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingTags === p.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveTags(p.id)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingTags(null)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <Link href={`/admin/profiles/${p.id}`} className="text-blue-600 hover:underline">
                            查看
                          </Link>
                          <button
                            onClick={() => startEditTags(p)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            标签
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 说明 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">匹配进度说明:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="text-gray-400">○</span> 待处理 - 等待自动化运行</li>
          <li><span className="text-blue-600">⟳</span> 运行中 - 正在处理</li>
          <li><span className="text-green-600">✓</span> 已完成 - 该层处理完成</li>
          <li><span className="text-red-600">✗</span> 失败 - 处理出错，鼠标悬停查看原因</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          自动化时间：AI评价(2:00-3:00) → 第一层(3:00-3:10) → 第二层+第三层(3:10-6:50)
        </p>
      </div>
    </div>
  );
}
