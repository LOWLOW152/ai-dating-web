-- Migration: 添加标准化答案字段
-- 用于AI评价后存储标准化字段值，供第一层筛选使用

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS standardized_answers JSONB DEFAULT NULL;

-- 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_profiles_standardized_answers ON profiles USING GIN (standardized_answers);
