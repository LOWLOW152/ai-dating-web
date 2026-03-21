'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

interface Question {
  id: string;
  order: number;
  question_text: string;
  ai_prompt: string | null;
  closing_message: string | null;
  max_questions: number;
  category: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是狗蛋，一个温暖、真诚的AI相亲助手。
你的任务是帮用户完成30题的相亲档案，了解他们的性格、爱好、价值观和情感需求。

【核心原则】
1. 像朋友一样聊天，不要像面试
2. 每次对话聚焦当前题目，不发散
3. 把用户的回答整理成结构化数据
4. 追问要温柔，不逼问

【记忆机制】
你不需要记住整个对话历史，网页会帮你记录。
每次你会收到：
- 当前进度（第几题，还剩几题）
- 已收集的数据摘要
- 当前题目的具体策略`;

const DEFAULT_PROGRESS_TEMPLATE = `【当前进度】
第 {order} 题（共30题），还剩 {remaining} 题
当前题目：{question_text}

【已收集数据】
{cached_summary}`;

const DEFAULT_DATA_FORMAT_TEMPLATE = `【返回格式要求】
你的回复必须包含两部分，用 ---DATA--- 分隔：

第一部分：对用户的自然语言回复（追问或结束语）

---DATA---

第二部分：当前题提取的数据（JSON格式），例如：
{
  "字段名": "值"
}

如果已达到追问上限，请在第一部分使用结束语。`;

export default function GlobalPromptPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // 配置状态
  const [systemPrompt, setSystemPrompt] = useState('');
  const [progressTemplate, setProgressTemplate] = useState('');
  const [dataFormatTemplate, setDataFormatTemplate] = useState('');
  const [contextLimit, setContextLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 题目列表
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // 测试状态
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>({});
  const [testStarted, setTestStarted] = useState(false);
  const [questionRound, setQuestionRound] = useState(0); // 当前题追问次数

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // 监听修改，标记未保存
  useEffect(() => {
    if (!loading) {
      setHasUnsavedChanges(true);
    }
  }, [systemPrompt, progressTemplate, dataFormatTemplate, contextLimit]);

  // 离开页面前提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchData() {
    setLoading(true);
    try {
      // 并行获取配置和题目
      const [configRes, questionsRes] = await Promise.all([
        fetch('/api/admin/system-configs'),
        fetch('/api/questions'),
      ]);

      const configData = await configRes.json();
      const questionsData = await questionsRes.json();

      if (configData.success) {
        const configs = configData.data;
        setSystemPrompt(configs.system_prompt || DEFAULT_SYSTEM_PROMPT);
        setProgressTemplate(configs.progress_template || DEFAULT_PROGRESS_TEMPLATE);
        setDataFormatTemplate(configs.data_format_template || DEFAULT_DATA_FORMAT_TEMPLATE);
        setContextLimit(parseInt(configs.context_limit || '5'));
      }
      
      if (questionsData.success) {
        const sorted = questionsData.data.sort((a: Question, b: Question) => a.order - b.order);
        setQuestions(sorted);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setProgressTemplate(DEFAULT_PROGRESS_TEMPLATE);
      setDataFormatTemplate(DEFAULT_DATA_FORMAT_TEMPLATE);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/system-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          progress_template: progressTemplate,
          data_format_template: dataFormatTemplate,
          context_limit: contextLimit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasUnsavedChanges(false);
        alert('保存成功！');
        router.push('/admin/questions');
      } else {
        alert('保存失败：' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败，请检查网络连接');
    }
    setSaving(false);
  }

  const currentQuestion = questions[currentQuestionIndex];

  // 生成完整提示词
  function buildFullPrompt(chatHistory: ChatMessage[], questionIndex: number) {
    const question = questions[questionIndex];
    if (!question) return '';
    
    // 根据contextLimit限制显示的数据
    const dataEntries = Object.entries(extractedData);
    const limitedData = dataEntries.slice(-contextLimit);
    const cachedSummary = limitedData.length > 0
      ? limitedData.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')
      : '暂无';
    
    const remaining = questions.length - questionIndex - 1;
    
    const progressSection = progressTemplate
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

    return `${systemPrompt}

${progressSection}

${questionPrompt}

${dataFormatTemplate}${roundInfo}${historySection}`;
  }

  async function startTest() {
    setTestStarted(true);
    setCurrentQuestionIndex(0);
    setMessages([]);
    setExtractedData({});
    setQuestionRound(0);
    
    // 自动发送第一题的初始问候
    await sendAiMessage(0, []);
  }

  async function sendAiMessage(qIndex: number, chatHistory: ChatMessage[]) {
    setIsAiResponding(true);
    
    try {
      const prompt = buildFullPrompt(chatHistory, qIndex);
      
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        const content = data.reply || '';
        
        // 尝试提取 ---DATA--- 后面的 JSON
        const dataMatch = content.match(/---DATA---\s*([\s\S]*)$/);
        
        if (dataMatch) {
          try {
            const jsonStr = dataMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            setExtractedData(prev => ({ ...prev, ...parsed }));
          } catch {
            // JSON解析失败，忽略
          }
        }
        
        // 清理掉 ---DATA--- 部分显示给用户
        const displayContent = content.split('---DATA---')[0].trim();
        
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: displayContent || '（AI未返回有效回复）'
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: '出错了: ' + (data.error || '未知错误')
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: '请求失败，请检查网络'
      }]);
    }

    setIsAiResponding(false);
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isAiResponding || !currentQuestion) return;

    const userContent = inputMessage.trim();
    setInputMessage('');
    
    // 添加用户消息
    const newMessages = [...messages, { role: 'user' as const, content: userContent }];
    setMessages(newMessages);
    
    // 增加追问次数
    const newRound = questionRound + 1;
    setQuestionRound(newRound);
    
    // 发送给AI
    await sendAiMessage(currentQuestionIndex, newMessages);
  }

  function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setMessages([]);
      setQuestionRound(0);
      
      // 自动发送下一题的初始问候
      setTimeout(() => {
        sendAiMessage(nextIndex, []);
      }, 100);
    }
  }

  function prevQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setMessages([]);
      setQuestionRound(0);
    }
  }

  function resetTest() {
    setTestStarted(false);
    setCurrentQuestionIndex(0);
    setMessages([]);
    setExtractedData({});
    setQuestionRound(0);
  }

  function jumpToQuestion(index: number) {
    setCurrentQuestionIndex(index);
    setMessages([]);
    setQuestionRound(0);
    if (testStarted) {
      setTimeout(() => {
        sendAiMessage(index, []);
      }, 100);
    }
  }

  function handleBack() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的修改，确定要返回吗？');
      if (!confirmed) return;
    }
    router.push('/admin/questions');
  }

  // 生成预览（使用第一题作为示例）
  const previewPrompt = questions.length > 0 
    ? buildFullPrompt([], 0)
    : '加载中...';

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold">全局AI提示词配置</h1>
            <p className="text-xs text-gray-500">设置整个题库的系统提示词和对话模板 · 共{questions.length}题</p>
          </div>
          {hasUnsavedChanges && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
              未保存
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 主内容 - 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧配置 */}
        <div className="w-1/3 border-r overflow-y-auto p-4 space-y-4">
          
          {/* 系统角色定义 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">系统角色定义</h2>
              <button
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className="text-xs text-blue-600 hover:underline"
              >
                默认
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 进度提示模板 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">进度提示模板</h2>
              <button
                onClick={() => setProgressTemplate(DEFAULT_PROGRESS_TEMPLATE)}
                className="text-xs text-blue-600 hover:underline"
              >
                默认
              </button>
            </div>
            <textarea
              value={progressTemplate}
              onChange={(e) => setProgressTemplate(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <div className="text-xs text-gray-400 mt-2">
              {'{order}'} {'{remaining}'} {'{cached_summary}'}
            </div>
          </div>

          {/* 数据格式模板 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">数据格式规范</h2>
              <button
                onClick={() => setDataFormatTemplate(DEFAULT_DATA_FORMAT_TEMPLATE)}
                className="text-xs text-blue-600 hover:underline"
              >
                默认
              </button>
            </div>
            <textarea
              value={dataFormatTemplate}
              onChange={(e) => setDataFormatTemplate(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 上下文限制 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-sm">上下文限制</span>
              <span className="text-lg font-bold text-blue-600">{contextLimit}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={contextLimit}
              onChange={(e) => setContextLimit(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">提示词中显示最近几道题的数据</p>
          </div>
        </div>

        {/* 中间预览 */}
        <div className="w-1/3 border-r flex flex-col bg-gray-50">
          <div className="bg-white border-b px-3 py-2 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-sm">完整提示词预览</h2>
              <p className="text-xs text-gray-500">第1题示例</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-800 text-green-400 p-3 rounded">
              {previewPrompt}
            </pre>
          </div>
        </div>

        {/* 右侧AI测试窗口 - 完整流程 */}
        <div className="w-1/3 flex flex-col bg-white">
          <div className="bg-purple-50 border-b px-3 py-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-sm text-purple-800">🤖 AI 全流程测试</h2>
              <div className="flex gap-1">
                <button
                  onClick={resetTest}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 border rounded"
                >
                  重置
                </button>
              </div>
            </div>
            
            {/* 题目导航 */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="text-xs px-2 py-1 bg-white border rounded disabled:opacity-30"
              >
                ◀
              </button>
              
              <select
                value={currentQuestionIndex}
                onChange={(e) => jumpToQuestion(parseInt(e.target.value))}
                className="flex-1 text-xs border rounded px-2 py-1"
              >
                {questions.map((q, idx) => (
                  <option key={q.id} value={idx}>
                    {q.order}. {q.question_text.slice(0, 15)}...
                  </option>
                ))}
              </select>
              
              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex >= questions.length - 1}
                className="text-xs px-2 py-1 bg-white border rounded disabled:opacity-30"
              >
                ▶
              </button>
            </div>
            
            {testStarted && currentQuestion && (
              <div className="mt-2 text-xs text-purple-600">
                第 {currentQuestion.order} 题 · 追问 {questionRound}/{currentQuestion.max_questions || 3}
              </div>
            )}
          </div>

          {/* 聊天记录 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!testStarted ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm mb-4">测试完整的30题对话流程</p>
                <button
                  onClick={startTest}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  开始测试（第1题）
                </button>
                <p className="text-xs mt-2">或选择上方题目跳转</p>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm mt-8">
                    AI思考中...
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'ai' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isAiResponding && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
                      思考中...
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 提取的数据展示 */}
          {Object.keys(extractedData).length > 0 && (
            <div className="border-t px-3 py-2 bg-green-50 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-green-700 mb-1">已收集数据：</p>
              <pre className="text-xs text-green-800">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
          )}

          {/* 输入框 */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={testStarted ? "回复AI..." : "点击开始测试"}
                disabled={!testStarted || isAiResponding}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={!testStarted || !inputMessage.trim() || isAiResponding}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-300"
              >
                发送
              </button>
            </div>
            
            {testStarted && (
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  测试第{currentQuestionIndex + 1}/{questions.length}题
                </p>
                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex >= questions.length - 1 || isAiResponding}
                  className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-30"
                >
                  {currentQuestionIndex >= questions.length - 1 ? '已完成' : '下一题 ➜'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
