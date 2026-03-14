-- ==========================================
-- 人格自评-印证-偏好 题目设计（方案A：精准验证）
-- ==========================================
-- 
-- 流程：
-- 1. 自身性格多选题（选2-4个特质）
-- 2. 根据选择，动态展示对应的印证题（1-4道）
-- 3. 偏好多选题
--
-- 前端逻辑：
-- - 记录 self_traits 的选择（如：["humor", "rational"]）
-- - 根据映射表，按顺序出对应的 verify_xxx 题
-- - 全部印证题答完后，出 partner_traits
-- ==========================================

-- ==========================================
-- 第一题：自身性格多选题
-- ==========================================

INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'self_traits',
  '用几个词形容自己，你觉得你主要是？（选2-4个）',
  'checkbox',
  'personality',
  4,
  '[
    {"value": "humor", "label": "🎭 幽默有趣 - 擅长活跃气氛，能逗人笑"},
    {"value": "rational", "label": "🧠 理性冷静 - 遇事分析利弊，不被情绪带跑"},
    {"value": "sensitive", "label": "💝 细腻敏感 - 能察觉情绪变化，共情能力强"},
    {"value": "independent", "label": "🦅 独立自我 - 有自己的世界，不黏人"},
    {"value": "adventurous", "label": "🎢 爱冒险 - 喜欢新鲜刺激，不怕不确定性"},
    {"value": "steady", "label": "🛡️ 稳重踏实 - 靠谱、有计划、让人安心"}
  ]'::jsonb,
  20,
  'traits_self',
  null,
  'auto'
);

-- ==========================================
-- 第二组：印证题（6道，根据self_traits选择动态展示）
-- 映射关系：self_traits.value -> verify_question_key
-- ==========================================

-- 2.1 幽默印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_humor',
  '假设你在相亲现场，对方不小心把饮料洒在自己身上了，场面有点尴尬。你会怎么化解？',
  'text',
  'personality',
  4,
  null,
  21,
  'traits_verify',
  null,
  'semi',
  'humor'
);

-- 2.2 理性印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_rational',
  '朋友想辞职创业，找你聊。他从没创过业，但觉得"再不试就老了"。你会怎么回应？',
  'text',
  'personality',
  4,
  null,
  22,
  'traits_verify',
  null,
  'semi',
  'rational'
);

-- 2.3 细腻印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_sensitive',
  '伴侣今天回家，话比平时少，问你"晚饭吃什么"的时候也没什么精神。你会注意到什么？会怎么做？',
  'text',
  'personality',
  4,
  null,
  23,
  'traits_verify',
  null,
  'semi',
  'sensitive'
);

-- 2.4 独立印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_independent',
  '交往半年后，对方说"周末我想各自安排，不用每次都一起"。你的第一反应是？',
  'text',
  'personality',
  4,
  null,
  24,
  'traits_verify',
  null,
  'semi',
  'independent'
);

-- 2.5 冒险印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_adventurous',
  '假如有个机会：去一个完全陌生的城市生活一年，工作未知、朋友没有，但可能有意想不到的收获。你会怎么考虑？',
  'text',
  'personality',
  4,
  null,
  25,
  'traits_verify',
  null,
  'semi',
  'adventurous'
);

-- 2.6 稳重印证题
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type,
  verify_for_trait
) VALUES (
  'verify_steady',
  '你俩存了一笔钱打算明年旅行，但对方突然看中一款限量包/鞋，想挪用这笔钱。你会怎么处理？',
  'text',
  'personality',
  4,
  null,
  26,
  'traits_verify',
  null,
  'semi',
  'steady'
);

-- ==========================================
-- 第三题：偏好性格多选题
-- ==========================================

INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'partner_traits',
  '你希望对方身上有哪些特质？（选2-4个）',
  'checkbox',
  'personality',
  4,
  '[
    {"value": "humor", "label": "🎭 幽默有趣 - 能逗我笑，生活不无聊"},
    {"value": "rational", "label": "🧠 理性冷静 - 遇事不慌，能帮我分析"},
    {"value": "sensitive", "label": "💝 细腻敏感 - 懂我的情绪，会照顾我感受"},
    {"value": "independent", "label": "🦅 独立有空间 - 各自有生活，不会黏太紧"},
    {"value": "adventurous", "label": "🎢 爱冒险 - 愿意尝试新鲜事物，生活有惊喜"},
    {"value": "steady", "label": "🛡️ 稳重踏实 - 靠谱、有计划、让我安心"}
  ]'::jsonb,
  30,
  'traits_preference',
  'self_traits',
  'auto'
);

-- ==========================================
-- 前端逻辑说明（chat.js需要添加）
-- ==========================================

/*

// 1. 新增状态
const [selectedTraits, setSelectedTraits] = useState([]); // 用户选的特质
const [verifyQueue, setVerifyQueue] = useState([]); // 待验证的题队列
const [currentVerifyIndex, setCurrentVerifyIndex] = useState(0); // 当前验证题索引

// 2. 特质到印证题的映射
const traitVerifyMap = {
  humor: 'verify_humor',
  rational: 'verify_rational',
  sensitive: 'verify_sensitive',
  independent: 'verify_independent',
  adventurous: 'verify_adventurous',
  steady: 'verify_steady'
};

// 3. 处理self_traits答案时，生成验证队列
const handleSelfTraitsAnswer = (selectedValues) => {
  setSelectedTraits(selectedValues);
  
  // 根据选择生成验证题队列
  const queue = selectedValues.map(trait => traitVerifyMap[trait]).filter(Boolean);
  setVerifyQueue(queue);
  
  // 插入验证题到题目列表（在当前位置后插入）
  insertVerifyQuestions(queue);
};

// 4. AI打分后存储（每道验证题答完，调用豆包API打分）
const scoreVerifyAnswer = async (questionKey, answer) => {
  const trait = questionKey.replace('verify_', '');
  const score = await callDoubaoScoring(trait, answer);
  
  // 存储：{ trait: 'humor', selfClaimed: true, verifyScore: 8.5, answer: '...' }
  updateAnswers({ [`verify_${trait}_score`]: score });
};

// 5. 生成档案时，计算自评vs实测差异
const generateTraitReport = () => {
  const traits = ['humor', 'rational', 'sensitive', 'independent', 'adventurous', 'steady'];
  
  return traits.map(trait => {
    const selfClaimed = selectedTraits.includes(trait);
    const verifyScore = answers[`verify_${trait}_score`] || null;
    
    return {
      trait,
      selfClaimed,
      verifyScore,
      consistency: selfClaimed && verifyScore ? (verifyScore >= 6 ? '一致' : '存疑') : '未测'
    };
  });
};

*/

-- ==========================================
-- AI打分标准（豆包提示词用）
-- ==========================================

/*
【角色】你是人格测评专家，根据用户的回答判断其声称的特质是否属实。

【任务】对用户的回答进行0-10分评分，并给出理由。

【评分标准 - 幽默】
- 10分：双关/意外转折/自嘲，让人会心一笑，反应极快
- 7-9分：试图幽默，有巧思，但不够自然
- 4-6分：常规回应，试图缓解尴尬但不有趣
- 0-3分：严肃回应、说教、或无反应

【评分标准 - 理性】
- 10分：结构化分析利弊、风险、给出数据或步骤
- 7-9分：有道理，但情绪化表达夹杂
- 4-6分：简单支持或反对，理由单薄
- 0-3分：完全感性（"冲就完了"或"别想了"）

【评分标准 - 细腻】
- 10分：察觉细节变化、询问原因、提供情绪支持方案
- 7-9分：注意到异常，但处理方式较粗糙
- 4-6分：有察觉，但优先解决问题而非情绪
- 0-3分：完全没察觉或忽视情绪

【评分标准 - 独立】
- 10分：表示理解、支持空间、不焦虑、有边界意识
- 7-9分：理解但有点小失落
- 4-6分：勉强接受，想说服对方改变
- 0-3分：抗拒、觉得被冷落、不安全

【评分标准 - 冒险】
- 10分：积极考虑、列出可能性、愿意承担风险、兴奋
- 7-9分：纠结但最终倾向尝试
- 4-6分：犹豫、有条件接受、需要保障
- 0-3分：直接拒绝、强调风险、求稳

【评分标准 - 稳重】
- 10分：强调计划、责任、延迟满足、协商替代方案
- 7-9分：犹豫但最终坚持原则
- 4-6分：被说服或妥协
- 0-3分：直接同意挪用、无所谓

【输出格式】
{
  "score": 8,
  "reason": "用户用了自嘲的方式化解尴尬，符合幽默特质",
  "evidence": "引用回答中的具体句子",
  "confidence": "high" // high/medium/low
}
*/

-- ==========================================
-- 数据库存储建议
-- ==========================================

/*
建议新增表存储验证结果，方便后续分析：

CREATE TABLE trait_verifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  trait VARCHAR(50) NOT NULL, -- humor/rational/...
  self_claimed BOOLEAN NOT NULL,
  verify_question_key TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  ai_score DECIMAL(3,1), -- 0-10
  ai_reason TEXT,
  ai_confidence VARCHAR(10), -- high/medium/low
  consistency VARCHAR(20), -- 一致/存疑/未测
  created_at TIMESTAMP DEFAULT NOW()
);

-- 查询示例：找出自评与实测差异大的用户
SELECT user_id, trait, self_claimed, ai_score 
FROM trait_verifications 
WHERE self_claimed = true AND ai_score < 5;
*/
