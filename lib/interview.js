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

// 验证提取的数据是否合理
function validateExtracted(field, value, message) {
  const issues = [];
  
  if (field === 'nickname') {
    // 昵称验证
    if (value.length > 8) {
      issues.push('昵称过长，可能是句子不是名字');
    }
    if (/[是叫的]/.test(value) && value.length <= 2) {
      issues.push('可能提取到了助词而不是名字');
    }
    // 常见无意义回答
    const meaningless = ['不知道', '随便', '都行', '你猜', '秘密'];
    if (meaningless.includes(value)) {
      issues.push('回答可能不够认真');
    }
    // 明显乱答：纯数字、纯符号
    if (/^[\d]+$/.test(value)) {
      issues.push('昵称是纯数字，可能是乱答');
    }
  }
  
  if (field === 'gender') {
    // 性别通常是明确的
    if (!['男', '女'].includes(value)) {
      issues.push('性别识别异常');
    }
  }
  
  if (field === 'city') {
    // 城市验证
    const suspiciousCities = ['地球', '中国', '亚洲', '不知道', '秘密', '无可奉告'];
    if (suspiciousCities.includes(value)) {
      issues.push('城市回答可疑');
    }
    if (value.length > 6) {
      issues.push('城市名过长');
    }
    // 检查是否是真实城市（简单检查）
    const realCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '天津', '苏州', '长沙', '郑州', '青岛', '大连', '厦门', '宁波', '无锡', '佛山', '东莞', '昆明', '沈阳', '济南', '哈尔滨', '长春', '石家庄', '太原', '合肥', '南昌', '福州', '南宁', '贵阳', '兰州', '海口', '乌鲁木齐', '拉萨', '银川', '西宁', '呼和浩特'];
    if (!realCities.includes(value) && value.length >= 2) {
      // 不是常见城市，置信度降低但不一定是错的
      issues.push('非标准城市名，需确认');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    confidence: issues.length === 0 ? 0.9 : (issues.some(i => i.includes('乱答') || i.includes('可疑')) ? 0.3 : 0.6)
  };
}

// 生成AI的思考过程（给用户看）
function generateThinkingProcess(extracted, validation, field) {
  if (Object.keys(extracted).length === 0) {
    return null;
  }
  
  const value = extracted[field];
  const thoughts = [];
  
  if (field === 'nickname') {
    thoughts.push(`从「${value}」推测是你的昵称`);
    if (validation.confidence < 0.7) {
      thoughts.push(`但不太确定，想跟你确认一下`);
    }
  }
  
  if (field === 'gender') {
    thoughts.push(`识别到你是${value}生`);
  }
  
  if (field === 'city') {
    thoughts.push(`推测你在${value}`);
    if (validation.issues.some(i => i.includes('非标准'))) {
      thoughts.push(`不太确定这个城市，方便确认下吗？`);
    }
  }
  
  return thoughts.join('，');
}

// 从对话中提取信息（核心逻辑）
export async function extractInfoFromMessage(message, targetFields, currentAnswers) {
  // 简单的规则提取 + AI兜底
  const extracted = {};
  const validations = {};
  const thoughts = {};
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
          validations.nickname = validateExtracted('nickname', filtered, message);
          thoughts.nickname = generateThinkingProcess(extracted, validations.nickname, 'nickname');
          break;
        }
      }
    }
  }
  
  if (targetFields.includes('gender')) {
    if (/我[是]?男生?|男的/.test(message)) {
      extracted.gender = '男';
      validations.gender = validateExtracted('gender', '男', message);
      thoughts.gender = generateThinkingProcess(extracted, validations.gender, 'gender');
    }
    else if (/我[是]?女生?|女的/.test(message)) {
      extracted.gender = '女';
      validations.gender = validateExtracted('gender', '女', message);
      thoughts.gender = generateThinkingProcess(extracted, validations.gender, 'gender');
    }
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
          validations.city = validateExtracted('city', city, message);
          thoughts.city = generateThinkingProcess(extracted, validations.city, 'city');
          break;
        }
      }
    }
  }
  
  // 计算整体置信度
  const allValidations = Object.values(validations);
  const avgConfidence = allValidations.length > 0 
    ? allValidations.reduce((sum, v) => sum + v.confidence, 0) / allValidations.length 
    : 0;
  
  // 检查是否有严重问题（乱答）
  const hasSeriousIssue = allValidations.some(v => 
    v.issues.some(i => i.includes('乱答') || i.includes('可疑') || i.includes('不够认真'))
  );
  
  return {
    extracted,
    validations,
    thoughts,
    method: Object.keys(extracted).length > 0 ? 'rule' : 'none',
    confidence: avgConfidence,
    needsConfirmation: avgConfidence < 0.7 || hasSeriousIssue,
    hasSeriousIssue
  };
}

// 生成AI回复
export function generateAIReply(collected, missing, message, depth, extractionResult = null, pendingConfirm = null) {
  const collectedCount = Object.keys(collected).length;
  
  // 开场
  if (depth === 0) {
    return {
      reply: "哈喽～我是狗蛋 🐶\n\n咱们随便聊聊，像朋友一样～ 怎么称呼你？",
      topic: "opening",
      thinking: null
    };
  }
  
  // 有待确认的信息
  if (pendingConfirm) {
    const { field, value, thought, hasIssue } = pendingConfirm;
    
    if (hasIssue) {
      // 检测到可疑回答
      return {
        reply: pickOne([
          `等等，「${value}」是你的${field === 'nickname' ? '昵称' : field === 'city' ? '城市' : '回答'}吗？感觉有点像乱答哦 😂 认真的说一下呗～`,
          `你确定是「${value}」吗？我怎么觉得有点奇怪 🤔 要不重新说？`,
        ]),
        topic: `confirm_${field}`,
        thinking: `检测到可疑回答：${value}，要求重新回答`,
        isConfirm: true
      };
    }
    
    // 正常确认
    if (field === 'nickname') {
      return {
        reply: pickOne([
          `${thought}～对吗？`,
          `那我叫你${value}可以吗？`,
        ]),
        topic: `confirm_${field}`,
        thinking: thought,
        isConfirm: true
      };
    }
    
    if (field === 'city') {
      return {
        reply: pickOne([
          `${thought}～对吗？`,
          `你现在在${value}对吧？`,
        ]),
        topic: `confirm_${field}`,
        thinking: thought,
        isConfirm: true
      };
    }
    
    return {
      reply: `${thought}～确认一下对吗？`,
      topic: `confirm_${field}`,
      thinking: thought,
      isConfirm: true
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
      topic: "nickname",
      thinking: null
    };
  }
  
  if (missing.includes('gender')) {
    // 有了昵称，问性别（自然过渡）
    if (message.length > 3 && !collected.nickname) {
      // 用户说了很多，可能包含昵称
      return {
        reply: `好的～对了，你是男生还是女生？`,
        topic: "gender",
        thinking: null
      };
    }
    return {
      reply: pickOne([
        `好的${collected.nickname ? '，' + collected.nickname : ''}～你是男生还是女生？`,
        `收到～方便说下你是男生女生吗？`,
      ]),
      topic: "gender",
      thinking: null
    };
  }
  
  if (missing.includes('city')) {
    return {
      reply: pickOne([
        `你现在在哪个城市？`,
        `方便问问你现在住哪里吗？`,
        `你是在哪个城市呀？`,
      ]),
      topic: "city",
      thinking: null
    };
  }
  
  // 都收集完了
  return {
    reply: `太棒了！基本信息都收集好了～\n\n📋 你的档案：\n- 昵称：${collected.nickname}\n- 性别：${collected.gender}\n- 城市：${collected.city}\n\n要不要继续聊聊你的兴趣爱好？`,
    topic: "complete",
    complete: true,
    thinking: null
  };
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
