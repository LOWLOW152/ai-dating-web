const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fix() {
  const client = await pool.connect();
  
  try {
    const oldQ = await client.query('SELECT * FROM question_bank ORDER BY display_order');
    const existing = await client.query('SELECT question_key FROM questions');
    const existingKeys = new Set(existing.rows.map(r => r.question_key));
    
    const missing = oldQ.rows.filter(q => !existingKeys.has(q.question_key) && !q.question_key.endsWith('_preference'));
    
    console.log(`修复 ${missing.length} 道题目...\n`);
    
    const algorithmMap = {
      'deal_breaker': 'must_match', 'similarity_match': 'set_similarity',
      'consistency_match': 'level_similarity', 'semantic_similarity': 'semantic_similarity',
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
        
        // 处理 options - 确保是有效的JSON
        let options = null;
        if (q.options) {
          if (typeof q.options === 'string') {
            options = q.options; // 已经是JSON字符串
          } else {
            options = JSON.stringify(q.options);
          }
        }
        
        await client.query(`
          INSERT INTO questions (question_key, category_key, part, display_order,
            main_text, main_type, main_options, main_required,
            ai_enabled, match_algorithm, match_config, is_deal_breaker,
            has_preference, preference_required, preference_default, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          q.question_key, categoryMap[q.category] || 'basic', q.part || 1, q.display_order || 0,
          q.question_text, q.question_type || 'text', options, q.is_required !== false,
          q.is_ai_monitored || false, algorithm, matchConfig, false, false, false, 'dontcare', true
        ]);
        
        added++;
        console.log(`✅ ${q.question_key}`);
      } catch (err) {
        console.error(`❌ ${q.question_key}: ${err.message}`);
      }
    }
    
    console.log(`\n新增 ${added} 道题目`);
    
    const count = await client.query('SELECT COUNT(*) as count FROM questions');
    console.log(`题库总计: ${count.rows[0].count} 道`);
    
  } catch (err) {
    console.error('失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();