const { sql } = require('../lib/db');

async function initQuestionBank() {
  try {
    console.log('开始创建题库表...');
    
    // 创建表
    await sql`
      CREATE TABLE IF NOT EXISTS question_bank (
        id SERIAL PRIMARY KEY,
        question_key VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(20) NOT NULL,
        part INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type VARCHAR(20) NOT NULL,
        options JSONB,
        is_required BOOLEAN DEFAULT true,
        is_ai_monitored BOOLEAN DEFAULT false,
        ai_prompt TEXT,
        ai_check_rules JSONB,
        match_logic JSONB,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ 题库表创建成功');
    
    // 插入基础题目
    const questions = [
      { key: 'nickname', cat: 'basic', part: 1, text: '你的昵称', type: 'text', ai: false },
      { key: 'gender', cat: 'basic', part: 1, text: '你的性别', type: 'radio', 
        options: [{value: '男', label: '男'}, {value: '女', label: '女'}], ai: false },
      { key: 'birth_year', cat: 'basic', part: 1, text: '出生年份', type: 'number', ai: false, 
        match: {type: 'age_match'} },
      { key: 'city', cat: 'basic', part: 1, text: '所在城市', type: 'text', ai: false,
        match: {type: 'location_match'} },
      { key: 'occupation', cat: 'basic', part: 1, text: '职业', type: 'text', ai: false },
      { key: 'education', cat: 'basic', part: 1, text: '学历', type: 'select',
        options: [{value: '高中及以下', label: '高中及以下'}, {value: '大专', label: '大专'}, 
                  {value: '本科', label: '本科'}, {value: '硕士', label: '硕士'}, {value: '博士', label: '博士'}], ai: false },
      { key: 'accept_long_distance', cat: 'basic', part: 1, text: '能否接受异地', type: 'radio',
        options: [{value: '能', label: '能'}, {value: '不能', label: '不能'}, {value: '视情况而定', label: '视情况而定'}], 
        ai: false, match: {type: 'deal_breaker', field: 'city'} },
      { key: 'age_range', cat: 'basic', part: 1, text: '接受对方年龄差范围', type: 'select',
        options: [{value: '3岁以内', label: '3岁以内'}, {value: '5岁以内', label: '5岁以内'}, 
                  {value: '10岁以内', label: '10岁以内'}, {value: '无所谓', label: '无所谓'}], 
        ai: false, match: {type: 'age_range_match', field: 'birth_year'} },
      
      // 兴趣话题
      { key: 'hobby_type', cat: 'interest', part: 2, text: '你的兴趣爱好', type: 'text', ai: true,
        match: {type: 'similarity_match', preference_field: 'hobby_match_preference'} },
      { key: 'hobby_match_preference', cat: 'interest', part: 2, text: '你希望对方的兴趣', type: 'radio',
        options: [{value: '必须相同', label: '必须相同，要一起玩'}, {value: '互补更好', label: '互补更好，互相带对方体验'}, 
                  {value: '无所谓', label: '无所谓，各自有各自的空间'}], ai: false },
      { key: 'travel_style', cat: 'interest', part: 2, text: '你的旅行风格', type: 'select',
        options: [{value: '特种兵', label: '特种兵式打卡'}, {value: '休闲', label: '休闲度假'}, 
                  {value: '探险', label: '探险猎奇'}, {value: '文化', label: '文化体验'}, {value: '美食', label: '美食之旅'}], 
        ai: true, match: {type: 'similarity_match', preference_field: 'travel_match_preference'} },
      { key: 'travel_match_preference', cat: 'interest', part: 2, text: '你希望对方的旅行节奏', type: 'radio',
        options: [{value: '必须相同', label: '必须相同'}, {value: '互补更好', label: '互补更好'}, {value: '无所谓', label: '无所谓'}], ai: false },
      
      // 社交偏好
      { key: 'social_circle', cat: 'social', part: 2, text: '你的社交圈子类型', type: 'select',
        options: [{value: '小', label: '小而精的密友圈'}, {value: '大', label: '广泛的社交圈'}], 
        ai: false, match: {type: 'similarity_match', preference_field: 'social_circle_preference'} },
      { key: 'social_circle_preference', cat: 'social', part: 2, text: '你希望对方的社交圈', type: 'radio',
        options: [{value: '必须相同', label: '必须相同'}, {value: '互补更好', label: '互补更好'}, {value: '无所谓', label: '无所谓'}], ai: false },
      
      // 生活方式
      { key: 'spending_habit', cat: 'lifestyle', part: 3, text: '你的消费观念', type: 'select',
        options: [{value: '节俭', label: '节俭实用主义'}, {value: '平衡', label: '平衡型'}, {value: '品质', label: '品质优先'}], 
        ai: true, match: {type: 'consistency_match', consistency_field: 'spending_consistency'} },
      { key: 'spending_consistency', cat: 'lifestyle', part: 3, text: '你希望对方消费观念', type: 'radio',
        options: [{value: '希望一致', label: '希望一致，避免矛盾'}, {value: '互补更好', label: '互补更好，互相平衡'}, {value: '无所谓', label: '无所谓'}], ai: false },
      { key: 'sleep_schedule', cat: 'lifestyle', part: 3, text: '你的作息类型', type: 'select',
        options: [{value: '早睡早起', label: '早睡早起'}, {value: '晚睡晚起', label: '晚睡晚起'}, {value: '不规律', label: '不规律'}], 
        ai: false, match: {type: 'consistency_match', consistency_field: 'sleep_consistency'} },
      { key: 'sleep_consistency', cat: 'lifestyle', part: 3, text: '你希望对方作息', type: 'radio',
        options: [{value: '希望一致', label: '希望一致'}, {value: '互补更好', label: '互补更好'}, {value: '无所谓', label: '无所谓'}], ai: false },
      
      // 情感核心
      { key: 'core_need', cat: 'emotion', part: 3, text: '你在亲密关系里最核心需求是什么', type: 'text', ai: true },
      { key: 'conflict_handling', cat: 'emotion', part: 3, text: '吵架时你通常怎么处理', type: 'select',
        options: [{value: '立即沟通', label: '立即沟通解决'}, {value: '先冷静', label: '先冷静再谈'}, {value: '回避', label: '回避冷处理'}], 
        ai: true, match: {type: 'deal_breaker_check'} },
      { key: 'deal_breakers', cat: 'emotion', part: 3, text: '有什么是你绝对不能接受的', type: 'text', ai: true,
        match: {type: 'deal_breaker_check'} }
    ];
    
    for (const q of questions) {
      await sql`
        INSERT INTO question_bank 
        (question_key, category, part, question_text, question_type, options, is_ai_monitored, match_logic)
        VALUES (${q.key}, ${q.cat}, ${q.part}, ${q.text}, ${q.type}, 
                ${q.options ? JSON.stringify(q.options) : null}, ${q.ai}, ${q.match ? JSON.stringify(q.match) : null})
        ON CONFLICT (question_key) DO NOTHING
      `;
      console.log(`  ✅ ${q.key}`);
    }
    
    console.log('\n🎉 题库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

initQuestionBank();
