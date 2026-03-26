-- 修复第二层分数为整数
UPDATE match_candidates 
SET level_2_score = ROUND(level_2_score::numeric)
WHERE level_2_score IS NOT NULL 
  AND level_2_score != ROUND(level_2_score::numeric);

-- 修复档案最高分
UPDATE profiles 
SET level2_max_score = ROUND(level2_max_score::numeric)
WHERE level2_max_score IS NOT NULL 
  AND level2_max_score != ROUND(level2_max_score::numeric);

-- 查看修复结果
SELECT 
  COUNT(*) as total_with_score,
  COUNT(*) FILTER (WHERE level_2_score = ROUND(level_2_score::numeric)) as integer_scores
FROM match_candidates 
WHERE level_2_score IS NOT NULL;
