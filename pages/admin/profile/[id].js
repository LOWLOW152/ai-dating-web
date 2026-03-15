import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

function ProfileDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    fetchProfile(token, id);
    fetchMatches(token, id);
  }, [id]);

  const fetchProfile = async (token, profileId) => {
    try {
      const res = await fetch(`/api/admin/profile/${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setNewStatus(data.profile.status);
        setNotes(data.profile.notes || '');
      } else {
        setError(data.error || '获取档案失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (token, profileId) => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/admin/match?profileId=${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches.slice(0, 5));
      }
    } catch (err) {
      console.error('获取匹配失败:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const updateStatus = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, status: newStatus, notes })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('更新成功');
        setProfile({ ...profile, status: newStatus, notes });
      } else {
        alert(data.error || '更新失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const getAge = (birthYear) => {
    if (!birthYear) return '未知';
    return new Date().getFullYear() - birthYear;
  };

  const formatAnswer = (value) => {
    return value || '未填写';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p style={{ color: '#ff4d4f' }}>{error}</p>
        <Link href="/admin" style={{ color: '#07c160', marginTop: '16px' }}>返回列表</Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        档案不存在
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: '18px' }}>档案详情</h1>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        {/* 基本信息 */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>基本信息</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div><span style={{ color: '#999' }}>昵称：</span>{formatAnswer(profile.nickname)}</div>
            <div><span style={{ color: '#999' }}>性别：</span>{formatAnswer(profile.gender)}</div>
            <div><span style={{ color: '#999' }}>年龄：</span>{getAge(profile.birth_year)}岁</div>
            <div><span style={{ color: '#999' }}>城市：</span>{formatAnswer(profile.city)}</div>
            <div><span style={{ color: '#999' }}>职业：</span>{formatAnswer(profile.occupation)}</div>
            <div><span style={{ color: '#999' }}>学历：</span>{formatAnswer(profile.education)}</div>
          </div>
        </div>

        {/* 生活状态 */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>生活状态</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div><span style={{ color: '#999' }}>消费观念：</span>{formatAnswer(profile.spending_habit)}</div>
            <div><span style={{ color: '#999' }}>作息类型：</span>{formatAnswer(profile.sleep_schedule)}</div>
            <div><span style={{ color: '#999' }}>整洁程度：</span>{formatAnswer(profile.tidiness)}</div>
            <div><span style={{ color: '#999' }}>压力应对：</span>{formatAnswer(profile.stress_response)}</div>
          </div>
        </div>

        {/* 情感核心 */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>情感核心</h2>
          <div style={{ marginBottom: '12px' }}><span style={{ color: '#999' }}>当前状态：</span>{formatAnswer(profile.current_state)}</div>
          <div style={{ marginBottom: '12px' }}><span style={{ color: '#999' }}>被理解时刻：</span>{formatAnswer(profile.understood_moment)}</div>
          <div style={{ marginBottom: '12px' }}><span style={{ color: '#999' }}>理想关系：</span>{formatAnswer(profile.ideal_relationship)}</div>
          <div style={{ marginBottom: '12px' }}><span style={{ color: '#999' }}>核心需求：</span>{formatAnswer(profile.core_need)}</div>
          <div style={{ marginBottom: '12px' }}><span style={{ color: '#999' }}>冲突处理：</span>{formatAnswer(profile.conflict_handling)}</div>
          <div><span style={{ color: '#999' }}>关系红线：</span>{formatAnswer(profile.deal_breakers)}</div>
        </div>

        {/* 匹配推荐 */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#333' }}>匹配推荐 TOP 5</h2>
            <Link href={`/admin/match?profileId=${id}`} style={{ color: '#07c160', fontSize: '14px', textDecoration: 'none' }}>
              查看全部 →
            </Link>
          </div>
          
          {loadingMatches ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>计算匹配中...</div>
          ) : matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无匹配数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matches.map((item, index) => (
                <div 
                  key={item.profile?.id || index}
                  onClick={() => item.profile?.id && (window.location.href = `/admin/match-detail?profileId=${id}&matchId=${item.profile.id}&_v=4`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    background: index < 3 ? '#f6ffed' : '#fafafa',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: index < 3 ? '1px solid #b7eb8f' : '1px solid #e8e8e8'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: index < 3 ? '#52c41a' : '#999',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginRight: '16px'
                  }}>
                    {index + 1}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                      {item.profile?.nickname || '未命名'}
                      <span style={{ color: '#999', fontSize: '13px', marginLeft: '8px' }}>
                        {item.profile?.gender === 'male' ? '男' : item.profile?.gender === 'female' ? '女' : ''} · {item.profile?.city || '未知城市'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {item.profile?.occupation || '职业未知'} · {item.profile?.education || '学历未知'}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {/* 我对他 */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: item.match?.score_ab >= 70 ? '#52c41a' : item.match?.score_ab >= 50 ? '#faad14' : '#999'
                      }}>
                        {item.match?.is_blocked ? '×' : item.match?.score_ab || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>我对他</div>
                    </div>
                    
                    {/* 他对我 */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: item.match?.score_ba >= 70 ? '#52c41a' : item.match?.score_ba >= 50 ? '#faad14' : '#999'
                      }}>
                        {item.match?.is_blocked ? '×' : item.match?.score_ba || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>他对我</div>
                    </div>
                    
                    {/* 综合分 */}
                    <div style={{ textAlign: 'center', padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px' }}>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: item.match?.is_blocked ? '#ff4d4f' : item.match?.composite_score >= 70 ? '#52c41a' : item.match?.composite_score >= 50 ? '#faad14' : '#999'
                      }}>
                        {item.match?.is_blocked ? '×' : item.match?.composite_score || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>综合</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 管理操作 */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>管理</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>状态</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="待处理">待处理</option>
              <option value="已联系">已联系</option>
              <option value="已匹配">已匹配</option>
              <option value="不合适">不合适</option>
              <option value="深度沟通">深度沟通</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px' }}
              placeholder="添加备注..."
            />
          </div>
          
          <button
            onClick={updateStatus}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: '#07c160',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfileDetail), { ssr: false });
