import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('/admin');
  const router = useRouter();

  useEffect(() => {
    // 如果已有token，直接跳转到后台
    const token = localStorage.getItem('adminToken');
    if (token) {
      const match = router.asPath.match(/[?&]redirect=([^&]+)/);
      const redirect = match ? decodeURIComponent(match[1]) : '/admin';
      router.push(redirect);
      return;
    }
    
    // 从 URL 参数获取 redirect 地址
    if (router.query.redirect) {
      setRedirectUrl(router.query.redirect);
    }
  }, [router.query, router.asPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        // 从 router.asPath 读取 redirect 参数
        const match = router.asPath.match(/[?&]redirect=([^&]+)/);
        const redirect = match ? decodeURIComponent(match[1]) : '/admin';
        router.push(redirect);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '360px'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '8px',
          fontSize: '24px',
          color: '#333'
        }}>
          狗蛋相亲实验室
        </h1>
        <p style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          color: '#999',
          fontSize: '14px'
        }}>
          后台管理系统
        </p>

        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px',
              fontSize: '14px',
              color: '#666'
            }}>
              账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="请输入账号"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px',
              fontSize: '14px',
              color: '#666'
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#07c160',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
