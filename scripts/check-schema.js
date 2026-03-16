const { sql } = require('@vercel/postgres');

async function checkSchema() {
  try {
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questions'
      ORDER BY ordinal_position
    `;
    
    console.log('=== questions 表结构 ===\n');
    for (const col of result.rows) {
      console.log(`${col.column_name}: ${col.data_type}`);
    }
    
  } catch (err) {
    console.error('查询失败:', err);
  }
  process.exit(0);
}

checkSchema();
