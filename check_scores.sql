-- 检查第二层分数数据类型
SELECT 
  COUNT(*) as total_scores,
  COUNT(*) FILTER (WHERE level_2_score::text LIKE '%.%') as decimal_scores,
  COUNT(*) FILTER (WHERE level_2_score::text NOT LIKE '%.%') as integer_scores,
  MIN(level_2_score) as min_score,
  MAX(level_2_score) as max_score
FROM match_candidates 
WHERE level_2_score IS NOT NULL;

-- 查看几条示例数据
SELECT 
  profile_id,
  candidate_id,
  level_2_score,
  pg_typeof(level_2_score) as data_type,
  level_2_score::text as score_text
FROM match_candidates 
WHERE level_2_score IS NOT NULL
ORDER BY level_2_score::text LIKE '%.%' DESC
LIMIT 10;
