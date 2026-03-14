import { sql } from '../../../lib/db';
import { validateSession } from './login';
import { calculateBidirectionalMatch, calculateRelationshipCurve, DEFAULT_WEIGHTS } from '../../../lib/match';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 验证登录
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  const isValid = await validateSession(token);
  if (!isValid) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  try {
    const { myId, targetId } = req.query;
    
    if (!myId || !targetId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 获取我的档案
    const myRes = await sql`SELECT * FROM profiles WHERE id = ${myId}`;
    if (myRes.rows.length === 0) {
      return res.status(404).json({ error: '我的档案不存在' });
    }
    const myProfile = myRes.rows[0];
    
    // 获取目标档案
    const targetRes = await sql`SELECT * FROM profiles WHERE id = ${targetId}`;
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: '对方档案不存在' });
    }
    const targetProfile = targetRes.rows[0];
    
    // 处理权重
    let myWeights = myProfile.match_weights;
    if (typeof myWeights === 'string') {
      try {
        myWeights = JSON.parse(myWeights);
      } catch (e) {
        myWeights = DEFAULT_WEIGHTS;
      }
    }
    if (!myWeights || typeof myWeights !== 'object' || Array.isArray(myWeights)) {
      myWeights = DEFAULT_WEIGHTS;
    }
    
    let targetWeights = targetProfile.match_weights;
    if (typeof targetWeights === 'string') {
      try {
        targetWeights = JSON.parse(targetWeights);
      } catch (e) {
        targetWeights = DEFAULT_WEIGHTS;
      }
    }
    if (!targetWeights || typeof targetWeights !== 'object' || Array.isArray(targetWeights)) {
      targetWeights = DEFAULT_WEIGHTS;
    }
    
    // 计算双向匹配
    const bidirectional = calculateBidirectionalMatch(myProfile, targetProfile, myWeights, targetWeights);
    
    // 计算关系发展曲线（从我的视角）
    const relationshipCurve = calculateRelationshipCurve(myProfile, targetProfile);
    
    return res.status(200).json({
      success: true,
      myProfile: {
        id: myProfile.id,
        nickname: myProfile.nickname,
        gender: myProfile.gender,
        birth_year: myProfile.birth_year,
        city: myProfile.city,
        occupation: myProfile.occupation,
        education: myProfile.education,
        accept_long_distance: myProfile.accept_long_distance,
        age_range: myProfile.age_range,
        hobby_type: myProfile.hobby_type,
        hobby_match_preference: myProfile.hobby_match_preference,
        travel_style: myProfile.travel_style,
        travel_match_preference: myProfile.travel_match_preference,
        social_circle: myProfile.social_circle,
        social_circle_preference: myProfile.social_circle_preference,
        social_role: myProfile.social_role,
        social_role_preference: myProfile.social_role_preference,
        spending_habit: myProfile.spending_habit,
        spending_consistency: myProfile.spending_consistency,
        sleep_schedule: myProfile.sleep_schedule,
        sleep_consistency: myProfile.sleep_consistency,
        tidiness: myProfile.tidiness,
        tidiness_consistency: myProfile.tidiness_consistency,
        stress_response: myProfile.stress_response,
        stress_consistency: myProfile.stress_consistency,
        family_relationship: myProfile.family_relationship,
        family_consistency: myProfile.family_consistency,
        life_preference: myProfile.life_preference,
        life_consistency: myProfile.life_consistency,
        current_state: myProfile.current_state,
        trusted_for: myProfile.trusted_for,
        understood_moment: myProfile.understood_moment,
        relationship_blindspot: myProfile.relationship_blindspot,
        ideal_relationship: myProfile.ideal_relationship,
        core_need: myProfile.core_need,
        conflict_handling: myProfile.conflict_handling,
        contact_frequency: myProfile.contact_frequency,
        deal_breakers: myProfile.deal_breakers,
        future_vision: myProfile.future_vision,
        match_weights: myWeights
      },
      matchProfile: {
        id: targetProfile.id,
        nickname: targetProfile.nickname,
        gender: targetProfile.gender,
        birth_year: targetProfile.birth_year,
        city: targetProfile.city,
        occupation: targetProfile.occupation,
        education: targetProfile.education,
        accept_long_distance: targetProfile.accept_long_distance,
        age_range: targetProfile.age_range,
        hobby_type: targetProfile.hobby_type,
        hobby_match_preference: targetProfile.hobby_match_preference,
        travel_style: targetProfile.travel_style,
        travel_match_preference: targetProfile.travel_match_preference,
        social_circle: targetProfile.social_circle,
        social_circle_preference: targetProfile.social_circle_preference,
        social_role: targetProfile.social_role,
        social_role_preference: targetProfile.social_role_preference,
        spending_habit: targetProfile.spending_habit,
        spending_consistency: targetProfile.spending_consistency,
        sleep_schedule: targetProfile.sleep_schedule,
        sleep_consistency: targetProfile.sleep_consistency,
        tidiness: targetProfile.tidiness,
        tidiness_consistency: targetProfile.tidiness_consistency,
        stress_response: targetProfile.stress_response,
        stress_consistency: targetProfile.stress_consistency,
        family_relationship: targetProfile.family_relationship,
        family_consistency: targetProfile.family_consistency,
        life_preference: targetProfile.life_preference,
        life_consistency: targetProfile.life_consistency,
        current_state: targetProfile.current_state,
        trusted_for: targetProfile.trusted_for,
        understood_moment: targetProfile.understood_moment,
        relationship_blindspot: targetProfile.relationship_blindspot,
        ideal_relationship: targetProfile.ideal_relationship,
        core_need: targetProfile.core_need,
        conflict_handling: targetProfile.conflict_handling,
        contact_frequency: targetProfile.contact_frequency,
        deal_breakers: targetProfile.deal_breakers,
        future_vision: targetProfile.future_vision,
        match_weights: targetWeights
      },
      matchDetails: {
        fromA: bidirectional.fromA,
        fromB: bidirectional.fromB,
        bidirectionalScore: bidirectional.bidirectionalScore,
        relationshipCurve: relationshipCurve
      }
    });
    
  } catch (error) {
    console.error('获取匹配详情错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
