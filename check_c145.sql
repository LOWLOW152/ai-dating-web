-- 检查档案 c1452b44-52e3-4dab-b25f-c101090fdfc7 的详细状态
SELECT 
  id,
  invite_code,
  match_level1_status,
  match_level2_status,
  match_level3_status,
  match_level1_at,
  match_level2_at,
  match_level3_at,
  ai_evaluation_status
FROM profiles 
WHERE id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7';

-- 查看 match_candidates 记录
SELECT 
  candidate_id,
  passed_level_1,
  level_1_reason,
  level_2_score,
  level_2_passed,
  level_2_calculated_at,
  level_3_score,
  level_3_calculated_at
FROM match_candidates 
WHERE profile_id = 'c1452b44-52e3-4dab-b25f-c101090fdfc7'
ORDER BY level_2_score DESC NULLS LAST
LIMIT 10;
