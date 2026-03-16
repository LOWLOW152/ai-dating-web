-- 重新排版问题顺序
-- Part 1: 基础信息 (1-8)
UPDATE questions SET part = 1, display_order = 1 WHERE question_key = 'nickname';
UPDATE questions SET part = 1, display_order = 2 WHERE question_key = 'gender';
UPDATE questions SET part = 1, display_order = 3 WHERE question_key = 'birth_year';
UPDATE questions SET part = 1, display_order = 4 WHERE question_key = 'city';
UPDATE questions SET part = 1, display_order = 5 WHERE question_key = 'occupation';
UPDATE questions SET part = 1, display_order = 6 WHERE question_key = 'education';
UPDATE questions SET part = 1, display_order = 7 WHERE question_key = 'accept_long_distance';
UPDATE questions SET part = 1, display_order = 8 WHERE question_key = 'age_range';

-- Part 2: 兴趣爱好 (9-14)
UPDATE questions SET part = 2, display_order = 9 WHERE question_key = 'hobby_type';
UPDATE questions SET part = 2, display_order = 10 WHERE question_key = 'douyin_content_type';
UPDATE questions SET part = 2, display_order = 11 WHERE question_key = 'travel_style';
UPDATE questions SET part = 2, display_order = 12 WHERE question_key = 'social_circle';
UPDATE questions SET part = 2, display_order = 13 WHERE question_key = 'xingge';
UPDATE questions SET part = 2, display_order = 14 WHERE question_key = 'xinggetwo';

-- Part 3: 生活方式 (15-19)
UPDATE questions SET part = 3, display_order = 15 WHERE question_key = 'spending_habit';
UPDATE questions SET part = 3, display_order = 16 WHERE question_key = 'sleep_schedule';
UPDATE questions SET part = 3, display_order = 17 WHERE question_key = 'tidiness';
UPDATE questions SET part = 3, display_order = 18 WHERE question_key = 'smoke_drink';
UPDATE questions SET part = 3, display_order = 19 WHERE question_key = 'time together';

-- Part 4: 情感核心 (20-22)
UPDATE questions SET part = 4, display_order = 20 WHERE question_key = 'core_need';
UPDATE questions SET part = 4, display_order = 21 WHERE question_key = 'deal_breakers';
UPDATE questions SET part = 4, display_order = 22 WHERE question_key = 'conflict_handling';
