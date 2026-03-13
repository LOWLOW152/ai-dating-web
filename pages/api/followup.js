// 豆包 AI 追问 API
// 环境变量：DOUBAO_API_KEY（在 Vercel Dashboard 设置）

export default async function handler(req, res) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { question, answer, questionType, history } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
    }
    
    // 从环境变量读取豆包 API Key
    const apiKey = process.env.DOUBAO_API_KEY;
    
    if (!apiKey) {
      // 如果没有配置 API Key，返回本地备用追问
      return res.status(200).json({
        followUp: generateLocalFollowUp(question, answer, questionType),
        source: 'local'
      });
    }
    
    // 调用豆包 API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-1-5-pro-32k-250115', // Doubao-1.5-pro-32k 公测模型
        messages: [
          {
            role: 'system',
            content: `你是「狗蛋」，一位严格的AI相亲助手。判断用户回答是否需要追问。

【追问标准】满足任一条就追问：
1. 回答少于20字
2. 含模糊词：还行、一般、看情况、都可以、差不多、还好、随便
3. 没具体例子（如只说"喜欢看电影"但没说什么电影）
4. 只有形容词没事实（如"很有趣"但没说是什么事）

【示例】
- 问：周末怎么过？答：还行 → 追问
- 问：周末怎么过？答：周六去爬山，周日在家看电影 → 不追问
- 问：喜欢什么电影？答：科幻片 → 追问
- 问：喜欢什么电影？答：星际穿越，看了三遍 → 不追问

【输出】只输出"追问文案"或"PASS"，不要其他内容`          },
          {
            role: 'user',
            content: `题目：${question}
用户回答：${answer}
题目类型：${questionType || 'semi'}

请判断是否需要追问。如果需要，输出追问文案；如果不需要，输出 "PASS"。`
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      throw new Error(`豆包 API 错误: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('豆包返回空响应');
    }
    
    // 如果豆包返回 PASS，表示不需要追问
    if (aiResponse === 'PASS' || aiResponse.includes('PASS')) {
      return res.status(200).json({
        needFollowUp: false,
        followUp: null,
        source: 'doubao'
      });
    }
    
    // 返回追问文案
    res.status(200).json({
      needFollowUp: true,
      followUp: aiResponse,
      source: 'doubao'
    });
    
  } catch (error) {
    console.error('豆包追问失败:', error);
    
    // 出错时返回本地备用追问
    const { question, answer, questionType } = req.body;
    res.status(200).json({
      followUp: generateLocalFollowUp(question, answer, questionType),
      source: 'local_fallback',
      error: error.message
    });
  }
}

// 本地备用追问逻辑（豆包不可用时）
function generateLocalFollowUp(question, answer, questionType) {
  const vagueWords = ['还行', '一般', '看情况', '都可以', '差不多', '还好', '随便'];
  const isVague = vagueWords.some(w => answer.includes(w)) || answer.length < 10;
  
  if (!isVague) {
    return null; // 不追问
  }
  
  const followUps = [
    '能多说一点吗？我想更了解真实的你～',
    '这个回答有点模糊呢，可以举个例子吗？',
    '具体是什么样的呢？',
    '如果用一件具体的事来形容，会是什么？',
    '不想说也没关系，但如果愿意多说一点，档案会更准确哦～'
  ];
  
  return followUps[Math.floor(Math.random() * followUps.length)];
}
