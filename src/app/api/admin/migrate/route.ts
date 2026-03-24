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
      { success: false, error: '迁移失败' },
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

    return NextResponse.json({ success: true, status });

  } catch (error) {
    console.error('Get migration status error:', error);
    return NextResponse.json(
      { success: false, error: '获取状态失败' },
      { status: 500 }
    );
  }
}
