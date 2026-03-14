import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const DEFAULT_WEIGHTS = {
  basic: 7,
  emotion: 8,
  values: 8,
  lifestyle: 6,
  interest: 6,
  social: 5
};

const DIMENSION_LABELS = {
  basic: '基础条件',
  emotion: '情感核心',
  values: '价值观',
  lifestyle: '生活方式',
  interest: '兴趣匹配',
  social: '社交偏好'
};

export default function MatchPage() {
  const router = useRouter();
  const { profileId } = router.query;
  
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [weightExplanations, setWeightExplanations] = useState({ part2: [], part3: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    if (profileId) {
      fetchMatches(token, profileId);
    }
  }, [profileId]);

  const fetchMatches = async (token, id) => {
    try {
      const res = await fetch(`/api/admin/match?profileId=${id}`, {
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
        setMatches(data.matches);
        setWeights(data.profile.weights || DEFAULT_WEIGHTS);
        setWeightExplanations(data.profile.weightExplanations || { part2: [], part3: [] });
      }
    } catch (err) {
      console.error('获取匹配失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateWeights = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileId, weights })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('权重已更新，重新计算匹配...');
        fetchMatches(token, profileId);
      } else {
        alert(data.error || '更新失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleWeightChange = (dim, value) => {
    setWeights({ ...weights, [dim]: parseInt(value) });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#07c160';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: '18px' }}>匹配推荐</h1>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {profile && (
          <>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>正在为「{profile.nickname}」匹配</h2>
              <p style={{ color: '#666', margin: 0 }}>性别: {profile.gender} | ID: {profile.id}</p>
            </div>

            {/* 权重设置 */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>匹配权重设置（1-10分）</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {label}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={weights[key]}
                      onChange={(e) => handleWeightChange(key, e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>{weights[key]}分</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={updateWeights}
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  background: '#07c160',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                {saving ? '保存中...' : '更新权重并重新匹配'}
              </button>

              {/* 权重说明 */}
              {(weightExplanations.part2.length > 0 || weightExplanations.part3.length > 0) && (
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '12px 16px', 
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '8px', color: '#333' }}>
                    权重来源分析
                  </div>
                  
                  {weightExplanations.part2.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ color: '#666', marginBottom: '4px' }}>
                        <strong>第二部分（兴趣话题）影响：</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                        {weightExplanations.part2.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {weightExplanations.part3.length > 0 && (
                    <div>
                      <div style={{ color: '#666', marginBottom: '4px' }}>
                        <strong>第三部分（生活底色）影响：</strong>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#666' }}>
                        {weightExplanations.part3.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 匹配结果 */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>推荐匹配（前5名）</h3>
              
              {matches.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>暂无匹配对象</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {matches.map((match, index) => (
                    <div
                      key={match.profileId}
                      style={{
                        padding: '16px',
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 500 }}>#{index + 1} {match.nickname}</span>
                          <span style={{ color: '#999', fontSize: '13px' }}>{match.gender} · {match.age || '年龄未知'}岁 · {match.city || '城市未知'}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {Object.entries(match.dimensions || {}).map(([dim, data]) => (
                            <span key={dim} style={{ marginRight: '12px' }}>
                              {DIMENSION_LABELS[dim]}: {data.score}分
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: getScoreColor(match.score)
                        }}>
                          {match.score}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>匹配度</div>
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
