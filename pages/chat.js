import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import ChatMessage from '../components/ChatMessage';
import ProgressBar from '../components/ProgressBar';
import { questions, getTotalQuestions } from '../lib/questions';
import { generateFollowUp, generateAIResponse } from '../lib/logic';

export default function Chat() {
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  
  // 语音相关状态
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const totalQuestions = getTotalQuestions();
  const currentQuestion = questions[currentQuestionIndex];

  // 检查浏览器是否支持语音
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;
      
      if (!SpeechRecognition || !speechSynthesis) {
        setVoiceSupported(false);
        console.log('浏览器不支持语音功能');
      } else {
        // 初始化语音识别
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'zh-CN';
        
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          // 自动发送
          setTimeout(() => handleSendWithText(transcript), 500);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          setIsListening(false);
        };
        
        // 初始化语音合成
        synthRef.current = speechSynthesis;
      }
    }
  }, []);

  // 初始化：显示第一个问题
  useEffect(() => {
    if (messages.length === 0) {
      const firstQuestion = currentQuestion.question;
      addMessage(firstQuestion, false);
      
      // 如果开启语音模式，自动播报第一个问题
      if (voiceMode) {
        speakText(firstQuestion);
      }
      
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

  // 语音合成函数
  const speakText = useCallback((text) => {
    if (!synthRef.current || !voiceMode) return;
    
    // 停止之前的播放
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85; // 更慢一点，更温柔
    utterance.pitch = 1.15; // 音调高一点，更柔和
    utterance.volume = 0.9; // 音量稍低，更亲切
    
    // 尝试找最温柔的中文女声
    const voices = synthRef.current.getVoices();
    // 优先选择微软 Xiaoxiao（最温柔的中文女声）
    const preferredVoice = voices.find(v => v.name.includes('Xiaoxiao')) 
                        || voices.find(v => v.name.includes('Ting-Ting'))
                        || voices.find(v => v.name.includes('Female') && v.lang.includes('zh'))
                        || voices.find(v => v.lang.includes('zh-CN') || v.lang.includes('zh'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log('使用语音:', preferredVoice.name);
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  }, [voiceMode]);

  // 开始语音识别
  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('启动语音识别失败:', err);
    }
  };

  // 停止语音识别
  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const addMessage = (text, isUser) => {
    setMessages(prev => [...prev, { text, isUser, id: Date.now() }]);
  };

  // 用指定文本发送
  const handleSendWithText = async (text) => {
    if (!text.trim()) return;

    const userAnswer = text.trim();
    addMessage(userAnswer, true);
    setInputValue('');
    setIsTyping(true);

    // 保存答案
    const newAnswers = { ...answers, [currentQuestion.field]: userAnswer };
    setAnswers(newAnswers);

    // 等待一下模拟思考
    await new Promise(resolve => setTimeout(resolve, 800));

    // 检查是否需要追问
    if (!isFollowUp && (currentQuestion.needDeepDive || currentQuestion.checkVague)) {
      const followUp = generateFollowUp(currentQuestion, userAnswer, followUpCount);
      
      if (followUp) {
        setIsTyping(false);
        addMessage(followUp.message, false);
        
        // 语音播报追问
        if (voiceMode) {
          speakText(followUp.message);
        }
        
        setIsFollowUp(true);
        setFollowUpCount(followUpCount + 1);
        return;
      }
    }

    // 进入下一个问题
    setIsTyping(false);
    setIsFollowUp(false);
    setFollowUpCount(0);

    // 简单的AI回应
    const aiResponse = generateAIResponse();
    addMessage(aiResponse, false);
    
    // 语音播报回应
    if (voiceMode) {
      speakText(aiResponse);
    }

    // 进入下一题
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      setTimeout(() => {
        const nextQuestion = questions[nextIndex];
        setCurrentQuestionIndex(nextIndex);
        addMessage(nextQuestion.question, false);
        
        // 语音播报新问题
        if (voiceMode) {
          speakText(nextQuestion.question);
        }
        
        if (nextQuestion.inputType === 'choice') {
          setCurrentOptions(nextQuestion.options);
          setShowOptions(true);
        } else {
          setShowOptions(false);
        }
      }, 1500);
    } else {
      // 完成，跳转到结果页
      const completeMsg = '问卷完成！正在生成你的相亲档案...';
      addMessage(completeMsg, false);
      
      if (voiceMode) {
        speakText(completeMsg);
      }
      
      setTimeout(() => {
        router.push({
          pathname: '/result',
          query: { answers: JSON.stringify(newAnswers) },
        });
      }, 2000);
    }
  };

  const handleSend = () => {
    handleSendWithText(inputValue);
  };

  const handleOptionClick = (option) => {
    handleSendWithText(option);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 切换语音模式
  const toggleVoiceMode = () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    
    if (newMode && synthRef.current) {
      // 开启时播报提示
      speakText('语音模式已开启，点击麦克风按钮开始说话');
    } else if (!newMode && synthRef.current) {
      // 关闭时停止播放
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* 头部 */}
      <header className="bg-white border-b border-warm-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-warm-500 flex items-center justify-center text-white font-medium relative">
                狗
                {isSpeaking && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></span>
                )}
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-800">狗蛋</p>
                <p className="text-xs text-gray-400">
                  {voiceMode ? '🔊 语音模式' : 'AI相亲助手'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 语音模式开关 */}
              {voiceSupported && (
                <button
                  onClick={toggleVoiceMode}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                    voiceMode 
                      ? 'bg-warm-100 text-warm-600' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={voiceMode ? '关闭语音模式' : '开启语音模式'}
                >
                  <span>{voiceMode ? '🔊' : '🔇'}</span>
                  <span>{voiceMode ? '语音开' : '语音关'}</span>
                </button>
              )}
              
              <div className="text-right">
                <p className="text-sm text-warm-600 font-medium">
                  {Math.round((currentQuestionIndex / totalQuestions) * 100)}%
                </p>
              </div>
            </div>
          </div>
          <ProgressBar current={currentQuestionIndex} total={totalQuestions} />
        </div>
      </header>

      {/* 语音模式提示 */}
      {voiceMode && voiceSupported && (
        <div className="bg-warm-50 border-b border-warm-100 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-center text-sm text-warm-700">
            <span className="mr-2">🎤</span>
            <span>点击麦克风按钮说话，我会语音回复你</span>
          </div>
        </div>
      )}

      {!voiceSupported && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2">
          <div className="max-w-2xl mx-auto text-center text-sm text-yellow-700">
            你的浏览器不支持语音功能，请使用 Chrome/Edge/Safari 浏览器
          </div>
        </div>
      )}

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg.text}
              isUser={msg.isUser}
              isPlaying={!msg.isUser && isSpeaking && index === messages.length - 1}
            />
          ))}
          {isTyping && <ChatMessage isTyping={true} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-warm-100 px-4 py-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          {/* 选项按钮 */}
          {showOptions && currentOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div className="flex items-center space-x-3">
            {/* 语音输入按钮 */}
            {voiceSupported && voiceMode && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isTyping || isSpeaking}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? '点击停止' : '点击说话'}
              >
                {isListening ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            )}
            
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? '正在听你说...' : '输入你的回答...'}
              className="input-warm flex-1"
              disabled={isTyping || isListening}
            />
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping || isListening}
              className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
          
          {/* 语音识别状态提示 */}
          {isListening && (
            <p className="text-center text-sm text-warm-600 mt-2 animate-pulse">
              🎤 正在听... 说完点发送或等自动识别
            </p>
          )}
        </div>
      </div>
    </div>
  );
}