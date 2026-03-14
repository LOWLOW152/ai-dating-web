import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// 导航配置
const NAV_ITEMS = [
  { key: 'profiles', label: '档案管理', icon: '📋' },
  { key: 'invite-codes', label: '邀请码', icon: '🔑' },
  { key: 'questions', label: '题库管理', icon: '📝', href: '/admin/questions' },
  { key: 'categories', label: '类别权重', icon: '⚖️', href: '/admin/categories' },
  { key: 'match-test', label: '算法测试', icon: '🧪', href: '/admin/match-test' }
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profiles');
  
  // 档案相关状态
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // 邀请码相关状态
  const [codes, setCodes] = useState([]);
  const [codeStats, setCodeStats] = useState({ total: 0, used: 0, remaining: 0 });
  const [trend, setTrend] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    
    fetchProfiles(token);
    fetchCodes(token, today);
  }, []);

  const fetchProfiles = async (token) => {
    try {
      const res = await fetch('/api/admin/profiles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.error('获取档案失败:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchCodes = async (token, date) => {
    setLoadingCodes(true);
    try {
      const res = await fetch(`/api/admin/invite-codes?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes);
        setCodeStats(data.stats);
        setTrend(data.trend);
      }
    } catch (err) {
      console.error('获取邀请码失败:', err);
    } finally {
      setLoadingCodes(false);
    }
  };

  const generateCodes = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ count: 5, date: selectedDate })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`成功生成 ${data.codes.length} 个邀请码`);
        fetchCodes(token, selectedDate);
      } else {
        alert(data.error || '生成失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setGenerating(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    const token = localStorage.getItem('adminToken');
    if (token) {
      fetchCodes(token, date);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`已复制: ${code}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      '待处理': '#ff9800',
      '已联系': '#2196f3',
      '已匹配': '#4caf50',
      '不合适': '#9e9e9e',
      '深度沟通': '#9c27b0'
    };
    return colors[status] || '#999';
  };

  const filteredProfiles = filter === 'all' 
    ? profiles 
    : profiles.filter(p => p.status === filter);

  const profileStats = {
    total: profiles.length,
    pending: profiles.filter(p => p.status === '待处理').length,
    contacted: profiles.filter(p => p.status === '已联系').length,
    matched: profiles.filter(p => p.status === '已匹配').length
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  const handleNavClick = (item) => {
    if (item.href) {
      router.push(item.href);
    } else {
      setActiveTab(item.key);
    }
  };

  if (loadingProfiles) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#333' }}>狗蛋相亲实验室 - 后台管理</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999' }}>
              档案 {profileStats.total} | 待处理 {profileStats.pending} | 邀请码剩余 {codeStats.remaining}
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}
          >
            退出登录
          </button>
        </div>
        
        {/* 统一导航栏 */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e8e8e8', margin: '0 -24px', padding: '0 24px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.href 
              ? false // 外部链接不高亮
              : activeTab === item.key;
            
            if (item.href) {
              return (
                <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '12px 20px',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px',
                    borderBottom: '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            }
            
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #07c160' : '2px solid transparent',
                  color: isActive ? '#07c160' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? 500 : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'profiles' && (
          <>
            {/* 档案筛选 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', '待处理', '已联系', '已匹配', '不合适', '深度沟通'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: '6px 12px',
                      background: filter === s ? '#07c160' : 'white',
                      color: filter === s ? 'white' : '#333',
                      border: '1px solid ' + (filter === s ? '#07c160' : '#ddd'),
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {s === 'all' ? '全部' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* 档案列表 */}
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>提交时间</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>状态</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/admin/profile/${p.id}`} style={{ color: '#07c160', textDecoration: 'none' }}>
                          {p.id}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#999' }}>
                        {new Date(p.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: getStatusColor(p.status) + '20',
                          color: getStatusColor(p.status),
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/admin/profile/${p.id}`}>
                          <button style={{
                            padding: '4px 12px',
                            background: '#07c160',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}>
                            查看
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProfiles.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  暂无数据
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'invite-codes' && (
          <>
            {/* 邀请码统计 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>今日总邀请码</div>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#333' }}>{codeStats.total}</div>
              </div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>已使用</div>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#4caf50' }}>{codeStats.used}</div>
              </div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>剩余</div>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#ff9800' }}>{codeStats.remaining}</div>
              </div>
            </div>

            {/* 日期选择和生成 */}
            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>选择日期:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={generateCodes}
                  disabled={generating}
                  style={{
                    padding: '8px 16px',
                    background: generating ? '#ccc' : '#07c160',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {generating ? '生成中...' : '生成5个邀请码'}
                </button>
              </div>
            </div>

            {/* 邀请码列表 */}
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>邀请码</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>状态</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>使用者</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#666' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.code} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 500 }}>
                        {c.code}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: c.used_at ? '#4caf5020' : '#ff980020',
                          color: c.used_at ? '#4caf50' : '#ff9800',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {c.used_at ? '已使用' : '未使用'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#999' }}>
                        {c.used_at ? `档案 ${c.profile_id}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => copyCode(c.code)}
                          style={{
                            padding: '4px 12px',
                            background: '#07c160',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {codes.length === 0 && !loadingCodes && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  该日期暂无邀请码
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
