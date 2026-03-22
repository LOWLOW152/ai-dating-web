const { sql } = require('./src/lib/db');

async function debugTags() {
  try {
    // 1. 检查PQMU4BUK的tags字段
    const res = await sql.query(
      "SELECT id, invite_code, tags, jsonb_typeof(tags) as tag_type FROM profiles WHERE invite_code = 'PQMU4BUK'"
    );
    
    console.log('=== PQMU4BUK 标签详情 ===');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      console.log('ID:', row.id);
      console.log('邀请码:', row.invite_code);
      console.log('tags原始值:', row.tags);
      console.log('tags类型(jsonb_typeof):', row.tag_type);
      console.log('tags类型(js):', typeof row.tags);
    } else {
      console.log('未找到档案');
    }
    
    // 2. 检查所有档案的tags
    const allRes = await sql.query(
      "SELECT invite_code, tags, jsonb_typeof(tags) as tag_type FROM profiles WHERE tags IS NOT NULL LIMIT 5"
    );
    
    console.log('\n=== 有tags的档案 ===');
    allRes.rows.forEach(row => {
      console.log(`${row.invite_code}: ${JSON.stringify(row.tags)} (类型: ${row.tag_type})`);
    });
    
  } catch (err) {
    console.error('查询错误:', err);
  } finally {
    process.exit(0);
  }
}

debugTags();
