'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
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

// 模拟题目的小提示词
const MOCK_QUESTION_PROMPT = `【语气】温柔亲切，多用共情
【开场】先打招呼再问
【敏感度】适度追问

【追问策略】
1. 问类型：运动/文艺/游戏/其他？
2. 问具体：什么运动？频率？
3. 问原因：为什么喜欢这个？

【结束语】这个话题就聊到这儿～我们聊聊下一个问题。`;

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
  
  // AI测试状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [testQuestion] = useState({
    id: 'hobbies',
    order: 5,
    question_text: '你平时有什么兴趣爱好？',
  });
  const [extractedData, setExtractedData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-configs');
      const data = await res.json();
      if (data.success) {
        const configs = data.data;
        setSystemPrompt(configs.system_prompt || DEFAULT_SYSTEM_PROMPT);
        setProgressTemplate(configs.progress_template || DEFAULT_PROGRESS_TEMPLATE);
        setDataFormatTemplate(configs.data_format_template || DEFAULT_DATA_FORMAT_TEMPLATE);
        setContextLimit(parseInt(configs.context_limit || '5'));
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
        router.push('/admin/questions');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  }

  // 生成完整提示词
  function buildFullPrompt(chatHistory: ChatMessage[]) {
    const cachedSummary = Object.entries(extractedData)
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join('\n') || '暂无';
    
    const progressSection = progressTemplate
      .replace(/{order}/g, String(testQuestion.order))
      .replace(/{remaining}/g, '25')
      .replace(/{question_id}/g, testQuestion.id)
      .replace(/{question_text}/g, testQuestion.question_text)
      .replace(/{cached_summary}/g, cachedSummary);

    const historySection = chatHistory.length > 0 
      ? '\n【本轮对话历史】\n' + chatHistory.map(m => `${m.role === 'ai' ? 'AI' : '用户'}: ${m.content}`).join('\n')
      : '';

    return `${systemPrompt}

${progressSection}

${MOCK_QUESTION_PROMPT}

${dataFormatTemplate}${historySection}`;
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isAiResponding) return;

    const userContent = inputMessage.trim();
    setInputMessage('');
    
    // 添加用户消息
    const newMessages = [...messages, { role: 'user' as const, content: userContent }];
    setMessages(newMessages);
    
    setIsAiResponding(true);

    try {
      const prompt = buildFullPrompt(newMessages);
      
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userContent,
          prompt,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        // 尝试提取 ---DATA--- 后面的 JSON
        const content = data.reply || '';
        const dataMatch = content.match(/---DATA---\s*([\s\S]*)$/);
        
        if (dataMatch) {
          try {
            const jsonStr = dataMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            setExtractedData(prev => ({ ...prev, ...parsed }));
          } catch (e) {
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
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: '请求失败，请检查网络'
      }]);
    }

    setIsAiResponding(false);
  }

  function resetChat() {
    setMessages([]);
    setExtractedData({});
    setInputMessage('');
  }

  // 生成预览
  const previewPrompt = buildFullPrompt([]);

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">全局AI提示词配置</h1>
          <p className="text-xs text-gray-500">设置整个题库的系统提示词和对话模板</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/questions')}
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
          </div>
        </div>

        {/* 中间预览 */}
        <div className="w-1/3 border-r flex flex-col bg-gray-50">
          <div className="bg-white border-b px-3 py-2 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-sm">完整提示词预览</h2>
              <p className="text-xs text-gray-500">最终发送给AI的提示词</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-800 text-green-400 p-3 rounded">
              {previewPrompt}
            </pre>
          </div>
        </div>

        {/* 右侧AI测试窗口 */}
        <div className="w-1/3 flex flex-col bg-white">
          <div className="bg-purple-50 border-b px-3 py-2 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-sm text-purple-800">🤖 AI 测试窗口</h2>
              <p className="text-xs text-gray-500">测试第{testQuestion.order}题：{testQuestion.question_text}</p>
            </div>
            <button
              onClick={resetChat}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              重置
            </button>
          </div>

          {/* 聊天记录 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                点击"开始对话"测试AI效果
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
            <div ref={chatEndRef} />
          </div>

          {/* 提取的数据展示 */}
          {Object.keys(extractedData).length > 0 && (
            <div className="border-t px-3 py-2 bg-green-50">
              <p className="text-xs font-medium text-green-700 mb-1">已提取数据：</p>
              <pre className="text-xs text-green-800 overflow-x-auto">
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
                placeholder="输入消息测试..."
                disabled={isAiResponding}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isAiResponding}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-300"
              >
                发送
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              使用当前配置的提示词进行对话测试
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
