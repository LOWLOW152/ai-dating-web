-- 数据库迁移：添加第三部分追问和权重相关字段

-- 添加第二部分追问字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobby_match_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_match_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_circle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_circle_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_role_preference TEXT;

-- 添加第三部分追问字段（一致性询问）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spending_consistency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_consistency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tidiness_consistency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stress_consistency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_consistency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_consistency TEXT;

-- 添加权重字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_weights JSONB;

-- 删除旧的不需要的字段（可选，保留兼容性先不删）
-- ALTER TABLE profiles DROP COLUMN IF EXISTS weekend_style;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS long_term_hobby;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS spiritual_enjoyment;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS recent_interest;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS friend_preference;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS unique_hobby;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS decision_style;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS planning_style;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS achievement_source;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS solitude_feeling;
