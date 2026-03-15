import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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

// 客户端组件
function MatchPageContent() {
  const router = useRouter();
  const { profileId } = router.query;
  
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [weightExplanations, setWeightExplanations] = useState({ part2: [], part3: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 确保 profileId 已解析
    if (!profileId) return;
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    fetchMatches(token, profileId);
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
      
      if (res.status === 404) {
        setError('档案不存在');
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setMatches(data.matches);
        setWeights(data.profile.weights || DEFAULT_WEIGHTS);
        setWeightExplanations(data.profile.weightExplanations || { part2: [], part3: [] });
        setErrorDetails(null);
      } else {
        setError(data.error || '获取匹配失败');
        setErrorDetails({ message: data.message, stack: data.stack });
      }
    } catch (err) {
      console.error('获取匹配失败:', err);
      setError('网络错误');
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

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px' }}>
        <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{error}</p>
        {errorDetails?.message && (
          <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>详情: {errorDetails.message}</p>
        )}
        {errorDetails?.stack && (
          <pre style={{ 
            color: '#999', 
            marginTop: '16px', 
            fontSize: '12px', 
            maxWidth: '800px',
            maxHeight: '300px',
            overflow: 'auto',
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'left'
          }}>
            {errorDetails.stack}
          </pre>
        )}
        <Link href="/admin" style={{ color: '#07c160', marginTop: '16px' }}>返回列表</Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p style={{ color: '#999' }}>无法加载档案信息</p>
        <Link href="/admin" style={{ color: '#07c160', marginTop: '16px' }}>返回列表</Link>
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
        {/* 档案信息 */}
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
            <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: '6px', fontSize: '13px' }}>
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
              {matches.map((item, index) => (
                <div
                  key={item.profile?.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                  }}
                  onClick={() => router.push(`/admin/match-detail?profileId=${profileId}&matchId=${item.profile?.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 500 }}>#{index + 1} {item.profile?.nickname}</span>
                      <span style={{ color: '#999', fontSize: '13px' }}>
                        {item.profile?.gender === 'male' ? '男' : item.profile?.gender === 'female' ? '女' : '未知'} · {item.profile?.birth_year ? new Date().getFullYear() - item.profile.birth_year : '?'}岁 · {item.profile?.city || '城市未知'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#07c160' }}>点击查看详情 →</span>
                  </div>
                  
                  {/* 匹配分数展示 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {item.match?.category_scores && Object.entries(item.match.category_scores).map(([dim, score]) => (
                        <span key={dim} style={{ marginRight: '12px' }}>
                          {DIMENSION_LABELS[dim]}: {Math.round(score)}分
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#999' }}>匹配分</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(item.match?.total_score) }}>
                          {item.match?.is_blocked ? '×' : item.match?.total_score || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 关系发展曲线图 */}
                  {item.match?.relationshipCurve && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8f8f8', borderRadius: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#333' }}>
                        关系发展预测
                      </div>
                      
                      {/* SVG 曲线图 */}
                      <svg width="100%" height="120" viewBox="0 0 400 120" style={{ maxWidth: '400px' }}>
                        {/* 背景网格线 */}
                        {[0, 25, 50, 75, 100].map(y => (
                          <line key={y} x1="40" y1={100 - y} x2="380" y2={100 - y} stroke="#eee" strokeWidth="1" />
                        ))}
                        
                        {/* 阶段背景 */}
                        <rect x="40" y="10" width="80" height="90" fill="#e6f7ff" opacity="0.3" />
                        <rect x="120" y="10" width="180" height="90" fill="#f6ffed" opacity="0.3" />
                        <rect x="300" y="10" width="80" height="90" fill="#fff7e6" opacity="0.3" />
                        
                        {/* 阶段标签 */}
                        <text x="80" y="105" fontSize="10" fill="#1890ff" textAnchor="middle">初期</text>
                        <text x="210" y="105" fontSize="10" fill="#52c41a" textAnchor="middle">发展期</text>
                        <text x="340" y="105" fontSize="10" fill="#fa8c16" textAnchor="middle">稳定期</text>
                        
                        {/* Y轴标签 */}
                        <text x="35" y="20" fontSize="9" fill="#999" textAnchor="end">100</text>
                        <text x="35" y="55" fontSize="9" fill="#999" textAnchor="end">50</text>
                        <text x="35" y="95" fontSize="9" fill="#999" textAnchor="end">0</text>
                        
                        {/* 曲线 */}
                        {item.match.relationshipCurve.curve.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#07c160"
                            strokeWidth="2"
                            points={match.relationshipCurve.curve.map(p => {
                              const x = 40 + (p.month / 24) * 340;
                              const y = 100 - p.score;
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                        )}
                        
                        {/* 数据点 */}
                        {item.match.relationshipCurve.curve.filter((_, i) => i % 4 === 0).map((p, i) => {
                          const x = 40 + (p.month / 24) * 340;
                          const y = 100 - p.score;
                          return (
                            <circle key={i} cx={x} cy={y} r="3" fill="#07c160" />
                          );
                        })}
                        
                        {/* 当前阶段指示 */}
                        <text x="200" y="15" fontSize="9" fill="#666" textAnchor="middle">
                          前期侧重: 兴趣 | 后期侧重: 价值观
                        </text>
                      </svg>
                      
                      {/* 阶段分数 */}
                      <div style={{ display: 'flex', gap: '24px', marginTop: '8px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: '#1890ff' }}>初期({match.relationshipCurve.phaseScores.early}分)</span>
                          <span style={{ color: '#999', marginLeft: '4px' }}>兴趣主导</span>
                        </div>
                        <div>
                          <span style={{ color: '#52c41a' }}>发展期({match.relationshipCurve.phaseScores.middle}分)</span>
                          <span style={{ color: '#999', marginLeft: '4px' }}>情感+生活方式</span>
                        </div>
                        <div>
                          <span style={{ color: '#fa8c16' }}>稳定期({match.relationshipCurve.phaseScores.late}分)</span>
                          <span style={{ color: '#999', marginLeft: '4px' }}>价值观契合</span>
                        </div>
                      </div>
                      
                      {/* 洞察 */}
                      {item.match?.insights && item.match.insights.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '8px 12px', background: 'white', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                          <div style={{ fontWeight: 500, marginBottom: '4px', color: '#333' }}>匹配洞察：</div>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {item.match.insights.map((insight, idx) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
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

// 使用 dynamic import 禁用 SSR
export default dynamic(() => Promise.resolve(MatchPageContent), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      加载中...
    </div>
  )
});
