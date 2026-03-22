const { sql } = require('./src/lib/db');

async function checkTags() {
  try {
    const res = await sql.query(
      'SELECT id, invite_code, tags, jsonb_typeof(tags) as tag_type FROM profiles LIMIT 5'
    );
    
    console.log('=== 检查 tags 字段 ===\n');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`邀请码: ${row.invite_code}`);
      console.log(`tags 类型: ${row.tag_type || 'null'}`);
      console.log(`tags 值: ${JSON.stringify(row.tags)}`);
      console.log('---');
    });
    
  } catch (err) {
    console.error('查询错误:', err);
  } finally {
    process.exit(0);
  }
}

checkTags();
