'use client';

import { useState, useEffect } from 'react';

interface InviteCode {
  code: string;
  status: string;
  max_uses: number;
  use_count: number;
  project_usages: {
    'beauty-score'?: { used: boolean; used_at: string; profile_id?: string };
    'questionnaire'?: { used: boolean; used_at: string; profile_id?: string };
  };
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<InviteCode[]>([]);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideTestCodes, setHideTestCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState<string>('');

  // 加载邀请码列表
  async function loadCodes() {
    try {
      const res = await fetch(`/api/admin/invite-codes?status=${statusFilter}&limit=200`);
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCodes();
  }, [statusFilter]);

  // 过滤邀请码
  useEffect(() => {
    let filtered = codes;
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.code.toLowerCase().includes(query) || 
        (c.notes && c.notes.toLowerCase().includes(query))
      );
    }
    
    // 隐藏测试邀请码
    if (hideTestCodes) {
      filtered = filtered.filter(c => 
        !(c.notes && c.notes.toLowerCase().includes('测试'))
      );
    }
    
    setFilteredCodes(filtered);
  }, [codes, searchQuery, hideTestCodes]);

  // 生成邀请码
  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invite-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 })
      });
      const data = await res.json();
      if (data.success) {
        setNewCodes(data.codes);
        loadCodes(); // 刷新列表
      }
    } catch {
      alert('生成失败');
    } finally {
      setGenerating(false);
    }
  }

  // 复制到剪贴板
  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // 降级方案
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }

  // 复制所有新码
  function copyAllNew() {
    const text = newCodes.join('\n');
    navigator.clipboard.writeText(text);
    alert('已复制所有新邀请码');
  }

  // 删除邀请码
  async function deleteCode(code: string) {
    if (!confirm(`确定要删除邀请码 ${code} 吗？此操作不可恢复。`)) {
      return;
    }
    setDeletingCode(code);
    try {
      const res = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCodes(codes.filter(c => c.code !== code));
        alert('删除成功');
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeletingCode(null);
    }
  }

  // 开始编辑过期时间
  function startEditDate(code: string, currentExpiresAt: string | null) {
    setEditingCode(code);
    setEditDate(currentExpiresAt ? new Date(currentExpiresAt).toISOString().slice(0, 16) : '');
  }

  // 保存过期时间
  async function saveDate(code: string) {
    try {
      const res = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: editDate || null })
      });
      const data = await res.json();
      if (data.success) {
        setCodes(codes.map(c =>
          c.code === code
            ? { ...c, expires_at: editDate || null }
            : c
        ));
        setEditingCode(null);
        alert('过期时间已更新');
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch {
      alert('更新失败');
    }
  }

  // 开始编辑备注
  function startEditNotes(code: string, currentNotes: string | null) {
    setEditingNotes(code);
    setEditNotesValue(currentNotes || '');
  }

  // 保存备注
  async function saveNotes(code: string) {
    try {
      const res = await fetch(`/api/admin/invite-codes/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotesValue || null })
      });
      const data = await res.json();
      if (data.success) {
        setCodes(codes.map(c =>
          c.code === code
            ? { ...c, notes: editNotesValue || null }
            : c
        ));
        setEditingNotes(null);
        alert('备注已更新');
      } else {
        alert('更新失败: ' + data.error);
      }
    } catch {
      alert('更新失败');
    }
  }

  // 状态标签
  function StatusBadge({ status, useCount, maxUses }: { status: string; useCount: number; maxUses: number }) {
    if (status === 'used' || useCount >= maxUses) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">已用完</span>;
    }
    if (status === 'partial') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">部分使用</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">未使用</span>;
  }

  // 项目使用状态
  function ProjectStatus({ used, label }: { used?: boolean; label: string }) {
    return (
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${used ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className="text-xs text-gray-600">{label}</span>
        {used && <span className="text-xs text-red-500">已用</span>}
        {!used && <span className="text-xs text-green-500">可用</span>}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">邀请码管理</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? '生成中...' : '生成10个邀请码'}
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-wrap">
          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">状态:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">全部</option>
              <option value="unused">未使用</option>
              <option value="used">已用完</option>
              <option value="expired">已过期</option>
            </select>
          </div>

          {/* 搜索框 */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-sm text-gray-600">搜索:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索邀请码或备注..."
              className="px-3 py-2 border rounded-md text-sm flex-1"
            />
          </div>

          {/* 隐藏测试邀请码 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideTestCodes}
                onChange={(e) => setHideTestCodes(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">隐藏测试邀请码</span>
            </label>
          </div>

          {/* 结果数量 */}
          <div className="text-sm text-gray-500 ml-auto">
            显示 {filteredCodes.length} / {codes.length} 个
          </div>
        </div>
      </div>

      {/* 新生成的邀请码 */}
      {newCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-green-800">✅ 新生成的邀请码（已存入数据库）</h2>
            <button
              onClick={copyAllNew}
              className="text-sm text-green-700 hover:text-green-900 underline"
            >
              复制全部
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {newCodes.map((code) => (
              <div
                key={code}
                className="bg-white rounded px-3 py-2 text-center font-mono text-sm border border-green-200"
              >
                {code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 邀请码列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">邀请码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">颜值打分</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">AI问卷</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">使用次数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">过期时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-56">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {codes.length === 0 ? '暂无邀请码，点击上方按钮生成' : '没有符合条件的邀请码'}
                  </td>
                </tr>
              ) : (
                filteredCodes.map((invite) => (
                  <tr key={invite.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                      {invite.code}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={invite.status}
                        useCount={invite.use_count}
                        maxUses={invite.max_uses}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatus
                        used={invite.project_usages?.['beauty-score']?.used}
                        label="颜值打分"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatus
                        used={invite.project_usages?.['questionnaire']?.used}
                        label="AI问卷"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invite.use_count} / {invite.max_uses}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString('zh-CN')
                        : '永不过期'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      {editingNotes === invite.code ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={editNotesValue}
                            onChange={(e) => setEditNotesValue(e.target.value)}
                            placeholder="输入客户信息..."
                            className="text-xs border rounded px-2 py-1 w-full"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveNotes(invite.code)}
                              className="text-xs text-green-600 hover:text-green-800"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[120px]" title={invite.notes || ''}>
                            {invite.notes || '-'}
                          </span>
                          <button
                            onClick={() => startEditNotes(invite.code, invite.notes)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            编辑
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyCode(invite.code)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {copiedCode === invite.code ? '已复制!' : '复制'}
                        </button>
                        <span className="text-gray-300">|</span>

                        {editingCode === invite.code ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="datetime-local"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="text-xs border rounded px-1 py-0.5 w-32"
                            />
                            <button
                              onClick={() => saveDate(invite.code)}
                              className="text-xs text-green-600 hover:text-green-800"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditDate(invite.code, invite.expires_at)}
                            className="text-sm text-orange-600 hover:text-orange-800"
                          >
                            改期
                          </button>
                        )}

                        <span className="text-gray-300">|</span>

                        <button
                          onClick={() => deleteCode(invite.code)}
                          disabled={deletingCode === invite.code}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deletingCode === invite.code ? '删除中...' : '删除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">总邀请码</p>
          <p className="text-2xl font-bold text-blue-600">{codes.length}</p>
        </div>
        <div className="bg-cyan-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">当前显示</p>
          <p className="text-2xl font-bold text-cyan-600">{filteredCodes.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">未使用</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredCodes.filter(c => c.status === 'unused').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">部分使用</p>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredCodes.filter(c => c.status === 'partial').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">已用完</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredCodes.filter(c => c.status === 'used').length}
          </p>
        </div>
      </div>
    </div>
  );
}
