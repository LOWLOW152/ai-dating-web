-- ==========================================
-- 人格特质管理表（可配置）
-- ==========================================

-- 特质主表
CREATE TABLE IF NOT EXISTS personality_traits (
  id SERIAL PRIMARY KEY,
  trait_key VARCHAR(50) UNIQUE NOT NULL,    -- 英文标识：humor/rational/sensitive...
  trait_name VARCHAR(50) NOT NULL,          -- 中文名：幽默有趣/理性冷静...
  emoji VARCHAR(10) NOT NULL DEFAULT '',    -- 图标：🎭/🧠/💝...
  description TEXT,                         -- 特质详细描述
  self_label TEXT NOT NULL,                 -- 自评选项文本
  partner_label TEXT NOT NULL,              -- 偏好选项文本
  color VARCHAR(20) DEFAULT '#07c160',      -- UI颜色
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 印证题配置表
CREATE TABLE IF NOT EXISTS trait_verify_questions (
  id SERIAL PRIMARY KEY,
  trait_key VARCHAR(50) REFERENCES personality_traits(trait_key) ON DELETE CASCADE,
  question_text TEXT NOT NULL,              -- 题目内容
  ai_prompt TEXT,                           -- AI打分提示词
  scoring_criteria JSONB,                   -- 评分标准配置
  min_score INT DEFAULT 0,                  -- 最低分
  max_score INT DEFAULT 10,                 -- 最高分
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户验证结果表
CREATE TABLE IF NOT EXISTS user_trait_verifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,                    -- 用户ID（邀请码）
  trait_key VARCHAR(50) REFERENCES personality_traits(trait_key),
  question_id INT REFERENCES trait_verify_questions(id),
  self_claimed BOOLEAN DEFAULT false,       -- 是否自评勾选
  user_answer TEXT,                         -- 用户回答
  ai_score DECIMAL(3,1),                    -- AI打分
  ai_reason TEXT,                           -- AI评分理由
  ai_confidence VARCHAR(10),                -- high/medium/low
  consistency VARCHAR(20),                  -- 一致/存疑/反差
  verified_at TIMESTAMP,                    -- 验证时间
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 初始化数据（6个基础特质）
-- ==========================================

INSERT INTO personality_traits (trait_key, trait_name, emoji, description, self_label, partner_label, color)
VALUES 
  ('humor', '幽默有趣', '🎭', '擅长活跃气氛，能逗人笑，有自嘲精神', '幽默有趣 - 擅长活跃气氛，能逗人笑', '幽默有趣 - 能逗我笑，生活不无聊', '#ff9800'),
  ('rational', '理性冷静', '🧠', '遇事分析利弊，不被情绪带跑，逻辑清晰', '理性冷静 - 遇事分析利弊，不被情绪带跑', '理性冷静 - 遇事不慌，能帮我分析', '#2196f3'),
  ('sensitive', '细腻敏感', '💝', '能察觉情绪变化，共情能力强，会照顾人', '细腻敏感 - 能察觉情绪变化，共情能力强', '细腻敏感 - 懂我的情绪，会照顾我感受', '#e91e63'),
  ('independent', '独立自我', '🦅', '有自己的世界，不黏人，尊重彼此空间', '独立自我 - 有自己的世界，不黏人', '独立有空间 - 各自有生活，不会黏太紧', '#607d8b'),
  ('adventurous', '爱冒险', '🎢', '喜欢新鲜刺激，不怕不确定性，敢于尝试', '爱冒险 - 喜欢新鲜刺激，不怕不确定性', '爱冒险 - 愿意尝试新鲜事物，生活有惊喜', '#9c27b0'),
  ('steady', '稳重踏实', '🛡️', '靠谱、有计划、让人安心，值得信赖', '稳重踏实 - 靠谱、有计划、让人安心', '稳重踏实 - 靠谱、有计划、让我安心', '#4caf50')
ON CONFLICT (trait_key) DO NOTHING;

-- ==========================================
-- 初始化印证题（6道）
-- ==========================================

INSERT INTO trait_verify_questions (trait_key, question_text, ai_prompt, scoring_criteria, display_order)
VALUES 
  (
    'humor',
    '假设你在相亲现场，对方不小心把饮料洒在自己身上了，场面有点尴尬。你会怎么化解？',
    '你是人格测评专家。请分析用户的回答，判断其幽默程度。评分标准：10分=双关/意外转折/自嘲，让人会心一笑；7-9分=试图幽默，有巧思；4-6分=常规回应；0-3分=严肃回应。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "双关/意外转折/自嘲", "good": "试图幽默，有巧思", "average": "常规回应", "poor": "严肃回应"}'::jsonb,
    1
  ),
  (
    'rational',
    '朋友想辞职创业，找你聊。他从没创过业，但觉得"再不试就老了"。你会怎么回应？',
    '你是人格测评专家。请分析用户的回答，判断其理性程度。评分标准：10分=结构化分析利弊、风险、给出数据或步骤；7-9分=有道理但情绪化；4-6分=简单支持或反对；0-3分=完全感性。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "结构化分析利弊、风险", "good": "有道理但情绪化", "average": "简单支持或反对", "poor": "完全感性"}'::jsonb,
    2
  ),
  (
    'sensitive',
    '伴侣今天回家，话比平时少，问你"晚饭吃什么"的时候也没什么精神。你会注意到什么？会怎么做？',
    '你是人格测评专家。请分析用户的回答，判断其细腻程度。评分标准：10分=察觉细节变化、询问原因、提供情绪支持；7-9分=注意到异常但处理粗糙；4-6分=有察觉但优先解决问题；0-3分=完全没察觉。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "察觉细节、询问原因、提供情绪支持", "good": "注意到异常但处理粗糙", "average": "有察觉但优先解决问题", "poor": "完全没察觉"}'::jsonb,
    3
  ),
  (
    'independent',
    '交往半年后，对方说"周末我想各自安排，不用每次都一起"。你的第一反应是？',
    '你是人格测评专家。请分析用户的回答，判断其独立程度。评分标准：10分=表示理解、支持空间、不焦虑；7-9分=理解但有点小失落；4-6分=勉强接受想说服对方；0-3分=抗拒、觉得被冷落。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "表示理解、支持空间、不焦虑", "good": "理解但有点小失落", "average": "勉强接受想说服对方", "poor": "抗拒、觉得被冷落"}'::jsonb,
    4
  ),
  (
    'adventurous',
    '假如有个机会：去一个完全陌生的城市生活一年，工作未知、朋友没有，但可能有意想不到的收获。你会怎么考虑？',
    '你是人格测评专家。请分析用户的回答，判断其冒险程度。评分标准：10分=积极考虑、列出可能性、愿意承担风险；7-9分=纠结但最终倾向尝试；4-6分=犹豫、有条件接受；0-3分=直接拒绝、强调风险。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "积极考虑、列出可能性、愿意承担风险", "good": "纠结但最终倾向尝试", "average": "犹豫、有条件接受", "poor": "直接拒绝、强调风险"}'::jsonb,
    5
  ),
  (
    'steady',
    '你俩存了一笔钱打算明年旅行，但对方突然看中一款限量包/鞋，想挪用这笔钱。你会怎么处理？',
    '你是人格测评专家。请分析用户的回答，判断其稳重程度。评分标准：10分=强调计划、责任、延迟满足、协商替代方案；7-9分=犹豫但最终坚持原则；4-6分=被说服或妥协；0-3分=直接同意挪用。请输出JSON格式：{"score": 数字, "reason": "评分理由", "evidence": "引用原句"}',
    '{"excellent": "强调计划、责任、延迟满足", "good": "犹豫但最终坚持原则", "average": "被说服或妥协", "poor": "直接同意挪用"}'::jsonb,
    6
  )
ON CONFLICT DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_trait_verifications_user_id ON user_trait_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trait_verifications_trait_key ON user_trait_verifications(trait_key);
