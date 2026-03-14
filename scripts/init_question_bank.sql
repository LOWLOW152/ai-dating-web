-- 题目库表
CREATE TABLE IF NOT EXISTS question_bank (
  id SERIAL PRIMARY KEY,
  question_key VARCHAR(50) UNIQUE NOT NULL,  -- 题目唯一标识，如 accept_long_distance
  category VARCHAR(20) NOT NULL,             -- 基础条件/兴趣话题/生活方式/价值观/情感核心
  part INTEGER NOT NULL,                     -- 第几部分 (1=Auto, 2=Semi, 3=Dog)
  question_text TEXT NOT NULL,               -- 问题内容
  question_type VARCHAR(20) NOT NULL,        -- text/radio/checkbox/select/number
  options JSONB,                             -- 选项列表 [{value, label, score?}]
  is_required BOOLEAN DEFAULT true,
  is_ai_monitored BOOLEAN DEFAULT false,     -- 是否需要AI监控追问
  ai_prompt TEXT,                            -- AI追问提示词
  ai_check_rules JSONB,                      -- AI检查规则
  match_logic JSONB,                         -- 匹配逻辑配置
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入基础题目
INSERT INTO question_bank (question_key, category, part, question_text, question_type, options, is_ai_monitored, match_logic) VALUES
-- 第一部分：基础信息 (Auto)
('nickname', 'basic', 1, '你的昵称', 'text', NULL, false, NULL),
('gender', 'basic', 1, '你的性别', 'radio', '[{"value": "男", "label": "男"}, {"value": "女", "label": "女"}]'::jsonb, false, NULL),
('birth_year', 'basic', 1, '出生年份', 'number', NULL, false, '{"type": "age_match"}'::jsonb),
('city', 'basic', 1, '所在城市', 'text', NULL, false, '{"type": "location_match"}'::jsonb),
('occupation', 'basic', 1, '职业', 'text', NULL, false, NULL),
('education', 'basic', 1, '学历', 'select', '[{"value": "高中及以下", "label": "高中及以下"}, {"value": "大专", "label": "大专"}, {"value": "本科", "label": "本科"}, {"value": "硕士", "label": "硕士"}, {"value": "博士", "label": "博士"}]'::jsonb, false, NULL),
('accept_long_distance', 'basic', 1, '能否接受异地', 'radio', '[{"value": "能", "label": "能"}, {"value": "不能", "label": "不能"}, {"value": "视情况而定", "label": "视情况而定"}]'::jsonb, false, '{"type": "deal_breaker", "field": "city"}'::jsonb),
('age_range', 'basic', 1, '接受对方年龄差范围', 'select', '[{"value": "3岁以内", "label": "3岁以内"}, {"value": "5岁以内", "label": "5岁以内"}, {"value": "10岁以内", "label": "10岁以内"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, '{"type": "age_range_match", "field": "birth_year"}'::jsonb),

-- 第二部分：兴趣话题 (Semi)
('hobby_type', 'interest', 2, '你的兴趣爱好', 'text', NULL, true, '{"type": "similarity_match", "preference_field": "hobby_match_preference"}'::jsonb),
('hobby_match_preference', 'interest', 2, '你希望对方的兴趣', 'radio', '[{"value": "必须相同", "label": "必须相同，要一起玩"}, {"value": "互补更好", "label": "互补更好，互相带对方体验"}, {"value": "无所谓", "label": "无所谓，各自有各自的空间"}]'::jsonb, false, NULL),
('travel_style', 'interest', 2, '你的旅行风格', 'select', '[{"value": "特种兵", "label": "特种兵式打卡"}, {"value": "休闲", "label": "休闲度假"}, {"value": "探险", "label": "探险猎奇"}, {"value": "文化", "label": "文化体验"}, {"value": "美食", "label": "美食之旅"}]'::jsonb, true, '{"type": "similarity_match", "preference_field": "travel_match_preference"}'::jsonb),
('travel_match_preference', 'interest', 2, '你希望对方的旅行节奏', 'radio', '[{"value": "必须相同", "label": "必须相同"}, {"value": "互补更好", "label": "互补更好"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('social_circle', 'social', 2, '你的社交圈子类型', 'select', '[{"value": "小", "label": "小而精的密友圈"}, {"value": "大", "label": "广泛的社交圈"}]'::jsonb, false, '{"type": "similarity_match", "preference_field": "social_circle_preference"}'::jsonb),
('social_circle_preference', 'social', 2, '你希望对方的社交圈', 'radio', '[{"value": "必须相同", "label": "必须相同"}, {"value": "互补更好", "label": "互补更好"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('social_role', 'social', 2, '你在社交中的角色', 'radio', '[{"value": "组织者", "label": "组织者/主导者"}, {"value": "参与者", "label": "参与者/跟随者"}]'::jsonb, false, '{"type": "similarity_match", "preference_field": "social_role_preference"}'::jsonb),
('social_role_preference', 'social', 2, '你希望对方在社交中的角色', 'radio', '[{"value": "必须相同", "label": "必须相同"}, {"value": "互补更好", "label": "互补更好"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),

-- 第三部分：生活方式 (Semi)
('spending_habit', 'lifestyle', 3, '你的消费观念', 'select', '[{"value": "节俭", "label": "节俭实用主义"}, {"value": "平衡", "label": "平衡型"}, {"value": "品质", "label": "品质优先"}]'::jsonb, true, '{"type": "consistency_match", "consistency_field": "spending_consistency"}'::jsonb),
('spending_consistency', 'lifestyle', 3, '你希望对方消费观念', 'radio', '[{"value": "希望一致", "label": "希望一致，避免矛盾"}, {"value": "互补更好", "label": "互补更好，互相平衡"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('sleep_schedule', 'lifestyle', 3, '你的作息类型', 'select', '[{"value": "早睡早起", "label": "早睡早起"}, {"value": "晚睡晚起", "label": "晚睡晚起"}, {"value": "不规律", "label": "不规律"}]'::jsonb, false, '{"type": "consistency_match", "consistency_field": "sleep_consistency"}'::jsonb),
('sleep_consistency', 'lifestyle', 3, '你希望对方作息', 'radio', '[{"value": "希望一致", "label": "希望一致"}, {"value": "互补更好", "label": "互补更好"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('tidiness', 'lifestyle', 3, '你的整洁程度', 'select', '[{"value": "洁癖", "label": "洁癖级"}, {"value": "整洁", "label": "整洁有序"}, {"value": "随意", "label": "随意随性"}]'::jsonb, true, '{"type": "consistency_match", "consistency_field": "tidiness_consistency"}'::jsonb),
('tidiness_consistency', 'lifestyle', 3, '你希望对方整洁程度', 'radio', '[{"value": "希望一致", "label": "希望一致"}, {"value": "互补更好", "label": "互补更好"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('stress_response', 'lifestyle', 3, '你压力大了会怎样', 'text', NULL, true, '{"type": "consistency_match", "consistency_field": "stress_consistency"}'::jsonb),
('stress_consistency', 'lifestyle', 3, '你希望对方压力应对方式', 'radio', '[{"value": "希望一致", "label": "希望一致，互相理解"}, {"value": "互补更好", "label": "互补更好，互相支持"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),

-- 第四部分：价值观 (Dog)
('family_relationship', 'values', 3, '你和家人的关系如何', 'text', NULL, true, '{"type": "consistency_match", "consistency_field": "family_consistency"}'::jsonb),
('family_consistency', 'values', 3, '你希望对方和家人的关系', 'radio', '[{"value": "希望相似", "label": "希望相似，价值观接近"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),
('life_preference', 'values', 3, '你更倾向于哪种生活', 'select', '[{"value": "稳定", "label": "稳定可预期"}, {"value": "变化", "label": "变化有挑战"}]'::jsonb, true, '{"type": "consistency_match", "consistency_field": "life_consistency"}'::jsonb),
('life_consistency', 'values', 3, '你希望对方的生活偏好', 'radio', '[{"value": "希望相似", "label": "希望相似"}, {"value": "无所谓", "label": "无所谓"}]'::jsonb, false, NULL),

-- 第五部分：情感核心 (Dog)
('current_state', 'emotion', 3, '如果用三个词形容你现在的状态', 'text', NULL, true, NULL),
('trusted_for', 'emotion', 3, '朋友遇到什么事会第一时间找你', 'text', NULL, true, NULL),
('understood_moment', 'emotion', 3, '最近一次感到被理解是什么时候', 'text', NULL, true, NULL),
('relationship_blindspot', 'emotion', 3, '上一段关系里，对方说你什么问题你当时不认，后来认了', 'text', NULL, true, NULL),
('ideal_relationship', 'emotion', 3, '你理想的关系是什么样的', 'text', NULL, true, '{"type": "semantic_similarity"}'::jsonb),
('core_need', 'emotion', 3, '你在亲密关系里最核心需求是什么', 'text', NULL, true, NULL),
('conflict_handling', 'emotion', 3, '吵架时你通常怎么处理', 'select', '[{"value": "立即沟通", "label": "立即沟通解决"}, {"value": "先冷静", "label": "先冷静再谈"}, {"value": "回避", "label": "回避冷处理"}]'::jsonb, true, '{"type": "deal_breaker_check"}'::jsonb),
('contact_frequency', 'emotion', 3, '你希望的日常联系频率', 'select', '[{"value": "随时", "label": "随时报备"}, {"value": "每天", "label": "每天联系"}, {"value": "有事", "label": "有事再说"}]'::jsonb, false, '{"type": "consistency_match", "consistency_field": null}'::jsonb),
('deal_breakers', 'emotion', 3, '有什么是你绝对不能接受的', 'text', NULL, true, '{"type": "deal_breaker_check"}'::jsonb),
('future_vision', 'emotion', 3, '你对未来3-5年的规划', 'text', NULL, true, '{"type": "semantic_similarity"}'::jsonb)

ON CONFLICT (question_key) DO NOTHING;
