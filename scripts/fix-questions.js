const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fix() {
  console.log('🔧 修复题库数据...\n');
  
  const client = await pool.connect();
  
  try {
    // 获取旧数据
    const oldQ = await client.query('SELECT * FROM question_bank ORDER BY display_order');
    console.log(`旧表有 ${oldQ.rows.length} 条记录`);
    
    // 获取新数据
    const newQ = await client.query('SELECT question_key FROM questions');
    console.log(`新表有 ${newQ.rows.length} 条记录`);
    
    const existingKeys = new Set(newQ.rows.map(r => r.question_key));
    
    // 找出缺失的
    const missing = oldQ.rows.filter(q => !existingKeys.has(q.question_key) && !q.question_key.endsWith('_preference'));
    console.log(`\n缺失 ${missing.length} 道主问题`);
    
    // 算法映射
    const algorithmMap = {
      'deal_breaker': 'must_match',
      'similarity_match': 'set_similarity',
      'consistency_match': 'level_similarity',
      'semantic_similarity': 'semantic_similarity',
      'deal_breaker_check': 'keyword_blocker'
    };
    
    const categoryMap = {
      'basic': 'basic', 'interest': 'interest', 'social': 'social',
      'lifestyle': 'lifestyle', 'values': 'values', 'emotion': 'emotion'
    };
    
    let added = 0;
    
    for (const q of missing) {
      try {
        let algorithm = 'no_match';
        let matchConfig = '{}';
        
        if (q.match_logic) {
          const logic = typeof q.match_logic === 'string' ? JSON.parse(q.match_logic) : q.match_logic;
          algorithm = algorithmMap[logic.type] || 'no_match';
        }
        
        await client.query(`
          INSERT INTO questions (question_key, category_key, part, display_order,
            main_text, main_type, main_options, main_required,
            ai_enabled, match_algorithm, match_config, is_deal_breaker,
            has_preference, preference_required, preference_default, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          q.question_key,
          categoryMap[q.category] || 'basic',
          q.part || 1, q.display_order || 0,
          q.question_text, q.question_type || 'text', q.options,
          q.is_required !== false, q.is_ai_monitored || false,
          algorithm, matchConfig, false, false, false, 'dontcare', true
        ]);
        
        added++;
        console.log(`  ✅ ${q.question_key}`);
      } catch (err) {
        console.error(`  ❌ ${q.question_key}: ${err.message}`);
      }
    }
    
    // 处理偏好问题
    console.log('\n处理偏好问题...');
    const prefs = oldQ.rows.filter(q => q.question_key.endsWith('_preference'));
    
    for (const p of prefs) {
      const baseKey = p.question_key.replace('_preference', '');
      try {
        await client.query(`
          UPDATE questions 
          SET has_preference = true, preference_text = $1
          WHERE question_key = $2
        `, [p.question_text, baseKey]);
        console.log(`  ✅ ${p.question_key} -> ${baseKey}`);
      } catch (err) {
        console.error(`  ❌ ${p.question_key}: ${err.message}`);
      }
    }
    
    console.log(`\n✅ 修复完成！新增 ${added} 道题目`);
    
    // 最终统计
    const count = await client.query('SELECT COUNT(*) as count FROM questions');
    console.log(`题库总计: ${count.rows[0].count} 道`);
    
  } catch (err) {
    console.error('❌ 失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();