-- 邀请码用户领取功能迁移
-- 1. 新增 source 字段区分管理员生成 vs 用户自助领取
-- 2. 新增 phone 字段存储用户手机号
-- 3. 初始化每日配额配置

ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin';
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS phone TEXT;

-- 索引优化查询
CREATE INDEX IF NOT EXISTS idx_invite_codes_source ON invite_codes(source);
CREATE INDEX IF NOT EXISTS idx_invite_codes_phone ON invite_codes(phone);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_at ON invite_codes(created_at);

-- 初始化每日配额配置（默认100个）
INSERT INTO system_configs (key, value) VALUES ('daily_invite_quota', '100')
ON CONFLICT (key) DO NOTHING;
