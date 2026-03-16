import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function InterviewFull() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 21, percentage: 0 });
  const [stage, setStage] = useState('idle'); // idle, opening, interviewing, confirming, complete
  const [profileId, setProfileId] = useState(null);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 开始会话
  const startSession = async () => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/interview-full/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setStage(data.stage);
        setProgress(data.progress);
        addMessage(data.reply, false, 'ai');
      }
    } catch (err) {
      console.error('Start failed:', err);
      addMessage('连接失败，请刷新重试', false, 'system');
    }
    setIsTyping(false);
  };

  // 添加消息
  const addMessage = (text, isUser, type = 'normal') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { text, isUser, type, time, id: Date.now() }]);
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || isTyping) return;

    const text = inputValue.trim();
    addMessage(text, true);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/interview-full/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTimeout(() => {
          addMessage(data.reply, false, data.stage === 'confirming' ? 'confirm' : 
                     data.stage === 'complete' ? 'complete' : 'ai');
          setProgress(data.progress);
          setStage(data.stage);
          if (data.profileId) setProfileId(data.profileId);
          setIsTyping(false);
        }, data.needsConfirm ? 300 : 600);
      }
    } catch (err) {
      console.error('Send failed:', err);
      addMessage('发送失败', false, 'system');
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const wechatGreen = '#95ec69';

  return (
    <>
      <Head>
        <title>AI访谈 - 完整问卷</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 顶部导航 */}
        <header style={{
          backgroundColor: '#ededed',
          borderBottom: '1px solid #d9d9d9',
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button 
              onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', fontSize: '24px', color: '#333', cursor: 'pointer' }}
            >
              ‹
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '4px', backgroundColor: '#07c160',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px'
              }}>🐶</div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#333', margin: 0 }}>
                  AI访谈 · 21题
                </h1>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                  {stage === 'complete' ? '已完成' : `第 ${progress.current}/${progress.total} 题 · ${progress.percentage}%`}
                </p>
              </div>
            </div>
            
            <div style={{ width: '40px' }} />
          </div>
        </header>

        {/* 进度条 */}
        {sessionId && stage !== 'complete' && (
          <div style={{
            backgroundColor: '#fff',
            padding: '8px 16px',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{
                height: '4px',
                backgroundColor: '#e5e5e5',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress.percentage}%`,
                  backgroundColor: '#07c160',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* 聊天区域 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {/* 开始界面 */}
            {!sessionId && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
                <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '8px' }}>
                  AI 对话式问卷
                </h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', maxWidth: '320px' }}>
                  像朋友一样聊天，21个问题了解真实的你
                </p>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '24px' }}>
                  预计需要 5-10 分钟
                </p>
                <button
                  onClick={startSession}
                  style={{
                    padding: '14px 40px',
                    backgroundColor: '#07c160',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  开始访谈
                </button>
              </div>
            )}

            {/* 消息列表 */}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isUser ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>{msg.time}</span>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: msg.isUser ? 'row-reverse' : 'row'
                }}>
                  {!msg.isUser && msg.type !== 'system' && (
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '4px',
                      backgroundColor: '#07c160',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', marginRight: '10px', flexShrink: 0
                    }}>🐶</div>
                  )}
                  
                  {msg.isUser && (
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '4px',
                      backgroundColor: '#ccc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', marginLeft: '10px', flexShrink: 0
                    }}>😊</div>
                  )}
                  
                  <div style={{
                    maxWidth: msg.type === 'complete' ? '320px' : '280px',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    backgroundColor: msg.isUser ? wechatGreen : 
                                    msg.type === 'system' ? '#fff2f0' :
                                    msg.type === 'confirm' ? '#fff7e6' :
                                    msg.type === 'complete' ? '#e6f7e6' : '#fff',
                    color: '#000',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.type === 'system' ? '1px solid #ffccc7' : 
                            msg.type === 'confirm' ? '1px solid #ffd591' :
                            msg.type === 'complete' ? '1px solid #07c160' : 'none',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 正在输入 */}
            {isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#07c160',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '10px'
                  }}>🐶</div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '4px', backgroundColor: '#fff',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                    <span style={{ width: '8px', height: '8px', backgroundColor: '#999', borderRadius: '50%' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 完成后的操作 */}
            {stage === 'complete' && profileId && (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '20px',
                marginTop: '16px',
                textAlign: 'center',
                border: '1px solid #e5e5e5'
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  档案ID：{profileId}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#07c160',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    再来一次
                  </button>
                  <button
                    onClick={() => router.push('/admin')}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#fff',
                      color: '#07c160',
                      border: '1px solid #07c160',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    查看后台
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入 */}
        {sessionId && stage !== 'complete' && (
          <div style={{ backgroundColor: '#f7f7f7', borderTop: '1px solid #d9d9d9', padding: '12px 16px' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              {/* 提示 */}
              {stage === 'confirming' && (
                <div style={{
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: '#d48806'
                }}>
                  💡 确认时回复「对/是的」，否认时回复「不对/错了」
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={stage === 'opening' ? '回复「准备好了」开始' : '输入你的回答...'}
                  disabled={isTyping}
                  style={{
                    flex: 1, height: '44px', padding: '0 12px',
                    border: '1px solid #d9d9d9', borderRadius: '4px',
                    fontSize: '15px', outline: 'none',
                    backgroundColor: isTyping ? '#f5f5f5' : '#fff'
                  }}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  style={{
                    padding: '10px 20px', borderRadius: '4px', border: 'none',
                    backgroundColor: inputValue.trim() && !isTyping ? '#07c160' : '#e5e5e5',
                    color: inputValue.trim() && !isTyping ? '#fff' : '#999',
                    fontSize: '15px', fontWeight: 500,
                    cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed'
                  }}
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
