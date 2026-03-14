const { sql } = require('../lib/db');

// 新题库设计：每道主观匹配题配一个偏好题
const questions = [
  // ========== 基础信息 (Auto - 无需偏好题) ==========
  { key: 'nickname', cat: 'basic', part: 1, group: null, text: '先简单认识一下～你怎么称呼呢？', type: 'text', ai: false },
  { key: 'gender', cat: 'basic', part: 1, group: null, text: '你的性别是？', type: 'radio', 
    options: [{value: '男', label: '男'}, {value: '女', label: '女'}], ai: false },
  { key: 'birth_year', cat: 'basic', part: 1, group: null, text: '出生年份是？', type: 'number', ai: false },
  { key: 'city', cat: 'basic', part: 1, group: null, text: '目前所在城市是？', type: 'text', ai: false },
  { key: 'occupation', cat: 'basic', part: 1, group: null, text: '你的职业是？', type: 'text', ai: false },
  { key: 'education', cat: 'basic', part: 1, group: null, text: '学历是？', type: 'select',
    options: [{value: '高中及以下', label: '高中及以下'}, {value: '大专', label: '大专'}, 
              {value: '本科', label: '本科'}, {value: '硕士', label: '硕士'}, {value: '博士', label: '博士'}], ai: false },
  
  // 硬性条件（偏好题即硬性标准）
  { key: 'accept_long_distance', cat: 'basic', part: 1, group: null, text: '能否接受异地？', type: 'radio',
    options: [{value: '能', label: '能'}, {value: '不能', label: '不能'}, {value: '视情况而定', label: '视情况而定'}], 
    ai: false },
  { key: 'age_range', cat: 'basic', part: 1, group: null, text: '接受对方年龄差范围？', type: 'select',
    options: [{value: '3岁以内', label: '3岁以内'}, {value: '5岁以内', label: '5岁以内'}, 
              {value: '10岁以内', label: '10岁以内'}, {value: '无所谓', label: '无所谓'}], ai: false },

  // ========== 兴趣话题 (Semi - 配对设计) ==========
  // 兴趣爱好组
  { key: 'hobby_type', cat: 'interest', part: 2, group: 'hobby', text: '休息时最常做的事是什么？', type: 'text', ai: true },
  { key: 'hobby_preference', cat: 'interest', part: 2, group: 'hobby', 
    is_preference_for: 'hobby_type',
    text: '你希望对方的兴趣爱好，是相似还是互补？', type: 'radio',
    options: [{value: '相似', label: '相似，要一起玩'}, {value: '互补', label: '互补，互相带对方体验'}, 
              {value: '无所谓', label: '无所谓，各自有空间'}], ai: false },
  
  // 旅行风格组
  { key: 'travel_style', cat: 'interest', part: 2, group: 'travel', text: '你的旅行风格是？', type: 'select',
    options: [{value: '特种兵', label: '特种兵式打卡'}, {value: '休闲', label: '休闲度假'}, 
              {value: '探险', label: '探险猎奇'}, {value: '文化', label: '文化体验'}, {value: '美食', label: '美食之旅'}], 
    ai: true },
  { key: 'travel_preference', cat: 'interest', part: 2, group: 'travel',
    is_preference_for: 'travel_style',
    text: '你希望对方的旅行风格？', type: 'radio',
    options: [{value: '相似', label: '相似'}, {value: '互补', label: '互补'}, {value: '无所谓', label: '无所谓'}], 
    ai: false },

  // ========== 社交偏好 (Semi - 配对设计) ==========
  // 社交圈子组
  { key: 'social_circle', cat: 'social', part: 2, group: 'social', text: '你的社交圈子类型？', type: 'select',
    options: [{value: '小而精', label: '小而精的密友圈'}, {value: '大而广', label: '广泛的社交圈'}], 
    ai: false },
  { key: 'social_preference', cat: 'social', part: 2, group: 'social',
    is_preference_for: 'social_circle',
    text: '你希望对方的社交圈？', type: 'radio',
    options: [{value: '相似', label: '相似'}, {value: '互补', label: '互补'}, {value: '无所谓', label: '无所谓'}], 
    ai: false },

  // ========== 生活方式 (Semi/Dog - 配对设计) ==========
  // 消费观念组
  { key: 'spending_habit', cat: 'lifestyle', part: 2, group: 'spending', text: '你的消费观念是？', type: 'select',
    options: [{value: '节俭', label: '节俭实用主义'}, {value: '平衡', label: '平衡型'}, {value: '品质', label: '品质优先'}], 
    ai: true },
  { key: 'spending_preference', cat: 'lifestyle', part: 2, group: 'spending',
    is_preference_for: 'spending_habit',
    text: '你希望对方的消费观念？', type: 'radio',
    options: [{value: '相似', label: '希望一致，避免矛盾'}, {value: '互补', label: '互补更好，互相平衡'}, 
              {value: '无所谓', label: '无所谓'}], ai: false },
  
  // 作息类型组
  { key: 'sleep_schedule', cat: 'lifestyle', part: 2, group: 'sleep', text: '你的作息类型是？', type: 'select',
    options: [{value: '早睡早起', label: '早睡早起'}, {value: '晚睡晚起', label: '晚睡晚起'}, {value: '不规律', label: '不规律'}], 
    ai: false },
  { key: 'sleep_preference', cat: 'lifestyle', part: 2, group: 'sleep',
    is_preference_for: 'sleep_schedule',
    text: '你希望对方的作息？', type: 'radio',
    options: [{value: '相似', label: '希望一致'}, {value: '互补', label: '互补'}, {value: '无所谓', label: '无所谓'}], 
    ai: false },
  
  // 整洁程度组
  { key: 'tidiness', cat: 'lifestyle', part: 2, group: 'tidiness', text: '你的整洁程度是？', type: 'select',
    options: [{value: '洁癖', label: '洁癖，必须井井有条'}, {value: '整洁', label: '比较整洁'}, 
              {value: '随意', label: '随性自然'}, {value: '凌乱', label: '有点凌乱'}], ai: false },
  { key: 'tidiness_preference', cat: 'lifestyle', part: 2, group: 'tidiness',
    is_preference_for: 'tidiness',
    text: '你希望对方的生活习惯？', type: 'radio',
    options: [{value: '相似', label: '希望一致'}, {value: '互补', label: '互补'}, {value: '无所谓', label: '无所谓'}], 
    ai: false },

  // ========== 情感核心 (Dog - 深度题，暂不配对) ==========
  { key: 'core_need', cat: 'emotion', part: 3, group: null, text: '你在亲密关系里最核心的需求是什么？', type: 'text', ai: true },
  { key: 'conflict_handling', cat: 'emotion', part: 3, group: null, text: '吵架时你通常怎么处理？', type: 'select',
    options: [{value: '立即沟通', label: '立即沟通解决'}, {value: '先冷静', label: '先冷静再谈'}, {value: '回避', label: '回避冷处理'}], 
    ai: true },
  { key: 'deal_breakers', cat: 'emotion', part: 3, group: null, text: '有什么是你绝对不能接受的？', type: 'text', ai: true }
];

async function initQuestionBank() {
  try {
    console.log('开始初始化题库...');
    
    for (const q of questions) {
      await sql`
        INSERT INTO question_bank 
        (question_key, category, part, question_group, question_text, question_type, options, 
         is_ai_monitored, is_preference_for, is_active)
        VALUES (${q.key}, ${q.cat}, ${q.part}, ${q.group}, ${q.text}, ${q.type}, 
                ${q.options ? JSON.stringify(q.options) : null}, ${q.ai}, ${q.is_preference_for || null}, true)
        ON CONFLICT (question_key) DO UPDATE SET
          category = ${q.cat},
          part = ${q.part},
          question_group = ${q.group},
          question_text = ${q.text},
          question_type = ${q.type},
          options = ${q.options ? JSON.stringify(q.options) : null},
          is_ai_monitored = ${q.ai},
          is_preference_for = ${q.is_preference_for || null},
          is_active = true
      `;
      console.log(`  ✅ ${q.key}${q.is_preference_for ? ' (偏好题)' : ''}`);
    }
    
    console.log('\n🎉 题库初始化完成！');
    console.log(`\n📊 统计：`);
    console.log(`  - 基础信息: 8题`);
    console.log(`  - 兴趣话题: 4题 (2组配对)`);
    console.log(`  - 社交偏好: 2题 (1组配对)`);
    console.log(`  - 生活方式: 6题 (3组配对)`);
    console.log(`  - 情感核心: 3题`);
    console.log(`  - 总计: 23题`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

initQuestionBank();
