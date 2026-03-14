import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchProfiles(token);
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
      setLoading(false);
    }
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

  const stats = {
    total: profiles.length,
    pending: profiles.filter(p => p.status === '待处理').length,
    contacted: profiles.filter(p => p.status === '已联系').length,
    matched: profiles.filter(p => p.status === '已匹配').length
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 头部 */}
      <div style={{
        background: 'white',
        padding: '20px 24px',
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            相亲档案管理
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999' }}>
            共 {stats.total} 份档案 | 待处理 {stats.pending} | 已联系 {stats.contacted} | 已匹配 {stats.matched}
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('adminToken');
            router.push('/admin/login');
          }}
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

      {/* 筛选 */}
      <div style={{ padding: '16px 24px' }}>
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
      <div style={{ padding: '0 24px 24px' }}>
        {filteredProfiles.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px',
            textAlign: 'center',
            borderRadius: '8px',
            color: '#999'
          }}>
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
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#333' }}>
                        {profile.nickname || '匿名'}
                      </span>
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
                      {profile.gender === '男' ? '👨' : '👩'} {profile.gender || '未知'} · 
                      {profile.birth_year ? new Date().getFullYear() - profile.birth_year + '岁' : '年龄未知'} · 
                      📍 {profile.city || '城市未知'} · 
                      💼 {profile.occupation || '职业未知'}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                      🆔 {profile.id} · 提交于 {new Date(profile.created_at).toLocaleString('zh-CN')}
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
      </div>
    </div>
  );
}
