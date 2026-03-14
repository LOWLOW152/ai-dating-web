import { sql } from '../../lib/db';
import { sendWecomNotification, formatNewProfileMessage } from '../../lib/wecom';
import { calculateWeights } from '../../lib/weights';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { answers, profile, timestamp, inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: '缺少邀请码' });
    }
    
    // 生成档案ID: YYYYMMDD-邀请码
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const profileId = `${date}-${inviteCode}`;
    
    // 检查是否已存在
    const existing = await sql`SELECT 1 FROM profiles WHERE id = ${profileId}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '该邀请码已完成答题' });
    }
    
    // 计算动态权重
    const matchWeights = calculateWeights(answers);
    
    // 插入档案到数据库
    const result = await sql`
      INSERT INTO profiles (
        id, invite_code, created_at,
        nickname, gender, birth_year, city, occupation, education,
        accept_long_distance, age_range,
        hobby_type, travel_style, social_circle, social_role,
        spending_habit, sleep_schedule, tidiness, stress_response,
        family_relationship, life_preference,
        current_state, trusted_for, understood_moment, relationship_blindspot, ideal_relationship,
        core_need, conflict_handling, contact_frequency, deal_breakers, future_vision,
        followup_logs, status, match_weights
      ) VALUES (
        ${profileId}, ${inviteCode}, ${timestamp || new Date().toISOString()},
        ${answers.nickname}, ${answers.gender}, 
        ${answers.birthYear ? parseInt(answers.birthYear) : null}, 
        ${answers.city}, ${answers.occupation}, ${answers.education},
        ${answers.acceptLongDistance}, ${answers.ageRange},
        ${answers.hobbyType}, ${answers.travelStyle}, ${answers.socialCircle}, ${answers.socialRole},
        ${answers.spendingHabit}, ${answers.sleepSchedule}, ${answers.tidiness}, ${answers.stressResponse},
        ${answers.familyRelationship}, ${answers.lifePreference},
        ${answers.currentState}, ${answers.trustedFor}, ${answers.understoodMoment}, ${answers.relationshipBlindspot}, ${answers.idealRelationship},
        ${answers.coreNeed}, ${answers.conflictHandling}, ${answers.contactFrequency}, ${answers.dealBreakers}, ${answers.futureVision},
        ${JSON.stringify(profile.followupLogs || [])}, '待处理',
        ${JSON.stringify(matchWeights)}
      )
      RETURNING *
    `;
    
    const savedProfile = result.rows[0];
    
    // 更新邀请码关联的档案ID
    await sql`
      UPDATE invite_codes 
      SET profile_id = ${profileId}
      WHERE code = ${inviteCode}
    `;
    
    // 发送企业微信通知
    await sendWecomNotification(formatNewProfileMessage(savedProfile));
    
    res.status(200).json({ 
      success: true, 
      profileId,
      matchWeights,
      message: '档案已保存'
    });
    
  } catch (error) {
    console.error('保存档案失败:', error);
    res.status(500).json({ error: '保存失败', message: error.message });
  }
}
