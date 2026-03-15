import { sql } from '@vercel/postgres';
import { generateInviteCode } from '../../../lib/db';

// 验证管理员token
async function validateAdmin(token) {
  try {
    const result = await sql`
      SELECT * FROM admin_sessions 
      WHERE token = ${token} AND expires_at > NOW()
    `;
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

// 随机选项
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];
const EDUCATIONS = ['高中', '大专', '本科', '硕士', '博士'];
const OCCUPATIONS = ['程序员', '设计师', '产品经理', '教师', '医生', '律师', '销售', '自由职业', '公务员', '创业者'];
const HOBBIES = ['跑步,游泳', '摄影,旅行', '阅读,写作', '游戏,动漫', '音乐,电影', '烹饪,美食', '瑜伽,健身', '绘画,手工', '登山,户外', '桌游,剧本杀'];
const SPENDING = ['理性消费', '享受型', '实用主义', '投资型', '节俭型'];
const SLEEP = ['早睡早起', '夜猫子', '规律作息', '弹性作息'];
const TIDINESS = ['极度整洁', '比较整洁', '随性而为', '有点乱'];
const STRESS = ['运动释放', '独处冷静', '找人倾诉', '购物发泄', '美食治愈'];
const STATES = ['单身已久想找对象', '刚结束一段感情', '一直单身习惯了', '有过几段感情经历'];
const CONFLICTS = ['直接沟通', '冷静后再谈', '让步妥协', '需要空间', '找第三方调解'];
const CONTACTS = ['每天联系', '有重要事才联系', '每周几次', '随缘'];
const WEEKENDS = ['宅家休息', '外出社交', '学习充电', '运动健身'];
const TRAVELS = ['独自旅行', '结伴同行', '跟团游', '自驾游'];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool() {
  return Math.random() > 0.5 ? 'true' : 'false';
}

function randomAgeRange() {
  return ['3', '5', '7', '10'][Math.floor(Math.random() * 4)];
}

function randomBirthYear() {
  return 1990 + Math.floor(Math.random() * 10);
}

function randomPreference() {
  const r = Math.random();
  if (r < 0.3) return 'same';
  if (r < 0.6) return 'complementary';
  return 'dontcare';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 验证登录
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  if (!await validateAdmin(token)) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }
  
  try {
    const count = req.body.count || 10;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const results = [];
    
    for (let i = 1; i <= count; i++) {
      const inviteCode = generateInviteCode();
      const profileId = `${date}-TEST${String(i).padStart(2, '0')}`;
      const gender = i % 3 === 0 ? 'male' : 'female';
      const birthYear = randomBirthYear();
      
      // 数据
      const data = {
        nickname: `测试用户${i}`,
        gender,
        birthYear,
        city: random(CITIES),
        occupation: random(OCCUPATIONS),
        education: random(EDUCATIONS),
        acceptLongDistance: randomBool(),
        ageRange: randomAgeRange(),
        hobby: random(HOBBIES),
        weekend: random(WEEKENDS),
        travel: random(TRAVELS),
        spending: random(SPENDING),
        sleep: random(SLEEP),
        tidiness: random(TIDINESS),
        stress: random(STRESS),
        state: random(STATES),
        conflict: random(CONFLICTS),
        contact: random(CONTACTS),
      };
      
      // 1. 创建邀请码
      await sql`
        INSERT INTO invite_codes (code, created_at, used, used_at, profile_id)
        VALUES (${inviteCode}, ${date}, true, NOW(), ${profileId})
        ON CONFLICT (code) DO UPDATE SET used = true, profile_id = ${profileId}
      `;
      
      // 2. 创建档案
      await sql`
        INSERT INTO profiles (
          id, invite_code, nickname, gender, birth_year, city, occupation, education,
          accept_long_distance, age_range,
          hobby_type, weekend_style, travel_style,
          spending_habit, sleep_schedule, tidiness, stress_response,
          current_state, conflict_handling, contact_frequency, deal_breakers,
          status, notes
        ) VALUES (
          ${profileId}, ${inviteCode}, ${data.nickname}, ${data.gender}, ${data.birthYear}, 
          ${data.city}, ${data.occupation}, ${data.education},
          ${data.acceptLongDistance}, ${data.ageRange},
          ${data.hobby}, ${data.weekend}, ${data.travel},
          ${data.spending}, ${data.sleep}, ${data.tidiness}, ${data.stress},
          ${data.state}, ${data.conflict}, ${data.contact}, '不忠诚,暴力倾向',
          '待处理', ${`自动生成的测试数据 #${i}`}
        )
        ON CONFLICT (id) DO UPDATE SET
          nickname = EXCLUDED.nickname,
          gender = EXCLUDED.gender,
          birth_year = EXCLUDED.birth_year,
          city = EXCLUDED.city,
          occupation = EXCLUDED.occupation,
          education = EXCLUDED.education
      `;
      
      // 3. 创建答案记录
      const answers = [
        { key: 'hobby_type', answer: data.hobby, pref: randomPreference() },
        { key: 'spending_habit', answer: data.spending, pref: randomPreference() },
        { key: 'sleep_schedule', answer: data.sleep, pref: 'same' },
        { key: 'tidiness', answer: data.tidiness, pref: 'same' },
        { key: 'stress_response', answer: data.stress, pref: 'dontcare' },
        { key: 'city', answer: data.city },
        { key: 'birth_year', answer: String(data.birthYear) },
        { key: 'accept_long_distance', answer: data.acceptLongDistance },
        { key: 'age_range', answer: data.ageRange },
        { key: 'current_state', answer: data.state },
        { key: 'conflict_handling', answer: data.conflict },
        { key: 'contact_frequency', answer: data.contact },
        { key: 'deal_breakers', answer: '不忠诚,暴力倾向' },
      ];
      
      for (const ans of answers) {
        await sql`
          INSERT INTO user_answers (profile_id, question_key, main_answer, preference_answer, answered_at)
          VALUES (${profileId}, ${ans.key}, ${ans.answer}, ${ans.pref || null}, NOW())
          ON CONFLICT (profile_id, question_key) DO UPDATE SET
            main_answer = EXCLUDED.main_answer,
            preference_answer = EXCLUDED.preference_answer
        `;
      }
      
      results.push({ id: profileId, nickname: data.nickname, city: data.city });
    }
    
    res.json({ success: true, count: results.length, profiles: results });
    
  } catch (error) {
    console.error('生成测试数据错误:', error);
    res.status(500).json({ error: '生成失败', message: error.message });
  }
}