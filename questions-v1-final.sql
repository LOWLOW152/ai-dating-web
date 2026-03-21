-- AI相亲题库 V1.0 - 27题完整SQL
-- 执行前请确保已备份现有数据

-- 清空现有题库（可选，谨慎操作）
-- DELETE FROM questions WHERE id NOT IN ('nickname', 'gender', 'birth_year', 'city', 'interests');

-- ============================================
-- 【Auto】基础条件 (1-8)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, is_active, is_required) VALUES
('nickname', 'basic', 'auto', 1, '怎么称呼你？', 'text', '{"required": true, "maxLength": 20}', NULL, '确认昵称，如果用户说"随便叫"则追问"给个称呼方便交流"', 2, false, true, true),
('gender', 'basic', 'auto', 2, '你的性别是？', 'select', '{"required": true}', '["男生", "女生"]', '确认性别，必须明确选择男生或女生', 2, false, true, true),
('birth_year', 'basic', 'auto', 3, '你哪一年出生的？', 'number', '{"required": true, "min": 1970, "max": 2005}', NULL, '确认年份，范围1970-2005。如果用户说"90后"则追问"具体是哪一年呢？比如1995"', 2, false, true, true),
('city', 'basic', 'auto', 4, '你现在在哪个城市？', 'text', '{"required": true}', NULL, '追问具体城市，如"广东"则追问"广东哪个城市？"', 2, false, true, true),
('occupation', 'basic', 'auto', 5, '你的职业是？', 'text', '{"required": true}', NULL, '追问具体岗位，如"做IT"则追问"具体是开发还是产品？"', 2, false, true, true),
('education', 'basic', 'auto', 6, '你的最高学历是？', 'select', '{"required": true}', '["高中", "大专", "本科", "硕士", "博士"]', '确认学历，如果用户说"大学"则追问"是本科还是硕士？"', 2, false, true, true),
('long_distance', 'basic', 'auto', 7, '能否接受异地恋？', 'select', '{"required": true}', '["完全不行", "短期可以", "看情况"]', '确认态度，如果用户说"不太能接受"则追问"是完全不行，还是短期异地可以？如果是短期可以，追问"你觉得异地最多能坚持多久？"如果是看情况，追问"什么情况你觉得异地也能走到最后？"', 4, false, true, true),
('age_gap_preference', 'basic', 'auto', 8, '你希望对方与你的年龄差？', 'text', '{"required": true}', NULL, '追问具体范围，如果只说"差不多"则追问"差不多是几岁范围？比如上下3岁？"如果只说"大一点"则追问"大多少你能接受？是喜欢对方比自己大，还是比自己小？"', 3, false, true, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  "order" = EXCLUDED."order",
  question_text = EXCLUDED.question_text,
  field_type = EXCLUDED.field_type,
  validation = EXCLUDED.validation,
  options = EXCLUDED.options,
  ai_prompt = EXCLUDED.ai_prompt,
  max_questions = EXCLUDED.max_questions,
  use_closing_message = EXCLUDED.use_closing_message,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Semi】生活方式 (9-17)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, is_active, is_required) VALUES
('interests', 'lifestyle', 'semi', 9, '平时有什么兴趣爱好？', 'multi_text', '{"required": true}', NULL, '追问类型和频率。类型深挖："你说喜欢运动，具体是什么运动？"频率确认："这个爱好一般多久做一次？每周几次？"情感连接："这个爱好对你来说意味着什么？是放松还是社交？"', 3, false, true, true),
('weekend', 'lifestyle', 'semi', 10, '你理想的周末是怎么度过的？', 'textarea', '{"required": true}', NULL, '追问具体安排，挖掘生活方式偏好。"具体会做什么？能描述一下吗？""是一个人还是和朋友一起？""这种周末状态是你想要的吗？"', 3, false, true, true),
('spending', 'lifestyle', 'semi', 11, '你的消费观念是？', 'select', '{"required": true}', '["节俭", "平衡", "享乐"]', '确认选项后追问原因。"能说说为什么吗？是什么经历让你这样看待消费？""在什么事情上你特别愿意花钱？""在什么事情上你特别舍不得花钱？"', 3, false, true, true),
('sleep_schedule', 'lifestyle', 'semi', 12, '你的作息习惯是？', 'select', '{"required": true}', '["早睡早起", "夜猫子", "不规律"]', '确认选项后追问。"这个作息是工作导致的，还是你自己习惯？""如果放假不用上班，你会怎么安排作息？""你觉得作息对感情生活有影响吗？"', 6, false, true, true),
('exercise', 'lifestyle', 'semi', 13, '你有运动习惯吗？', 'text', '{"required": true}', NULL, '如有，追问项目和频率；如无，追问原因。"具体做什么运动？""一周大概几次？""如果回答说没有运动习惯，追问"是没时间，还是不喜欢运动？"', 5, false, true, true),
('diet', 'lifestyle', 'semi', 14, '你的饮食习惯是？', 'multi_select', '{"required": true}', '["清淡", "重口味", "素食", "无辣不欢", "其他"]', '选项后追问是否有忌口。"有忌口或者过敏的食物吗？""和伴侣吃饭，口味差异大你能接受吗？""你会为了对方改变饮食习惯吗？"', 5, false, true, true),
('pets', 'lifestyle', 'semi', 15, '你喜欢宠物吗？现在养了吗？', 'text', '{"required": true}', NULL, '如养，追问品种和相处模式；如不养，追问态度。"养的是什么宠物？""平时怎么照顾它？""如果伴侣不喜欢你的宠物，你会怎么处理？"', 5, false, true, true),
('travel', 'lifestyle', 'semi', 16, '你喜欢旅行吗？偏好哪种方式？', 'textarea', '{"required": true}', NULL, '追问目的地偏好、频次、旅行风格。"是特种兵式打卡，还是度假式慢慢体验？""一般喜欢去哪种类型的目的地？海边/山里/城市？""一年大概旅行几次？"', 3, false, true, true),
('social', 'lifestyle', 'semi', 17, '你的社交模式是？', 'select', '{"required": true}', '["社牛", "一般", "社恐"]', '选项后追问具体场景表现。"在什么样的场合你会比较活跃？""和伴侣的朋友聚会，你通常是什么状态？""你觉得社交这件事消耗你还是给你能量？"', 3, false, true, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  "order" = EXCLUDED."order",
  question_text = EXCLUDED.question_text,
  field_type = EXCLUDED.field_type,
  validation = EXCLUDED.validation,
  options = EXCLUDED.options,
  ai_prompt = EXCLUDED.ai_prompt,
  max_questions = EXCLUDED.max_questions,
  use_closing_message = EXCLUDED.use_closing_message,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Dog】情感核心 (18-24)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, is_active, is_required) VALUES
('family_relationship', 'emotion', 'dog', 18, '你和父母的关系怎么样？', 'textarea', '{"required": true}', NULL, '深挖家庭关系。前4轮追问："平时联系多吗？多久见一次？""你觉得父母对你的性格/感情观有什么影响？""有没有什么事情让你觉得和他们有距离？""理想中的亲子关系是什么样的？"后续6轮由AI根据回答自由深挖：父母感情、家庭角色、隐瞒的事、被理解程度、带对象回家的预期、对组建家庭的期待/恐惧等。', 10, false, true, true),
('current_status', 'emotion', 'dog', 19, '你现在的生活状态满意吗？', 'textarea', '{"required": true}', NULL, '深挖现状与焦虑。前4轮追问："如果10分满分，你给自己现在打几分？""扣分扣在哪里？具体是什么不满意？""这种不满意是一直都有，还是最近才有的？""如果改变现状，你最想改变什么？"后续6轮由AI根据回答自由深挖。', 10, false, true, true),
('trust_point', 'emotion', 'dog', 20, '在朋友中，你最看重什么品质？', 'textarea', '{"required": true}', NULL, '深挖信任与经历。前4轮追问："能具体说说吗？为什么是这个品质？""有没有因为看重这个品质而被伤害过？""这种品质在感情中同样重要吗？""你自己具备这个品质吗？"后续6轮由AI根据回答自由深挖。', 10, false, true, true),
('relationship_blindspot', 'emotion', 'dog', 21, '你在亲密关系中可能的盲点是什么？', 'textarea', '{"required": true}', NULL, '深挖自我认知。前4轮追问："朋友或前任有没有跟你提过这个问题？""你自己是怎么发现这个盲点的？""这个盲点在过去感情中造成过什么影响？""你有没有尝试去改变？"后续6轮由AI根据回答自由深挖。', 10, false, true, true),
('core_needs', 'emotion', 'dog', 22, '在一段关系中，你最核心的需求是什么？', 'textarea', '{"required": true}', NULL, '深挖情感需求。前4轮追问："是陪伴？被理解？安全感？还是其他？""如果只能选一个，最不能少的是什么？""这种需求是怎么形成的？""过去有没有因为需求没被满足而结束关系？"后续6轮由AI根据回答自由深挖。', 10, false, true, true),
('red_lines', 'emotion', 'dog', 23, '在感情中，你的红线是什么？', 'multi_text', '{"required": true}', NULL, '深挖底线与妥协。前4轮追问："能具体说说吗？是什么让你把这条设为红线？""有过触碰这条红线的经历吗？""如果对方不小心触碰了，你能给机会吗？""这条红线有商量的余地吗？什么情况可以妥协？"后续6轮由AI根据回答自由深挖。', 10, false, true, true),
('relationship_expectation', 'emotion', 'dog', 24, '你对未来感情的期待是什么？', 'textarea', '{"required": true}', NULL, '深挖期待与焦虑。前4轮追问："你希望多久内进入一段稳定关系？""这种期待让你焦虑吗？""你为此做过什么准备或改变？""如果一直遇不到合适的人，你会怎么办？"后续6轮由AI根据回答自由深挖。', 10, false, true, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  "order" = EXCLUDED."order",
  question_text = EXCLUDED.question_text,
  field_type = EXCLUDED.field_type,
  validation = EXCLUDED.validation,
  options = EXCLUDED.options,
  ai_prompt = EXCLUDED.ai_prompt,
  max_questions = EXCLUDED.max_questions,
  use_closing_message = EXCLUDED.use_closing_message,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Semi】价值观 (25-27)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, is_active, is_required) VALUES
('values_priority', 'values', 'semi', 25, '人生中最重要的是什么？', 'multi_text', '{"required": true}', NULL, '追问排序理由：事业/家庭/自由/稳定/金钱/成长。"如果只能选一个，最不能放弃的是什么？""这种价值观是怎么形成的？""如果伴侣的排序和你不一样，你能接受吗？"', 4, false, true, true),
('life_goals', 'values', 'semi', 26, '你未来3-5年的规划是什么？', 'textarea', '{"required": true}', NULL, '追问是否与感情冲突、如何平衡。"这个规划里，感情/婚姻占什么位置？""如果规划和个人感情冲突，你会怎么选？""你希望伴侣在你的规划里扮演什么角色？"', 4, false, true, true),
('deal_breakers', 'lifestyle', 'semi', 27, '有什么绝对无法接受的生活习惯？', 'multi_text', '{"required": true}', NULL, '追问原因、是否有妥协空间。"为什么这个习惯你绝对接受不了？""如果对方愿意改，你能给机会吗？""你有没有什么习惯是别人可能接受不了的？"', 4, false, true, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  "order" = EXCLUDED."order",
  question_text = EXCLUDED.question_text,
  field_type = EXCLUDED.field_type,
  validation = EXCLUDED.validation,
  options = EXCLUDED.options,
  ai_prompt = EXCLUDED.ai_prompt,
  max_questions = EXCLUDED.max_questions,
  use_closing_message = EXCLUDED.use_closing_message,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 初始化模板权重（如果不存在）
-- ============================================

INSERT INTO template_weights (template_id, question_id, match_enabled, match_algorithm, match_weight, is_veto)
SELECT 'v1_default', id, true, 'set_similarity', 10, false
FROM questions
WHERE id NOT IN (SELECT question_id FROM template_weights WHERE template_id = 'v1_default')
ON CONFLICT (template_id, question_id) DO NOTHING;
