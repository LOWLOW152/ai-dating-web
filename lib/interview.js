// AI访谈会话管理
import { sql } from '@vercel/postgres';

// 创建新会话
export async function createInterviewSession() {
  const result = await sql`
    INSERT INTO interview_sessions (status, collected_answers, ai_state, messages)
    VALUES ('active', '{}', '{"currentTopic": "opening", "missingFields": ["nickname", "gender", "city"], "conversationDepth": 0}'::jsonb, '[]'::jsonb)
    RETURNING id, collected_answers, ai_state
  `;
  return result.rows[0];
}

// 获取会话
export async function getSession(sessionId) {
  const result = await sql`
    SELECT * FROM interview_sessions WHERE id = ${sessionId}
  `;
  return result.rows[0];
}

// 更新会话
export async function updateSession(sessionId, updates) {
  const { collected_answers, ai_state, messages, status } = updates;
  
  const result = await sql`
    UPDATE interview_sessions 
    SET 
      collected_answers = COALESCE(${collected_answers ? JSON.stringify(collected_answers) : null}::jsonb, collected_answers),
      ai_state = COALESCE(${ai_state ? JSON.stringify(ai_state) : null}::jsonb, ai_state),
      messages = COALESCE(${messages ? JSON.stringify(messages) : null}::jsonb, messages),
      status = COALESCE(${status}, status),
      updated_at = NOW()
    WHERE id = ${sessionId}
    RETURNING *
  `;
  return result.rows[0];
}

// 从对话中提取信息（核心逻辑）
export async function extractInfoFromMessage(message, targetFields, currentAnswers) {
  // 简单的规则提取 + AI兜底
  const extracted = {};
  const lowerMsg = message.toLowerCase();
  
  // 1. 规则匹配提取
  if (targetFields.includes('nickname')) {
    // 常见自我介绍模式
    const patterns = [
      /我叫(\S{1,10})/,
      /我是(\S{1,10})/,
      /昵称[是为:]?(\S{1,10})/,
      /小?名[字]?[叫是]?\s*(\S{1,10})/,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length >= 1) {
        // 过滤掉常见动词
        const filtered = match[1].replace(/^(叫|是|的|了)$/g, '');
        if (filtered.length > 0) {
          extracted.nickname = filtered;
          break;
        }
      }
    }
  }
  
  if (targetFields.includes('gender')) {
    if (/我[是]?男生?|男的/.test(message)) extracted.gender = '男';
    else if (/我[是]?女生?|女的/.test(message)) extracted.gender = '女';
  }
  
  if (targetFields.includes('city')) {
    // 简单城市提取
    const cityPatterns = [
      /在(\S{2,8})[市]?[上]?工作/,
      /住在(\S{2,8})/,
      /来自(\S{2,8})/,
      /是(\S{2,8})人/,
      /在(\S{2,8})[市]?/, 
      /(\S{2,8})[市]?土著/,
      /(\S{2,8})[市]?本地人/,
    ];
    for (const pattern of cityPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const city = match[1].replace(/[市区]$/, '');
        if (city.length >= 2 && !['这里', '那边', '外地', '国外'].includes(city)) {
          extracted.city = city;
          break;
        }
      }
    }
  }
  
  return {
    extracted,
    method: Object.keys(extracted).length > 0 ? 'rule' : 'none',
    confidence: Object.keys(extracted).length > 0 ? 0.8 : 0
  };
}

// 生成AI回复
export function generateAIReply(collected, missing, message, depth) {
  const collectedCount = Object.keys(collected).length;
  
  // 开场
  if (depth === 0) {
    return {
      reply: "哈喽～我是狗蛋 🐶\n\n咱们随便聊聊，像朋友一样～ 怎么称呼你？",
      topic: "opening"
    };
  }
  
  // 根据缺失字段决定聊什么
  if (missing.includes('nickname') && collectedCount === 0) {
    // 还没问到昵称，继续引导
    return {
      reply: pickOne([
        "方便告诉我怎么称呼你吗？",
        "想让我怎么叫你？",
        "你的昵称是？"
      ]),
      topic: "nickname"
    };
  }
  
  if (missing.includes('gender')) {
    // 有了昵称，问性别（自然过渡）
    if (message.length > 3 && !collected.nickname) {
      // 用户说了很多，可能包含昵称
      return {
        reply: `好的～对了，你是男生还是女生？`,
        topic: "gender"
      };
    }
    return {
      reply: pickOne([
        `好的${collected.nickname ? '，' + collected.nickname : ''}～你是男生还是女生？`,
        `收到～方便说下你是男生女生吗？`,
      ]),
      topic: "gender"
    };
  }
  
  if (missing.includes('city')) {
    return {
      reply: pickOne([
        `你现在在哪个城市？`,
        `方便问问你现在住哪里吗？`,
        `你是在哪个城市呀？`,
      ]),
      topic: "city"
    };
  }
  
  // 都收集完了
  return {
    reply: `太棒了！基本信息都收集好了～\n\n📋 你的档案：\n- 昵称：${collected.nickname}\n- 性别：${collected.gender}\n- 城市：${collected.city}\n\n要不要继续聊聊你的兴趣爱好？`,
    topic: "complete",
    complete: true
  };
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
