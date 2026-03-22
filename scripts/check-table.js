const { sql } = require('../src/lib/db');

async function checkTable() {
  try {
    // 检查 profiles 表的列类型
    const res = await sql.query(`
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
    
    // 尝试直接更新一个测试标签
    console.log('\n=== 尝试直接更新 ===');
    const updateRes = await sql.query(
      `UPDATE profiles SET tags = $1::jsonb, updated_at = NOW() 
       WHERE invite_code = 'PQMU4BUK' 
       RETURNING tags`,
      [['测试']]
    );
    console.log('更新结果:', updateRes.rows);
    
  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    process.exit(0);
  }
}

checkTable();
