'use client';

import { useState, useEffect } from 'react';

interface Profile {
  id: string;
  invite_code: string;
  nickname: string;
  gender: string;
  birthYear: string;
  city: string;
}

export default function BatchUpdateGenderPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetGender, setTargetGender] = useState<'女' | '男'>('女');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: Profile[] } | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profiles/batch-update-gender');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data);
      }
    } catch (error) {
      console.error('Load profiles error:', error);
    }
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    const maleProfiles = profiles.filter(p => p.gender === '男');
    setSelectedIds(maleProfiles.map(p => p.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const handleUpdate = async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要修改的档案');
      return;
    }

    if (!confirm(`确定将 ${selectedIds.length} 个档案的性别改为"${targetGender}"吗？`)) {
      return;
    }

    setUpdating(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/profiles/batch-update-gender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds: selectedIds, gender: targetGender }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        loadProfiles();
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Update error:', error);
      setResult({ success: false, message: '更新失败' });
    }
    setUpdating(false);
  };

  const maleCount = profiles.filter(p => p.gender === '男').length;
  const femaleCount = profiles.filter(p => p.gender === '女').length;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">批量修改档案性别</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-800 mb-2">⚠️ 开发测试功能</h3>
        <p className="text-sm text-yellow-700">
          此功能用于测试匹配系统，会将选定档案的性别修改为指定值。
          当前统计：男 {maleCount} 人，女 {femaleCount} 人
        </p>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标性别</label>
            <select
              value={targetGender}
              onChange={(e) => setTargetGender(e.target.value as '女' | '男')}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="女">女</option>
              <option value="男">男</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              全选所有男生
            </button>
            <button
              onClick={selectNone}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              清空选择
            </button>
          </div>

          <div className="flex-1"></div>

          <div className="text-sm text-gray-600">
            已选择 {selectedIds.length} 个档案
          </div>

          <button
            onClick={handleUpdate}
            disabled={updating || selectedIds.length === 0}
            className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 disabled:bg-gray-300"
          >
            {updating ? '修改中...' : '确认修改'}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.message}
          </div>
        )}
      </div>

      {/* 档案列表 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === profiles.length && profiles.length > 0}
                      onChange={(e) => e.target.checked ? setSelectedIds(profiles.map(p => p.id)) : setSelectedIds([])}
                    />
                  </th>
                  <th className="text-left px-4 py-3">邀请码</th>
                  <th className="text-left px-4 py-3">昵称</th>
                  <th className="text-left px-4 py-3">性别</th>
                  <th className="text-left px-4 py-3">出生年</th>
                  <th className="text-left px-4 py-3">城市</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr 
                    key={p.id} 
                    className={`border-b hover:bg-gray-50 ${selectedIds.includes(p.id) ? 'bg-pink-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelection(p.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">{p.invite_code}</td>
                    <td className="px-4 py-3">{p.nickname || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${p.gender === '女' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.gender || '未设置'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.birthYear || '-'}</td>
                    <td className="px-4 py-3">{p.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无档案数据
          </div>
        )}
      </div>
    </div>
  );
}
