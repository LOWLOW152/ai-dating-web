const { sql } = require('@vercel/postgres');

async function fixQuestions() {
  try {
    const questionsToFix = [
      'spending_habit',
      'sleep_schedule', 
      'tidiness',
      'smoke_drink',
      'time_together',
      'conflict_handling'
    ];
    
    console.log('=== 修复题目类型 ===\n');
    
    for (const key of questionsToFix) {
      const result = await sql`
        UPDATE questions 
        SET part = 2, updated_at = NOW()
        WHERE question_key = ${key}
        RETURNING id, question_key, part, main_text
      `;
      
      if (result.rows.length > 0) {
        console.log(`✅ ${key} -> part=2 (semi)`);
      } else {
        console.log(`⚠️ ${key} 未找到`);
      }
    }
    
    console.log('\n=== 修复完成 ===');
    
    // 验证
    const check = await sql`
      SELECT question_key, part FROM questions 
      WHERE question_key = ANY(ARRAY['spending_habit', 'sleep_schedule', 'tidiness', 'smoke_drink', 'time_together', 'conflict_handling'])
      ORDER BY question_key
    `;
    
    console.log('\n验证结果:');
    for (const row of check.rows) {
      const typeLabel = row.part === 1 ? 'auto' : row.part === 2 ? 'semi' : 'dog';
      console.log(`  ${row.question_key}: part=${row.part} (${typeLabel})`);
    }
    
  } catch (err) {
    console.error('修复失败:', err);
  }
  process.exit(0);
}

fixQuestions();
