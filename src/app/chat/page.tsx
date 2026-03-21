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

// 默认配置 fallback
const DEFAULT_CONFIG: GlobalConfig = {
  system_prompt: `你是狗蛋，一个温暖、真诚的AI相亲助手。
你的任务是帮用户完成30题的相亲档案，了解他们的性格、爱好、价值观和情感需求。

【核心原则】
1. 像朋友一样聊天，不要像面试
2. 每次对话聚焦当前题目，不发散
3. 把用户的回答整理成结构化数据
4. 追问要温柔，不逼问
5. **保持对话连贯性**：这是同一个持续进行的对话，只是话题在切换，不要重复打招呼或显得突兀

【话题切换规则】
- 如果是第一题的开场，可以自然打招呼
- 如果是切换到新话题，用自然过渡的方式引入新问题，不要重新自我介绍
- 参考之前的对话风格，保持一致的语气`,
  progress_template: `【当前进度】
第 {order} 题（共30题），还剩 {remaining} 题
当前题目：{question_text}

【已收集数据】
{cached_summary}`,
  data_format_template: `【返回格式要求】
你的回复必须包含两部分，用 ---DATA--- 分隔：

第一部分：对用户的自然语言回复（追问或结束语）

---DATA---

第二部分：当前题提取的数据（JSON格式）`,
  context_limit: 5
};

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
  const [currentPrompt, setCurrentPrompt] = useState<string>(''); // 当前传给AI的提示词
  const [showPrompt, setShowPrompt] = useState(false); // 是否显示右侧面板
  const [rightPanelTab, setRightPanelTab] = useState<'prompt' | 'data'>('prompt'); // 右侧面板当前标签
  const requestLock = useRef(false); // 请求锁，防止重复发送

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
    if (questions.length > 0 && messages.length === 0 && !loading) {
      sendAiMessage(0, [], true); // true = 初始加载，不触发自动跳转
    }
  }, [questions, loading]);

  function buildPrompt(questionIndex: number) {
    // 使用配置或默认配置
    const cfg = config || DEFAULT_CONFIG;
    if (questions.length === 0) return '';
    
    const question = questions[questionIndex];
    const dataEntries = Object.entries(extractedData);
    const limitedData = dataEntries.slice(-cfg.context_limit);
    const cachedSummary = limitedData.length > 0
      ? limitedData.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')
      : '暂无';
    
    const remaining = questions.length - questionIndex - 1;
    
    const progressSection = cfg.progress_template
      .replace(/{order}/g, String(question.order))
      .replace(/{remaining}/g, String(remaining))
      .replace(/{question_id}/g, question.id)
      .replace(/{question_text}/g, question.question_text)
      .replace(/{cached_summary}/g, cachedSummary);

    const questionPrompt = question.ai_prompt || '';

    return `${cfg.system_prompt}

${progressSection}

${questionPrompt}

${cfg.data_format_template}`;
  }

  async function sendAiMessage(qIndex: number, chatHistory: ChatMessage[], isInitialLoad = false, currentRound?: number) {
    setIsAiResponding(true);
    
    // 使用传入的 currentRound 或 state 中的 questionRound
    const roundToCheck = currentRound !== undefined ? currentRound : questionRound;
    
    try {
      const prompt = buildPrompt(qIndex);
      setCurrentPrompt(prompt); // 保存当前提示词用于显示
      
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
        let parsedData = {};
        if (dataMatch) {
          try {
            const jsonStr = dataMatch[1].trim();
            parsedData = JSON.parse(jsonStr);
            setExtractedData(prev => ({ ...prev, ...parsedData }));
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

        // 判断是否要进入下一题（只有用户对话后，不是初始加载时才判断）
        if (!isInitialLoad) {
          // 条件1：AI明确使用了结束语
          // 条件2：达到追问次数上限
          const isEnding = /(?:下一个问题|下一题|这个话题结束|完成.*下一题|进入下一题)/i.test(displayContent);
          const isMaxRound = roundToCheck >= (questions[qIndex]?.max_questions || 3);
          
          console.log('Auto next check:', { roundToCheck, max: questions[qIndex]?.max_questions, isEnding, isMaxRound, content: displayContent.slice(0, 50) });
          
          if ((isEnding || isMaxRound) && qIndex < questions.length - 1) {
            // 延迟一下让用户看到结束语，然后自动进入下一题
            setTimeout(() => {
              handleNextQuestion();
            }, 3000);
          }
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
    // 严格检查：输入为空、AI正在回复、或请求被锁定
    if (!inputMessage.trim() || isAiResponding || requestLock.current) return;
    
    // 加锁
    requestLock.current = true;

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
    
    try {
      await sendAiMessage(currentIndex, newMessages, false, newRound);
    } finally {
      // 解锁（在 finally 中确保一定会解锁）
      requestLock.current = false;
    }
  }

  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setQuestionRound(0);
      // 不清空聊天记录，保持连贯性
      
      setTimeout(() => {
        sendAiMessage(nextIndex, [], true); // true = 新题目初始加载
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
        <div className="flex items-center gap-3">
          {/* 调试面板切换按钮 */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              showPrompt 
                ? 'bg-gray-800 text-white border-gray-800' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showPrompt ? '隐藏调试' : '显示调试'}
          </button>
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
      </div>

      {/* 主内容区 - 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧聊天记录 */}
        <div className={`${showPrompt ? 'w-2/3' : 'w-full'} flex flex-col transition-all duration-300`}>
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
                disabled={!inputMessage.trim() || isAiResponding || requestLock.current}
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

        {/* 右侧提示词/数据面板 */}
        {showPrompt && (
          <div className="w-1/3 border-l bg-gray-50 flex flex-col">
            {/* 标签切换 */}
            <div className="bg-white border-b flex">
              <button
                onClick={() => setRightPanelTab('prompt')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  rightPanelTab === 'prompt'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                提示词
              </button>
              <button
                onClick={() => setRightPanelTab('data')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  rightPanelTab === 'data'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                已收集数据
              </button>
            </div>
            
            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto p-4">
              {rightPanelTab === 'prompt' ? (
                <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto">
                  {currentPrompt || '提示词加载中...'}
                </pre>
              ) : (
                <div className="space-y-3">
                  {Object.keys(extractedData).length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      暂无收集到的数据
                    </div>
                  ) : (
                    Object.entries(extractedData).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="text-xs font-semibold text-gray-600 mb-1">{key}</div>
                        <div className="text-sm text-gray-800 break-all">
                          {typeof value === 'object' 
                            ? JSON.stringify(value, null, 2) 
                            : String(value)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
