import { sql } from '../../lib/db';
import { calculateWeights } from '../../lib/weights';

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateProfile = (index) => {
  const genders = ['男', '女'];
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都'];
  const educations = ['本科', '硕士', '大专'];
  const longDistance = ['短期可以，长期不行', '看感情深度', '可以接受'];
  const ageRange = ['±3岁', '±5岁', '±8岁'];
  
  const hobbyMatch = ['志同道合一起玩', '各有各的爱好互相尊重', '都可以看情况'];
  const travelMatch = ['跟我一致', '不一样但能互相迁就', '都可以'];
  const socialCirclePref = ['社交活跃型（圈子大）', '社交精简型（圈子小）', '都可以'];
  const socialRolePref = ['跟我角色相似', '互补搭配', '都可以'];
  
  const spending = ['攒钱有安全感', '平衡享受当下', '喜欢就买'];
  const sleep = ['早睡早起', '夜猫子', '灵活调整'];
  const tidiness = ['井井有条', '乱中有序', '能找着就行'];
  const stress = ['自己消化', '找人倾诉', '转移注意力'];
  const lifePref = ['稳定可预期', '充满变化'];
  
  const consistencyOptions = [
    ['挺在意的，希望一致', '有点在意，但可以沟通', '不太在意，可以不一样', '完全无所谓'],
    ['需要调整，希望一致', '可以商量着来', '不用调整，各睡各的', '完全无所谓'],
    ['会别扭，希望一致', '有点别扭，但可以忍', '不会别扭，各管各的', '完全无所谓'],
    ['会有隔阂，希望一致', '会有点，但能理解', '不会，尊重差异', '完全无所谓'],
    ['会觉得是问题', '有点介意，但可以接受', '不太介意，各家有各家的过法', '完全无所谓'],
    ['不太能接受，希望一致', '有点难，但可以磨合', '能接受，互相尊重', '完全无所谓']
  ];
  
  const gender = genders[index % 2];
  const birthYear = randomChoice([1990, 1992, 1994, 1995, 1996, 1998, 1999, 2000]);
  const nickname = gender === '男' 
    ? randomChoice(['小明', '阿杰', '大伟', '子轩', '浩然'])
    : randomChoice(['小红', '小美', '思思', '雨薇', '晓婷']);
  
  return {
    inviteCode: `TEST${String(index + 1).padStart(2, '0')}`,
    nickname,
    gender,
    birthYear,
    city: randomChoice(cities),
    occupation: randomChoice(['程序员', '设计师', '产品经理', '教师', '医生', '金融']),
    education: randomChoice(educations),
    acceptLongDistance: randomChoice(longDistance),
    ageRange: randomChoice(ageRange),
    hobbyType: randomChoice(['打游戏', '看书', '追剧', '运动', '旅游']),
    hobbyMatchPreference: randomChoice(hobbyMatch),
    travelStyle: randomChoice(['慢下来享受', '特种兵式打卡']),
    travelMatchPreference: randomChoice(travelMatch),
    socialCircle: randomChoice(['同事为主', '同学为主', '兴趣圈为主']),
    socialCirclePreference: randomChoice(socialCirclePref),
    socialRole: randomChoice(['气氛组', '旁听者', '组织者']),
    socialRolePreference: randomChoice(socialRolePref),
    spendingHabit: randomChoice(spending),
    sleepSchedule: randomChoice(sleep),
    tidiness: randomChoice(tidiness),
    stressResponse: randomChoice(stress),
    familyRelationship: randomChoice(['和谐', '独立', '复杂', '普通']),
    lifePreference: randomChoice(lifePref),
    spendingConsistency: randomChoice(consistencyOptions[0]),
    sleepConsistency: randomChoice(consistencyOptions[1]),
    tidinessConsistency: randomChoice(consistencyOptions[2]),
    stressConsistency: randomChoice(consistencyOptions[3]),
    familyConsistency: randomChoice(consistencyOptions[4]),
    lifeConsistency: randomChoice(consistencyOptions[5]),
    currentState: randomChoice(['稳步前进', '正在找方向', '想要突破']),
    trustedFor: '靠谱',
    understoodMoment: '难过的时候',
    relationshipBlindspot: randomChoice(['太理性', '太感性', '不够主动']),
    idealRelationship: randomChoice(['互相支持', '各自独立', '共同成长']),
    coreNeed: randomChoice(['安全感', '自由', '被认可']),
    conflictHandling: randomChoice(['冷静沟通', '先冷静再谈', '直接表达']),
    contactFrequency: randomChoice(['每天', '隔天', '每周几次']),
    dealBreakers: randomChoice(['撒谎', '冷暴力', '不忠诚']),
    futureVision: randomChoice(['结婚', '先恋爱', '看感觉'])
  };
};

export default async function handler(req, res) {
  // 简单验证，防止滥用
  const { key } = req.query;
  if (key !== 'generate_test_data_2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const results = [];
  
  for (let i = 0; i < 5; i++) {
    const answers = generateProfile(i);
    const matchWeights = calculateWeights(answers);
    const profileId = `20250314-${answers.inviteCode}`;
    
    try {
      // 先创建邀请码（如果不存在）
      await sql`
        INSERT INTO invite_codes (code, created_at, used, profile_id)
        VALUES (${answers.inviteCode}, '2025-03-14', true, ${profileId})
        ON CONFLICT (code) DO NOTHING
      `;
      
      const existing = await sql`SELECT 1 FROM profiles WHERE id = ${profileId}`;
      if (existing.rows.length > 0) {
        results.push({ id: profileId, status: 'skipped', reason: '已存在' });
        continue;
      }
      
      await sql`
        INSERT INTO profiles (
          id, invite_code, created_at, status,
          nickname, gender, birth_year, city, occupation, education,
          accept_long_distance, age_range,
          hobby_type, hobby_match_preference, travel_style, travel_match_preference,
          social_circle, social_circle_preference, social_role, social_role_preference,
          spending_habit, spending_consistency, sleep_schedule, sleep_consistency,
          tidiness, tidiness_consistency, stress_response, stress_consistency,
          family_relationship, family_consistency, life_preference, life_consistency,
          current_state, trusted_for, understood_moment, relationship_blindspot, ideal_relationship,
          core_need, conflict_handling, contact_frequency, deal_breakers, future_vision,
          match_weights
        ) VALUES (
          ${profileId}, ${answers.inviteCode}, NOW(), '待处理',
          ${answers.nickname}, ${answers.gender}, ${answers.birthYear}, ${answers.city}, ${answers.occupation}, ${answers.education},
          ${answers.acceptLongDistance}, ${answers.ageRange},
          ${answers.hobbyType}, ${answers.hobbyMatchPreference}, ${answers.travelStyle}, ${answers.travelMatchPreference},
          ${answers.socialCircle}, ${answers.socialCirclePreference}, ${answers.socialRole}, ${answers.socialRolePreference},
          ${answers.spendingHabit}, ${answers.spendingConsistency}, ${answers.sleepSchedule}, ${answers.sleepConsistency},
          ${answers.tidiness}, ${answers.tidinessConsistency}, ${answers.stressResponse}, ${answers.stressConsistency},
          ${answers.familyRelationship}, ${answers.familyConsistency}, ${answers.lifePreference}, ${answers.lifeConsistency},
          ${answers.currentState}, ${answers.trustedFor}, ${answers.understoodMoment}, ${answers.relationshipBlindspot}, ${answers.idealRelationship},
          ${answers.coreNeed}, ${answers.conflictHandling}, ${answers.contactFrequency}, ${answers.dealBreakers}, ${answers.futureVision},
          ${JSON.stringify(matchWeights)}
        )
      `;
      
      results.push({ 
        id: profileId, 
        status: 'created', 
        nickname: answers.nickname,
        gender: answers.gender,
        weights: matchWeights 
      });
    } catch (err) {
      results.push({ id: profileId, status: 'error', error: err.message });
    }
  }
  
  res.status(200).json({ success: true, results });
}
