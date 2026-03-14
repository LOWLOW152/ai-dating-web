const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const client = await pool.connect();
  try {
    console.log('📊 迁移结果检查\n');
    
    const cats = await client.query('SELECT COUNT(*) as count FROM question_categories');
    console.log(`✅ question_categories: ${cats.rows[0].count} 条`);
    
    const questions = await client.query('SELECT COUNT(*) as count FROM questions');
    console.log(`✅ questions: ${questions.rows[0].count} 条`);
    
    const answers = await client.query('SELECT COUNT(*) as count FROM user_answers');
    console.log(`✅ user_answers: ${answers.rows[0].count} 条`);
    
    if (questions.rows[0].count > 0) {
      const sample = await client.query('SELECT question_key, category_key, match_algorithm, has_preference FROM questions LIMIT 5');
      console.log('\n📝 示例题目:');
      sample.rows.forEach(q => {
        console.log(`   - ${q.question_key} (${q.category_key}, ${q.match_algorithm}${q.has_preference ? ', 有偏好' : ''})`);
      });
    }
    
    console.log('\n✅ 迁移检查完成！');
  } catch (err) {
    console.error('❌ 检查失败:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();