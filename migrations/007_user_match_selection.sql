-- ============================================
-- 用户匹配选择表
-- 存储用户在三选一界面做出的选择
-- ============================================

CREATE TABLE IF NOT EXISTS user_match_selections (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 用户选择的匹配对象
  selected_candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 选择时的匹配分数
  selection_score INTEGER,
  -- 选择时的报告摘要
  selection_report JSONB,
  -- 选择状态：active(有效), replaced(被重新匹配替换), cancelled(取消)
  status TEXT DEFAULT 'active',
  -- 重新匹配次数（后台可调整）
  remake_count INTEGER DEFAULT 0,
  max_remake_count INTEGER DEFAULT 0,
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- 唯一约束：一个用户只能有一个有效选择
  UNIQUE(profile_id, status)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ums_profile ON user_match_selections(profile_id);
CREATE INDEX IF NOT EXISTS idx_ums_candidate ON user_match_selections(selected_candidate_id);
CREATE INDEX IF NOT EXISTS idx_ums_status ON user_match_selections(status);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_user_match_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ums_updated_at ON user_match_selections;
CREATE TRIGGER trg_update_ums_updated_at
BEFORE UPDATE ON user_match_selections
FOR EACH ROW
EXECUTE FUNCTION update_user_match_selections_updated_at();

-- ============================================
-- 用户匹配报告缓存表
-- 存储润色后的AI匹配报告，供用户端展示
-- ============================================

CREATE TABLE IF NOT EXISTS user_match_reports (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 匹配分数
  overall_score INTEGER,
  similarity_score INTEGER,
  complement_score INTEGER,
  -- AI润色后的推荐理由（优势）
  strengths_summary TEXT,
  -- AI润色后的风险提示（冲突点）
  risks_summary TEXT,
  -- 完整报告JSON
  full_report JSONB,
  -- 是否在三选一Top 3中展示
  is_top3 BOOLEAN DEFAULT false,
  rank INTEGER,
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, candidate_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_umr_profile ON user_match_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_umr_candidate ON user_match_reports(candidate_id);
CREATE INDEX IF NOT EXISTS idx_umr_top3 ON user_match_reports(profile_id, is_top3, rank);

-- 触发器：自动更新 updated_at
DROP TRIGGER IF EXISTS trg_update_umr_updated_at ON user_match_reports;
CREATE TRIGGER trg_update_umr_updated_at
BEFORE UPDATE ON user_match_reports
FOR EACH ROW
EXECUTE FUNCTION update_user_match_selections_updated_at();
