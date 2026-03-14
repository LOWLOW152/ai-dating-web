import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 检查是否已验证
  useEffect(() => {
    const verified = sessionStorage.getItem('inviteVerified');
    if (verified === 'true') {
      setIsVerified(true);
    }
    
    // 获取剩余邀请码数量
    checkRemaining();
  }, []);

  const checkRemaining = async () => {
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      const data = await res.json();
      setRemaining(data.remaining);
    } catch (err) {
      console.error('获取剩余数量失败:', err);
    }
  };

  const handleVerify = async () => {
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', code: inviteCode })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        sessionStorage.setItem('inviteVerified', 'true');
        sessionStorage.setItem('inviteCode', inviteCode.toUpperCase().trim());
        setIsVerified(true);
      } else {
        setError(data.message || '验证失败');
        checkRemaining();
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    router.push('/chat');
  };

  // 邀请码输入页面
  if (!isVerified) {
    return (
      <>
        <Head>
          <title>狗蛋 AI 相亲助手 - 邀请码验证</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Logo */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: '#07c160',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '50px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(7,193,96,0.3)'
          }}>🐶</div>

          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>狗蛋 AI 相亲</h1>
          
          <p style={{
            fontSize: '14px',
            color: '#999',
            marginBottom: '40px'
          }}>30道题，找到真正懂你的人</p>

          {/* 邀请码输入框 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px',
              textAlign: 'center'
            }}>请输入邀请码</h2>
            
            <p style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '24px',
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              本服务为邀请制，每日限量开放
              {remaining !== null && (
                <>
                  <br />
                  <span style={{ color: '#07c160', fontWeight: 500 }}>今日剩余：{remaining} 个名额</span>
                </>
              )}
            </p>
            
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="请输入8位邀请码"
              maxLength={8}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 16px',
                border: error ? '1px solid #ff4d4f' : '1px solid #d9d9d9',
                borderRadius: '8px',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '4px',
                outline: 'none',
                marginBottom: error ? '8px' : '16px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            />
            
            {error && (
              <p style={{
                color: '#ff4d4f',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>{error}</p>
            )}
            
            <button
              onClick={handleVerify}
              disabled={isLoading || !inviteCode.trim()}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: inviteCode.trim() && !isLoading ? '#07c160' : '#e5e5e5',
                color: inviteCode.trim() && !isLoading ? '#fff' : '#999',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: 500,
                cursor: inviteCode.trim() && !isLoading ? 'pointer' : 'not-allowed'
              }}
            >
              {isLoading ? '验证中...' : '验证并进入'}
            </button>
            
            <p style={{
              fontSize: '13px',
              color: '#999',
              marginTop: '20px',
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              没有邀请码？
              <br />
              请联系管理员获取今日名额
            </p>
          </div>
        </div>
      </>
    );
  }

  // 主页面（已验证）
  return (
    <>
      <Head>
        <title>狗蛋 AI 相亲助手</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 顶部导航栏 */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🐶</span>
            <span style={{ fontSize: '17px', fontWeight: 500 }}>狗蛋 AI 相亲助手</span>
          </div>
        </div>

        {/* 主内容区 */}
        <div style={{
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* 头像 */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: '#07c160',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '50px',
            marginBottom: '24px'
          }}>🐶</div>

          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>狗蛋 AI 相亲</h1>
          
          <p style={{
            fontSize: '14px',
            color: '#999',
            marginBottom: '32px'
          }}>30道题，找到真正懂你的人</p>

          {/* 介绍卡片 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
            marginBottom: '32px'
          }}>
            <p style={{
              fontSize: '15px',
              color: '#333',
              lineHeight: 1.6,
              marginBottom: '20px'
            }}>
              哈喽～我是你的专属人格采集师<b>狗蛋</b>。
              <br /><br />
              接下来30个轻松问题，一起探索真实的你。
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '全程对话式交互，轻松自然',
                '深度追问，不只停留在表面',
                '生成专属相亲档案'
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#07c160',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    marginRight: '10px'
                  }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              maxWidth: '340px',
              backgroundColor: '#07c160',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 0',
              fontSize: '17px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            开始了解我
          </button>

          <p style={{
            marginTop: '20px',
            fontSize: '13px',
            color: '#999'
          }}>
            预计用时 10-15 分钟 · 随时可暂停
          </p>
        </div>
      </div>
    </>
  );
}
