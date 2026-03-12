import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import ChatMessage from '../components/ChatMessage';
import { questions, getTotalQuestions } from '../lib/questions';
import { generateFollowUp, generateAIResponse } from '../lib/logic';

export default function Chat() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const totalQuestions = getTotalQuestions();
  const currentQuestion = questions[currentQuestionIndex];

  // 获取当前时间
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // 检查浏览器是否支持语音
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;
      
      if (!SpeechRecognition || !speechSynthesis) {
        setVoiceSupported(false);
      } else {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'zh-CN';
        
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setTimeout(() => handleSendWithText(transcript), 500);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          setIsListening(false);
        };
        
        synthRef.current = speechSynthesis;
      }
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (messages.length === 0) {
      const firstQuestion = currentQuestion.question;
      addMessage(firstQuestion, false);
      
      if (voiceMode) speakText(firstQuestion);
      
      if (currentQuestion.inputType === 'choice') {
        setCurrentOptions(currentQuestion.options);
        setShowOptions(true);
      }
    }
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 腾讯云 TTS
  const speakText = useCallback(async (text) => {
    if (!voiceMode) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    try {
      setIsSpeaking(true);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          speakFallback(text);
        };
        
        await audio.play();
      } else {
        throw new Error('TTS API failed');
      }
    } catch (error) {
      console.error('腾讯云 TTS 失败:', error);
      speakFallback(text);
    }
  }, [voiceMode]);
  
  const speakFallback = (text) => {
    if (!synthRef.current) {
      setIsSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;
    
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Xiaoxiao')) 
                        || voices.find(v => v.name.includes('Ting-Ting'))
                        || voices.find(v => v.name.includes('Female') && v.lang.includes('zh'))
                        || voices.find(v => v.lang.includes('zh-CN') || v.lang.includes('zh'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('启动语音识别失败:', err);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const addMessage = (text, isUser) => {
    const time = getCurrentTime();
    setMessages(prev => [...prev, { text, isUser, id: Date.now(), time }]);
  };

  const handleSendWithText = async (text) => {
    if (!text.trim()) return;

    const userAnswer = text.trim();
    addMessage(userAnswer, true);
    setInputValue('');
    setIsTyping(true);

    const newAnswers = { ...answers, [currentQuestion.field]: userAnswer };
    setAnswers(newAnswers);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (!isFollowUp && (currentQuestion.needDeepDive || currentQuestion.checkVague)) {
      const followUp = generateFollowUp(currentQuestion, userAnswer, followUpCount);
      
      if (followUp) {
        setIsTyping(false);
        addMessage(followUp.message, false);
        
        if (voiceMode) speakText(followUp.message);
        
        setIsFollowUp(true);
        setFollowUpCount(followUpCount + 1);
        return;
      }
    }

    setIsTyping(false);
    setIsFollowUp(false);
    setFollowUpCount(0);

    const aiResponse = generateAIResponse();
    addMessage(aiResponse, false);
    
    if (voiceMode) speakText(aiResponse);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      setTimeout(() => {
        const nextQuestion = questions[nextIndex];
        setCurrentQuestionIndex(nextIndex);
        addMessage(nextQuestion.question, false);
        
        if (voiceMode) speakText(nextQuestion.question);
        
        if (nextQuestion.inputType === 'choice') {
          setCurrentOptions(nextQuestion.options);
          setShowOptions(true);
        } else {
          setShowOptions(false);
        }
      }, 1500);
    } else {
      const completeMsg = '问卷完成！正在生成你的相亲档案...';
      addMessage(completeMsg, false);
      
      if (voiceMode) speakText(completeMsg);
      
      setTimeout(() => {
        router.push({
          pathname: '/result',
          query: { answers: JSON.stringify(newAnswers) },
        });
      }, 2000);
    }
  };

  const handleSend = () => handleSendWithText(inputValue);

  const handleOptionClick = (option) => handleSendWithText(option);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceMode = () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    
    if (newMode && synthRef.current) {
      speakText('语音模式已开启，点击麦克风按钮开始说话');
    } else if (!newMode && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // 判断是否显示时间（每条消息都显示时间，或者间隔超过5分钟显示）
  const shouldShowTime = (index) => {
    return true; // 简化：每条都显示
  };

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5]" style={{ backgroundColor: '#f5f5f5' }}>
      {/* 微信风格顶部导航 */}
      <header className="bg-[#ededed] border-b border-gray-300 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* 左侧返回 */}
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* 中间标题 */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded bg-warm-500 flex items-center justify-center text-white text-sm font-bold mr-2 overflow-hidden">
              <span>🐶</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">狗蛋</h1>
              <p className="text-xs text-gray-500">AI相亲助手 · {Math.round((currentQuestionIndex / totalQuestions) * 100)}%</p>
            </div>
          </div>
          
          {/* 右侧语音开关 */}
          <button
            onClick={toggleVoiceMode}
            className={`p-2 rounded-full transition-all ${
              voiceMode 
                ? 'bg-warm-500 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={voiceMode 
                ? "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                : "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              } />
            </svg>
          </button>
        </div>
      </header>

      {/* 聊天区域 - 微信风格 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg.text}
              isUser={msg.isUser}
              isPlaying={!msg.isUser && isSpeaking && index === messages.length - 1}
              showTime={shouldShowTime(index)}
              time={msg.time}
            />
          ))}
          {isTyping && <ChatMessage isTyping={true} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 微信风格底部输入区 */}
      <div className="bg-[#f7f7f7] border-t border-gray-300 px-4 py-3 sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          {/* 选项按钮 - 微信风格 */}
          {showOptions && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 px-1">
              {currentOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  className="bg-white border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 输入框区域 - 微信风格 */}
          <div className="flex items-center space-x-3">
            {/* 语音按钮 */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isTyping || isSpeaking}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 0 01-3 3z" />
                </svg>
              </button>
            )}
            
            {/* 输入框 - 微信风格 */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? '正在听你说...' : '输入消息...'}
                className="w-full bg-white border border-gray-300 rounded px-4 py-2.5 focus:outline-none focus:border-warm-400 text-base"
                disabled={isTyping || isListening}
              />
            </div>
            
            {/* 发送按钮 - 微信绿色 */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping || isListening}
              className="px-5 py-2 rounded text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: inputValue.trim() && !isTyping && !isListening ? '#07c160' : '#e5e5e5',
                color: inputValue.trim() && !isTyping && !isListening ? 'white' : '#999'
              }}
            >
              发送
            </button>
          </div>
          
          {/* 语音识别状态 */}
          {isListening && (
            <p className="text-center text-sm text-warm-600 mt-2 animate-pulse flex items-center justify-center">
              <span className="mr-1">🎤</span> 正在听... 说完点发送或等自动识别
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
