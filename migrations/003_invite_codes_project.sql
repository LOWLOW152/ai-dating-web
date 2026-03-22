-- 邀请码表迁移：添加 project_usages 字段，修改 max_uses 默认值

-- 1. 添加 project_usages 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invite_codes' AND column_name = 'project_usages'
  ) THEN
    ALTER TABLE invite_codes ADD COLUMN project_usages JSONB DEFAULT '{}';
  END IF;
END $$;

-- 2. 修改 max_uses 默认值为 2（颜值打分 + 问卷各一次）
ALTER TABLE invite_codes ALTER COLUMN max_uses SET DEFAULT 2;

-- 3. 更新现有数据：将 use_count 根据 profiles 表重新计算
-- 把已有档案的邀请码标记为已使用
UPDATE invite_codes ic
SET 
  status = CASE WHEN p.id IS NOT NULL THEN 'used' ELSE 'unused' END,
  use_count = CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END,
  project_usages = CASE 
    WHEN p.id IS NOT NULL THEN '{"questionnaire": {"used": true}}'::jsonb 
    ELSE '{}' 
  END
FROM profiles p
WHERE ic.code = p.invite_code;

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_invite_codes_status ON invite_codes(status);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created ON invite_codes(created_at);
