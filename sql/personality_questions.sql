-- ==========================================
-- 人格确认题目（新增）
-- 分类: personality（人格特质）
-- 设计原则: 用场景提问，不自贴标签
-- ==========================================

-- 1. 能量来源探测（外向/内向）
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'energy_source',
  '连续工作一周后，周五晚上你更想怎么过？',
  'select',
  'personality',
  4,
  '[
    {"value": "party", "label": "约朋友聚会、喝酒、唱歌，人越多越解压"},
    {"value": "date", "label": "约一个人（暧昧对象或好友）深度聊天"},
    {"value": "alone", "label": "自己待着，看书/追剧/发呆，不想说话"},
    {"value": "move", "label": "独自运动、散步、骑车，用身体消耗压力"}
  ]'::jsonb,
  0,
  'energy',
  null,
  'auto'
);

-- 2. 能量来源偏好
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'energy_preference',
  '你希望对方是怎么给自己充电的类型？',
  'radio',
  'personality',
  4,
  '[
    {"value": "same", "label": "和我一样，这样节奏一致"},
    {"value": "social", "label": "外向型，能带动我社交"},
    {"value": "quiet", "label": "内向型，能陪我安静待着"},
    {"value": "flexible", "label": "无所谓，能互相尊重就行"}
  ]'::jsonb,
  1,
  'energy',
  'energy_source',
  'auto'
);

-- 3. 决策风格（思考/情感）
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'decision_style',
  '你和朋友约饭，他选了家新店结果很难吃。你会怎么做？',
  'select',
  'personality',
  4,
  '[
    {"value": "direct", "label": "直接说：这家不行，下次别来了"},
    {"value": "hint", "label": "委婉暗示：下次可以试试XX家"},
    {"value": "endure", "label": "不说，怕伤感情，自己默默吃完"},
    {"value": "joke", "label": "开玩笑带过：咱俩今天运气爆炸了"}
  ]'::jsonb,
  5,
  'decision',
  null,
  'auto'
);

-- 4. 决策风格偏好
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'decision_preference',
  '你希望对方在关系里是哪种沟通风格？',
  'radio',
  'personality',
  4,
  '[
    {"value": "direct", "label": "有话直说，不绕弯子"},
    {"value": "gentle", "label": "委婉体贴，照顾情绪"},
    {"value": "smart", "label": "看情况，该直接时直接"},
    {"value": "same", "label": "和我一样的风格"}
  ]'::jsonb,
  6,
  'decision',
  'decision_style',
  'auto'
);

-- 5. 压力应对模式（依恋相关）
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'stress_response',
  '你最近压力很大，心情很糟。这时候伴侣应该怎么做？',
  'select',
  'personality',
  4,
  '[
    {"value": "space", "label": "给我空间，让我自己处理"},
    {"value": "company", "label": "默默陪着，不逼我说话"},
    {"value": "ask", "label": "主动问我发生了什么，倾听我"},
    {"value": "solve", "label": "帮我分析问题，一起想办法"}
  ]'::jsonb,
  10,
  'stress',
  null,
  'semi'
);

-- 6. 压力应对偏好
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'stress_preference',
  '当对方压力大时，你会怎么做？',
  'radio',
  'personality',
  4,
  '[
    {"value": "same", "label": "用我期待被对待的方式对待TA"},
    {"value": "ask", "label": "先问TA需要我做什么"},
    {"value": "observe", "label": "观察TA的状态，随机应变"},
    {"value": "default", "label": "按我的习惯来，给空间或陪伴"}
  ]'::jsonb,
  11,
  'stress',
  'stress_response',
  'semi'
);

-- 7. 关系节奏（规划/随性）
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'planning_style',
  '约会时你更喜欢哪种状态？',
  'select',
  'personality',
  4,
  '[
    {"value": "plan", "label": "提前计划好：几点去哪、吃什么、看什么"},
    {"value": "flex", "label": "大体有个方向，细节到时再说"},
    {"value": "random", "label": "完全随性，想到哪去哪"},
    {"value": "surprise", "label": "对方安排，我配合就好"}
  ]'::jsonb,
  15,
  'planning',
  null,
  'auto'
);

-- 8. 关系节奏偏好
INSERT INTO question_bank (
  question_key, question_text, question_type, category, part,
  options, display_order, question_group, is_preference_for, type
) VALUES (
  'planning_preference',
  '你希望和对方的生活节奏是？',
  'radio',
  'personality',
  4,
  '[
    {"value": "same", "label": "和我一样，步调一致"},
    {"value": "plan", "label": "对方更规划型，带我规律生活"},
    {"value": "flex", "label": "对方更随性型，给我惊喜"},
    {"value": "balance", "label": "互补，我缺什么TA补什么"}
  ]'::jsonb,
  16,
  'planning',
  'planning_style',
  'auto'
);

-- ==========================================
-- 使用说明：
-- 1. 这些题放在 Part 4（人格特质）
-- 2. 每组配对题：主体题（探测真实人格）→ 偏好题（希望对方如何）
-- 3. 可以插在 lifestyle 和 emotion 之间
-- 4. 当前 display_order 从0开始，实际插入时需调整避免冲突
-- ==========================================
