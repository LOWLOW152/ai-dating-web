import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profiles'); // profiles | invite-codes
  
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

  // 获取档案列表
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

  // 获取邀请码
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

  // 生成邀请码
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
      <div style={{ background: 'white', padding: '20px 24px', borderBottom: '1px solid #e8e8e8' }}>
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
        
        {/* 标签页切换 */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e8e8e8', margin: '0 -24px', padding: '0 24px' }}>
          {[
            { key: 'profiles', label: '档案管理' },
            { key: 'invite-codes', label: '邀请码管理' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? '#07c160' : 'transparent'}`,
                color: activeTab === tab.key ? '#07c160' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? 500 : 400
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'profiles' ? (
          <>
            {/* 档案筛选 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', '待处理', '已联系', '已匹配', '不合适', '深度沟通'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      padding: '6px 14px',
                      background: filter === s ? '#07c160' : 'white',
                      color: filter === s ? 'white' : '#666',
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
            {filteredProfiles.length === 0 ? (
              <div style={{ background: 'white', padding: '60px', textAlign: 'center', borderRadius: '8px', color: '#999' }}>
                暂无档案
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {filteredProfiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/admin/profile/${profile.id}`}
                    style={{
                      background: 'white',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 500, color: '#333' }}>{profile.nickname || '匿名'}</span>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            background: getStatusColor(profile.status) + '20',
                            color: getStatusColor(profile.status),
                            borderRadius: '10px'
                          }}>
                            {profile.status}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                          {profile.gender === '男' ? '男' : '女'} {profile.gender || '未知'} · 
                          {profile.birth_year ? new Date().getFullYear() - profile.birth_year + '岁' : '年龄未知'} · 
                          {profile.city || '城市未知'} · 
                          {profile.occupation || '职业未知'}
                        </div>
                        
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                          ID: {profile.id} · 提交于 {new Date(profile.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Link
                          href={`/admin/match?profileId=${profile.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '6px 12px',
                            background: '#07c160',
                            color: 'white',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '13px'
                          }}
                        >
                          匹配
                        </Link>
                        <div style={{ color: '#ccc' }}>→</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 邀请码管理 */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ marginRight: '8px', color: '#666' }}>选择日期：</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <button
                  onClick={generateCodes}
                  disabled={generating}
                  style={{
                    padding: '8px 20px',
                    background: '#07c160',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    opacity: generating ? 0.6 : 1
                  }}
                >
                  {generating ? '生成中...' : '生成5个新码'}
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{codeStats.total}</div>
                <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>总数</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#07c160' }}>{codeStats.remaining}</div>
                <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>剩余可用</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>{codeStats.used}</div>
                <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>已使用</div>
              </div>
            </div>

            {/* 邀请码列表 */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{selectedDate} 邀请码列表</h3>
              
              {loadingCodes ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>加载中...</p>
              ) : codes.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>该日期暂无邀请码</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {codes.map((code) => (
                    <div
                      key={code.code}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: code.used ? '#f5f5f5' : '#f0f9ff',
                        borderRadius: '6px',
                        border: `1px solid ${code.used ? '#e8e8e8' : '#bae7ff'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          color: code.used ? '#999' : '#1890ff'
                        }}>
                          {code.code}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: code.used ? '#ff4d4f' : '#07c160',
                          color: 'white'
                        }}>
                          {code.used ? '已使用' : '未使用'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {code.used ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: '#666' }}>
                              {code.nickname || '未知用户'}
                              {code.gender && ` (${code.gender})`}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999' }}>
                              {code.used_at && new Date(code.used_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => copyCode(code.code)}
                            style={{
                              padding: '6px 12px',
                              background: 'white',
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            复制
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
