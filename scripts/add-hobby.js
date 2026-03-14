const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fix() {
  const client = await pool.connect();
  
  try {
    const q = await client.query("SELECT * FROM question_bank WHERE question_key = 'hobby_type'");
    const data = q.rows[0];
    
    console.log('原始数据:', JSON.stringify(data, null, 2));
    
    // 手动构建正确的选项
    const options = JSON.stringify([
      { value: "运动健身", label: "运动健身" },
      { value: "阅读写作", label: "阅读写作" },
      { value: "游戏电竞", label: "游戏电竞" },
      { value: "音乐乐器", label: "音乐乐器" },
      { value: "摄影拍照", label: "摄影拍照" },
      { value: "绘画设计", label: "绘画设计" },
      { value: "烹饪烘焙", label: "烹饪烘焙" },
      { value: "旅行户外", label: "旅行户外" },
      { value: "手工DIY", label: "手工DIY" },
      { value: "看电影追剧", label: "看电影追剧" },
      { value: "逛街购物", label: "逛街购物" },
      { value: "其他", label: "其他" }
    ]);
    
    await client.query(`
      INSERT INTO questions (question_key, category_key, part, display_order,
        main_text, main_type, main_options, main_required,
        ai_enabled, match_algorithm, match_config, is_deal_breaker,
        has_preference, preference_required, preference_default, is_active)
      VALUES ($1, $2, $3, $4, $5, 'multiple', $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      'hobby_type', 'interest', data.part, data.display_order,
      '休息时最喜欢做的事是什么？', options, true,
      true, 'set_similarity', '{}', false, true, false, 'dontcare', true
    ]);
    
    console.log('✅ hobby_type 添加成功');
    
  } catch (err) {
    console.error('❌ 失败:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();