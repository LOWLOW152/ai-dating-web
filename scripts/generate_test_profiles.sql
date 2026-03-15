-- 生成10个随机测试档案的SQL脚本
-- 运行前请确保邀请码表中有足够的未使用邀请码

-- 基础数据选项
WITH 
cities AS (SELECT unnest(ARRAY['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']) AS city),
educations AS (SELECT unnest(ARRAY['高中', '大专', '本科', '硕士', '博士']) AS edu),
occupations AS (SELECT unnest(ARRAY['程序员', '设计师', '产品经理', '教师', '医生', '律师', '销售', '自由职业', '公务员', '创业者']) AS occ),
hobbies AS (SELECT unnest(ARRAY['跑步,游泳', '摄影,旅行', '阅读,写作', '游戏,动漫', '音乐,电影', '烹饪,美食', '瑜伽,健身', '绘画,手工', '登山,户外', '桌游,剧本杀']) AS hobby),
spending AS (SELECT unnest(ARRAY['理性消费', '享受型', '实用主义', '投资型', '节俭型']) AS spend),
sleep AS (SELECT unnest(ARRAY['早睡早起', '夜猫子', '规律作息', '弹性作息']) AS sleep),
tidiness AS (SELECT unnest(ARRAY['极度整洁', '比较整洁', '随性而为', '有点乱']) AS tidy),
stress AS (SELECT unnest(ARRAY['运动释放', '独处冷静', '找人倾诉', '购物发泄', '美食治愈']) AS stress),
current_states AS (SELECT unnest(ARRAY['单身已久想找对象', '刚结束一段感情', '一直单身习惯了', '有过几段感情经历']) AS state),
conflicts AS (SELECT unnest(ARRAY['直接沟通', '冷静后再谈', '让步妥协', '需要空间', '找第三方调解']) AS conflict),
contacts AS (SELECT unnest(ARRAY['每天联系', '有重要事才联系', '每周几次', '随缘']) AS contact)

-- 生成10条随机档案数据
INSERT INTO profiles (
  id, invite_code, nickname, gender, birth_year, city, occupation, education,
  accept_long_distance, age_range,
  hobby_type, weekend_style, travel_style,
  spending_habit, sleep_schedule, tidiness, stress_response,
  current_state, conflict_handling, contact_frequency, deal_breakers,
  status, notes
)
SELECT 
  '20250315-TEST' || LPAD(i::text, 2, '0'),
  'TEST' || LPAD(i::text, 4, '0'),
  CASE WHEN i % 2 = 0 THEN '测试用户' || i ELSE '用户' || i END,
  CASE WHEN i % 3 = 0 THEN 'male' ELSE 'female' END,
  1990 + (i % 10),
  (SELECT city FROM cities ORDER BY random() LIMIT 1),
  (SELECT occ FROM occupations ORDER BY random() LIMIT 1),
  (SELECT edu FROM educations ORDER BY random() LIMIT 1),
  CASE WHEN i % 2 = 0 THEN 'true' ELSE 'false' END,
  (ARRAY['3', '5', '7', '10'])[1 + (i % 4)],
  (SELECT hobby FROM hobbies ORDER BY random() LIMIT 1),
  (ARRAY['宅家休息', '外出社交', '学习充电', '运动健身'])[1 + (i % 4)],
  (ARRAY['独自旅行', '结伴同行', '跟团游', '自驾游'])[1 + (i % 4)],
  (SELECT spend FROM spending ORDER BY random() LIMIT 1),
  (SELECT sleep FROM sleep ORDER BY random() LIMIT 1),
  (SELECT tidy FROM tidiness ORDER BY random() LIMIT 1),
  (SELECT stress FROM stress ORDER BY random() LIMIT 1),
  (SELECT state FROM current_states ORDER BY random() LIMIT 1),
  (SELECT conflict FROM conflicts ORDER BY random() LIMIT 1),
  (SELECT contact FROM contacts ORDER BY random() LIMIT 1),
  '不忠诚,暴力倾向,没有上进心',
  '待处理',
  '这是自动生成的测试数据 #' || i
FROM generate_series(1, 10) AS i
ON CONFLICT (id) DO NOTHING;

-- 插入对应的邀请码（如果不存在）
INSERT INTO invite_codes (code, created_at, used, profile_id)
SELECT 
  'TEST' || LPAD(i::text, 4, '0'),
  '2025-03-15',
  true,
  '20250315-TEST' || LPAD(i::text, 2, '0')
FROM generate_series(1, 10) AS i
ON CONFLICT (code) DO UPDATE SET 
  used = true, 
  profile_id = EXCLUDED.profile_id;

-- 生成对应的user_answers记录（用于匹配计算）
INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
SELECT 
  p.id,
  'hobby_type',
  p.hobby_type,
  CASE WHEN random() < 0.3 THEN 'same' WHEN random() < 0.6 THEN 'complementary' ELSE 'dontcare' END,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
SELECT 
  p.id,
  'spending_habit',
  p.spending_habit,
  CASE WHEN random() < 0.3 THEN 'same' WHEN random() < 0.6 THEN 'complementary' ELSE 'dontcare' END,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
SELECT 
  p.id,
  'sleep_schedule',
  p.sleep_schedule,
  'same',
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
SELECT 
  p.id,
  'tidiness',
  p.tidiness,
  'same',
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
SELECT 
  p.id,
  'stress_response',
  p.stress_response,
  'dontcare',
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'city',
  p.city,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'birth_year',
  p.birth_year::text,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'accept_long_distance',
  p.accept_long_distance,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'age_range',
  p.age_range,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'current_state',
  p.current_state,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'conflict_handling',
  p.conflict_handling,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'contact_frequency',
  p.contact_frequency,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
SELECT 
  p.id,
  'deal_breakers',
  p.deal_breakers,
  NOW()
FROM profiles p
WHERE p.id LIKE '20250315-TEST%'
ON CONFLICT (profile_id, question_key) DO NOTHING;

-- 显示生成的数据
SELECT id, nickname, gender, city, occupation, education, hobby_type, status 
FROM profiles 
WHERE id LIKE '20250315-TEST%' 
ORDER BY id;