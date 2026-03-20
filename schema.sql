-- AI相亲系统数据库 Schema V3 (App Router)

-- ============================================
-- 1. 题库表 (questions)
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  field_type TEXT NOT NULL,
  validation JSONB DEFAULT '{}',
  options JSONB DEFAULT NULL,
  ai_prompt TEXT,
  closing_message TEXT DEFAULT NULL,
  hierarchy JSONB DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions("order");

-- ============================================
-- 2. 资料库模板表 (profile_templates)
-- ============================================
CREATE TABLE IF NOT EXISTS profile_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_default ON profile_templates(is_default) WHERE is_default = true;

-- ============================================
-- 3. 资料库权重配置表 (template_weights)
-- ============================================
CREATE TABLE IF NOT EXISTS template_weights (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  match_enabled BOOLEAN DEFAULT true,
  match_algorithm TEXT,
  match_weight INTEGER DEFAULT 10,
  algorithm_params JSONB DEFAULT '{}',
  is_veto BOOLEAN DEFAULT false,
  veto_condition JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_tw_template ON template_weights(template_id);
CREATE INDEX IF NOT EXISTS idx_tw_question ON template_weights(question_id);

-- ============================================
-- 4. 用户档案表 (profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  question_version TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  ai_summary JSONB,
  status TEXT DEFAULT 'active',
  manual_tags TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);

-- ============================================
-- 5. 邀请码表 (invite_codes)
-- ============================================
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  status TEXT DEFAULT 'unused',
  used_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. 匹配结果缓存表 (match_results)
-- ============================================
CREATE TABLE IF NOT EXISTS match_results (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES profile_templates(id),
  profile_a_id TEXT NOT NULL REFERENCES profiles(id),
  profile_b_id TEXT NOT NULL REFERENCES profiles(id),
  overall_score INTEGER NOT NULL,
  category_scores JSONB,
  details JSONB,
  veto_flags TEXT[],
  suggestions TEXT[],
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(template_id, profile_a_id, profile_b_id)
);

CREATE INDEX IF NOT EXISTS idx_mr_template ON match_results(template_id);
CREATE INDEX IF NOT EXISTS idx_mr_profiles ON match_results(profile_a_id, profile_b_id);

-- ============================================
-- 初始化数据
-- ============================================
INSERT INTO profile_templates (id, name, description, is_default, is_active)
VALUES ('v1_default', '默认版本', '适合大多数用户的匹配算法', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, ai_prompt, is_active, is_required)
VALUES 
('nickname', 'basic', 'auto', 1, '怎么称呼你？', 'text', '{"required": true, "maxLength": 20}', '询问用户昵称', true, true),
('gender', 'basic', 'auto', 2, '你的性别是？', 'select', '{"required": true}', '确认性别', true, true),
('birth_year', 'basic', 'auto', 3, '你哪一年出生的？', 'number', '{"required": true, "min": 1970, "max": 2005}', '确认出生年份', true, true),
('city', 'basic', 'auto', 4, '你现在在哪个城市？', 'text', '{"required": true}', '确认城市', true, true),
('interests', 'lifestyle', 'semi', 5, '平时有什么兴趣爱好？', 'multi_text', '{"required": true}', '追问具体类型', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_weights (template_id, question_id, match_enabled, match_algorithm, match_weight, is_veto)
VALUES 
('v1_default', 'nickname', false, null, 0, false),
('v1_default', 'gender', true, 'must_match', 20, false),
('v1_default', 'birth_year', true, 'range_compatible', 15, false),
('v1_default', 'city', true, 'must_match', 20, true),
('v1_default', 'interests', true, 'set_similarity', 15, false)
ON CONFLICT (template_id, question_id) DO NOTHING;