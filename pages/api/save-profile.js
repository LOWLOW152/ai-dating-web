import { sql } from '../../lib/db';
import { sendWecomNotification, formatNewProfileMessage } from '../../lib/wecom';

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
    
    // 插入档案到数据库
    const result = await sql`
      INSERT INTO profiles (
        id, invite_code, created_at,
        nickname, gender, birth_year, city, occupation, education,
        accept_long_distance, age_range,
        hobby_type, weekend_style, long_term_hobby, travel_style,
        spiritual_enjoyment, recent_interest, friend_preference, unique_hobby,
        spending_habit, sleep_schedule, tidiness, stress_response,
        decision_style, family_relationship, planning_style,
        achievement_source, solitude_feeling, life_preference,
        current_state, trusted_for, understood_moment, relationship_blindspot, ideal_relationship,
        core_need, conflict_handling, contact_frequency, deal_breakers, future_vision,
        followup_logs, status
      ) VALUES (
        ${profileId}, ${inviteCode}, ${timestamp || new Date().toISOString()},
        ${answers.nickname}, ${answers.gender}, 
        ${answers.birthYear ? parseInt(answers.birthYear) : null}, 
        ${answers.city}, ${answers.occupation}, ${answers.education},
        ${answers.acceptLongDistance}, ${answers.ageRange},
        ${answers.hobbyType}, ${answers.weekendStyle}, ${answers.longTermHobby}, ${answers.travelStyle},
        ${answers.spiritualEnjoyment}, ${answers.recentInterest}, ${answers.friendPreference}, ${answers.uniqueHobby},
        ${answers.spendingHabit}, ${answers.sleepSchedule}, ${answers.tidiness}, ${answers.stressResponse},
        ${answers.decisionStyle}, ${answers.familyRelationship}, ${answers.planningStyle},
        ${answers.achievementSource}, ${answers.solitudeFeeling}, ${answers.lifePreference},
        ${answers.currentState}, ${answers.trustedFor}, ${answers.understoodMoment}, ${answers.relationshipBlindspot}, ${answers.idealRelationship},
        ${answers.coreNeed}, ${answers.conflictHandling}, ${answers.contactFrequency}, ${answers.dealBreakers}, ${answers.futureVision},
        ${JSON.stringify(profile.followupLogs || [])}, '待处理'
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
      message: '档案已保存'
    });
    
  } catch (error) {
    console.error('保存档案失败:', error);
    res.status(500).json({ error: '保存失败', message: error.message });
  }
}
