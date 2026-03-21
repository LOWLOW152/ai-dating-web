-- Token 使用记录表
CREATE TABLE IF NOT EXISTS token_usage (
  id SERIAL PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  api_endpoint TEXT NOT NULL,
  request_tokens INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_cny DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_profile ON token_usage(profile_id);

-- 每日统计视图
CREATE OR REPLACE VIEW daily_token_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as request_count,
  SUM(request_tokens) as total_request_tokens,
  SUM(response_tokens) as total_response_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_cny) as total_cost
FROM token_usage
GROUP BY DATE(created_at)
ORDER BY date DESC;
