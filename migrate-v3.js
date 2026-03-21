const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ 已连接到数据库');
    
    // 添加新字段到 beauty_scores
    await client.query(`
      ALTER TABLE beauty_scores 
      ADD COLUMN IF NOT EXISTS body_shape DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS symmetry DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS face_age DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS hairline DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS eye_bags DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS teeth DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS nose_bridge DECIMAL(3, 1) DEFAULT NULL
    `);
    console.log('✅ beauty_scores 表字段添加完成');
    
    // 添加新字段到 profiles
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS body_shape DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS symmetry DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS face_age DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS hairline DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS eye_bags DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS teeth DECIMAL(3, 1) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS nose_bridge DECIMAL(3, 1) DEFAULT NULL
    `);
    console.log('✅ profiles 表字段添加完成');
    
    console.log('\n🎉 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    await client.end();
  }
}

migrate();
