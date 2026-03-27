-- Migration: 添加第二层、第三层匹配字段
-- 用于AI初筛和深度匹配

-- match_candidates 表新增字段
ALTER TABLE match_candidates 
ADD COLUMN IF NOT EXISTS level_2_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS level_2_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS level_2_calculated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS level_3_score INTEGER,
ADD COLUMN IF NOT EXISTS level_3_report JSONB,
ADD COLUMN IF NOT EXISTS level_3_calculated_at TIMESTAMP;

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_match_candidates_level2 ON match_candidates(profile_id, level_2_passed, level_2_score);
CREATE INDEX IF NOT EXISTS idx_match_candidates_level3 ON match_candidates(profile_id, level_3_calculated_at);

-- 第二层筛选配置表（管理员可配置）
CREATE TABLE IF NOT EXISTS level2_config (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL DEFAULT 'v1_default',
    question_keys TEXT[] NOT NULL, -- 参与评分的题目key列表
    similarity_threshold DECIMAL(5,2) DEFAULT 60.0, -- 及格分数线
    top_percent INTEGER DEFAULT 20, -- 取前百分之几
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id)
);

-- 插入默认配置（5道题）
INSERT INTO level2_config (template_id, question_keys, similarity_threshold, top_percent)
VALUES (
    'v1_default', 
    ARRAY['interests', 'sleep_schedule', 'social_mode', 'topics', 'exercise'],
    60.0,
    20
)
ON CONFLICT (template_id) DO NOTHING;

-- 第三层匹配报告表（存储详细报告）
CREATE TABLE IF NOT EXISTS level3_reports (
    id SERIAL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    candidate_id VARCHAR(255) NOT NULL,
    overall_score INTEGER, -- 综合匹配度 0-100
    similarity_score INTEGER, -- 相似度 0-100
    complement_score INTEGER, -- 互补度 0-100
    strengths TEXT[], -- 优势互补点
    risks TEXT[], -- 潜在风险点
    advice TEXT, -- 相处建议
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(profile_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_level3_reports_profile ON level3_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_level3_reports_candidate ON level3_reports(candidate_id);
