import React from 'react';

export default function ChatMessage({ message, isUser, isTyping, isPlaying }) {
  if (isTyping) {
    return (
      <div className="flex justify-start mb-4">
        <div className="chat-bubble-ai flex items-center space-x-1">
          <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-warm-500 flex items-center justify-center text-white text-sm font-medium mr-2 flex-shrink-0 relative">
          狗
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
          )}
        </div>
      )}
      <div className={`${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'} relative`}>
        <p className="text-sm leading-relaxed">{message}</p>
        {isPlaying && (
          <span className="absolute -right-6 top-1/2 transform -translate-y-1/2">
            <svg className="w-4 h-4 text-warm-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}