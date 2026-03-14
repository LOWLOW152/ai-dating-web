const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  console.log('🚀 开始完整数据迁移...\n');
  
  const client = await pool.connect();
  
  try {
    // 清空新表重新迁移
    console.log('📋 清空新表...');
    await client.query('DELETE FROM user_answers');
    await client.query('DELETE FROM questions');
    console.log('✅ 已清空\n');

    console.log('📋 迁移题库数据...');
    const oldQuestions = await client.query('SELECT * FROM question_bank ORDER BY display_order');
    console.log(`   找到 ${oldQuestions.rows.length} 道旧题目`);
    
    const algorithmMap = {
      'deal_breaker': 'must_match',
      'similarity_match': 'set_similarity', 
      'consistency_match': 'level_similarity',
      'semantic_similarity': 'semantic_similarity',
      'deal_breaker_check': 'keyword_blocker',
      'age_match': 'range_compatible',
      'age_range_match': 'range_compatible',
      'location_match': 'must_match'
    };
    
    const categoryMap = {
      'basic': 'basic',
      'interest': 'interest', 
      'social': 'social',
      'lifestyle': 'lifestyle',
      'values': 'values',
      'emotion': 'emotion'
    };
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const q of oldQuestions.rows) {
      try {
        let matchConfig = '{}';
        let algorithm = 'no_match';
        let isDealBreaker = false;
        
        if (q.match_logic) {
          const logic = typeof q.match_logic === 'string' ? JSON.parse(q.match_logic) : q.match_logic;
          algorithm = algorithmMap[logic.type] || 'no_match';
          
          if (logic.type === 'consistency_match') {
            if (q.question_key === 'spending_habit') {
              matchConfig = JSON.stringify({
                levels: { '节俭型': 1, '理性消费': 2, '平衡型': 3, '享受型': 4, '奢侈型': 5 },
                maxDiff: 1, diffPenalty: 30
              });
            } else if (q.question_key === 'tidiness') {
              matchConfig = JSON.stringify({
                levels: { '洁癖级': 1, '整洁有序': 2, '随意随性': 3 },
                maxDiff: 1, diffPenalty: 30
              });
            }
          }
          
          if (logic.type === 'deal_breaker' || logic.type === 'deal_breaker_check') {
            isDealBreaker = true;
          }
        }
        
        // 偏好问题逻辑：xxx_preference 对应 xxx 的偏好
        const isPreference = q.question_key.endsWith('_preference');
        const baseKey = isPreference ? q.question_key.replace('_preference', '') : null;
        
        if (isPreference) {
          // 这是偏好问题，更新对应主问题的偏好设置
          await client.query(`
            UPDATE questions 
            SET has_preference = true,
                preference_text = $1,
                preference_default = 'dontcare'
            WHERE question_key = $2
          `, [q.question_text, baseKey]);
          
          migratedCount++;
          continue;
        }
        
        // 判断是否有对应偏好问题
        const hasPreference = ['hobby_type', 'travel_style', 'social_circle', 
                               'spending_habit', 'sleep_schedule', 'tidiness'].includes(q.question_key);
        
        const prefText = hasPreference ? getPrefText(q.question_key) : null;
        
        await client.query(`
          INSERT INTO questions (
            question_key, category_key, part, display_order,
            main_text, main_type, main_options, main_required,
            ai_enabled, ai_prompt, match_algorithm, match_config, is_deal_breaker,
            has_preference, preference_text, preference_required, preference_default, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          q.question_key,
          categoryMap[q.category] || 'basic',
          q.part || 1,
          q.display_order || 0,
          q.question_text,
          q.question_type || 'text',
          q.options,
          q.is_required !== false,
          q.is_ai_monitored || false,
          q.ai_prompt,
          algorithm,
          matchConfig,
          isDealBreaker,
          hasPreference,
          prefText,
          false,
          'dontcare',
          q.is_active !== false
        ]);
        
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ ${q.question_key}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`✅ 题库迁移完成: ${migratedCount} 道, ${errorCount} 错误\n`);

    // 迁移用户答案
    console.log('📋 迁移用户答案...');
    const profiles = await client.query('SELECT * FROM profiles');
    console.log(`   找到 ${profiles.rows.length} 个档案`);
    
    const fieldMapping = {
      'nickname': 'nickname', 'gender': 'gender', 'birth_year': 'birth_year', 'city': 'city',
      'occupation': 'occupation', 'education': 'education', 'accept_long_distance': 'accept_long_distance',
      'age_range': 'age_range', 'hobby_type': 'hobby_type', 'travel_style': 'travel_style',
      'social_circle': 'social_circle', 'spending_habit': 'spending_habit',
      'sleep_schedule': 'sleep_schedule', 'tidiness': 'tidiness', 'stress_response': 'stress_response',
      'family_relationship': 'family_relationship', 'life_preference': 'life_preference',
      'current_state': 'current_state', 'trusted_for': 'trusted_for', 'understood_moment': 'understood_moment',
      'relationship_blindspot': 'relationship_blindspot', 'ideal_relationship': 'ideal_relationship',
      'core_need': 'core_need', 'conflict_handling': 'conflict_handling', 'contact_frequency': 'contact_frequency',
      'deal_breakers': 'deal_breakers', 'future_vision': 'future_vision'
    };
    
    let answerCount = 0;
    
    for (const profile of profiles.rows) {
      for (const [field, value] of Object.entries(profile)) {
        if (!value || !fieldMapping[field]) continue;
        
        try {
          await client.query(`
            INSERT INTO user_answers (profile_id, question_key, main_answer, answered_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (profile_id, question_key) DO UPDATE SET main_answer = EXCLUDED.main_answer
          `, [profile.id, fieldMapping[field], String(value), profile.created_at]);
          
          answerCount++;
        } catch (err) {}
      }
    }
    
    console.log(`✅ 答案迁移完成: ${answerCount} 条\n`);
    
    // 显示最终统计
    const finalCount = await client.query('SELECT COUNT(*) as count FROM questions');
    console.log('🎉 迁移完成！');
    console.log(`   - 题库题目: ${finalCount.rows[0].count} 道`);
    console.log(`   - 用户答案: ${answerCount} 条`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

function getPrefText(key) {
  const map = {
    'hobby_type': '你希望对方的兴趣爱好与你？',
    'travel_style': '你希望对方的旅行风格与你？',
    'social_circle': '你希望对方的社交圈子与你？',
    'spending_habit': '你希望对方的消费观念与你？',
    'sleep_schedule': '你希望对方的作息类型与你？',
    'tidiness': '你希望对方的整洁程度与你？'
  };
  return map[key] || '你希望对方与你？';
}

migrate();