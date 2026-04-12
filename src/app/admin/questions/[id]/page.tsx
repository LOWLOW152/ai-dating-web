'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface HierarchyNode {
  label: string;
  children?: HierarchyNode[];
}

interface Question {
  id: string;
  category: string;
  type: string;
  order: number;
  question_text: string;
  field_type: string;
  validation: Record<string, unknown>;
  options: unknown[] | null;
  ai_prompt: string | null;
  closing_message: string | null;
  max_questions: number;
  use_closing_message: boolean;
  hierarchy: HierarchyNode[] | null;
  is_active: boolean;
  is_required: boolean;
  preset_options: string[] | null;
}

interface AiToneConfig {
  style: 'gentle' | 'neutral' | 'playful' | 'professional';
  depth: 'shallow' | 'moderate' | 'deep';
  opening: 'direct' | 'empathy' | 'casual';
  sensitivity: 'low' | 'medium' | 'high';
}

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

// 提取的数据结构
interface ExtractedData {
  [key: string]: string | ExtractedData | (string | ExtractedData)[];
}

// 快捷选项编辑器组件
function PresetOptionsEditor({
  value,
  onChange
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  // 处理 value 可能是字符串的情况（从数据库返回的 JSONB）
  const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
  const [options, setOptions] = useState<string[]>(parsedValue || []);
  const [newOption, setNewOption] = useState('');

  // 当外部 value 变化时同步更新内部状态
  useEffect(() => {
    const newParsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    setOptions(newParsedValue || []);
  }, [value]);

  useEffect(() => {
    onChange(options);
  }, [options, onChange]);

  function addOption() {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  function moveOption(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index > 0) {
      const newOptions = [...options];
      [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
      setOptions(newOptions);
    } else if (direction === 'down' && index < options.length - 1) {
      const newOptions = [...options];
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
      setOptions(newOptions);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      {/* 已添加的选项 */}
      <div className="space-y-2 mb-3">
        {options.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-xs">
            暂无快捷选项，用户只能手动输入
          </div>
        ) : (
          options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white rounded px-3 py-2">
              <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
              <span className="flex-1 text-sm">{opt}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveOption(idx, 'up')}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveOption(idx, 'down')}
                  disabled={idx === options.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1"
                  title="下移"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-red-400 hover:text-red-600 px-1"
                  title="删除"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加新选项 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOption()}
          placeholder="输入选项文字，如：喜欢、不喜欢、偶尔"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={addOption}
          disabled={!newOption.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          添加
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        配置后，用户聊天时会看到这些选项按钮，点击后自动填入输入框（可修改后发送）
      </p>
    </div>
  );
}

// 层级编辑器组件
function HierarchyEditor({
  value,
  onChange
}: {
  value: HierarchyNode[];
  onChange: (value: HierarchyNode[]) => void;
}) {
  const [nodes, setNodes] = useState<HierarchyNode[]>(value || []);

  useEffect(() => {
    onChange(nodes);
  }, [nodes, onChange]);

  function addNode(parentPath: number[] = []) {
    const newNode: HierarchyNode = { label: '' };

    if (parentPath.length === 0) {
      setNodes([...nodes, newNode]);
    } else {
      const newNodes = [...nodes];
      let current = newNodes;
      for (let i = 0; i < parentPath.length - 1; i++) {
        current = current[parentPath[i]].children = current[parentPath[i]].children || [];
      }
      const lastIndex = parentPath[parentPath.length - 1];
      current[lastIndex].children = [...(current[lastIndex].children || []), newNode];
      setNodes(newNodes);
    }
  }

  function updateNode(path: number[], label: string) {
    const newNodes = [...nodes];
    let current = newNodes;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children!;
    }
    current[path[path.length - 1]].label = label;
    setNodes(newNodes);
  }

  function removeNode(path: number[]) {
    const newNodes = [...nodes];
    if (path.length === 1) {
      newNodes.splice(path[0], 1);
    } else {
      let current = newNodes;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].children!;
      }
      current.splice(path[path.length - 1], 1);
    }
    setNodes(newNodes);
  }

  function renderNode(node: HierarchyNode, path: number[], level: number) {
    const indent = level * 20;

    return (
      <div key={path.join('-')} className="mb-1">
        <div className="flex items-center gap-1" style={{ marginLeft: indent }}>
          <span className="text-gray-400 text-xs">{level === 0 ? '●' : '└─'}</span>
          <input
            type="text"
            value={node.label}
            onChange={(e) => updateNode(path, e.target.value)}
            placeholder={level === 0 ? '第1层' : `第${level + 1}层`}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => addNode(path)}
            className="text-blue-600 text-xs hover:underline px-1"
          >+子</button>
          <button
            type="button"
            onClick={() => removeNode(path)}
            className="text-red-600 text-xs hover:underline px-1"
          >删</button>
        </div>
        {node.children?.map((child, index) =>
          renderNode(child, [...path, index], level + 1)
        )}
      </div>
    );
  }

  const maxDepth = nodes.reduce((max, node) => {
    function getDepth(n: HierarchyNode, d: number): number {
      if (!n.children?.length) return d;
      return Math.max(...n.children.map(c => getDepth(c, d + 1)));
    }
    return Math.max(max, getDepth(node, 1));
  }, 0);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">深度追问层级</span>
        {maxDepth > 0 && <span className="text-xs text-gray-500">({maxDepth}层)</span>}
        <button
          type="button"
          onClick={() => addNode([])}
          className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50"
        >+ 添加</button>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-xs">
          暂无层级配置，点击添加
        </div>
      ) : (
        <div className="space-y-1">{nodes.map((node, index) => renderNode(node, [index], 0))}</div>
      )}
    </div>
  );
}

// 打印层级结构
function printHierarchy(nodes: HierarchyNode[], level: number): string {
  return nodes.map(n => {
    const indent = '  '.repeat(level);
    let result = `${indent}第${level + 1}层: ${n.label}`;
    if (n.children?.length) {
      result += '\n' + printHierarchy(n.children, level + 1);
    }
    return result;
  }).join('\n');
}

// 生成AI提示词
function generateAiPrompt(
  question: Question,
  toneConfig: AiToneConfig,
  questionCount: number,
  extractedData: ExtractedData,
  closingMessage: string,
  maxQuestions: number
): string {
  const styleMap: Record<string, string> = {
    gentle: '【语气】温柔亲切，多用共情和鼓励',
    neutral: '【语气】理性中立，简洁直接',
    playful: '【语气】活泼俏皮，带点幽默感',
    professional: '【语气】沉稳专业，用词准确',
  };

  const openingMap: Record<string, string> = {
    direct: '【开场】直接切入主题',
    empathy: '【开场】先共情再提问',
    casual: '【开场】闲聊式过渡',
  };

  const sensitivityMap: Record<string, string> = {
    low: '【敏感度】对模糊回答宽容，不强行追问',
    medium: '【敏感度】适度追问模糊回答',
    high: '【敏感度】对任何模糊回答都要追问到底',
  };

  let prompt = `你正在帮用户完成一道交友档案题目。

【题号】${question.id}（第 ${question.order} 题）
【题目】${question.question_text}

${styleMap[toneConfig.style]}
${openingMap[toneConfig.opening]}
${sensitivityMap[toneConfig.sensitivity]}

【重要规则】
1. 最多追问${maxQuestions}个问题（包括确认题），当前已问${questionCount}个
2. 每轮对话必须同时完成两件事：
   - 回应用户的回答
   - 更新已提取的数据（JSON格式）
3. 已提取的数据会在下一轮发给你，请基于此继续追问或结束
4. 当收集到足够信息或已达追问上限时，请根据【结束提示词】告知用户本话题结束，然后停止提问`;

  if (question.hierarchy && question.hierarchy.length > 0) {
    prompt += '\n\n【追问层级参考】\n';
    prompt += printHierarchy(question.hierarchy, 0);
    prompt += '\n\n按以上层级逐层追问，获得最具体的信息。';
  }

  // 添加结束提示词
  if (closingMessage) {
    prompt += `

【结束提示词】当需要结束本话题时，请按以下要求回应：
${closingMessage}`;
  } else {
    prompt += `

【结束提示词】当需要结束本话题时，请简要总结刚才聊的内容，然后告知用户进入下一题。不要提出新的问题。`;
  }

  prompt += `

【已提取数据】
${JSON.stringify(extractedData, null, 2)}

【输出格式要求】
你的回复必须包含两部分，用 ---DATA--- 分隔：

第一部分：对用户的自然语言回复（追问或结束语）

---DATA---

第二部分：更新后的提取数据（JSON格式），例如：
{
  "兴趣爱好": {
    "类型": "运动",
    "具体项目": "羽毛球",
    "形式": "双打"
  }
}

如果已问满3个问题或信息已收集完整，请在第一部分使用【结束提示词】，并给出总结。`;

  return prompt;
}

// 解析AI回复，分离自然语言和JSON数据
function parseAiReply(content: string): { reply: string; data: ExtractedData | null } {
  const parts = content.split('---DATA---');
  const reply = parts[0].trim();
  let data: ExtractedData | null = null;

  if (parts.length > 1) {
    try {
      const jsonStr = parts[1].trim();
      // 尝试提取JSON代码块
      const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/) || jsonStr.match(/```\s*([\s\S]*?)```/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[1]);
      } else {
        data = JSON.parse(jsonStr);
      }
    } catch {
      // JSON解析失败，忽略数据部分
    }
  }

  return { reply, data };
}

// 递归渲染提取的数据树
function renderDataTree(data: ExtractedData, level: number = 0): React.ReactNode {
  return Object.entries(data).map(([key, value]) => {
    const indent = level * 16;
    if (typeof value === 'string') {
      return (
        <div key={key} style={{ marginLeft: indent }} className="text-sm">
          <span className="text-gray-500">{key}:</span> <span className="text-gray-800">{value}</span>
        </div>
      );
    } else if (Array.isArray(value)) {
      return (
        <div key={key} style={{ marginLeft: indent }} className="text-sm">
          <span className="text-gray-500">{key}:</span>
          {value.map((item, i) => (
            <div key={i} className="ml-4">
              {typeof item === 'string' ? item : renderDataTree(item as ExtractedData, 0)}
            </div>
          ))}
        </div>
      );
    } else if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} style={{ marginLeft: indent }} className="text-sm">
          <span className="text-gray-600 font-medium">{key}</span>
          <div className="ml-2">{renderDataTree(value as ExtractedData, 1)}</div>
        </div>
      );
    }
    return null;
  });
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [maxQuestions, setMaxQuestions] = useState(3);

  const [toneConfig, setToneConfig] = useState<AiToneConfig>({
    style: 'gentle',
    depth: 'moderate',
    opening: 'empathy',
    sensitivity: 'medium',
  });

  // AI测试窗口状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [aiResponding, setAiResponding] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && params.id && params.id !== 'new') {
      fetchQuestion();
    }
  }, [mounted, params.id]);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/questions/${params.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        // 处理 preset_options 可能是字符串的情况
        const questionData = {
          ...data.data,
          preset_options: typeof data.data.preset_options === 'string' 
            ? JSON.parse(data.data.preset_options) 
            : data.data.preset_options
        };
        setQuestion(questionData);
        setClosingMessage(data.data.closing_message || '');
        setMaxQuestions(data.data.max_questions || 3);
        // 读取 tone_config，如果没有则使用默认值
        if (data.data.tone_config) {
          setToneConfig(typeof data.data.tone_config === 'string'
            ? JSON.parse(data.data.tone_config)
            : data.data.tone_config
          );
        }
      } else {
        setError(data.error || '题目不存在');
      }
    } catch {
      setError('网络错误');
    }
    setLoading(false);
  }, [params.id]);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!question) return;

    setSaving(true);
    setError('');
    
    const saveUrl = `/api/admin/questions/${params.id}`;
    console.log('Sending save request to:', saveUrl);

    try {
      const payload = { 
        ...question, 
        closing_message: closingMessage, 
        max_questions: maxQuestions,
        tone_config: toneConfig
      };
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const res = await fetch(saveUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('Response:', res.status, res.statusText);
      
      if (!res.ok) {
        const text = await res.text();
        console.error('HTTP error:', res.status, text);
        setError(`服务器错误 ${res.status}: ${text.slice(0, 300)}`);
        setSaving(false);
        return;
      }
      
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        console.error('Parse error, raw response:', text);
        setError(`服务器返回格式错误: ${text.slice(0, 200)}`);
        setSaving(false);
        return;
      }
      
      console.log('Save response:', data);
      
      if (data.success) {
        router.push('/admin/questions');
      } else {
        setError(data.error || '保存失败，无错误信息');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(`网络错误: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('确定要删除这道题吗？')) return;

    try {
      const res = await fetch(`/api/admin/questions/${params.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/questions');
      } else {
        setError(data.error || '删除失败');
      }
    } catch {
      setError('网络错误');
    }
  }

  // AI对话功能
  async function handleSendMessage() {
    if (!userInput.trim() || !question || aiResponding || isComplete) return;

    // 检查是否已达上限
    if (questionCount >= maxQuestions) {
      setIsComplete(true);
      return;
    }

    const userMsg = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiResponding(true);

    try {
      const prompt = generateAiPrompt(question, toneConfig, questionCount, extractedData, closingMessage, maxQuestions);

      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: prompt },
            ...chatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
            { role: 'user', content: userMsg }
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        const { reply, data: newData } = parseAiReply(data.reply);
        setChatMessages(prev => [...prev, { role: 'ai', content: reply }]);

        // 更新问题计数
        setQuestionCount(prev => prev + 1);

        // 更新提取的数据
        if (newData) {
          setExtractedData(prev => ({ ...prev, ...newData }));
        }

        // 检查是否完成（已满上限或AI明确说完成）
        if (questionCount + 1 >= maxQuestions || reply.includes('收集完成') || reply.includes('完成')) {
          setIsComplete(true);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', content: '抱歉，AI响应出错。' }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', content: '网络错误，请重试。' }]);
    }
    setAiResponding(false);
  }

  function startNewTest() {
    if (!question) return;
    const initialMsg = toneConfig.opening === 'direct'
      ? question.question_text
      : toneConfig.opening === 'empathy'
      ? `你好呀～想和你聊聊，${question.question_text}`
      : `随便聊聊，${question.question_text}`;
    setChatMessages([{ role: 'ai', content: initialMsg }]);
    setQuestionCount(0);
    setExtractedData({});
    setIsComplete(false);
  }

  if (!mounted) {
    return <div className="p-8">加载中...</div>;
  }

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  if (!question) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">题目不存在</div>
        <button onClick={fetchQuestion} className="px-4 py-2 bg-blue-600 text-white rounded">重试</button>
      </div>
    );
  }

  const aiPrompt = generateAiPrompt(question, toneConfig, questionCount, extractedData, closingMessage, maxQuestions);

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold">编辑题目: {question.id}</h1>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="px-3 py-1.5 text-red-600 border border-red-300 rounded hover:bg-red-50 text-sm">删除</button>
          <button onClick={() => router.push('/admin/questions')} className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 text-sm">返回</button>
        </div>
      </div>

      {/* 主内容区 - 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧配置面板 */}
        <div className="w-1/2 border-r overflow-y-auto p-4 space-y-4">

          {/* 基础配置 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3 text-gray-800">基础配置</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">题目ID</label>
                <input type="text" value={question.id} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">序号</label>
                <input
                  type="number"
                  value={question.order}
                  onChange={(e) => setQuestion({ ...question, order: parseInt(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">题目内容</label>
              <input
                type="text"
                value={question.question_text}
                onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">分类</label>
                <select
                  value={question.category}
                  onChange={(e) => setQuestion({ ...question, category: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="basic">基础条件</option>
                  <option value="interests">兴趣话题</option>
                  <option value="lifestyle">生活方式</option>
                  <option value="values">价值观</option>
                  <option value="emotion">情感核心</option>
                  <option value="social">社交模式</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">类型</label>
                <select
                  value={question.type}
                  onChange={(e) => setQuestion({ ...question, type: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="semi">Semi</option>
                  <option value="dog">Dog</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">字段类型</label>
                <select
                  value={question.field_type}
                  onChange={(e) => setQuestion({ ...question, field_type: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="select">单选</option>
                  <option value="multi_select">多选</option>
                  <option value="multi_text">多文本</option>
                  <option value="textarea">长文本</option>
                </select>
              </div>
            </div>
          </div>

          {/* 问题上限配置 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">追问上限</h2>
              <span className="text-xs text-gray-400">AI最多追问几个问题</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-8 text-center">{maxQuestions}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              包括确认题在内，AI最多追问的数量。达到上限后将自动结束本话题。
            </p>
          </div>

          {/* 结束语配置 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">结束语配置</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">启用结束语</label>
                <button
                  type="button"
                  onClick={() => setQuestion({ ...question, use_closing_message: !question.use_closing_message })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.use_closing_message !== false ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      question.use_closing_message !== false ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <textarea
              value={closingMessage}
              onChange={(e) => setClosingMessage(e.target.value)}
              placeholder="例如：总结一下用户刚才说的内容，然后告诉他们这个话题结束了，准备进入下一题。不要提出新的问题。"
              rows={3}
              disabled={question.use_closing_message === false}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                question.use_closing_message === false ? 'bg-gray-100 text-gray-500' : ''
              }`}
            />
            <p className="text-xs text-gray-400 mt-2">
              {question.use_closing_message === false 
                ? '已禁用结束语，AI将直接结束本题不输出结束语。'
                : '留空则使用默认提示词。AI会根据此提示词在结束本话题时给出回应（总结+不提问，或直接结束）。'}
            </p>
          </div>

          {/* 快捷选项配置 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">快捷选项</h2>
              <span className="text-xs text-gray-400">用户端显示的快捷回复按钮</span>
            </div>
            <PresetOptionsEditor
              value={question.preset_options || []}
              onChange={(preset_options) => setQuestion({ ...question, preset_options })}
            />
          </div>

          {/* 深度追问层级 */}
          <HierarchyEditor
            value={question.hierarchy || []}
            onChange={(hierarchy) => setQuestion({ ...question, hierarchy })}
          />

          {/* AI语气设定 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3 text-gray-800">AI语气设定</h2>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-2">语气风格</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'gentle', label: '温柔亲切' },
                  { key: 'neutral', label: '理性中立' },
                  { key: 'playful', label: '活泼俏皮' },
                  { key: 'professional', label: '沉稳专业' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setToneConfig({ ...toneConfig, style: opt.key as AiToneConfig['style'] })}
                    className={`px-3 py-1.5 rounded text-sm border ${
                      toneConfig.style === opt.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">追问深度</label>
                <select
                  value={toneConfig.depth}
                  onChange={(e) => setToneConfig({ ...toneConfig, depth: e.target.value as AiToneConfig['depth'] })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="shallow">浅尝辄止</option>
                  <option value="moderate">适度深挖</option>
                  <option value="deep">打破砂锅</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">开场白</label>
                <select
                  value={toneConfig.opening}
                  onChange={(e) => setToneConfig({ ...toneConfig, opening: e.target.value as AiToneConfig['opening'] })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="direct">直接切入</option>
                  <option value="empathy">先共情</option>
                  <option value="casual">闲聊过渡</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">追问敏感度</label>
                <select
                  value={toneConfig.sensitivity}
                  onChange={(e) => setToneConfig({ ...toneConfig, sensitivity: e.target.value as AiToneConfig['sensitivity'] })}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>
          </div>

          {/* 生成的AI提示词 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-white">生成的AI提示词</h2>
              <span className="text-xs text-gray-400">根据上方配置自动生成</span>
            </div>
            <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono overflow-x-auto">{aiPrompt}</pre>
          </div>

          {/* 错误提示 - 始终在保存按钮附近显示 */}
          {error && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-4">
              <div className="font-bold text-red-700 mb-1">❌ 保存失败</div>
              <div className="text-red-600 text-sm break-all">{error}</div>
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              {saving ? '保存中...' : '保存题目'}
            </button>
          </div>
        </div>

        {/* 右侧AI测试窗口 */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          {/* 顶部状态栏 */}
          <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold">AI测试窗口</h2>
              {chatMessages.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isComplete
                    ? 'bg-green-100 text-green-700'
                    : questionCount >= maxQuestions
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {isComplete ? '已完成' : `追问 ${questionCount}/${maxQuestions}`}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={startNewTest}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                开始新对话
              </button>
              <button
                onClick={() => {
                  setChatMessages([]);
                  setQuestionCount(0);
                  setExtractedData({});
                  setIsComplete(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                清空
              </button>
            </div>
          </div>

          {/* 聊天记录 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 mt-20">
                <p>点击「开始新对话」测试AI提问效果</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'ai'
                        ? 'bg-white border border-gray-200 text-gray-800'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {aiResponding && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
                  AI思考中...
                </div>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="bg-white border-t p-4">
            {isComplete ? (
              <div className="text-center text-green-600 font-medium py-2">
                ✓ 数据收集完成
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={questionCount >= maxQuestions ? "已达追问上限，请重新开始" : "输入你的回答..."}
                  disabled={aiResponding || chatMessages.length === 0 || questionCount >= maxQuestions}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={aiResponding || !userInput.trim() || chatMessages.length === 0 || questionCount >= maxQuestions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300"
                >
                  发送
                </button>
              </div>
            )}
          </div>

          {/* 已提取数据显示区 */}
          <div className="bg-white border-t">
            <div className="px-4 py-2 bg-gray-100 border-b flex justify-between items-center">
              <span className="font-medium text-sm text-gray-700">已提取的数据</span>
              {Object.keys(extractedData).length > 0 && (
                <span className="text-xs text-green-600">{Object.keys(extractedData).length} 个字段</span>
              )}
            </div>
            <div className="p-4 max-h-48 overflow-y-auto">
              {Object.keys(extractedData).length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  暂无提取的数据
                </div>
              ) : (
                <div className="space-y-1">{renderDataTree(extractedData)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}