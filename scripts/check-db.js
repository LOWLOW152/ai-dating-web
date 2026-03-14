const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const client = await pool.connect();
  
  console.log('📊 数据库检查\n');
  
  // 检查所有表
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%question%'
    ORDER BY table_name
  `);
  console.log('问题相关表:', tables.rows.map(r => r.table_name).join(', '));
  
  // 检查旧表
  const oldExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'question_bank'
    )
  `);
  
  if (oldExists.rows[0].exists) {
    const oldQ = await client.query('SELECT question_key, question_text FROM question_bank ORDER BY display_order');
    console.log(`\n📋 旧表 question_bank: ${oldQ.rows.length} 条`);
    oldQ.rows.forEach(q => console.log(`   - ${q.question_key}: ${q.question_text.substring(0, 30)}...`));
  } else {
    console.log('\n⚠️ 旧表 question_bank 不存在');
  }
  
  // 检查新表
  const newQ = await client.query('SELECT question_key, main_text, category_key, match_algorithm FROM questions ORDER BY part, display_order');
  console.log(`\n📋 新表 questions: ${newQ.rows.length} 条`);
  newQ.rows.forEach(q => console.log(`   - [${q.category_key}] ${q.question_key}: ${q.main_text.substring(0, 30)}... (${q.match_algorithm})`));
  
  client.release();
  await pool.end();
}

check();