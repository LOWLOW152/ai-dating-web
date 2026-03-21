'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
}

interface Question {
  id: string;
  order: number;
  question_text: string;
  ai_prompt: string | null;
  closing_message: string | null;
  max_questions: number;
}

interface GlobalConfig {
  system_prompt: string;
  progress_template: string;
  data_format_template: string;
  context_limit: number;
}

export default function ChatPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  
  // 数据
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>({});
  const [questionRound, setQuestionRound] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const code = localStorage.getItem('inviteCode');
    if (!code) {
      router.push('/');
      return;
    }
    initChat();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function initChat() {
    setLoading(true);
    try {
      // 获取题目和配置
      const [questionsRes, configRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/admin/system-configs'),
      ]);

      const questionsData = await questionsRes.json();
      const configData = await configRes.json();

      if (questionsData.success) {
        const sorted = questionsData.data.sort((a: Question, b: Question) => a.order - b.order);
        setQuestions(sorted);
      }

      if (configData.success) {
        setConfig(configData.data);
      }
    } catch (error) {
      console.error('Init error:', error);
    }
    setLoading(false);
  }

  // 开始第一题
  useEffect(() => {
    if (questions.length > 0 && config && messages.length === 0 && !loading) {
      sendAiMessage(0, []);
    }
  }, [questions, config, loading]);

  function buildPrompt(questionIndex: number, chatHistory: ChatMessage[]) {
    if (!config || questions.length === 0) return '';
    
    const question = questions[questionIndex];
    const dataEntries = Object.entries(extractedData);
    const limitedData = dataEntries.slice(-config.context_limit);
    const cachedSummary = limitedData.length > 0
      ? limitedData.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')
      : '暂无';
    
    const remaining = questions.length - questionIndex - 1;
    
    const progressSection = config.progress_template
      .replace(/{order}/g, String(question.order))
      .replace(/{remaining}/g, String(remaining))
      .replace(/{question_id}/g, question.id)
      .replace(/{question_text}/g, question.question_text)
      .replace(/{cached_summary}/g, cachedSummary);

    const questionPrompt = question.ai_prompt || '';
    
    const historySection = chatHistory.length > 0 
      ? '\n【本轮对话历史】\n' + chatHistory.map(m => `${m.role === 'ai' ? 'AI' : '用户'}: ${m.content}`).join('\n')
      : '';

    const roundInfo = `\n【追问状态】当前第 ${questionRound + 1}/${question.max_questions || 3} 轮\n`;

    return `${config.system_prompt}\n\n${progressSection}\n\n${questionPrompt}\n\n${config.data_format_template}${roundInfo}${historySection}`;
  }

  async function sendAiMessage(qIndex: number, chatHistory: ChatMessage[]) {
    setIsAiResponding(true);
    
    try {
      const prompt = buildPrompt(qIndex, chatHistory);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      if (data.success) {
        const content = data.reply || '';
        
        // 提取数据
        const dataMatch = content.match(/---DATA---\s*([\s\S]*)$/);
        if (dataMatch) {
          try {
            const jsonStr = dataMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            setExtractedData(prev => ({ ...prev, ...parsed }));
          } catch {
            // 忽略解析失败
          }
        }
        
        const displayContent = content.split('---DATA---')[0].trim();
        
        const newMessage: ChatMessage = {
          role: 'ai',
          content: displayContent || '（AI未返回有效回复）',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, newMessage]);

        // 语音播报
        if (mounted && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(displayContent);
          utterance.lang = 'zh-CN';
          utterance.rate = 1;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '抱歉，我出了点问题，请重试...',
        timestamp: Date.now(),
      }]);
    }

    setIsAiResponding(false);
  }

  async function handleSend() {
    if (!inputMessage.trim() || isAiResponding) return;

    const userContent = inputMessage.trim();
    setInputMessage('');
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const newRound = questionRound + 1;
    setQuestionRound(newRound);
    
    await sendAiMessage(currentIndex, newMessages);
  }

  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setQuestionRound(0);
      
      setTimeout(() => {
        sendAiMessage(nextIndex, []);
      }, 100);
    } else {
      // 完成所有题目
      localStorage.setItem('profileData', JSON.stringify(extractedData));
      router.push('/complete');
    }
  }

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 
    ? Math.round((currentIndex / questions.length) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在准备...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-xl">🐕</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">狗蛋</h1>
            <p className="text-xs text-gray-500">第 {currentQuestion?.order || 1}/{questions.length} 题</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">{progress}%</div>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 聊天记录 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-sm">🐕</span>
              </div>
            )}
            <div 
              className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'ai' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'bg-green-500 text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {isAiResponding && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-sm">🐕</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* 底部输入 */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            disabled={isAiResponding}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-200"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isAiResponding}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400"
          >
            发送
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-400">
            追问 {questionRound}/{currentQuestion?.max_questions || 3}
          </p>
          <button
            onClick={handleNextQuestion}
            disabled={isAiResponding}
            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 disabled:opacity-50"
          >
            {currentIndex >= questions.length - 1 ? '完成' : '下一题'}
          </button>
        </div>
      </div>
    </div>
  );
}
