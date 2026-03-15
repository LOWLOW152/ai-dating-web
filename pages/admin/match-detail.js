import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DIMENSION_LABELS = {
  basic: '基础条件',
  emotion: '情感核心',
  values: '价值观',
  lifestyle: '生活方式',
  interest: '兴趣匹配',
  social: '社交偏好'
};

const DIMENSION_COLORS = {
  basic: '#1890ff',
  emotion: '#eb2f96',
  values: '#fa8c16',
  lifestyle: '#52c41a',
  interest: '#722ed1',
  social: '#13c2c2'
};

// 问题映射表（用于展示）
const QUESTION_MAP = {
  // 基础信息
  nickname: { category: 'basic', label: '昵称', type: 'text' },
  gender: { category: 'basic', label: '性别', type: 'text' },
  birthYear: { category: 'basic', label: '出生年份', type: 'text' },
  city: { category: 'basic', label: '城市', type: 'text' },
  occupation: { category: 'basic', label: '职业', type: 'text' },
  education: { category: 'basic', label: '学历', type: 'text' },
  acceptLongDistance: { category: 'basic', label: '能否接受异地', type: 'text' },
  ageRange: { category: 'basic', label: '接受年龄差', type: 'text' },
  
  // 兴趣话题
  hobbyType: { category: 'interest', label: '兴趣爱好', type: 'text' },
  hobbyMatchPreference: { category: 'interest', label: '兴趣匹配偏好', type: 'text' },
  travelStyle: { category: 'interest', label: '旅行风格', type: 'text' },
  travelMatchPreference: { category: 'interest', label: '旅行节奏偏好', type: 'text' },
  socialCircle: { category: 'social', label: '社交圈子类型', type: 'text' },
  socialCirclePreference: { category: 'social', label: '社交圈子偏好', type: 'text' },
  socialRole: { category: 'social', label: '社交角色', type: 'text' },
  socialRolePreference: { category: 'social', label: '社交角色偏好', type: 'text' },
  
  // 生活方式
  spendingHabit: { category: 'lifestyle', label: '消费观念', type: 'text' },
  spendingConsistency: { category: 'lifestyle', label: '消费观念一致性', type: 'text' },
  sleepSchedule: { category: 'lifestyle', label: '作息类型', type: 'text' },
  sleepConsistency: { category: 'lifestyle', label: '作息一致性', type: 'text' },
  tidiness: { category: 'lifestyle', label: '整洁程度', type: 'text' },
  tidinessConsistency: { category: 'lifestyle', label: '整洁一致性', type: 'text' },
  stressResponse: { category: 'lifestyle', label: '压力应对方式', type: 'text' },
  stressConsistency: { category: 'lifestyle', label: '压力应对一致性', type: 'text' },
  
  // 价值观
  familyRelationship: { category: 'values', label: '家庭关系', type: 'text' },
  familyConsistency: { category: 'values', label: '家庭关系一致性', type: 'text' },
  lifePreference: { category: 'values', label: '生活偏好', type: 'text' },
  lifeConsistency: { category: 'values', label: '生活偏好一致性', type: 'text' },
  
  // 情感核心
  currentState: { category: 'emotion', label: '当前状态', type: 'text' },
  trustedFor: { category: 'emotion', label: '朋友信任点', type: 'text' },
  understoodMoment: { category: 'emotion', label: '被理解经历', type: 'text' },
  relationshipBlindspot: { category: 'emotion', label: '关系盲点', type: 'text' },
  idealRelationship: { category: 'emotion', label: '理想关系', type: 'text' },
  coreNeed: { category: 'emotion', label: '核心需求', type: 'text' },
  conflictHandling: { category: 'emotion', label: '冲突处理', type: 'text' },
  contactFrequency: { category: 'emotion', label: '联系频率', type: 'text' },
  dealBreakers: { category: 'emotion', label: '关系红线', type: 'text' },
  futureVision: { category: 'emotion', label: '未来愿景', type: 'text' }
};

function MatchDetailContent() {
  const router = useRouter();
  const { profileId, matchId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myProfile, setMyProfile] = useState(null);
  const [matchProfile, setMatchProfile] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 检查硬性条件匹配
  const checkDealBreakers = () => {
    if (!myProfile || !matchProfile) return [];
    
    const mismatches = [];
    
    // 1. 异地检查
    const myAcceptLD = myProfile.accept_long_distance;
    const theirAcceptLD = matchProfile.accept_long_distance;
    const myCity = myProfile.city;
    const theirCity = matchProfile.city;
    const isDifferentCity = myCity !== theirCity;
    
    if (isDifferentCity) {
      if (myAcceptLD === '不能' || myAcceptLD === '完全不接受') {
        mismatches.push({
          field: '异地',
          issue: '城市不同且你不接受异地',
          myValue: myCity,
          theirValue: theirCity,
          myRequirement: myAcceptLD,
          theirRequirement: theirAcceptLD,
          blocker: '你'
        });
      } else if (theirAcceptLD === '不能' || theirAcceptLD === '完全不接受') {
        mismatches.push({
          field: '异地',
          issue: '城市不同且对方不接受异地',
          myValue: myCity,
          theirValue: theirCity,
          myRequirement: myAcceptLD,
          theirRequirement: theirAcceptLD,
          blocker: '对方'
        });
      } else if (myAcceptLD === '视情况而定' || theirAcceptLD === '视情况而定') {
        mismatches.push({
          field: '异地',
          issue: '城市不同，需要进一步确认',
          myValue: myCity,
          theirValue: theirCity,
          myRequirement: myAcceptLD,
          theirRequirement: theirAcceptLD,
          blocker: '待定',
          warning: true
        });
      }
    }
    
    // 2. 年龄差检查
    const myAge = myProfile.birth_year ? new Date().getFullYear() - myProfile.birth_year : null;
    const theirAge = matchProfile.birth_year ? new Date().getFullYear() - matchProfile.birth_year : null;
    
    if (myAge && theirAge) {
      const ageDiff = Math.abs(myAge - theirAge);
      
      // 解析我的年龄差要求
      let myMaxDiff = 10;
      if (myProfile.age_range) {
        const match = myProfile.age_range.match(/(\d+)/);
        if (match) myMaxDiff = parseInt(match[1]);
      }
      
      // 解析对方的年龄差要求
      let theirMaxDiff = 10;
      if (matchProfile.age_range) {
        const match = matchProfile.age_range.match(/(\d+)/);
        if (match) theirMaxDiff = parseInt(match[1]);
      }
      
      if (ageDiff > myMaxDiff) {
        mismatches.push({
          field: '年龄差',
          issue: `相差${ageDiff}岁，超出你接受范围(${myProfile.age_range || '未指定'})`,
          myValue: `${myAge}岁`,
          theirValue: `${theirAge}岁`,
          myRequirement: myProfile.age_range,
          theirRequirement: matchProfile.age_range,
          blocker: '你',
          diff: ageDiff
        });
      } else if (ageDiff > theirMaxDiff) {
        mismatches.push({
          field: '年龄差',
          issue: `相差${ageDiff}岁，超出对方接受范围(${matchProfile.age_range || '未指定'})`,
          myValue: `${myAge}岁`,
          theirValue: `${theirAge}岁`,
          myRequirement: myProfile.age_range,
          theirRequirement: matchProfile.age_range,
          blocker: '对方',
          diff: ageDiff
        });
      }
    }
    
    // 3. 学历要求检查（如果有一方明确有要求）
    const educationLevels = {
      '高中及以下': 1,
      '大专': 2,
      '本科': 3,
      '硕士': 4,
      '博士': 5
    };
    
    const myEdu = educationLevels[myProfile.education] || 0;
    const theirEdu = educationLevels[matchProfile.education] || 0;
    
    // 这里可以添加更复杂的学历匹配逻辑
    
    // 4. 关系红线检查
    const myDealBreakers = (myProfile.deal_breakers || '').toLowerCase();
    const theirDealBreakers = (matchProfile.deal_breakers || '').toLowerCase();
    
    // 简单的关键词匹配检查
    const commonRedFlags = ['抽烟', '喝酒', '赌博', '出轨', '欺骗', '暴力', '冷暴力'];
    
    commonRedFlags.forEach(flag => {
      const myHatesIt = myDealBreakers.includes(flag);
      const theyMightHaveIt = theirDealBreakers.includes(flag) || 
        (matchProfile[flag] && matchProfile[flag] !== '不' && matchProfile[flag] !== '否');
      
      if (myHatesIt && theyMightHaveIt) {
        mismatches.push({
          field: '关系红线',
          issue: `你明确排斥"${flag}"，对方可能涉及`,
          myValue: myProfile.deal_breakers,
          theirValue: matchProfile.deal_breakers,
          myRequirement: `不接受${flag}`,
          theirRequirement: null,
          blocker: '你',
          critical: true
        });
      }
    });
    
    return mismatches;
  };

  useEffect(() => {
    if (!profileId || !matchId) {
      if (profileId === undefined || matchId === undefined) {
        // 等待 URL 参数解析
        return;
      }
      setError('缺少必要参数：' + (!profileId ? 'profileId ' : '') + (!matchId ? 'matchId' : ''));
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    fetchMatchDetail(token, profileId, matchId);
  }, [profileId, matchId]);

  const fetchMatchDetail = async (token, myId, targetId) => {
    try {
      const res = await fetch(`/api/admin/match-detail?myId=${myId}&targetId=${targetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setMyProfile(data.myProfile);
        setMatchProfile(data.matchProfile);
        setMatchDetails(data.matchDetails);
      } else {
        setError(data.error || '获取详情失败');
      }
    } catch (err) {
      console.error('获取匹配详情失败:', err);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#07c160';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const renderComparisonBar = (label, myValue, theirValue, maxWidth = 100) => {
    const myWidth = Math.min(100, myValue || 0);
    const theirWidth = Math.min(100, theirValue || 0);
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: '2px' }}>你 ({myValue}分)</div>
            <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${myWidth}%`, height: '100%', background: '#1890ff', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#eb2f96', marginBottom: '2px' }}>TA ({theirValue}分)</div>
            <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${theirWidth}%`, height: '100%', background: '#eb2f96', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 计算单个问题的匹配分数
  const calculateQuestionMatch = (myAnswer, myRequirement, theirAnswer, theirRequirement, field, myFullProfile, theirFullProfile) => {
    // 如果没有答案，返回 null
    if (!myAnswer && !theirAnswer) return null;
    
    // 基础信息类问题（昵称、性别、职业、学历等）不评分
    const autoFields = ['nickname', 'gender', 'birthYear', 'city', 'occupation', 'education'];
    if (autoFields.includes(field)) {
      return { score: null, matched: null, note: '基础信息' };
    }
    
    // 1. 异地检查
    if (field === 'acceptLongDistance') {
      const myCity = myFullProfile.city;
      const theirCity = theirFullProfile.city;
      const sameCity = myCity === theirCity;
      const myAccept = myAnswer?.includes('不能') || myAnswer?.includes('不接受') ? false : true;
      const theyAccept = theirAnswer?.includes('不能') || theirAnswer?.includes('不接受') ? false : true;
      
      if (sameCity) return { score: 100, matched: true, note: `同城(${myCity})` };
      if (!myAccept) return { score: 0, matched: false, note: `异地，你不接受(${myCity} vs ${theirCity})` };
      if (!theyAccept) return { score: 0, matched: false, note: `异地，对方不接受(${myCity} vs ${theirCity})` };
      if (myAnswer === '视情况而定' || theirAnswer === '视情况而定') {
        return { score: 60, matched: null, note: `异地，需确认(${myCity} vs ${theirCity})` };
      }
      return { score: 100, matched: true, note: `异地，双方接受(${myCity} vs ${theirCity})` };
    }
    
    // 2. 年龄差匹配
    if (field === 'ageRange') {
      const myBirthYear = myFullProfile.birth_year;
      const theirBirthYear = theirFullProfile.birth_year;
      const myAge = myBirthYear ? new Date().getFullYear() - myBirthYear : null;
      const theirAge = theirBirthYear ? new Date().getFullYear() - theirBirthYear : null;
      
      if (myAge && theirAge) {
        const diff = Math.abs(myAge - theirAge);
        const myMaxDiff = parseInt(myAnswer?.match(/(\d+)/)?.[1] || '10');
        const theirMaxDiff = parseInt(theirAnswer?.match(/(\d+)/)?.[1] || '10');
        
        if (diff <= myMaxDiff && diff <= theirMaxDiff) {
          return { score: 100, matched: true, note: `差${diff}岁，符合双方要求(${myAge} vs ${theirAge})` };
        } else if (diff > myMaxDiff) {
          return { score: 0, matched: false, note: `差${diff}岁，超出你的${myMaxDiff}岁要求` };
        } else {
          return { score: 0, matched: false, note: `差${diff}岁，超出对方的${theirMaxDiff}岁要求` };
        }
      }
      return { score: null, matched: null, note: '年龄未知' };
    }
    
    // 3. 生活方式类（有明确要求偏好的）
    const lifestylePreferences = {
      spendingHabit: 'spendingConsistency',
      sleepSchedule: 'sleepConsistency',
      tidiness: 'tidinessConsistency',
      stressResponse: 'stressConsistency',
      familyRelationship: 'familyConsistency',
      lifePreference: 'lifeConsistency'
    };
    
    if (lifestylePreferences[field]) {
      const myPref = myProfile[lifestylePreferences[field]];
      const theirPref = matchProfile[lifestylePreferences[field]];
      
      // 如果一方要求一致，另一方确实一致
      if (myPref === '希望一致' && myAnswer === theirAnswer) {
        return { score: 100, matched: true, note: '符合你的一致性要求' };
      }
      if (myPref === '希望一致' && myAnswer !== theirAnswer) {
        return { score: 30, matched: false, note: '不一致，但你要求一致' };
      }
      if (myPref === '互补更好' && myAnswer !== theirAnswer) {
        return { score: 90, matched: true, note: '互补，符合你偏好' };
      }
      if (myPref === '无所谓') {
        return { score: 80, matched: true, note: '你对此无要求' };
      }
      
      // 检查对方的要求
      if (theirPref === '希望一致' && myAnswer !== theirAnswer) {
        return { score: 40, matched: false, note: '不一致，对方要求一致' };
      }
      
      return { score: 70, matched: true, note: '基本匹配' };
    }
    
    // 4. 兴趣社交类（有匹配偏好的）
    const interestPreferences = {
      hobbyType: 'hobbyMatchPreference',
      travelStyle: 'travelMatchPreference',
      socialCircle: 'socialCirclePreference',
      socialRole: 'socialRolePreference'
    };
    
    if (interestPreferences[field]) {
      const myPref = myProfile[interestPreferences[field]];
      const theirPref = matchProfile[interestPreferences[field]];
      const isSame = myAnswer === theirAnswer;
      
      if (myPref === '必须相同' && isSame) return { score: 100, matched: true, note: '符合你相同要求' };
      if (myPref === '必须相同' && !isSame) return { score: 20, matched: false, note: '不同，但你要求相同' };
      if (myPref === '互补更好' && !isSame) return { score: 95, matched: true, note: '互补，符合你偏好' };
      if (myPref === '无所谓') return { score: 80, matched: true, note: '你对此无要求' };
      
      // 检查对方要求
      if (theirPref === '必须相同' && !isSame) {
        return { score: 30, matched: false, note: '不同，对方要求相同' };
      }
      
      return { score: 70, matched: true, note: '基本匹配' };
    }
    
    // 5. 情感核心类（通过dealBreakers判断）
    const emotionFields = ['coreNeed', 'conflictHandling', 'contactFrequency', 'idealRelationship'];
    if (emotionFields.includes(field)) {
      const myBreakers = (myProfile.dealBreakers || '').toLowerCase();
      const theirBreakers = (matchProfile.dealBreakers || '').toLowerCase();
      
      // 简单的语义匹配
      if (myAnswer && theirAnswer) {
        const similarity = calculateSimilarity(myAnswer, theirAnswer);
        
        // 检查是否有硬性冲突
        const conflictKeywords = ['冷暴力', '不沟通', '逃避'];
        const myHasConflict = conflictKeywords.some(k => myBreakers.includes(k) && theirAnswer?.includes(k));
        const theyHaveConflict = conflictKeywords.some(k => theirBreakers.includes(k) && myAnswer?.includes(k));
        
        if (myHasConflict) return { score: 10, matched: false, note: '触及你的红线' };
        if (theyHaveConflict) return { score: 20, matched: false, note: '触及对方红线' };
        
        if (similarity > 0.7) return { score: 90, matched: true, note: '高度相似' };
        if (similarity > 0.4) return { score: 70, matched: true, note: '部分相似' };
        return { score: 50, matched: null, note: '差异较大' };
      }
    }
    
    // 6. 关系红线
    if (field === 'dealBreakers') {
      const myRedFlags = myAnswer?.toLowerCase().split(/[,，、\s]+/) || [];
      const theirRedFlags = theirAnswer?.toLowerCase().split(/[,，、\s]+/) || [];
      
      const conflicts = myRedFlags.filter(flag => 
        flag.length > 1 && theirAnswer?.toLowerCase().includes(flag)
      );
      
      if (conflicts.length > 0) {
        return { score: 0, matched: false, note: `冲突: ${conflicts.join(', ')}` };
      }
      return { score: 100, matched: true, note: '无冲突' };
    }
    
    // 默认处理
    return { score: null, matched: null, note: '需人工判断' };
  };
  
  // 简单的文本相似度计算
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const keywords1 = s1.split(/[,，、\s]+/).filter(w => w.length > 1);
    const keywords2 = s2.split(/[,，、\s]+/).filter(w => w.length > 1);
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const common = keywords1.filter(w => keywords2.includes(w));
    return common.length / Math.max(keywords1.length, keywords2.length);
  };

  const renderAnswerComparison = () => {
    if (!myProfile || !matchProfile) return null;
    
    const categories = {
      basic: '基础条件',
      interest: '兴趣话题',
      social: '社交偏好', 
      lifestyle: '生活方式',
      values: '价值观',
      emotion: '情感核心'
    };
    
    return (
      <div>
        {Object.entries(categories).map(([catKey, catName]) => {
          const catQuestions = Object.entries(QUESTION_MAP).filter(([_, info]) => info.category === catKey);
          if (catQuestions.length === 0) return null;
          
          // 过滤掉辅助字段（如 xxxConsistency, xxxPreference）
          const mainQuestions = catQuestions.filter(([field]) => 
            !field.endsWith('Consistency') && !field.endsWith('Preference')
          );
          
          return (
            <div key={catKey} style={{ marginBottom: '32px' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 500, 
                color: DIMENSION_COLORS[catKey],
                marginBottom: '16px',
                padding: '10px 16px',
                background: `${DIMENSION_COLORS[catKey]}10`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              >
                <span>{catName}</span>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  {mainQuestions.length} 个问题
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mainQuestions.map(([field, info]) => {
                  const myAnswer = myProfile[field] || myProfile[field.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] || '-';
                  const theirAnswer = matchProfile[field] || matchProfile[field.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] || '-';
                  
                  // 获取我对对方的要求
                  let myRequirement = null;
                  let theirRequirement = null;
                  
                  // 检查是否有对应的 preference/consistency 字段
                  const prefField = field.replace(/Type$/, 'MatchPreference').replace(/Style$/, 'MatchPreference').replace(/Circle$/, 'CirclePreference').replace(/Role$/, 'RolePreference');
                  const consistencyField = field + 'Consistency';
                  
                  if (myProfile[prefField]) myRequirement = myProfile[prefField];
                  else if (myProfile[consistencyField]) myRequirement = myProfile[consistencyField];
                  else if (field === 'acceptLongDistance') myRequirement = myAnswer;
                  else if (field === 'ageRange') myRequirement = myAnswer;
                  
                  if (matchProfile[prefField]) theirRequirement = matchProfile[prefField];
                  else if (matchProfile[consistencyField]) theirRequirement = matchProfile[consistencyField];
                  else if (field === 'acceptLongDistance') theirRequirement = theirAnswer;
                  else if (field === 'ageRange') theirRequirement = theirAnswer;
                  
                  // 计算匹配分数
                  const matchResult = calculateQuestionMatch(myAnswer, myRequirement, theirAnswer, theirRequirement, field, myProfile, matchProfile);
                  
                  return (
                    <div key={field} style={{ 
                      background: 'white', 
                      borderRadius: '8px',
                      border: `1px solid ${matchResult?.matched === false ? '#ffa39e' : matchResult?.matched === true ? '#b7eb8f' : '#e8e8e8'}`,
                      overflow: 'hidden'
                    }}>
                      {/* 问题标题 */}
                      <div style={{ 
                        padding: '12px 16px', 
                        background: matchResult?.matched === false ? '#fff1f0' : matchResult?.matched === true ? '#f6ffed' : '#f8f8f8',
                        borderBottom: `1px solid ${matchResult?.matched === false ? '#ffa39e' : matchResult?.matched === true ? '#b7eb8f' : '#e8e8e8'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{info.label}</span>
                        
                        {matchResult?.score !== null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: getScoreColor(matchResult.score)
                            }}>
                              {matchResult.score}分
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: matchResult.matched === true ? '#52c41a' : matchResult.matched === false ? '#ff4d4f' : '#faad14',
                              color: 'white'
                            }}>
                              {matchResult.matched === true ? '✓ 匹配' : matchResult.matched === false ? '✗ 不匹配' : '? 待定'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* 三列对比 */}
                      <div style={{ display: 'flex' }}>
                        {/* 我的回答 */}
                        <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: '11px', color: '#1890ff', marginBottom: '4px', fontWeight: 500 }}>你的回答</div>
                          <div style={{ fontSize: '13px', color: '#333', minHeight: '20px' }}>{myAnswer}</div>
                        </div>
                        
                        {/* 我的要求 */}
                        <div style={{ flex: 1, padding: '12px 16px', borderRight: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: '11px', color: '#fa8c16', marginBottom: '4px', fontWeight: 500 }}>你对对方的要求</div>
                          <div style={{ fontSize: '13px', color: '#333', minHeight: '20px' }}>{myRequirement || '无明确要求'}</div>
                        </div>
                        
                        {/* 对方的回答 */}
                        <div style={{ flex: 1, padding: '12px 16px' }}>
                          <div style={{ fontSize: '11px', color: '#eb2f96', marginBottom: '4px', fontWeight: 500 }}>对方的回答</div>
                          <div style={{ fontSize: '13px', color: '#333', minHeight: '20px' }}>{theirAnswer}</div>
                        </div>
                      </div>
                      
                      {/* 匹配说明 */}
                      {matchResult?.note && (
                        <div style={{ 
                          padding: '8px 16px', 
                          background: '#fafafa',
                          borderTop: '1px solid #f0f0f0',
                          fontSize: '12px',
                          color: '#666'
                        }}
                        >
                          <span style={{ fontWeight: 500 }}>匹配分析: </span>
                          {matchResult.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderScoreDetails = () => {
    if (!matchDetails) return null;
    
    const { dimensions } = matchDetails.fromA;
    
    return (
      <div>
        {/* 总体分数 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '32px', 
          marginBottom: '24px',
          padding: '20px',
          background: '#f8f8f8',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>你对TA</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: getScoreColor(matchDetails.fromA.score) }}>
              {matchDetails.fromA.score}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>综合</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: getScoreColor(matchDetails.bidirectionalScore) }}>
              {matchDetails.bidirectionalScore}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>TA对你</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: getScoreColor(matchDetails.fromB.score) }}>
              {matchDetails.fromB.score}
            </div>
          </div>
        </div>
        
        {/* 硬性条件检查 */}
        {(() => {
          const dealBreakers = checkDealBreakers();
          if (dealBreakers.length === 0) return null;
          
          return (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ff4d4f' }}>
                ⚠️ 硬性条件不匹配 ({dealBreakers.length}项)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dealBreakers.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      background: item.critical ? '#fff1f0' : item.warning ? '#fffbe6' : '#f6ffed',
                      border: `1px solid ${item.critical ? '#ffa39e' : item.warning ? '#ffd666' : '#b7eb8f'}`,
                      borderRadius: '6px',
                      borderLeft: `4px solid ${item.critical ? '#ff4d4f' : item.warning ? '#faad14' : '#52c41a'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '4px' }}>
                          {item.field}
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            marginLeft: '8px',
                            background: item.blocker === '你' ? '#e6f7ff' : item.blocker === '对方' ? '#fff0f6' : '#f5f5f5',
                            color: item.blocker === '你' ? '#1890ff' : item.blocker === '对方' ? '#eb2f96' : '#666'
                          }}>
                            {item.blocker === '你' ? '你的要求' : item.blocker === '对方' ? '对方要求' : item.blocker}导致
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                          {item.issue}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                          <div>
                            <span style={{ color: '#999' }}>你: </span>
                            <span style={{ color: '#1890ff' }}>{item.myValue || item.myRequirement || '-'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#999' }}>对方: </span>
                            <span style={{ color: '#eb2f96' }}>{item.theirValue || item.theirRequirement || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: item.critical ? '#ff4d4f' : item.warning ? '#faad14' : '#52c41a',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {item.critical ? '!' : item.warning ? '?' : 'i'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>            
            </div>
          );
        })()}
        
        {/* 各维度对比 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>各维度匹配度</h3>
          {Object.entries(dimensions).map(([dim, data]) => {
            const theirDim = matchDetails.fromB.dimensions[dim];
            return (
              <div key={dim} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#333' }}>{DIMENSION_LABELS[dim]}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    你→TA: <span style={{ color: getScoreColor(data.score), fontWeight: 500 }}>{data.score}分</span>
                    {' · '}
                    TA→你: <span style={{ color: getScoreColor(theirDim?.score || 0), fontWeight: 500 }}>{theirDim?.score || 0}分</span>
                  </span>
                </div>
                {renderComparisonBar('', data.score, theirDim?.score || 0)}
              </div>
            );
          })}
        </div>
        
        {/* 权重配置 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>权重配置对比</h3>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, padding: '12px', background: '#e6f7ff', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#1890ff', marginBottom: '8px', fontWeight: 500 }}>你的权重偏好</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(matchDetails.fromA.weights).map(([dim, weight]) => (
                  <span key={dim} style={{ fontSize: '11px', padding: '2px 8px', background: 'white', borderRadius: '10px' }}>
                    {DIMENSION_LABELS[dim]}: {weight}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, padding: '12px', background: '#fff0f6', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#eb2f96', marginBottom: '8px', fontWeight: 500 }}>TA的权重偏好</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(matchDetails.fromB.weights).map(([dim, weight]) => (
                  <span key={dim} style={{ fontSize: '11px', padding: '2px 8px', background: 'white', borderRadius: '10px' }}>
                    {DIMENSION_LABELS[dim]}: {weight}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* 发展曲线 */}
        {matchDetails.relationshipCurve && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>关系发展预测</h3>
            <div style={{ padding: '16px', background: '#f8f8f8', borderRadius: '8px' }}>
              <svg width="100%" height="150" viewBox="0 0 400 150" style={{ maxWidth: '500px', margin: '0 auto', display: 'block' }}>
                {/* 背景 */}
                <rect x="40" y="10" width="100" height="110" fill="#e6f7ff" opacity="0.3" />
                <rect x="140" y="10" width="160" height="110" fill="#f6ffed" opacity="0.3" />
                <rect x="300" y="10" width="80" height="110" fill="#fff7e6" opacity="0.3" />
                
                {/* 网格线 */}
                {[0, 25, 50, 75, 100].map(y => (
                  <line key={y} x1="40" y1={120 - y} x2="380" y2={120 - y} stroke="#eee" strokeWidth="1" />
                ))}
                
                {/* 阶段标签 */}
                <text x="90" y="140" fontSize="10" fill="#1890ff" textAnchor="middle">初期</text>
                <text x="220" y="140" fontSize="10" fill="#52c41a" textAnchor="middle">发展期</text>
                <text x="340" y="140" fontSize="10" fill="#fa8c16" textAnchor="middle">稳定期</text>
                
                {/* Y轴 */}
                <text x="35" y="25" fontSize="9" fill="#999" textAnchor="end">100</text>
                <text x="35" y="70" fontSize="9" fill="#999" textAnchor="end">50</text>
                <text x="35" y="115" fontSize="9" fill="#999" textAnchor="end">0</text>
                
                {/* 曲线 */}
                {matchDetails.relationshipCurve.curve.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#07c160"
                    strokeWidth="2"
                    points={matchDetails.relationshipCurve.curve.map(p => {
                      const x = 40 + (p.month / 24) * 340;
                      const y = 120 - p.score;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                )}
                
                {/* 数据点 */}
                {matchDetails.relationshipCurve.curve.filter((_, i) => i % 4 === 0).map((p, i) => {
                  const x = 40 + (p.month / 24) * 340;
                  const y = 120 - p.score;
                  return <circle key={i} cx={x} cy={y} r="3" fill="#07c160" />;
                })}
              </svg>
              
              {/* 阶段分数 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                    {matchDetails.relationshipCurve.phaseScores.early}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>初期(兴趣)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                    {matchDetails.relationshipCurve.phaseScores.middle}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>发展期(情感)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                    {matchDetails.relationshipCurve.phaseScores.late}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>稳定期(价值观)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p style={{ color: '#ff4d4f' }}>{error}</p>
        <Link href={`/admin/match?profileId=${profileId}`} style={{ color: '#07c160', marginTop: '16px' }}>返回匹配页</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href={`/admin/match?profileId=${profileId}`} style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: '18px' }}>匹配详情</h1>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* 双方信息卡片 */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: '#e6f7ff', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#1890ff', marginBottom: '4px' }}>你</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{myProfile?.nickname}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {myProfile?.gender} · {myProfile?.birth_year ? new Date().getFullYear() - myProfile.birth_year : '?'}岁 · {myProfile?.city}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#999' }}>⇄</div>
          <div style={{ flex: 1, background: '#fff0f6', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#eb2f96', marginBottom: '4px' }}>TA</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{matchProfile?.nickname}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {matchProfile?.gender} · {matchProfile?.birth_year ? new Date().getFullYear() - matchProfile.birth_year : '?'}岁 · {matchProfile?.city}
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'overview' ? '#f5f5f5' : 'white',
                border: 'none',
                borderBottom: activeTab === 'overview' ? '2px solid #07c160' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: activeTab === 'overview' ? '#07c160' : '#666'
              }}
            >
              分数总览
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'comparison' ? '#f5f5f5' : 'white',
                border: 'none',
                borderBottom: activeTab === 'comparison' ? '2px solid #07c160' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: activeTab === 'comparison' ? '#07c160' : '#666'
              }}
            >
              详细回答对比
            </button>
          </div>
          
          <div style={{ padding: '20px' }}>
            {activeTab === 'overview' && renderScoreDetails()}
            {activeTab === 'comparison' && renderAnswerComparison()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(MatchDetailContent), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      加载中...
    </div>
  )
});
