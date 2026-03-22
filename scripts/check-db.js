// 直接检查数据库
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_qB89zZO7NljK@ep-crimson-silence-a12yj3kn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTable() {
  const client = await pool.connect();
  try {
    // 检查 profiles 表的列类型
    const res = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'tags'
    `);
    
    console.log('=== profiles.tags 列信息 ===');
    if (res.rows.length > 0) {
      console.log(res.rows[0]);
    } else {
      console.log('未找到 tags 列');
    }
    
    // 查看PQMU4BUK当前tags值
    const currentRes = await client.query(
      "SELECT tags, pg_typeof(tags) as type FROM profiles WHERE invite_code = 'PQMU4BUK'"
    );
    console.log('\n=== PQMU4BUK 当前 tags ===');
    console.log(currentRes.rows[0]);
    
    // 尝试直接更新
    console.log('\n=== 尝试直接更新 ===');
    try {
      const updateRes = await client.query(
        `UPDATE profiles SET tags = $1::jsonb, updated_at = NOW() 
         WHERE invite_code = 'PQMU4BUK' 
         RETURNING tags`,
        [['测试']]
      );
      console.log('更新成功:', updateRes.rows[0]);
    } catch (err) {
      console.error('更新失败:', err.message);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable().catch(console.error);
