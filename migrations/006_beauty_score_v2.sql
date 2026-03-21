-- 颜值打分系统 V2 - 只存评价，不存照片
-- 先删除旧表（如果有）
DROP TABLE IF EXISTS beauty_scores CASCADE;
DROP TABLE IF EXISTS photos CASCADE;

-- 创建新的颜值评价表
CREATE TABLE IF NOT EXISTS beauty_scores (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 三个评价维度
  photoshop_level DECIMAL(3, 1) NOT NULL CHECK (photoshop_level >= 0 AND photoshop_level <= 10), -- P图程度 0-10
  beauty_type TEXT NOT NULL, -- 颜值类型标签（如"御姐型""清纯型"）
  beauty_score DECIMAL(3, 1) NOT NULL CHECK (beauty_score >= 0 AND beauty_score <= 10), -- 颜值评分 0-10
  -- 其他
  ai_comment TEXT, -- AI评语（可选）
  evaluator TEXT DEFAULT 'admin', -- 评价者（admin/AI）
  scored_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beauty_scores_profile ON beauty_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_beauty_scores_scored_at ON beauty_scores(scored_at);

-- 删除profiles表的颜值相关字段（如果有），重新添加
ALTER TABLE profiles 
DROP COLUMN IF EXISTS avg_beauty_score,
DROP COLUMN IF EXISTS has_photos;

-- 添加最新颜值评分字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS beauty_score DECIMAL(3, 1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS beauty_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS photoshop_level DECIMAL(3, 1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS beauty_evaluated_at TIMESTAMP DEFAULT NULL;
