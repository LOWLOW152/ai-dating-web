const { sql } = require('../lib/db');

async function migrateSchema() {
  try {
    console.log('开始迁移数据库...');
    
    // 添加新字段
    await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS is_preference_for VARCHAR(50)`;
    await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS question_group VARCHAR(50)`;
    console.log('✅ 字段添加完成');
    
    // 清空旧数据
    await sql`TRUNCATE question_bank RESTART IDENTITY`;
    console.log('✅ 旧数据已清空');
    
    console.log('🎉 数据库迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

migrateSchema();
