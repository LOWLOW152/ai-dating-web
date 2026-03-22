'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Profile {
  id: string;
  invite_code: string;
  status: string;
  tags: string[];
  created_at: string;
}

const PREDEFINED_TAGS = [
  { value: 'deleted', label: '🗑️ 已删除', color: 'bg-red-100 text-red-700' },
  { value: 'vip', label: '⭐ VIP', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'suspicious', label: '⚠️ 可疑', color: 'bg-orange-100 text-orange-700' },
  { value: 'completed', label: '✅ 已完成', color: 'bg-green-100 text-green-700' },
  { value: 'pending', label: '⏳ 待处理', color: 'bg-blue-100 text-blue-700' },
  { value: '测试', label: '🧪 测试', color: 'bg-purple-100 text-purple-700' },
];

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    // 邀请码搜索
    if (searchCode.trim()) {
      return p.invite_code.toLowerCase().includes(searchCode.toLowerCase());
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
        // 重新加载档案列表确保数据同步
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
    <div className="max-w-6xl mx-auto px-4">
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
        
        {/* 标签筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 邀请码搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="搜索邀请码..."
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.map((p) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 说明 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">标签说明:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="text-red-600">🗑️ 已删除</span> - 软删除标识，匹配时会自动排除</li>
          <li><span className="text-yellow-600">⭐ VIP</span> - 重要客户标识</li>
          <li><span className="text-orange-600">⚠️ 可疑</span> - 需要重点审核</li>
          <li><span className="text-green-600">✅ 已完成</span> - 档案完整，可以匹配</li>
          <li><span className="text-blue-600">⏳ 待处理</span> - 等待审核或补充信息</li>
          <li><span className="text-purple-600">🧪 测试</span> - 测试数据标识</li>
        </ul>
      </div>
    </div>
  );
}
