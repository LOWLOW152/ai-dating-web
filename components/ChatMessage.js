import React from 'react';

export default function ChatMessage({ message, isUser, isTyping, isPlaying, showTime, time }) {
  // 微信绿色
  const wechatGreen = '#95ec69';
  
  if (isTyping) {
    return (
      <div className="flex items-start mb-4">
        {/* AI 头像 */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center text-white text-lg flex-shrink-0 mr-3 shadow-sm">
          🐶
        </div>
        {/* 气泡 */}
        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-1 h-5">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    // 用户消息 - 右边，绿色气泡
    return (
      <div className="flex items-start justify-end mb-4">
        <div className="flex flex-col items-end max-w-xs md:max-w-md">
          {showTime && (
            <span className="text-xs text-gray-400 mb-1">{time}</span>
          )}
          <div className="flex items-start">
            <div 
              className="rounded-lg px-4 py-2.5 text-black text-base leading-relaxed shadow-sm"
              style={{ backgroundColor: wechatGreen }}
            >
              <p className="break-words">{message}</p>
            </div>
            {/* 用户头像 */}
            <div className="w-10 h-10 rounded-lg bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0 ml-3">
              😊
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI 消息 - 左边，白色气泡
  return (
    <div className="flex items-start mb-4">
      {/* AI 头像 */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-warm-400 to-warm-600 flex items-center justify-center text-white text-lg flex-shrink-0 mr-3 shadow-sm relative">
        🐶
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></span>
        )}
      </div>
      <div className="flex flex-col max-w-xs md:max-w-md">
        {showTime && (
          <span className="text-xs text-gray-400 mb-1 ml-1">{time}</span>
        )}
        <div className="flex items-start">
          <div className="bg-white rounded-lg px-4 py-2.5 text-black text-base leading-relaxed shadow-sm border border-gray-100 relative">
            <p className="break-words">{message}</p>
            {isPlaying && (
              <span className="absolute -right-6 top-1/2 transform -translate-y-1/2">
                <svg className="w-4 h-4 text-warm-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
