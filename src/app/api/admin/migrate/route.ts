import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const MIGRATIONS = [
  {
    name: '004_level1_filter',
    description: '第一层筛选相关表',
    sql: `
-- 第一层候选匹配结果表
CREATE TABLE IF NOT EXISTS match_candidates (
    id SERIAL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    candidate_id VARCHAR(255) NOT NULL,
    passed_level_1 BOOLEAN DEFAULT false,
    failed_reason VARCHAR(50),
    calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(profile_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_match_candidates_profile_id ON match_candidates(profile_id);
CREATE INDEX IF NOT EXISTS idx_match_candidates_candidate_id ON match_candidates(candidate_id);

-- 第一层筛选配置表
CREATE TABLE IF NOT EXISTS level1_filter_config (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL,
    question_id VARCHAR(255) NOT NULL,
    filter_type VARCHAR(50) NOT NULL DEFAULT 'hard_filter',
    filter_rule VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    params JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_level1_filter_config_template ON level1_filter_config(template_id);

-- profiles 表新增字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accept_age_min INTEGER DEFAULT -5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accept_age_max INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accept_education_min VARCHAR(50) DEFAULT '高中';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet_restrictions JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level1_calculated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_profiles_level1_calculated ON profiles(level1_calculated_at);
    `
  },
  {
    name: '004_level1_filter_seed',
    description: '插入默认第一层筛选规则',
    sql: `
-- 先添加唯一约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_level1_filter_config_template_rule'
  ) THEN
    CREATE UNIQUE INDEX idx_level1_filter_config_template_rule ON level1_filter_config(template_id, filter_rule);
  END IF;
END $$;

-- 插入默认筛选规则
INSERT INTO level1_filter_config (template_id, question_id, filter_type, filter_rule, is_enabled, params)
VALUES 
  ('v1_default', 'gender', 'hard_filter', 'gender_opposite', true, '{}'),
  ('v1_default', 'age', 'hard_filter', 'age_mutual', true, '{}'),
  ('v1_default', 'city', 'hard_filter', 'city_or_accept', true, '{}'),
  ('v1_default', 'education', 'hard_filter', 'education_min', true, '{}'),
  ('v1_default', 'diet', 'hard_filter', 'diet_compatible', true, '{}')
ON CONFLICT (template_id, filter_rule) DO NOTHING;
    `
  },
  {
    name: '005_standardized_answers',
    description: 'AI标准化答案字段',
    sql: `
-- 添加标准化答案字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS standardized_answers JSONB DEFAULT NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_standardized_answers ON profiles USING GIN (standardized_answers);
    `
  },
  {
    name: '006_level2_level3',
    description: '第二层、第三层匹配字段和配置表',
    sql: `
-- match_candidates 表新增第二层、第三层字段
ALTER TABLE match_candidates 
ADD COLUMN IF NOT EXISTS level_2_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS level_2_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS level_2_calculated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS level_3_report JSONB,
ADD COLUMN IF NOT EXISTS level_3_calculated_at TIMESTAMP;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_match_candidates_level2 ON match_candidates(profile_id, level_2_passed, level_2_score);
CREATE INDEX IF NOT EXISTS idx_match_candidates_level3 ON match_candidates(profile_id, level_3_calculated_at);

-- 第二层筛选配置表
CREATE TABLE IF NOT EXISTS level2_config (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(255) NOT NULL DEFAULT 'v1_default',
    question_keys TEXT[] NOT NULL,
    similarity_threshold DECIMAL(5,2) DEFAULT 60.0,
    top_percent INTEGER DEFAULT 20,
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

-- 第三层匹配报告表
CREATE TABLE IF NOT EXISTS level3_reports (
    id SERIAL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    candidate_id VARCHAR(255) NOT NULL,
    overall_score INTEGER,
    similarity_score INTEGER,
    complement_score INTEGER,
    strengths TEXT[],
    risks TEXT[],
    advice TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(profile_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_level3_reports_profile ON level3_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_level3_reports_candidate ON level3_reports(candidate_id);
    `
  },
  {
    name: '007_match_automation_status',
    description: '自动化匹配状态字段和日志表',
    sql: `
-- 档案匹配状态字段（加到 profiles 表）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level1_status TEXT DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level2_status TEXT DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level3_status TEXT DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level1_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level2_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_level3_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_error TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level2_max_score INTEGER;

-- 自动化匹配日志表
CREATE TABLE IF NOT EXISTS match_automation_logs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL,
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

-- 匹配队列表
CREATE TABLE IF NOT EXISTS match_queue (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  layer INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(profile_id, layer)
);

CREATE INDEX IF NOT EXISTS idx_mq_status_layer ON match_queue(status, layer);
CREATE INDEX IF NOT EXISTS idx_mq_priority ON match_queue(priority DESC, created_at);
    `
  },
  {
    name: '008_fix_match_status_data',
    description: '修复已有匹配数据的状态字段',
    sql: `
-- 修复第一层状态：已经有 level1_calculated_at 的标记为 completed
UPDATE profiles 
SET match_level1_status = 'completed',
    match_level1_at = COALESCE(match_level1_at, level1_calculated_at)
WHERE level1_calculated_at IS NOT NULL 
  AND (match_level1_status IS NULL OR match_level1_status = 'pending');

-- 修复第二层状态：已经有 level_2_score 的标记为 completed 并更新最高分
UPDATE profiles 
SET match_level2_status = 'completed',
    match_level2_at = COALESCE(match_level2_at, NOW()),
    level2_max_score = (
      SELECT MAX(level_2_score)
      FROM match_candidates
      WHERE profile_id = profiles.id
        AND passed_level_1 = true
        AND level_2_score IS NOT NULL
    )
WHERE id IN (
  SELECT DISTINCT profile_id 
  FROM match_candidates 
  WHERE level_2_score IS NOT NULL
)
AND (match_level2_status IS NULL OR match_level2_status = 'pending');

-- 修复第三层状态：已经有 level_3_report 的标记为 completed
UPDATE profiles 
SET match_level3_status = 'completed',
    match_level3_at = COALESCE(match_level3_at, NOW())
WHERE id IN (
  SELECT DISTINCT profile_id 
  FROM match_candidates 
  WHERE level_3_report IS NOT NULL
)
AND (match_level3_status IS NULL OR match_level3_status = 'pending');
    `
  },
  {
    name: '009_user_match_selections',
    description: '用户匹配选择表和报告缓存表',
    sql: `
-- 用户匹配选择表
CREATE TABLE IF NOT EXISTS user_match_selections (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selection_score INTEGER,
  selection_report JSONB,
  status TEXT DEFAULT 'active',
  remake_count INTEGER DEFAULT 0,
  max_remake_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, status)
);

CREATE INDEX IF NOT EXISTS idx_ums_profile ON user_match_selections(profile_id);
CREATE INDEX IF NOT EXISTS idx_ums_candidate ON user_match_selections(selected_candidate_id);
CREATE INDEX IF NOT EXISTS idx_ums_status ON user_match_selections(status);

-- 更新时间戳触发器
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

-- 用户匹配报告缓存表
CREATE TABLE IF NOT EXISTS user_match_reports (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score INTEGER,
  similarity_score INTEGER,
  complement_score INTEGER,
  strengths_summary TEXT,
  risks_summary TEXT,
  full_report JSONB,
  is_top3 BOOLEAN DEFAULT false,
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_umr_profile ON user_match_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_umr_candidate ON user_match_reports(candidate_id);
CREATE INDEX IF NOT EXISTS idx_umr_top3 ON user_match_reports(profile_id, is_top3, rank);

DROP TRIGGER IF EXISTS trg_update_umr_updated_at ON user_match_reports;
CREATE TRIGGER trg_update_umr_updated_at
BEFORE UPDATE ON user_match_reports
FOR EACH ROW
EXECUTE FUNCTION update_user_match_selections_updated_at();
    `
  },
  {
    name: '010_add_phone_claim',
    description: '邀请码用户领取功能（source/phone字段+每日配额）',
    sql: `
-- 新增 source 字段区分管理员生成 vs 用户自助领取
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin';
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS phone TEXT;

-- 索引优化查询
CREATE INDEX IF NOT EXISTS idx_invite_codes_source ON invite_codes(source);
CREATE INDEX IF NOT EXISTS idx_invite_codes_phone ON invite_codes(phone);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_at ON invite_codes(created_at);

-- 初始化每日配额配置（默认100个）
INSERT INTO system_configs (key, value) VALUES ('daily_invite_quota', '100')
ON CONFLICT (key) DO NOTHING;
    `
  }
];

// POST /api/admin/migrate - 执行数据库迁移
export async function POST() {
  try {
    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const migration of MIGRATIONS) {
      try {
        // 执行迁移
        await sql.query(migration.sql);
        results.push({ name: migration.name, status: 'success' });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`Migration ${migration.name} error:`, error);
        // 忽略"已存在"的错误
        if (error.includes('already exists') || error.includes('duplicate')) {
          results.push({ name: migration.name, status: 'already_exists' });
        } else {
          results.push({ name: migration.name, status: 'error', error });
        }
      }
    }

    const allSuccess = results.every(r => r.status === 'success' || r.status === 'already_exists');

    return NextResponse.json({
      success: allSuccess,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/admin/migrate - 获取迁移状态
export async function GET() {
  try {
    const status: Array<{ name: string; description: string; applied: boolean }> = [];

    // 检查各表是否存在
    const tables = ['match_candidates', 'level1_filter_config'];
    for (const table of tables) {
      const res = await sql.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [table]
      );
      status.push({
        name: `表: ${table}`,
        description: '',
        applied: res.rows[0].exists
      });
    }

    // 检查 level1_filter_config 是否有默认筛选规则数据
    try {
      const filterCountRes = await sql.query(
        "SELECT COUNT(*) as count FROM level1_filter_config WHERE template_id = 'v1_default'"
      );
      const hasFilters = parseInt(filterCountRes.rows[0].count) >= 5;
      status.push({
        name: '数据: 默认筛选规则',
        description: '性别、年龄、地域等5条规则',
        applied: hasFilters
      });
    } catch {
      // 表可能不存在
      status.push({
        name: '数据: 默认筛选规则',
        description: '性别、年龄、地域等5条规则',
        applied: false
      });
    }

    // 检查 standardized_answers 字段
    const colRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'standardized_answers')"
    );
    status.push({
      name: '字段: standardized_answers',
      description: 'AI标准化答案字段',
      applied: colRes.rows[0].exists
    });

    // 检查 level2_config 表
    const level2TableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'level2_config')"
    );
    status.push({
      name: '表: level2_config',
      description: '第二层筛选配置',
      applied: level2TableRes.rows[0].exists
    });

    // 检查 level3_reports 表
    const level3TableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'level3_reports')"
    );
    status.push({
      name: '表: level3_reports',
      description: '第三层深度匹配报告',
      applied: level3TableRes.rows[0].exists
    });

    // 检查 match_candidates 是否有第二层字段
    const level2ColRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'match_candidates' AND column_name = 'level_2_score')"
    );
    status.push({
      name: '字段: level_2_score 等',
      description: '第二层、第三层匹配字段',
      applied: level2ColRes.rows[0].exists
    });

    // 检查 profiles 是否有自动化匹配状态字段
    const matchStatusColRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'match_level1_status')"
    );
    status.push({
      name: '字段: match_level1_status 等',
      description: '自动化匹配状态字段（3层状态+时间戳）',
      applied: matchStatusColRes.rows[0].exists
    });

    // 检查 match_automation_logs 表
    const logsTableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'match_automation_logs')"
    );
    status.push({
      name: '表: match_automation_logs',
      description: '自动化匹配日志',
      applied: logsTableRes.rows[0].exists
    });

    // 检查 match_queue 表
    const queueTableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'match_queue')"
    );
    status.push({
      name: '表: match_queue',
      description: '匹配任务队列',
      applied: queueTableRes.rows[0].exists
    });

    // 检查是否需要修复匹配状态数据
    try {
      const fixCheckRes = await sql.query(
        `SELECT COUNT(*) as count 
         FROM profiles 
         WHERE level1_calculated_at IS NOT NULL 
           AND (match_level1_status IS NULL OR match_level1_status = 'pending')`
      );
      const needsFix = parseInt(fixCheckRes.rows[0].count) > 0;
      status.push({
        name: '数据: 匹配状态修复',
        description: needsFix ? `需要修复 ${fixCheckRes.rows[0].count} 条档案` : '已修复',
        applied: !needsFix
      });
    } catch {
      status.push({
        name: '数据: 匹配状态修复',
        description: '依赖字段未创建',
        applied: false
      });
    }

    // 检查 user_match_selections 表
    const umsTableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_match_selections')"
    );
    status.push({
      name: '表: user_match_selections',
      description: '用户匹配选择表',
      applied: umsTableRes.rows[0].exists
    });

    // 检查 user_match_reports 表
    const umrTableRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_match_reports')"
    );
    status.push({
      name: '表: user_match_reports',
      description: '用户匹配报告缓存表',
      applied: umrTableRes.rows[0].exists
    });

    // 检查 invite_codes 的 source 字段
    const inviteSourceColRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'source')"
    );
    status.push({
      name: '字段: invite_codes.source',
      description: '邀请码来源（admin/user_claim）',
      applied: inviteSourceColRes.rows[0].exists
    });

    // 检查 invite_codes 的 phone 字段
    const invitePhoneColRes = await sql.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'phone')"
    );
    status.push({
      name: '字段: invite_codes.phone',
      description: '用户领取手机号',
      applied: invitePhoneColRes.rows[0].exists
    });

    // 检查每日配额配置
    try {
      const quotaRes = await sql.query(
        "SELECT EXISTS (SELECT FROM system_configs WHERE key = 'daily_invite_quota')"
      );
      status.push({
        name: '配置: daily_invite_quota',
        description: '每日邀请码配额（默认100）',
        applied: quotaRes.rows[0].exists
      });
    } catch {
      status.push({
        name: '配置: daily_invite_quota',
        description: '每日邀请码配额（默认100）',
        applied: false
      });
    }

    return NextResponse.json({ success: true, status });

  } catch (error) {
    console.error('Get migration status error:', error);
    return NextResponse.json(
      { success: false, error: '获取状态失败' },
      { status: 500 }
    );
  }
}
