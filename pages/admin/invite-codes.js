import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function InviteCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState({ total: 0, used: 0, remaining: 0 });
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    // 默认今天
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchCodes(token, today);
  }, []);

  const fetchCodes = async (token, date) => {
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
        setStats(data.stats);
        setTrend(data.trend);
      }
    } catch (err) {
      console.error('获取邀请码失败:', err);
    } finally {
      setLoading(false);
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
      setLoading(true);
      fetchCodes(token, date);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`已复制: ${code}`);
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
          <h1 style={{ margin: 0, fontSize: '18px' }}>邀请码管理</h1>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* 日期选择 */}
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
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
            <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>今日总数</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#07c160' }}>{stats.remaining}</div>
            <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>剩余可用</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>{stats.used}</div>
            <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>已使用</div>
          </div>
        </div>

        {/* 邀请码列表 */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{selectedDate} 邀请码列表</h3>
          
          {codes.length === 0 ? (
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

        {/* 7天趋势 */}
        {trend.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>近7天使用趋势</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trend.map((day) => (
                <div
                  key={day.date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <span style={{ color: '#666' }}>{day.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span>
                      <span style={{ color: '#07c160' }}>{parseInt(day.total) - parseInt(day.used)}</span>
                      <span style={{ color: '#999', marginLeft: '4px' }}>剩余</span>
                    </span>
                    <span>
                      <span style={{ color: '#ff4d4f' }}>{day.used}</span>
                      <span style={{ color: '#999', marginLeft: '4px' }}>已用</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
