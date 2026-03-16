# AI 对话式问卷采集方案

## 核心概念

**传统方式**：给用户一份问卷 → 用户逐一填写 → 枯燥、像考试

**AI访谈方式**：AI以聊天方式闲聊 → 在对话中自然获取信息 → 收集完成后后台已填好问卷

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Interviewer Agent                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  信息采集器   │◄──►│  对话生成器   │◄──►│  缺失分析器   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│          ▲                                      │           │
│          └──────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                         状态存储                             │
│  { nickname: "小王", gender: null, hobby_type: ["旅行"] }    │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键技术点

### 1. 信息提取（Extraction）

每次用户回复后，AI分析这段话里包含了哪些问卷字段的信息：

**示例**：
```
用户："我平时周末喜欢去爬山，偶尔也看看电影"

AI提取：
- hobby_type: ["户外运动", "影视娱乐"] ✓
- 其他字段：未提及
```

**实现方式**：
- 使用 Kimi 的 JSON Mode / Function Calling
- 或 Prompt 工程 + 正则兜底

```javascript
// API 设计
POST /api/interview/extract
{
  "userMessage": "我平时周末喜欢去爬山...",
  "targetFields": ["hobby_type", "sleep_schedule", "city"],
  "currentAnswers": { "nickname": "小王" }
}

返回：
{
  "extracted": {
    "hobby_type": ["户外运动", "影视娱乐"]
  },
  "confidence": 0.92
}
```

### 2. 缺失分析（Gap Analysis）

哪些必要信息还没收集到？

```javascript
const requiredFields = [
  { key: 'nickname', priority: 'high' },
  { key: 'gender', priority: 'high' },
  { key: 'hobby_type', priority: 'medium' },
  { key: 'core_need', priority: 'low' }  // 深度题，最后问
];

// 当前已收集
const current = { nickname: "小王", hobby_type: ["旅行"] };

// 缺失字段
const missing = ['gender', 'core_need', ...];
```

### 3. 话题引导（Topic Steering）

根据缺失字段，AI决定下一轮聊什么：

```
当前缺失：gender（高优先级）

AI策略：
- 不生硬问"你性别是？"
- 而是说："朋友一般怎么评价你？"
- 或分享一个性别相关话题引出

如果用户还没说性别，下一轮继续找机会引导
```

### 4. 对话流程控制

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│ 开场闲聊 │────►│ 第一轮：基础  │────►│ 第二轮：兴趣  │
└─────────┘     │ 信息收集     │     │ 生活方式     │
                └──────────────┘     └──────┬───────┘
                                            │
                              ┌─────────────▼───────┐
                              │ 第三轮：深度情感     │
                              │ (前面铺垫够了再问)   │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │ 完成：生成档案       │
                              └─────────────────────┘
```

---

## 数据结构

### 访谈会话表
```sql
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,                    -- 匿名用户用 session id
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- 已收集的答案（JSON）
  collected_answers JSONB DEFAULT '{}',
  
  -- AI内部状态
  ai_state JSONB DEFAULT '{
    "currentTopic": "opening",
    "missingFields": [],
    "conversationDepth": 0,
    "userEngagement": "high"
  }',
  
  -- 完整对话记录
  messages JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 问卷字段配置（扩展现有questions表）
```sql
-- 新增字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS 
  extraction_prompt TEXT;  -- 如何从对话中提取此字段的Prompt

ALTER TABLE questions ADD COLUMN IF NOT EXISTS
  natural_triggers TEXT[]; -- 自然触发词，如["平时喜欢","周末","爱好"]
```

---

## 核心API设计

### 1. 发送消息
```javascript
POST /api/interview/chat
{
  "sessionId": "xxx",
  "message": "用户说的话"
}

返回：
{
  "aiReply": "AI回复",
  "extractedInfo": { /* 本次提取到的信息 */ },
  "progress": {
    "collected": 12,
    "total": 21,
    "percentage": 57
  },
  "sessionComplete": false
}
```

### 2. 获取访谈状态
```javascript
GET /api/interview/session/:id

返回：
{
  "collectedAnswers": { /* 当前已收集 */ },
  "missingFields": ["gender", "core_need"],
  "suggestedTopics": ["聊聊你的朋友圈", "平时工作累吗"],
  "estimatedQuestionsRemaining": 3
}
```

### 3. 强制确认（兜底机制）

如果AI聊了好几轮还是漏掉了某个必填字段，自动切换到直接询问模式：

```
AI: "对了，还没问你呢，方便说下你是男生还是女生吗？"
```

---

## Prompt 设计

### 系统Prompt框架

```
你是狗蛋，一个专业的相亲顾问AI。

当前任务：通过自然对话帮用户填写相亲档案。

【已收集信息】
{{collected_answers}}

【还需收集】
{{missing_fields}}

【本轮策略】
{{strategy}}  // 如：聊兴趣爱好，顺便问问作息

【规则】
1. 不要一次问太多问题，像正常聊天
2. 用户提到信息时，记下来即可，不必重复确认
3. 高优先级缺失字段优先引导
4. 深度题（core_need等）不要开场就问，等聊熟了
5. 如果用户不想回答某题，尊重并跳过

【回复格式】
- 正常回复用户的聊天内容
- 保持温暖、幽默的语气
- 必要时自然地把话题引向缺失的信息
```

### 信息提取Prompt示例

```
分析用户这段话，提取以下字段：
{{target_fields}}

当前已收集：{{current_answers}}

用户输入："{{user_message}}"

请返回JSON格式：
{
  "extracted": {
    "field_name": "提取的值"
  },
  "confidence": 0-1,
  "reasoning": "为什么这样提取"
}
```

---

## 集成到现有系统

### 方案A：完全替换现有问卷（推荐）
- 新用户默认进入AI访谈模式
- 老用户可选择传统问卷或AI访谈
- 最终都生成相同的档案格式

### 方案B：并行存在
- 保留现有21题问卷
- 新增"/interview"入口进入AI访谈
- 两套系统数据互通

### 数据兼容
AI访谈收集的答案，直接存入现有 `profiles` 表，格式保持一致。

---

## 成本估算

| 环节 | 每次访谈调用次数 | 单次成本 | 总成本 |
|------|-----------------|---------|--------|
| 信息提取 | ~10-15轮 | ¥0.003 | ¥0.03-0.05 |
| 对话生成 | ~10-15轮 | ¥0.005 | ¥0.05-0.075 |
| **总计** | | | **~¥0.1/人** |

---

## 实现优先级

1. **第一阶段**：基础信息采集（昵称、性别、城市等）
2. **第二阶段**：兴趣生活方式（hobby_type, sleep_schedule等）
3. **第三阶段**：深度情感（core_need, deal_breakers等，需要更多轮对话铺垫）

---

## 待讨论问题

1. 访谈时长控制在多久合适？（建议5-10分钟 vs 现有问卷3-5分钟）
2. 是否允许用户随时查看"已收集了哪些信息"？
3. AI追问次数上限？避免一直问同一个字段让用户烦
4. 是否接入TTS让AI"打电话"访谈？（更像真人聊天）
