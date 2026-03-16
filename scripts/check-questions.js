const { sql } = require('@vercel/postgres');

async function checkQuestions() {
  try {
    const result = await sql`
      SELECT id, question_key, main_text, main_type, part, main_options, has_preference
      FROM questions 
      WHERE is_active = true
      ORDER BY part, display_order
    `;
    
    console.log('=== 题目类型检查 ===\n');
    
    for (const q of result.rows) {
      const hasOptions = q.main_options && q.main_options.length > 0;
      const isSelectType = ['single', 'multiple', 'checkbox', 'radio'].includes(q.main_type);
      const isPart3 = q.part === 3;
      
      // 检查是否有选项但类型是dog(part=3)的情况
      if (hasOptions && isPart3) {
        console.log(`⚠️  WARNING: 第${q.id}题有选项但part=3(dog类型)`);
        console.log(`   题目标识: ${q.question_key}`);
        console.log(`   题目内容: ${q.main_text.substring(0, 40)}...`);
        console.log(`   选项数量: ${q.main_options.length}`);
        console.log(`   main_type: ${q.main_type}`);
        console.log('');
      }
      
      // 列出所有题目概况
      const typeLabel = q.part === 1 ? 'auto' : q.part === 2 ? 'semi' : 'dog';
      console.log(`${q.id.toString().padStart(2)}. [${typeLabel.toUpperCase()}] ${q.question_key.padEnd(20)} | ${hasOptions ? '有选项' : '无选项'} | ${q.main_type}`);
    }
    
    // 统计
    const part1 = result.rows.filter(q => q.part === 1).length;
    const part2 = result.rows.filter(q => q.part === 2).length;
    const part3 = result.rows.filter(q => q.part === 3).length;
    const problematic = result.rows.filter(q => {
      const hasOptions = q.main_options && q.main_options.length > 0;
      return hasOptions && q.part === 3;
    });
    
    console.log('\n=== 统计 ===');
    console.log(`Part 1 (auto): ${part1} 题`);
    console.log(`Part 2 (semi): ${part2} 题`);
    console.log(`Part 3 (dog): ${part3} 题`);
    console.log(`\n⚠️  有选项但类型为dog的题目: ${problematic.length} 题`);
    
    if (problematic.length > 0) {
      console.log('\n这些题目应该选择后追问，需要修复为part=2:');
      problematic.forEach(q => console.log(`  - ${q.question_key}`));
    }
    
  } catch (err) {
    console.error('查询失败:', err);
  }
  process.exit(0);
}

checkQuestions();
