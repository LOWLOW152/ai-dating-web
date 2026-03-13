// 豆包直连测试 API
export default async function handler(req, res) {
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
    const { message } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({
        response: '⚠️ 未配置豆包API Key',
        source: 'error'
      });
    }
    
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-1-5-pro-32k-250115',
        messages: [
          { role: 'system', content: '你是豆包AI助手，直接回复用户问题。' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({
        response: `❌ API错误: ${response.status}\n${errorText}`,
        source: 'error'
      });
    }
    
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    
    res.status(200).json({
      response: aiResponse || '（空响应）',
      source: 'doubao',
      raw: data
    });
    
  } catch (error) {
    res.status(200).json({
      response: `❌ 请求失败: ${error.message}`,
      source: 'error'
    });
  }
}
