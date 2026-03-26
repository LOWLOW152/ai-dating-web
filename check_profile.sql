-- 检查档案 c1452b44-52e3-4dab-b25f-c101090fdfc7 的状态
SELECT 
  id,
  invite_code,
  match_level1_status,
  match_level2_status,
  match_level3_status,
  ai_evaluation_status
FROM profiles 
WHERE id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7';

-- 第一层候选人
SELECT COUNT(*) as l1_total FROM match_candidates WHERE profile_id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7';

-- 第一层通过
SELECT COUNT(*) as l1_passed FROM match_candidates WHERE profile_id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7' AND passed_level_1 = true;

-- 第二层已评分
SELECT COUNT(*) as l2_scored FROM match_candidates WHERE profile_id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7' AND level_2_score IS NOT NULL;

-- 第三层已评分  
SELECT COUNT(*) as l3_scored FROM match_candidates WHERE profile_id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7' AND level_3_score IS NOT NULL;
