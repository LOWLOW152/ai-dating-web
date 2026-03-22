// 查询所有 pending 但有答题数据的档案
const { sql } = require('./src/lib/db');

async function checkPendingProfiles() {
  try {
    const res = await sql.query(`
      SELECT 
        id, 
        invite_code, 
        status, 
        created_at, 
        completed_at,
        CASE 
          WHEN answers IS NULL THEN 0
          ELSE jsonb_object_keys(answers)::text
        END as answer_keys
      FROM profiles 
      WHERE status = 'pending' 
        AND answers IS NOT NULL 
        AND jsonb_typeof(answers) = 'object'
      ORDER BY created_at DESC
    `);
    
    // 按档案分组统计答题数
    const profileMap = new Map();
    res.rows.forEach(row => {
      if (!profileMap.has(row.id)) {
        profileMap.set(row.id, {
          id: row.id,
          invite_code: row.invite_code,
          status: row.status,
          created_at: row.created_at,
          completed_at: row.completed_at,
          answer_count: 0
        });
      }
      profileMap.get(row.id).answer_count++;
    });
    
    const profiles = Array.from(profileMap.values());
    
    console.log('=== Pending 但有答题数据的档案 ===');
    console.log(`共找到 ${profiles.length} 个档案\n`);
    
    profiles.forEach(p => {
      console.log(`邀请码: ${p.invite_code}`);
      console.log(`  答题数: ${p.answer_count}`);
      console.log(`  创建时间: ${p.created_at}`);
      console.log(`  状态: ${p.status}`);
      console.log('');
    });
    
  } catch (err) {
    console.error('查询错误:', err);
  } finally {
    process.exit(0);
  }
}

checkPendingProfiles();
