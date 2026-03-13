import React, { useState } from 'react';
import Head from 'next/head';

export default function TestDoubao() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/test-doubao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        source: data.source,
        raw: data.raw
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: '请求失败: ' + err.message 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const testPrompts = [
    '周末怎么过？答：还行',
    '周末怎么过？答：周六去爬山，周日在家看电影',
    '喜欢什么电影？答：科幻片',
    '喜欢什么电影？答：星际穿越，看了三遍'
  ];

  return (
    <>
      <Head>
        <title>豆包直连测试</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 头部 */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: '#fff',
          padding: '16px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '18px', margin: 0 }}>🤖 豆包直连测试</h1>
          <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
            直接对话豆包API，测试连接是否正常
          </p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
          {/* 快捷测试 */}
          <div style={{
            backgroundColor: '#fff',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
              快捷测试（点击直接发送）
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {testPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                    setTimeout(() => handleSend(), 100);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {prompt.length > 20 ? prompt.slice(0, 20) + '...' : prompt}
                </button>
              ))}
            </div>
          </div>

          {/* 聊天区域 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 消息列表 */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              maxHeight: '500px'
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  输入消息测试豆包API...
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: '16px',
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}>
                  <div style={{
                    display: 'inline-block',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: msg.role === 'user' ? '#95ec69' : 
                                    msg.role === 'error' ? '#ff4d4f' : '#f0f0f0',
                    color: msg.role === 'user' ? '#000' : 
                           msg.role === 'error' ? '#fff' : '#333',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                    {msg.source && (
                      <div style={{
                        fontSize: '11px',
                        color: '#999',
                        marginTop: '4px',
                        textAlign: 'right'
                      }}>
                        来源: {msg.source}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    border: '2px solid #e5e5e5',
                    borderTopColor: '#07c160',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: '12px'
            }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息测试豆包..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'none',
                  height: '60px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: input.trim() && !loading ? '#07c160' : '#e5e5e5',
                  color: input.trim() && !loading ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed'
                }}
              >
                发送
              </button>
            </div>
          </div>

          {/* 说明 */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#666'
          }}>
            <strong>测试说明：</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>上方快捷按钮模拟相亲问答场景</li>
              <li>也可以直接输入任意消息测试豆包</li>
              <li>如果返回错误或空响应，检查API Key配置</li>
              <li>正常应该显示豆包的回复内容</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
