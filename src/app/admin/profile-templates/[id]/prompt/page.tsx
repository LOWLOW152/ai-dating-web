'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  description: string;
  system_prompt: string | null;
  progress_template: string | null;
  data_format_template: string | null;
  context_limit: number;
}

const DEFAULT_SYSTEM_PROMPT = `你是狗蛋，一个温暖、真诚的AI交友助手。
你的任务是帮用户完成30题的交友档案，了解他们的性格、爱好、价值观和情感需求。

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

export default function TemplatePromptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [progressTemplate, setProgressTemplate] = useState('');
  const [dataFormatTemplate, setDataFormatTemplate] = useState('');
  const [contextLimit, setContextLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [params.id]);

  async function fetchTemplate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/profile-templates/${params.id}`);
      const data = await res.json();
      if (data.success) {
        const t = data.data;
        setTemplate(t);
        setSystemPrompt(t.system_prompt || DEFAULT_SYSTEM_PROMPT);
        setProgressTemplate(t.progress_template || DEFAULT_PROGRESS_TEMPLATE);
        setDataFormatTemplate(t.data_format_template || DEFAULT_DATA_FORMAT_TEMPLATE);
        setContextLimit(t.context_limit || 5);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/profile-templates/${params.id}/prompt`, {
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
        router.push('/admin/profile-templates');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
    setSaving(false);
  }

  // 生成预览
  const previewPrompt = `${systemPrompt}

${progressTemplate.replace(/{order}/g, '5').replace(/{remaining}/g, '25').replace(/{question_text}/g, '你平时有什么兴趣爱好？').replace(/{cached_summary}/g, '- 昵称: 小明\n- 性别: 男\n- 城市: 北京')}

【当前题目策略】
（这里会插入题目自己的AI提示词）

${dataFormatTemplate}`;

  if (loading) return <div className="p-8">加载中...</div>;
  if (!template) return <div className="p-8">资料库不存在</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部 */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">配置AI提示词: {template.name}</h1>
          <p className="text-xs text-gray-500">设置全局系统提示词和对话模板</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/profile-templates')}
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

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧配置 */}
        <div className="w-1/2 border-r overflow-y-auto p-4 space-y-4">
          
          {/* 系统角色定义 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">系统角色定义</h2>
              <button
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className="text-xs text-blue-600 hover:underline"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="定义AI的角色、性格、核心原则..."
            />
            <p className="text-xs text-gray-500 mt-2">
              定义狗蛋是谁、什么性格、整体对话风格
            </p>
          </div>

          {/* 进度提示模板 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">进度提示模板</h2>
              <button
                onClick={() => setProgressTemplate(DEFAULT_PROGRESS_TEMPLATE)}
                className="text-xs text-blue-600 hover:underline"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={progressTemplate}
              onChange={(e) => setProgressTemplate(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="可用变量: {order}, {question_id}, {question_text}, {remaining}, {cached_summary}"
            />
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <p>可用变量：</p>
              <ul className="list-disc list-inside text-gray-400">
                <li>{'{order}'} - 当前题序号</li>
                <li>{'{question_id}'} - 题ID</li>
                <li>{'{question_text}'} - 题目文本</li>
                <li>{'{remaining}'} - 剩余题数</li>
                <li>{'{cached_summary}'} - 已收集数据摘要</li>
              </ul>
            </div>
          </div>

          {/* 数据格式模板 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">数据格式规范</h2>
              <button
                onClick={() => setDataFormatTemplate(DEFAULT_DATA_FORMAT_TEMPLATE)}
                className="text-xs text-blue-600 hover:underline"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={dataFormatTemplate}
              onChange={(e) => setDataFormatTemplate(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="告诉AI怎么返回数据..."
            />
            <p className="text-xs text-gray-500 mt-2">
              定义AI返回数据的格式要求（JSON结构、分隔符等）
            </p>
          </div>

          {/* 上下文限制 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">上下文限制</h2>
              <span className="text-2xl font-bold text-blue-600">{contextLimit}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={contextLimit}
              onChange={(e) => setContextLimit(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              提示词中显示最近几道题的摘要（控制token用量，防止AI遗忘）
            </p>
          </div>
        </div>

        {/* 右侧预览 */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          <div className="bg-white border-b px-4 py-2">
            <h2 className="font-semibold">完整提示词预览</h2>
            <p className="text-xs text-gray-500">最终发送给AI的完整提示词（含题目提示词插入位置）</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono bg-gray-800 text-green-400 p-4 rounded-lg">
              {previewPrompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
