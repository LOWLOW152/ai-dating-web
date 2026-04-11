-- ============================================
-- Schema V5: 添加题目快捷选项字段 (preset_options)
-- 用于聊天界面右侧/底部的快捷回复选项
-- ============================================

-- 为 questions 表添加 preset_options 字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'questions' AND column_name = 'preset_options') THEN
    ALTER TABLE questions ADD COLUMN preset_options JSONB DEFAULT NULL;
  END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN questions.preset_options IS '聊天界面的快捷选项，格式: ["选项1", "选项2", "选项3"]';
