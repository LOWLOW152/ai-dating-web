-- 添加 tone_config 字段到 questions 表
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tone_config JSONB DEFAULT NULL;
