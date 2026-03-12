import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>狗蛋 AI 相亲助手</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      
      {/* 微信风格主容器 */}
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 顶部导航栏 - 微信黑色导航 */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            position: 'absolute',
            left: '16px',
            fontSize: '20px',
            cursor: 'pointer'
          }}>‹</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>🐶</span>
            <span style={{ fontSize: '17px', fontWeight: 500 }}>狗蛋 AI 相亲助手</span>
          </div>
        </div>

        {/* 主内容区 */}
        <div style={{
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 'calc(100vh - 60px)'
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
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(7,193,96,0.3)'
          }}>
            🐶
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            狗蛋 AI 相亲
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#999',
            marginBottom: '32px'
          }}>
            30道题，找到真正懂你的人
          </p>

          {/* 介绍卡片 - 微信白色卡片 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
              <div style={{
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
                全程对话式交互，轻松自然
              </div>
              <div style={{
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
                深度追问，不只停留在表面
              </div>
              <div style={{
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
                生成专属相亲档案
              </div>
            </div>
          </div>

          {/* 开始按钮 - 微信绿色 */}
          <button
            onClick={() => router.push('/chat')}
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
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(7,193,96,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#06ad56';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#07c160';
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
