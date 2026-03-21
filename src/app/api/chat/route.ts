import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
}

interface ToneConfig {
  style: 'gentle' | 'neutral' | 'playful' | 'professional';
  depth: 'shallow' | 'moderate' | 'deep';
  opening: 'direct' | 'empathy' | 'casual';
  sensitivity: 'low' | 'medium' | 'high';
}

interface Question {
  id: string;
  order: number;
  question_text: string;
  ai_prompt: string | null;
  closing_message: string | null;
  max_questions: number;
  use_closing_message: boolean;
  tone_config: ToneConfig | null;
}

interface GlobalConfig {
  system_prompt: string;
  progress_template: string;
  data_format_template: string;
  context_limit: number;
}

// 根据 toneConfig 生成小提示词
function generateAiPrompt(question: Question): string {
  const tone = question.tone_config;
  
  console.log('generateAiPrompt called:', {
    questionId: question.id,
    hasToneConfig: !!tone,
    toneConfig: tone
  });
  
  if (!tone) {
    return question.ai_prompt || '';
  }

  const styleMap: Record<string, string> = {
    gentle: '【语气】温柔亲切，多用共情和鼓励',
    neutral: '【语气】自然中性，像普通朋友聊天',
    playful: '【语气】轻松活泼，带点幽默感',
    professional: '【语气】专业理性，条理清晰',
  };

  const depthMap: Record<string, string> = {
    shallow: '【深度】点到为止，不深究',
    moderate: '【深度】适度追问，获取关键信息',
    deep: '【深度】深入挖掘，了解本质动机',
  };

  const openingMap: Record<string, string> = {
    direct: '【开场】直接提问，不绕弯子',
    empathy: '【开场】先共情再提问',
    casual: '【开场】闲聊式开场，自然引入',
  };

  const sensitivityMap: Record<string, string> = {
    low: '【敏感度】对模糊回答宽容，不深究',
    medium: '【敏感度】适度追问模糊回答',
    high: '【敏感度】对任何模糊回答都要追问到底',
  };

  return `你正在帮用户完成一道相亲档案题目。

【题号】${question.id}（第 ${question.order} 题）
【题目】${question.question_text}

${styleMap[tone.style] || styleMap.gentle}
${depthMap[tone.depth] || depthMap.moderate}
${openingMap[tone.opening] || openingMap.empathy}
${sensitivityMap[tone.sensitivity] || sensitivityMap.medium}

${question.ai_prompt || ''}`;
}
const DEFAULT_CONFIG: GlobalConfig = {
  system_prompt: `你是狗蛋，一个温暖、真诚的AI相亲助手。
你的任务是帮用户完成30题的相亲档案，了解他们的性格、爱好、价值观和情感需求。

【核心原则】
1. 像朋友一样聊天，不要像面试
2. 每次对话聚焦当前题目，不发散
3. 把用户的回答整理成结构化数据
4. 追问要温柔，不逼问
5. **保持对话连贯性**：这是同一个持续进行的对话，只是话题在切换，不要重复打招呼或显得突兀

【绝对禁止 - 违反会导致用户体验极差】
- **禁止重复提问**：如果【当前题目对话记录】显示用户已经回答过当前问题，绝对不要再问一遍
- 看到用户回答后，应该追问细节、确认理解，或者结束当前题目，而不是重复原问题

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

// 构建提示词（后端版本）
function buildPrompt(
  question: Question,
  totalQuestions: number,
  extractedData: Record<string, unknown>,
  chatHistory: ChatMessage[],
  config: GlobalConfig | null,
  isNewQuestion: boolean,
  currentRound: number = 1
): string {
  const cfg = config || DEFAULT_CONFIG;
  
  const dataEntries = Object.entries(extractedData);
  const limitedData = dataEntries.slice(-cfg.context_limit);
  const cachedSummary = limitedData.length > 0
    ? limitedData.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')
    : '暂无';
  
  const remaining = totalQuestions - question.order;
  
  const progressSection = cfg.progress_template
    .replace(/{order}/g, String(question.order))
    .replace(/{remaining}/g, String(remaining))
    .replace(/{question_id}/g, question.id)
    .replace(/{question_text}/g, question.question_text)
    .replace(/{cached_summary}/g, cachedSummary);

  const questionPrompt = generateAiPrompt(question);
  
  // 构建完整的对话历史
  const fullHistory = chatHistory.length > 0
    ? `【历史对话记录】\n${chatHistory.slice(-10).map(m => 
        `${m.role === 'ai' ? '你' : '用户'}: ${m.content}`
      ).join('\n')}\n`
    : '';
  
  // 新题目标记
  const newQuestionMarker = isNewQuestion 
    ? `【重要】这是第 ${question.order} 题的首次对话。请基于上面的历史记录自然过渡，引入新话题。不要重复问历史记录中已问过的问题。\n`
    : '';
  
  // 追问逻辑说明 - 使用前端传来的currentRound
  const maxQuestions = question.max_questions || 3;
  
  const currentRoundNum = Math.min(currentRound, maxQuestions);
  const isLastRound = currentRoundNum >= maxQuestions;
  const maxFollowUps = Math.max(0, maxQuestions - 2);
  
  console.log('Backend buildPrompt:', {
    questionId: question.id,
    maxQuestions,
    currentRound: currentRoundNum,
    isLastRound,
    isNewQuestion
  });
  
  const endInstruction = isLastRound ? `
【重要规则 - 强制静默结束】
当前是第 ${currentRoundNum} 轮（共 ${maxQuestions} 轮），这是本题最后一轮。

**强制规则：**
无论数据是否完整，本轮回复**只返回DATA，不返回任何对话内容**，静默进入下一题。

**返回格式：**
第一部分留空，直接返回：

---DATA---
{当前题提取的数据}

注意：不要追问，不要解释，直接静默结束本题。
` : `
【追问规则】
当前是第 ${currentRoundNum} 轮（共 ${maxQuestions} 轮），不是最后一轮。

**判断逻辑：**
1. 如果用户回答已经完整，可以提取有效数据 → **静默结束**（第一部分留空，只返回DATA），直接进入下一题
2. 如果用户回答不完整，需要追问 → **正常追问**（返回对话内容）

**优先级：** 数据完整 > 继续追问。一旦收集到足够信息，立即停止追问，静默切题。

【静默结束格式】
如果决定静默结束（数据完整），第一部分留空：

（第一部分留空，不要写任何内容）

---DATA---
{当前题提取的数据}
`;
  
  const followUpLogic = `【追问逻辑】
- 本题最多追问 ${maxQuestions} 轮（包括首次提问）
- 当前已是第 ${currentRoundNum} 轮${isLastRound ? '（最后一轮）' : ''}
- **核心策略：数据完整即静默结束**（优先于追问次数）
- 追问流程：首次提问 → 追问细节（最多${maxFollowUps}次） → 数据完整即静默结束 → 或达到${maxQuestions}轮强制静默结束
- 【重要】如果用户说"跳过"或不想回答，静默结束本题
${endInstruction}
`;

  // 根据是否是最后一轮或数据是否完整，使用不同的格式说明
  // 注意：这里简化处理，只区分最后一轮（强制静默）和非最后一轮
  // 数据完整时的静默判断由AI根据endInstruction自行决定
  const formatTemplate = isLastRound ? `
【返回格式要求 - 静默模式】
由于是最后一轮追问，本次回复**只返回DATA，不返回对话内容**。

格式：
第一部分：（留空，什么都不要写）

---DATA---

第二部分：当前题提取的数据（JSON格式）

重要：不要写"收到""好的"等任何回复，第一部分必须留空。
` : cfg.data_format_template;

  return `${cfg.system_prompt}

${progressSection}

${fullHistory}${newQuestionMarker}${followUpLogic}【当前题目策略】
${questionPrompt}

${formatTemplate}`;
}

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      questionId, 
      chatHistory = [], 
      extractedData = {}, 
      isNewQuestion = false,
      totalQuestions = 30,
      currentRound = 0 // 前端传来的当前轮数（0表示还没开始）
    } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: '缺少题目ID' },
        { status: 400 }
      );
    }

    // 查询题目数据
    const questionRes = await sql.query(
      'SELECT * FROM questions WHERE id = $1 AND is_active = true',
      [questionId]
    );
    
    if (questionRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '题目不存在' },
        { status: 404 }
      );
    }
    
    const question: Question = questionRes.rows[0];

    // 查询系统配置
    const configRes = await sql.query('SELECT key, value FROM system_configs');
    const config: GlobalConfig = { ...DEFAULT_CONFIG };
    
    configRes.rows.forEach((row: { key: string; value: string }) => {
      if (row.key === 'system_prompt') config.system_prompt = row.value;
      if (row.key === 'progress_template') config.progress_template = row.value;
      if (row.key === 'data_format_template') config.data_format_template = row.value;
      if (row.key === 'context_limit') config.context_limit = parseInt(row.value) || 5;
    });

    // 构建提示词（后端构建）
    const prompt = buildPrompt(
      question,
      totalQuestions,
      extractedData,
      chatHistory,
      config,
      isNewQuestion,
      currentRound
    );

    const apiKey = process.env.DOUBAO_API_KEY;
    
    if (apiKey) {
      try {
        const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.DOUBAO_MODEL || 'doubao-1-5-pro-32k-250115',
            messages: [
              { role: 'system', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content || '';
          return NextResponse.json({ success: true, reply, prompt });
        }
      } catch (err) {
        console.log('Doubao API failed:', err);
      }
    }

    // 模拟模式
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockReply = `[🤖 模拟模式 - 豆包AI未配置] 这是后端构建的提示词测试回复\n\n---DATA---\n{}`;
    
    return NextResponse.json({ success: true, reply: mockReply, prompt });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
