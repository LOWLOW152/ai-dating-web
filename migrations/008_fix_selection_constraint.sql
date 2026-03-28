-- 修复 user_match_selections 唯一约束问题
-- 原约束：UNIQUE(profile_id, status) - 每个status只能有一条记录，导致无法多次重新匹配
-- 新约束：只允许一个 active，replaced 可以有多个历史记录

-- 1. 先删除旧约束
ALTER TABLE user_match_selections 
DROP CONSTRAINT IF EXISTS user_match_selections_profile_id_status_key;

-- 2. 创建部分唯一索引，只限制 active 状态唯一
DROP INDEX IF EXISTS idx_unique_active_selection;
CREATE UNIQUE INDEX idx_unique_active_selection 
ON user_match_selections(profile_id) 
WHERE status = 'active';

-- 3. 添加普通索引方便查询 replaced 记录
DROP INDEX IF EXISTS idx_ums_profile_status;
CREATE INDEX idx_ums_profile_status 
ON user_match_selections(profile_id, status);
