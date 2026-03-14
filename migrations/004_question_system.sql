-- 问题系统重构 - 题库匹配系统 V2
-- 创建时间: 2026-03-15

-- 1. 问题分类表
CREATE TABLE IF NOT EXISTS question_categories (
  id SERIAL PRIMARY KEY,
  category_key VARCHAR(20) UNIQUE NOT NULL,
  category_name VARCHAR(50) NOT NULL,
  description TEXT,
  default_weight INTEGER DEFAULT 5 CHECK (default_weight BETWEEN 1 AND 10),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化六大维度
INSERT INTO question_categories (category_key, category_name, description, default_weight, sort_order) VALUES
('basic', '基础条件', '年龄、城市、异地等硬性条件', 7, 1),
('interest', '兴趣话题', '爱好、旅行、社交偏好', 6, 2),
('lifestyle', '生活方式', '消费观、作息、整洁度', 6, 3),
('values', '价值观', '家庭关系、人生选择', 8, 4),
('emotion', '情感核心', '依恋类型、核心需求、冲突处理', 9, 5),
('social', '社交模式', '社交圈子、角色定位', 5, 6)
ON CONFLICT (category_key) DO NOTHING;

-- 2. 题库主表
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_key VARCHAR(50) UNIQUE NOT NULL,
  category_key VARCHAR(20) NOT NULL REFERENCES question_categories(category_key),
  part INTEGER NOT NULL CHECK (part IN (1, 2, 3)),
  display_order INTEGER DEFAULT 0,
  
  -- 主问题
  main_text TEXT NOT NULL,
  main_type VARCHAR(20) NOT NULL CHECK (main_type IN ('text', 'radio', 'select', 'multiple', 'number')),
  main_options JSONB,
  main_placeholder TEXT,
  main_required BOOLEAN DEFAULT true,
  
  -- AI追问配置
  ai_enabled BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  
  -- 匹配算法配置
  match_algorithm VARCHAR(30) NOT NULL DEFAULT 'no_match',
  match_config JSONB DEFAULT '{}',
  is_deal_breaker BOOLEAN DEFAULT false,
  
  -- 偏好问题（可选）
  has_preference BOOLEAN DEFAULT false,
  preference_text TEXT,
  preference_required BOOLEAN DEFAULT false,
  preference_default VARCHAR(20) DEFAULT 'dontcare',
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_questions_category ON questions(category_key);
CREATE INDEX idx_questions_part ON questions(part);
CREATE INDEX idx_questions_active ON questions(is_active);
CREATE INDEX idx_questions_order ON questions(part, display_order);

-- 3. 用户答案表（新表，与现有profiles解耦）
CREATE TABLE IF NOT EXISTS user_answers (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_key VARCHAR(50) NOT NULL REFERENCES questions(question_key),
  
  main_answer TEXT NOT NULL,
  main_answer_normalized JSONB,
  preference_answer VARCHAR(20),
  
  ai_followup_q TEXT,
  ai_followup_a TEXT,
  ai_extracted_tags JSONB,
  ai_confidence FLOAT,
  
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(profile_id, question_key)
);

CREATE INDEX idx_user_answers_profile ON user_answers(profile_id);
CREATE INDEX idx_user_answers_question ON user_answers(question_key);

-- 4. 用户类别权重偏好表
CREATE TABLE IF NOT EXISTS user_category_weights (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_key VARCHAR(20) NOT NULL REFERENCES question_categories(category_key),
  custom_weight INTEGER CHECK (custom_weight BETWEEN 1 AND 10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(profile_id, category_key)
);

-- 5. 匹配结果缓存表
CREATE TABLE IF NOT EXISTS match_results (
  id SERIAL PRIMARY KEY,
  profile_a_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_b_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  total_score INTEGER CHECK (total_score BETWEEN 0 AND 100),
  is_blocked BOOLEAN DEFAULT false,
  block_reasons JSONB DEFAULT '[]',
  
  category_scores JSONB DEFAULT '{}',
  question_scores JSONB DEFAULT '[]',
  
  summary_text TEXT,
  
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  
  UNIQUE(profile_a_id, profile_b_id)
);

CREATE INDEX idx_match_results_a ON match_results(profile_a_id);
CREATE INDEX idx_match_results_b ON match_results(profile_b_id);
CREATE INDEX idx_match_results_expires ON match_results(expires_at);

-- 6. 创建用户权重视图
CREATE OR REPLACE VIEW user_weights_view AS
SELECT 
  p.id as profile_id,
  qc.category_key,
  qc.category_name,
  COALESCE(ucw.custom_weight, qc.default_weight) as weight
FROM profiles p
CROSS JOIN question_categories qc
LEFT JOIN user_category_weights ucw 
  ON p.id = ucw.profile_id AND qc.category_key = ucw.category_key
WHERE qc.is_active = true;

-- 7. 迁移现有数据（从question_bank）
-- 注：这部分在应用部署后手动执行或写脚本执行

COMMENT ON TABLE questions IS '题库主表 - 支持主问题+偏好问题';
COMMENT ON TABLE user_answers IS '用户答案表 - 解耦自profiles表';
COMMENT ON TABLE match_results IS '匹配结果缓存表';

