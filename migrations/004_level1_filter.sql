-- ============================================
-- Schema V4: 第一层硬性条件筛选 + 赛马机制
-- ============================================

-- ============================================
-- 7. 第一层候选匹配表 (match_candidates)
-- ============================================
CREATE TABLE IF NOT EXISTS match_candidates (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passed_level_1 BOOLEAN DEFAULT false,
  failed_reason TEXT,  -- 失败原因: gender/age/location/education/diet
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_mc_profile ON match_candidates(profile_id);
CREATE INDEX IF NOT EXISTS idx_mc_candidate ON match_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_mc_passed ON match_candidates(profile_id, passed_level_1) WHERE passed_level_1 = true;

-- ============================================
-- 8. 第一层筛选配置表 (level1_filter_config)
-- 管理员可配置哪些条件是硬性条件
-- ============================================
CREATE TABLE IF NOT EXISTS level1_filter_config (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL,  -- hard_filter(硬性排除) / soft_preference(软性偏好)
  filter_rule TEXT NOT NULL,  -- 规则类型: gender_opposite/age_mutual/city_or_accept/education_min/diet_compatible
  is_enabled BOOLEAN DEFAULT true,
  params JSONB DEFAULT '{}',  -- 额外参数
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, question_id, filter_rule)
);

CREATE INDEX IF NOT EXISTS idx_l1fc_template ON level1_filter_config(template_id);
CREATE INDEX IF NOT EXISTS idx_l1fc_question ON level1_filter_config(question_id);

-- ============================================
-- 9. 档案年龄接受范围字段（加到 profiles 表）
-- ============================================
-- 检查列是否存在，不存在则添加
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'accept_age_min') THEN
    ALTER TABLE profiles ADD COLUMN accept_age_min INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'accept_age_max') THEN
    ALTER TABLE profiles ADD COLUMN accept_age_max INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'accept_education_min') THEN
    ALTER TABLE profiles ADD COLUMN accept_education_min TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'diet_restrictions') THEN
    ALTER TABLE profiles ADD COLUMN diet_restrictions TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 初始化第一层筛选配置（默认配置）
-- ============================================
INSERT INTO level1_filter_config (template_id, question_id, filter_type, filter_rule, is_enabled, params)
VALUES 
-- 性别：必须异性
('v1_default', 'gender', 'hard_filter', 'gender_opposite', true, '{}'),

-- 年龄：双向互适（需要用户配置接受范围）
('v1_default', 'age_gap_preference', 'hard_filter', 'age_mutual', true, '{}'),

-- 地域：不接受异地则必须同城
('v1_default', 'long_distance', 'hard_filter', 'city_or_accept', true, '{}'),

-- 学历：可配置最低要求
('v1_default', 'education', 'soft_preference', 'education_min', false, '{"min_level": "本科"}'),

-- 饮食：必须兼容（如素食vs无肉不欢冲突）
('v1_default', 'diet', 'soft_preference', 'diet_compatible', false, '{}')
ON CONFLICT (template_id, question_id, filter_rule) DO UPDATE SET
  filter_type = EXCLUDED.filter_type,
  is_enabled = EXCLUDED.is_enabled,
  params = EXCLUDED.params;

-- ============================================
-- 添加档案计算状态字段
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'level1_calculated_at') THEN
    ALTER TABLE profiles ADD COLUMN level1_calculated_at TIMESTAMP;
  END IF;
END $$;
