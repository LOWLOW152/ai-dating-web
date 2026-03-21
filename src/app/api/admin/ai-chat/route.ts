import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 模拟AI回复，根据配置生成追问
function generateMockReply(messages: ChatMessage[]): string {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
  
  // 解析系统提示词中的配置
  const prompt = systemMsg?.content || '';
  
  // 提取层级配置
  const hierarchyMatch = prompt.match(/【追问层级参考】([\s\S]*?)(?=\n\n|$)/);
  const hierarchy = hierarchyMatch ? hierarchyMatch[1] : '';
  
  // 提取语气配置
  const isGentle = prompt.includes('温柔亲切');
  const isPlayful = prompt.includes('活泼俏皮');
  const isProfessional = prompt.includes('沉稳专业');
  // const isNeutral = prompt.includes('理性中立');
  
  // 提取深度配置 (后续扩展用)
  // const isDeep = prompt.includes('打破砂锅');
  // const isShallow = prompt.includes('浅尝辄止');
  
  // 提取敏感度 (后续扩展用)
  // const isHighSensitivity = prompt.includes('都要追问到底');
  
  // 分析用户回答处于哪个层级
  const lines = hierarchy.split('\n').filter(l => l.trim());
  const userAnswer = lastUserMsg.toLowerCase();
  
  // 找到匹配的层级
  let currentLevel = 0;
  let matchedCategory = '';
  const nextLevelOptions: string[] = [];
  
  for (const line of lines) {
    const match = line.match(/第(\d+)层:\s*(.+)/);
    if (match) {
      const level = parseInt(match[1]);
      const label = match[2].trim();
      
      if (userAnswer.includes(label.toLowerCase()) || 
          label.toLowerCase().includes(userAnswer)) {
        currentLevel = level;
        matchedCategory = label;
      }
      
      // 收集下一层的选项
      if (level === currentLevel + 1 && currentLevel > 0) {
        nextLevelOptions.push(label);
      }
    }
  }
  
  // 如果只有1层或没配置层级，简单追问
  if (lines.length === 0 || currentLevel === 0) {
    if (isGentle) {
      return `太棒了！喜欢${lastUserMsg}的人很有品味呢～可以具体说说是什么类型的${lastUserMsg}吗？`;
    } else if (isPlayful) {
      return `哇！${lastUserMsg}！快展开说说，具体是哪种？`;
    } else if (isProfessional) {
      return `了解。请进一步说明${lastUserMsg}的具体类型或偏好。`;
    } else {
      return `收到。${lastUserMsg}具体指什么类型？`;
    }
  }
  
  // 根据层级生成追问
  if (nextLevelOptions.length > 0) {
    const options = nextLevelOptions.slice(0, 3).join('、');
    
    if (isGentle) {
      return `太棒了！喜欢${matchedCategory}的人很有活力呢～具体是${options}哪一种呀？`;
    } else if (isPlayful) {
      return `哟！${matchedCategory}系！快说快说，${options}喜欢哪个？`;
    } else if (isProfessional) {
      return `${matchedCategory}涉及多个细分领域。请明确：${options}？`;
    } else {
      return `${matchedCategory}具体类型：${options}？`;
    }
  }
  
  // 已经到最深层，确认或换角度
  if (isGentle) {
    return `原来如此～${lastUserMsg}确实很棒！还有其他喜欢的吗？`;
  } else if (isPlayful) {
    return `get到了！还有啥别的爱好不？`;
  } else if (isProfessional) {
    return `已记录。是否还有其他${matchedCategory}相关偏好？`;
  } else {
    return `了解。还有其他补充吗？`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, prompt, message } = body;

    const apiKey = process.env.MOONSHOT_API_KEY;
    
    // 如果有API Key，调用真实的Kimi
    if (apiKey) {
      try {
        let chatMessages;
        
        if (prompt) {
          // 新格式：直接传入完整prompt
          chatMessages = [
            { role: 'system', content: prompt },
            ...(message ? [{ role: 'user', content: message }] : [{ role: 'user', content: '开始' }]),
          ];
        } else if (messages && Array.isArray(messages)) {
          // 旧格式：messages数组
          chatMessages = messages;
        } else {
          return NextResponse.json({ success: false, error: '缺少消息或提示词' }, { status: 400 });
        }

        const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'moonshot-v1-8k',
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content || 'AI没有回应';
          return NextResponse.json({ success: true, reply });
        }
      } catch (err) {
        console.log('Kimi API failed:', err);
      }
    }

    // 模拟模式
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (prompt) {
      // 检测当前题目类型，返回不同的模拟回复
      let mockReply = '';
      
      if (prompt.includes('昵称') || prompt.includes('名字')) {
        mockReply = `你好呀～很高兴认识你！我是狗蛋😊\n\n可以先告诉我你的名字吗？怎么称呼你比较方便呢？\n\n---DATA---\n{}`;
      } else if (prompt.includes('兴趣爱好') || prompt.includes('hobbies')) {
        mockReply = `哈哈，那我们可以聊聊你的兴趣爱好～\n\n平时工作之余，你都喜欢做些什么来放松自己呢？\n\n---DATA---\n{\n  "hobbies": {\n    "type": "待补充"\n  }\n}`;
      } else if (prompt.includes('异地')) {
        mockReply = `好的，那我们聊一个比较实际的问题～\n\n对于感情中的距离，你是怎么看的呢？如果对方在外地，你能接受异地恋吗？\n\n---DATA---\n{}`;
      } else {
        mockReply = `嗯嗯，这个话题挺有意思的～\n\n可以多跟我聊聊你的想法吗？\n\n---DATA---\n{}`;
      }
      
      return NextResponse.json({ success: true, reply: mockReply });
    }
    
    // 旧格式的模拟回复
    const reply = generateMockReply(messages || []);
    return NextResponse.json({ success: true, reply });
    
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}