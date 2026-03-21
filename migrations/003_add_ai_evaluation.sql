-- 每日AI评价系统迁移
-- 为 profiles 表添加评价相关字段

-- 添加AI评价状态字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_evaluation JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_evaluated_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_evaluation_status TEXT DEFAULT 'pending' CHECK (ai_evaluation_status IN ('pending', 'processing', 'completed', 'failed'));

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_profiles_eval_status ON profiles(ai_evaluation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_evaluated_at ON profiles(ai_evaluated_at);

-- 创建评价任务日志表（用于追踪每次评价任务）
CREATE TABLE IF NOT EXISTS evaluation_logs (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  evaluation_result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_logs_profile ON evaluation_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_eval_logs_created ON evaluation_logs(created_at);
