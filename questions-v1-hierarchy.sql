-- AI相亲题库 V1.1 - 27题完整SQL（含追问层级）
-- 执行前请确保已备份现有数据

-- ============================================
-- 【Auto】基础条件 (1-8)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, hierarchy, is_active, is_required) VALUES
('nickname', 'basic', 'auto', 1, '怎么称呼你？', 'text', '{"required": true, "maxLength": 20}', NULL, '确认昵称，如果用户说"随便叫"则追问"给个称呼方便交流"', 2, false, '[{"label":"主问题：询问昵称"},{"label":"追问1：如果模糊或拒绝，请给出具体称呼"}]', true, true),
('gender', 'basic', 'auto', 2, '你的性别是？', 'select', '{"required": true}', '["男生", "女生"]', '确认性别，必须明确选择男生或女生', 2, false, '[{"label":"主问题：确认性别"},{"label":"追问1：必须明确选择男生或女生"}]', true, true),
('birth_year', 'basic', 'auto', 3, '你哪一年出生的？', 'number', '{"required": true, "min": 1970, "max": 2005}', NULL, '确认年份，范围1970-2005。如果用户说"90后"则追问"具体是哪一年呢？比如1995"', 2, false, '[{"label":"主问题：询问出生年份"},{"label":"追问1：如果模糊，追问具体年份如1995"}]', true, true),
('city', 'basic', 'auto', 4, '你现在在哪个城市？', 'text', '{"required": true}', NULL, '追问具体城市，如"广东"则追问"广东哪个城市？"', 2, false, '[{"label":"主问题：询问所在城市"},{"label":"追问1：如果范围太大，追问具体城市"}]', true, true),
('occupation', 'basic', 'auto', 5, '你的职业是？', 'text', '{"required": true}', NULL, '追问具体岗位，如"做IT"则追问"具体是开发还是产品？"', 2, false, '[{"label":"主问题：询问职业"},{"label":"追问1：追问具体岗位和职责"}]', true, true),
('education', 'basic', 'auto', 6, '你的最高学历是？', 'select', '{"required": true}', '["高中", "大专", "本科", "硕士", "博士"]', '确认学历，如果用户说"大学"则追问"是本科还是硕士？"', 2, false, '[{"label":"主问题：询问最高学历"},{"label":"追问1：如果模糊，确认具体学历层次"}]', true, true),
('long_distance', 'basic', 'auto', 7, '能否接受异地恋？', 'select', '{"required": true}', '["完全不行", "短期可以", "看情况"]', '确认态度，追问异地接受程度和时长', 4, false, '[{"label":"主问题：询问异地接受度"},{"label":"追问1：如果是短期可以，追问最多坚持多久"},{"label":"追问2：如果是看情况，追问什么情况可以接受"},{"label":"追问3：追问异地成功的关键因素"}]', true, true),
('age_gap_preference', 'basic', 'auto', 8, '你希望对方与你的年龄差？', 'text', '{"required": true}', NULL, '追问具体范围、倾向性', 3, false, '[{"label":"主问题：询问年龄差偏好"},{"label":"追问1：如果模糊，追问具体范围如3岁以内"},{"label":"追问2：追问喜欢比自己大还是小"}]', true, true)
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
  hierarchy = EXCLUDED.hierarchy,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Semi】生活方式 (9-17)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, hierarchy, is_active, is_required) VALUES
('interests', 'lifestyle', 'semi', 9, '平时有什么兴趣爱好？', 'multi_text', '{"required": true}', NULL, '追问类型和频率，挖掘深层偏好', 3, false, '[{"label":"主问题：询问兴趣爱好"},{"label":"追问1：类型深挖-具体是什么类型"},{"label":"追问2：频率确认-多久做一次"},{"label":"追问3：情感连接-对你意味着什么"}]', true, true),
('weekend', 'lifestyle', 'semi', 10, '你理想的周末是怎么度过的？', 'textarea', '{"required": true}', NULL, '追问具体安排，挖掘生活方式偏好', 3, false, '[{"label":"主问题：询问周末安排"},{"label":"追问1：具体做什么活动"},{"label":"追问2：独处还是社交"},{"label":"追问3：这是你想要的状态吗"}]', true, true),
('spending', 'lifestyle', 'semi', 11, '你的消费观念是？', 'select', '{"required": true}', '["节俭", "平衡", "享乐"]', '确认选项后追问原因和消费习惯', 3, false, '[{"label":"主问题：询问消费观念"},{"label":"追问1：为什么是这样"},{"label":"追问2：愿意为什么花钱"},{"label":"追问3：舍不得为什么花钱"}]', true, true),
('sleep_schedule', 'lifestyle', 'semi', 12, '你的作息习惯是？', 'select', '{"required": true}', '["早睡早起", "夜猫子", "不规律"]', '确认选项后追问作息原因和影响', 6, false, '[{"label":"主问题：询问作息习惯"},{"label":"追问1：工作导致还是个人习惯"},{"label":"追问2：放假时的作息安排"},{"label":"追问3：对感情生活的影响"},{"label":"追问4：是否想改变"},{"label":"追问5：改变的最大障碍"}]', true, true),
('exercise', 'lifestyle', 'semi', 13, '你有运动习惯吗？', 'text', '{"required": true}', NULL, '如有追问项目和频率；如无追问原因', 5, false, '[{"label":"主问题：询问运动习惯"},{"label":"追问1：具体做什么运动"},{"label":"追问2：一周几次"},{"label":"追问3：为什么开始运动"},{"label":"追问4：没有运动是时间还是不喜欢"}]', true, true),
('diet', 'lifestyle', 'semi', 14, '你的饮食习惯是？', 'multi_select', '{"required": true}', '["清淡", "重口味", "素食", "无辣不欢", "其他"]', '选项后追问是否有忌口和包容度', 5, false, '[{"label":"主问题：询问饮食习惯"},{"label":"追问1：有无忌口或过敏"},{"label":"追问2：口味差异能否接受"},{"label":"追问3：会为对方改变吗"},{"label":"追问4：最不能接受的饮食行为"}]', true, true),
('pets', 'lifestyle', 'semi', 15, '你喜欢宠物吗？现在养了吗？', 'text', '{"required": true}', NULL, '如养追问品种和相处；如不养追问态度', 5, false, '[{"label":"主问题：询问宠物态度"},{"label":"追问1：养的是什么宠物"},{"label":"追问2：平时怎么照顾"},{"label":"追问3：伴侣不喜欢怎么办"},{"label":"追问4：没有宠物是想养吗"}]', true, true),
('travel', 'lifestyle', 'semi', 16, '你喜欢旅行吗？偏好哪种方式？', 'textarea', '{"required": true}', NULL, '追问目的地偏好、频次、旅行风格', 3, false, '[{"label":"主问题：询问旅行偏好"},{"label":"追问1：特种兵式还是度假式"},{"label":"追问2：喜欢什么类型的目的地"},{"label":"追问3：一年旅行几次"}]', true, true),
('social', 'lifestyle', 'semi', 17, '你的社交模式是？', 'select', '{"required": true}', '["社牛", "一般", "社恐"]', '选项后追问具体场景表现', 3, false, '[{"label":"主问题：询问社交模式"},{"label":"追问1：什么场合比较活跃"},{"label":"追问2：伴侣朋友聚会的状态"},{"label":"追问3：社交给你能量还是消耗"}]', true, true)
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
  hierarchy = EXCLUDED.hierarchy,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Dog】情感核心 (18-24)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, hierarchy, is_active, is_required) VALUES
('family_relationship', 'emotion', 'dog', 18, '你和父母的关系怎么样？', 'textarea', '{"required": true}', NULL, '深挖家庭关系、父母影响、亲子隔阂', 10, false, '[{"label":"主问题：询问亲子关系"},{"label":"追问1：平时联系频率"},{"label":"追问2：父母对你性格/感情观的影响"},{"label":"追问3：有没有感到距离的时刻"},{"label":"追问4：理想的亲子关系"},{"label":"追问5：父母感情状态对你影响"},{"label":"追问6：你在家庭中的角色"},{"label":"追问7：不会告诉父母的事"},{"label":"追问8：父母理解你吗"},{"label":"追问9：带对象回家的预期"},{"label":"追问10：对组建家庭的期待或恐惧"}]', true, true),
('current_status', 'emotion', 'dog', 19, '你现在的生活状态满意吗？', 'textarea', '{"required": true}', NULL, '深挖现状与焦虑、期待的改变', 10, false, '[{"label":"主问题：询问生活满意度"},{"label":"追问1：10分满分打几分"},{"label":"追问2：扣分在哪里"},{"label":"追问3：不满是一直有还是最近"},{"label":"追问4：最想改变什么"},{"label":"追问5：改变的最大阻力"},{"label":"追问6：有没有为改变做过努力"},{"label":"追问7：这种不满影响感情吗"},{"label":"追问8：理想状态是什么样"},{"label":"追问9：多久能达到理想"},{"label":"追问10：达不到怎么办"}]', true, true),
('trust_point', 'emotion', 'dog', 20, '在朋友中，你最看重什么品质？', 'textarea', '{"required": true}', NULL, '深挖信任与经历、背叛与成长', 10, false, '[{"label":"主问题：询问看重品质"},{"label":"追问1：为什么是这个品质"},{"label":"追问2：有没有因此被伤害过"},{"label":"追问3：这种品质在感情中重要吗"},{"label":"追问4：你自己具备吗"},{"label":"追问5：没有这种品质的人你怎么看"},{"label":"追问6：因为这个品质失去过朋友吗"},{"label":"追问7：对方有这个品质就够了吗"},{"label":"追问8：这个品质的具体表现"},{"label":"追问9：最容易破坏这种品质的行为"},{"label":"追问10：原谅的底线在哪里"}]', true, true),
('relationship_blindspot', 'emotion', 'dog', 21, '你在亲密关系中可能的盲点是什么？', 'textarea', '{"required": true}', NULL, '深挖自我认知、前任反馈、改变意愿', 10, false, '[{"label":"主问题：询问关系盲点"},{"label":"追问1：朋友或前任提过吗"},{"label":"追问2：怎么发现的这个盲点"},{"label":"追问3：过去感情中的影响"},{"label":"追问4：有没有尝试改变"},{"label":"追问5：改变的效果如何"},{"label":"追问6：伴侣怎么看待这个盲点"},{"label":"追问7：这是性格还是习惯"},{"label":"追问8：接受伴侣指出吗"},{"label":"追问9：最不想被说的盲点"},{"label":"追问10：和盲点共处的方式"}]', true, true),
('core_needs', 'emotion', 'dog', 22, '在一段关系中，你最核心的需求是什么？', 'textarea', '{"required": true}', NULL, '深挖情感需求、形成原因、历史经历', 10, false, '[{"label":"主问题：询问核心需求"},{"label":"追问1：陪伴/理解/安全感/其他"},{"label":"追问2：只能选一个最不能少的是什么"},{"label":"追问3：这种需求怎么形成的"},{"label":"追问4：有没有因需求没被满足分手"},{"label":"追问5：伴侣能满足这个需求吗"},{"label":"追问6：需求没被满足的表现"},{"label":"追问7：会为了对方降低需求吗"},{"label":"追问8：需求和现实的冲突"},{"label":"追问9：最理想的需求满足状态"},{"label":"追问10：需求改变的可能性"}]', true, true),
('red_lines', 'emotion', 'dog', 23, '在感情中，你的红线是什么？', 'multi_text', '{"required": true}', NULL, '深挖底线与妥协、触碰经历、商量空间', 10, false, '[{"label":"主问题：询问感情红线"},{"label":"追问1：为什么设为红线"},{"label":"追问2：有过触碰红线的经历吗"},{"label":"追问3：不小心触碰能给机会吗"},{"label":"追问4：红线有商量余地吗"},{"label":"追问5：什么情况可以妥协"},{"label":"追问6：对方的红线你能接受吗"},{"label":"追问7：红线和底线有区别吗"},{"label":"追问8：曾经为谁降低过红线吗"},{"label":"追问9：红线会随年龄改变吗"},{"label":"追问10：最不能接受的红线触碰"}]', true, true),
('relationship_expectation', 'emotion', 'dog', 24, '你对未来感情的期待是什么？', 'textarea', '{"required": true}', NULL, '深挖期待与焦虑、准备与计划', 10, false, '[{"label":"主问题：询问感情期待"},{"label":"追问1：多久内希望进入稳定关系"},{"label":"追问2：这种期待让你焦虑吗"},{"label":"追问3：为此做过什么准备"},{"label":"追问4：遇不到合适的人怎么办"},{"label":"追问5：会为了脱单降低标准吗"},{"label":"追问6：理想的时间表是什么"},{"label":"追问7：家人给你的压力大吗"},{"label":"追问8：单身和将就选哪个"},{"label":"追问9：期待中的最大障碍"},{"label":"追问10：怎么看待缘分"}]', true, true)
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
  hierarchy = EXCLUDED.hierarchy,
  is_active = EXCLUDED.is_active,
  is_required = EXCLUDED.is_required,
  updated_at = NOW();

-- ============================================
-- 【Semi】价值观 (25-27)
-- ============================================

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, hierarchy, is_active, is_required) VALUES
('values_priority', 'values', 'semi', 25, '人生中最重要的是什么？', 'multi_text', '{"required": true}', NULL, '追问排序理由和取舍', 4, false, '[{"label":"主问题：询问人生优先级"},{"label":"追问1：事业/家庭/自由/稳定/金钱/成长排序"},{"label":"追问2：只能选一个最不能放弃的是什么"},{"label":"追问3：这种价值观怎么形成的"},{"label":"追问4：伴侣排序不同能接受吗"}]', true, true),
('life_goals', 'values', 'semi', 26, '你未来3-5年的规划是什么？', 'textarea', '{"required": true}', NULL, '追问感情在规划中的位置', 4, false, '[{"label":"主问题：询问未来规划"},{"label":"追问1：规划里感情/婚姻占什么位置"},{"label":"追问2：规划和个人感情冲突怎么选"},{"label":"追问3：希望伴侣在规划里扮演什么角色"},{"label":"追问4：会为感情调整规划吗"}]', true, true),
('deal_breakers', 'lifestyle', 'semi', 27, '有什么绝对无法接受的生活习惯？', 'multi_text', '{"required": true}', NULL, '追问原因和妥协空间', 4, false, '[{"label":"主问题：询问无法接受的习惯"},{"label":"追问1：为什么绝对接受不了"},{"label":"追问2：对方愿意改能给机会吗"},{"label":"追问3：你有什么别人可能接受不了的习惯"},{"label":"追问4：习惯和个人原则的界限"}]', true, true)
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
  hierarchy = EXCLUDED.hierarchy,
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
