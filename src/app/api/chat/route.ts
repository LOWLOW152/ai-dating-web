import { NextRequest, NextResponse } from 'next/server';

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: '缺少提示词' },
        { status: 400 }
      );
    }

    const apiKey = process.env.MOONSHOT_API_KEY;
    
    if (apiKey) {
      try {
        const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'moonshot-v1-8k',
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
          return NextResponse.json({ success: true, reply });
        }
      } catch (err) {
        console.log('Kimi API failed:', err);
      }
    }

    // 模拟模式
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 根据prompt内容返回不同的模拟回复
    let mockReply = '';
    
    if (prompt.includes('昵称') || prompt.includes('名字')) {
      mockReply = `[🤖 模拟模式] 你好呀～很高兴认识你！我是狗蛋🐕\n\n可以先告诉我你的名字吗？怎么称呼你比较方便呢？\n\n---DATA---\n{}`;
    } else if (prompt.includes('性别')) {
      mockReply = `[🤖 模拟模式] 你好！那我们正式开始吧～\n\n先问个基础问题，你的性别是？\n\n---DATA---\n{}`;
    } else if (prompt.includes('年龄') || prompt.includes('出生')) {
      mockReply = `[🤖 模拟模式] 了解了～那你的出生年份是？这样我可以知道你的年龄范围。\n\n---DATA---\n{}`;
    } else if (prompt.includes('城市')) {
      mockReply = `[🤖 模拟模式] 好的！那你现在在哪个城市生活呢？\n\n---DATA---\n{}`;
    } else if (prompt.includes('职业')) {
      mockReply = `[🤖 模拟模式] 了解～方便说一下你的职业吗？\n\n---DATA---\n{}`;
    } else if (prompt.includes('学历')) {
      mockReply = `[🤖 模拟模式] 好的！你的学历是什么？\n\n---DATA---\n{}`;
    } else if (prompt.includes('异地')) {
      mockReply = `[🤖 模拟模式] 那我们聊一个比较实际的问题～\n\n对于感情中的距离，你能接受异地恋吗？\n\n---DATA---\n{}`;
    } else if (prompt.includes('年龄差')) {
      mockReply = `[🤖 模拟模式] 了解了！那你能接受的年龄差范围是多少呢？比如大几岁或小几岁？\n\n---DATA---\n{}`;
    } else if (prompt.includes('兴趣') || prompt.includes('爱好')) {
      mockReply = `[🤖 模拟模式] 哈哈，那我们聊聊你的兴趣爱好～\n\n平时工作之余，你都喜欢做些什么来放松自己呢？\n\n---DATA---\n{\n  "hobbies": {\n    "type": "待补充"\n  }\n}`;
    } else if (prompt.includes('周末')) {
      mockReply = `[🤖 模拟模式] 了解了！那你的周末一般是怎么安排的呢？\n\n---DATA---\n{}`;
    } else if (prompt.includes('消费') || prompt.includes('花钱')) {
      mockReply = `[🤖 模拟模式] 我们来聊聊消费观念～\n\n你觉得自己是偏节俭型还是享受型呢？\n\n---DATA---\n{}`;
    } else {
      mockReply = `[🤖 模拟模式] 嗯嗯，这个话题挺有意思的～\n\n可以多跟我聊聊你的想法吗？\n\n---DATA---\n{}`;
    }
    
    return NextResponse.json({ success: true, reply: mockReply });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
