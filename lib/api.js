// Kimi API 封装
// 使用时需要配置 KIMI_API_KEY 环境变量

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 调用Kimi API进行追问
export const callKimiAPI = async (messages, apiKey) => {
  if (!apiKey) {
    throw new Error('请配置 KIMI_API_KEY');
  }

  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Kimi API调用失败:', error);
    throw error;
  }
};

// 生成追问用的prompt
export const generateFollowUpPrompt = (question, answer, context) => {
  return [
    {
      role: 'system',
      content: `你是一位温柔的AI相亲助手"狗蛋"。你的任务是：
1. 根据用户的回答，判断是否需要追问
2. 如果需要追问，用温柔、好奇的语气提出
3. 追问要具体，避免泛泛而谈
4. 最多追问2次

判断标准：
- 回答过于简短（少于10字）→ 需要追问
- 回答模糊（"都行""随便"）→ 需要追问
- 深度问题（涉及情感、关系）→ 可以追问一次
- 回答具体、有细节 → 不需要追问，直接肯定并继续`,
    },
    {
      role: 'user',
      content: `问题：${question}
用户回答：${answer}

请判断是否需要追问。如果需要，给出追问内容；如果不需要，回复"继续"。`,
    },
  ];
};

// 生成最终档案用的prompt
export const generateProfilePrompt = (answers) => {
  const answersText = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `你是一位专业的相亲档案分析师。请根据用户的回答，生成一份温暖、真实的相亲档案。

档案结构：
1. 个人画像（3-4个标签）
2. 性格特点（基于回答的观察）
3. 情感需求（最看重什么）
4. 相处建议（什么样的人适合TA）
5. 一句话总结

语气要求：
- 温暖真诚，不套路
- 有洞察但不评判
- 突出独特性`,
    },
    {
      role: 'user',
      content: `以下是用户的回答：\n\n${answersText}\n\n请生成相亲档案：`,
    },
  ];
};