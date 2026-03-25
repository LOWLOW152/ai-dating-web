-- ============================================
-- Schema V5: 自动化匹配系统 - 状态追踪与日志
-- ============================================

-- ============================================
-- 1. 档案匹配状态字段（加到 profiles 表）
-- ============================================
DO $$
BEGIN
  -- 第一层状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level1_status') THEN
    ALTER TABLE profiles ADD COLUMN match_level1_status TEXT DEFAULT 'pending';
  END IF;
  
  -- 第二层状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level2_status') THEN
    ALTER TABLE profiles ADD COLUMN match_level2_status TEXT DEFAULT 'pending';
  END IF;
  
  -- 第三层状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level3_status') THEN
    ALTER TABLE profiles ADD COLUMN match_level3_status TEXT DEFAULT 'pending';
  END IF;
  
  -- 各层完成时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level1_at') THEN
    ALTER TABLE profiles ADD COLUMN match_level1_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level2_at') THEN
    ALTER TABLE profiles ADD COLUMN match_level2_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_level3_at') THEN
    ALTER TABLE profiles ADD COLUMN match_level3_at TIMESTAMP;
  END IF;
  
  -- 匹配异常信息
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'match_error') THEN
    ALTER TABLE profiles ADD COLUMN match_error TEXT;
  END IF;
  
  -- 第二层最高分（用于第三层触发判断）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'level2_max_score') THEN
    ALTER TABLE profiles ADD COLUMN level2_max_score INTEGER;
  END IF;
END $$;

-- ============================================
-- 2. 自动化匹配日志表
-- ============================================
CREATE TABLE IF NOT EXISTS match_automation_logs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_type TEXT NOT NULL,  -- 'level1', 'level2', 'level3', 'full_pipeline'
  status TEXT NOT NULL,    -- 'running', 'completed', 'failed', 'partial'
  total_profiles INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mal_run_date ON match_automation_logs(run_date);
CREATE INDEX IF NOT EXISTS idx_mal_run_type ON match_automation_logs(run_type);
CREATE INDEX IF NOT EXISTS idx_mal_status ON match_automation_logs(status);

-- ============================================
-- 3. 匹配队列表（用于控制并发）
-- ============================================
CREATE TABLE IF NOT EXISTS match_queue (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  layer INTEGER NOT NULL,  -- 2 or 3
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 0,     -- 优先级，第三层高分优先
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(profile_id, layer)
);

CREATE INDEX IF NOT EXISTS idx_mq_status_layer ON match_queue(status, layer);
CREATE INDEX IF NOT EXISTS idx_mq_priority ON match_queue(priority DESC, created_at);

-- ============================================
-- 4. match_candidates 表补充字段（如果不存在）
-- ============================================
DO $$
BEGIN
  -- 第二层相关字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'match_candidates' AND column_name = 'level_2_score') THEN
    ALTER TABLE match_candidates ADD COLUMN level_2_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'match_candidates' AND column_name = 'level_2_passed') THEN
    ALTER TABLE match_candidates ADD COLUMN level_2_passed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'match_candidates' AND column_name = 'level_2_calculated_at') THEN
    ALTER TABLE match_candidates ADD COLUMN level_2_calculated_at TIMESTAMP;
  END IF;
  
  -- 第三层相关字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'match_candidates' AND column_name = 'level_3_report') THEN
    ALTER TABLE match_candidates ADD COLUMN level_3_report JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'match_candidates' AND column_name = 'level_3_calculated_at') THEN
    ALTER TABLE match_candidates ADD COLUMN level_3_calculated_at TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- 5. 第二层配置表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS level2_config (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  question_keys TEXT[] DEFAULT ARRAY['interests', 'sleep_schedule', 'social_mode', 'topics', 'exercise'],
  min_score_to_level3 INTEGER DEFAULT 80,  -- 进入第三层的最低分数
  max_candidates_per_batch INTEGER DEFAULT 20,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id)
);

-- 初始化默认配置
INSERT INTO level2_config (template_id, question_keys, min_score_to_level3, is_enabled)
VALUES ('v1_default', ARRAY['interests', 'sleep_schedule', 'social_mode', 'topics', 'exercise'], 80, true)
ON CONFLICT (template_id) DO NOTHING;

-- ============================================
-- 6. 创建触发器函数：更新 profiles 表的第二层最高分
-- ============================================
CREATE OR REPLACE FUNCTION update_profile_level2_max_score()
RETURNS TRIGGER AS $$
BEGIN
  -- 当 match_candidates 的 level_2_score 更新时，更新对应 profile 的最高分
  UPDATE profiles
  SET level2_max_score = (
    SELECT COALESCE(MAX(level_2_score), 0)
    FROM match_candidates
    WHERE profile_id = NEW.profile_id
      AND passed_level_1 = true
      AND level_2_score IS NOT NULL
  )
  WHERE id = NEW.profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_level2_max_score ON match_candidates;
CREATE TRIGGER trg_update_level2_max_score
AFTER UPDATE OF level_2_score ON match_candidates
FOR EACH ROW
WHEN (OLD.level_2_score IS DISTINCT FROM NEW.level_2_score)
EXECUTE FUNCTION update_profile_level2_max_score();
