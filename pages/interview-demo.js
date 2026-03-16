import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function InterviewDemo() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState({ collected: 0, total: 3, percentage: 0 });
  const [collectedAnswers, setCollectedAnswers] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 开始会话
  const startSession = async () => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        addMessage(data.reply, false, 'ai');
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('Start session failed:', err);
      addMessage('抱歉，连接失败了，请刷新重试', false, 'system');
    }
    setIsTyping(false);
  };

  // 添加消息（支持思考过程）
  const addMessage = (text, isUser, type = 'normal', thinking = null) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { text, isUser, type, time, id: Date.now(), thinking }]);
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || isTyping) return;

    const text = inputValue.trim();
    addMessage(text, true);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 延迟一下，模拟打字
        setTimeout(() => {
          // 如果有思考过程，先显示思考气泡
          if (data.thinking && !data.needsConfirmation) {
            addMessage(`🤔 ${data.thinking}`, false, 'thinking');
            // 再显示正式回复
            setTimeout(() => {
              addMessage(data.reply, false, 'ai');
              setProgress(data.progress);
              setCollectedAnswers(data.collectedAnswers);
              setIsComplete(data.completed);
              setIsTyping(false);
            }, 400);
          } else {
            addMessage(data.reply, false, data.needsConfirmation ? 'confirm' : 'ai', data.thinking);
            setProgress(data.progress);
            setCollectedAnswers(data.collectedAnswers);
            setIsComplete(data.completed);
            setIsTyping(false);
          }
        }, 600);
      }
    } catch (err) {
      console.error('Send message failed:', err);
      addMessage('抱歉，发送失败了', false, 'system');
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
        <title>AI访谈 Demo - 狗蛋</title>
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
                <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#333', margin: 0 }}>AI访谈 Demo</h1>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                  已收集 {progress.collected}/{progress.total} · {progress.percentage}%
                </p>
              </div>
            </div>
            
            <div style={{ width: '40px' }} />
          </div>
        </header>

        {/* 进度条 */}
        {sessionId && (
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
              
              {/* 已收集信息显示 */}
              {Object.keys(collectedAnswers).length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#666',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: '#999' }}>已确认：</span>
                  {collectedAnswers.nickname && (
                    <span style={{ 
                      backgroundColor: '#e6f7e6', 
                      color: '#07c160', 
                      padding: '2px 8px', 
                      borderRadius: '10px' 
                    }}>
                      昵称: {collectedAnswers.nickname}
                    </span>
                  )}
                  {collectedAnswers.gender && (
                    <span style={{ 
                      backgroundColor: '#e6f7e6', 
                      color: '#07c160', 
                      padding: '2px 8px', 
                      borderRadius: '10px' 
                    }}>
                      性别: {collectedAnswers.gender}
                    </span>
                  )}
                  {collectedAnswers.city && (
                    <span style={{ 
                      backgroundColor: '#e6f7e6', 
                      color: '#07c160', 
                      padding: '2px 8px', 
                      borderRadius: '10px' 
                    }}>
                      城市: {collectedAnswers.city}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 聊天区域 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {/* 开始按钮 */}
            {!sessionId && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
                <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '8px' }}>
                  AI 对话式采集 Demo
                </h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', maxWidth: '300px' }}>
                  像朋友一样闲聊，AI 自动收集你的基本信息（昵称、性别、城市）
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
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(7, 193, 96, 0.3)'
                  }}
                >
                  开始体验
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
                    maxWidth: msg.type === 'thinking' ? '240px' : '280px',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    backgroundColor: msg.isUser ? wechatGreen : 
                                    msg.type === 'system' ? '#fff2f0' :
                                    msg.type === 'thinking' ? '#f0f0f0' :
                                    msg.type === 'confirm' ? '#fff7e6' : '#fff',
                    color: msg.type === 'thinking' ? '#666' : '#000',
                    fontSize: msg.type === 'thinking' ? '13px' : '15px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.type === 'system' ? '1px solid #ffccc7' : 
                            msg.type === 'confirm' ? '1px solid #ffd591' : 'none',
                    fontStyle: msg.type === 'thinking' ? 'italic' : 'normal'
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
            
            {/* 完成状态 */}
            {isComplete && (
              <div style={{
                backgroundColor: '#e6f7e6',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '16px', color: '#07c160', fontWeight: 500 }}>
                  基本信息采集完成！
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                  可以继续深入聊兴趣爱好，或重新开始
                </div>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: '12px',
                    padding: '8px 20px',
                    backgroundColor: '#07c160',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  重新开始
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入 */}
        {sessionId && (
          <div style={{ backgroundColor: '#f7f7f7', borderTop: '1px solid #d9d9d9', padding: '12px 16px' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isComplete ? '信息采集已完成' : '输入消息...'}
                  disabled={isComplete || isTyping}
                  style={{
                    flex: 1, height: '44px', padding: '0 12px',
                    border: '1px solid #d9d9d9', borderRadius: '4px',
                    fontSize: '15px', outline: 'none',
                    backgroundColor: (isComplete || isTyping) ? '#f5f5f5' : '#fff'
                  }}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping || isComplete}
                  style={{
                    padding: '10px 20px', borderRadius: '4px', border: 'none',
                    backgroundColor: inputValue.trim() && !isTyping && !isComplete ? '#07c160' : '#e5e5e5',
                    color: inputValue.trim() && !isTyping && !isComplete ? '#fff' : '#999',
                    fontSize: '15px', fontWeight: 500,
                    cursor: inputValue.trim() && !isTyping && !isComplete ? 'pointer' : 'not-allowed'
                  }}
                >
                  发送
                </button>
              </div>
              
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
                💡 试试这样说："我叫小明，男生，在北京工作" · 确认时回复"对"或"不对"
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
