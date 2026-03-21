-- 数据库迁移：添加 use_closing_message 字段到 questions 表
-- 执行方式：在 Vercel Postgres 控制台或本地数据库执行

-- 添加字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'use_closing_message'
    ) THEN
        ALTER TABLE questions ADD COLUMN use_closing_message BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added use_closing_message column to questions table';
    ELSE
        RAISE NOTICE 'use_closing_message column already exists';
    END IF;
END $$;

-- 更新现有数据：如果为 NULL 则设为 true（默认开启）
UPDATE questions 
SET use_closing_message = true 
WHERE use_closing_message IS NULL;

-- 验证
SELECT id, question_text, max_questions, use_closing_message 
FROM questions 
LIMIT 5;
