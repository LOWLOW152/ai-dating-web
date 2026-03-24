import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 第一层硬性条件筛选
 * 为新档案计算与所有现有档案的第一层匹配
 * POST /api/admin/match/level1-calculate
 * Body: { profileId: string, templateId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { profileId, templateId = 'v1_default' } = await request.json();

    if (!profileId) {
      return Response.json(
        { success: false, error: '缺少profileId' },
        { status: 400 }
      );
    }

    // 获取新档案信息
    const profileRes = await sql.query(
      'SELECT * FROM profiles WHERE id = $1',
      [profileId]
    );

    if (profileRes.rows.length === 0) {
      return Response.json(
        { success: false, error: '档案不存在' },
        { status: 404 }
      );
    }

    const profile = profileRes.rows[0];
    const answers = profile.standardized_answers || profile.answers || {};

    // 获取第一层筛选配置
    const configRes = await sql.query(
      `SELECT * FROM level1_filter_config 
       WHERE template_id = $1 AND is_enabled = true`,
      [templateId]
    );

    const filters = configRes.rows;

    // 获取所有其他已完成的档案
    const othersRes = await sql.query(
      `SELECT * FROM profiles 
       WHERE id != $1 AND status = 'completed' AND completed_at IS NOT NULL`,
      [profileId]
    );

    const others = othersRes.rows;

    // 先删除旧的
    await sql.query(
      'DELETE FROM match_candidates WHERE profile_id = $1 OR candidate_id = $1',
      [profileId]
    );

    // 逐个检查硬性条件并插入
    for (const other of others) {
      const otherAnswers = other.standardized_answers || other.answers || {};
      let passed = true;
      let failedReason: string | undefined;

      for (const filter of filters) {
        const result = applyFilter(filter.filter_rule, answers, otherAnswers, profile, other);
        
        if (!result.passed) {
          passed = false;
          failedReason = result.reason;
          break;
        }
      }

      // 正向记录 (A→B)
      await sql.query(
        `INSERT INTO match_candidates (profile_id, candidate_id, passed_level_1, failed_reason)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id, candidate_id) DO UPDATE SET
         passed_level_1 = EXCLUDED.passed_level_1,
         failed_reason = EXCLUDED.failed_reason,
         calculated_at = NOW()`,
        [profileId, other.id, passed, failedReason || null]
      );

      // 反向记录 (B→A) - 需要重新计算对方视角
      let reversePassed = true;
      let reverseFailedReason: string | undefined;

      for (const filter of filters) {
        const result = applyFilter(filter.filter_rule, otherAnswers, answers, other, profile);
        
        if (!result.passed) {
          reversePassed = false;
          reverseFailedReason = result.reason;
          break;
        }
      }

      await sql.query(
        `INSERT INTO match_candidates (profile_id, candidate_id, passed_level_1, failed_reason)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id, candidate_id) DO UPDATE SET
         passed_level_1 = EXCLUDED.passed_level_1,
         failed_reason = EXCLUDED.failed_reason,
         calculated_at = NOW()`,
        [other.id, profileId, reversePassed, reverseFailedReason || null]
      );
    }

    // 更新档案的计算时间
    await sql.query(
      'UPDATE profiles SET level1_calculated_at = NOW() WHERE id = $1',
      [profileId]
    );

    // 重新统计
    const statsRes = await sql.query(
      `SELECT 
        COUNT(*) FILTER (WHERE passed_level_1 = true) as passed,
        COUNT(*) as total
       FROM match_candidates
       WHERE profile_id = $1`,
      [profileId]
    );

    const { passed, total } = statsRes.rows[0];

    return Response.json({
      success: true,
      data: {
        profileId,
        totalChecked: parseInt(total),
        passed: parseInt(passed),
        failed: parseInt(total) - parseInt(passed)
      }
    });

  } catch (error) {
    console.error('Level1 calculate error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// 应用筛选规则
function applyFilter(
  rule: string,
  answersA: Record<string, unknown>,
  answersB: Record<string, unknown>,
  profileA: Record<string, unknown>,
  profileB: Record<string, unknown>
): { passed: boolean; reason?: string } {
  switch (rule) {
    case 'gender_opposite':
      // 必须异性
      const genderA = answersA.gender;
      const genderB = answersB.gender;
      if (genderA === genderB) {
        return { passed: false, reason: 'gender' };
      }
      return { passed: true };

    case 'age_mutual':
      // 双向年龄互适
      const birthYearA = Number(answersA.birth_year);
      const birthYearB = Number(answersB.birth_year);
      
      // 如果没有配置接受范围，默认±5岁
      const acceptMinA = Number(profileA.accept_age_min) || -5;
      const acceptMaxA = Number(profileA.accept_age_max) || 5;
      const acceptMinB = Number(profileB.accept_age_min) || -5;
      const acceptMaxB = Number(profileB.accept_age_max) || 5;

      const ageDiff = birthYearA - birthYearB; // 正数表示A比B大

      // A的年龄是否在B的接受范围内
      const aInBRange = ageDiff >= acceptMinB && ageDiff <= acceptMaxB;
      // B的年龄是否在A的接受范围内
      const bInARange = (-ageDiff) >= acceptMinA && (-ageDiff) <= acceptMaxA;

      if (!aInBRange || !bInARange) {
        return { passed: false, reason: 'age' };
      }
      return { passed: true };

    case 'city_or_accept':
      // 不接受异地则必须同城（模糊匹配）
      const longDistanceA = answersA.long_distance;
      const longDistanceB = answersB.long_distance;
      let cityA = String(answersA.city || '').trim();
      let cityB = String(answersB.city || '').trim();
      
      // 去掉常见后缀（市、区、县）用于模糊匹配
      cityA = cityA.replace(/[市区县]$/, '');
      cityB = cityB.replace(/[市区县]$/, '');

      // 判断是否同城：互相包含或相等
      // 例如："北京" 和 "北京市" → 同城
      // 例如："上海" 和 "上海浦东" → 同城（浦东包含上海，虽然不完全准确，但比误杀好）
      const isSameCity = cityA === cityB || 
                         cityA.includes(cityB) || 
                         cityB.includes(cityA);

      // 如果A完全不接受异地且不在同一城市
      if (longDistanceA === '完全不行' && !isSameCity) {
        return { passed: false, reason: 'location' };
      }
      // 如果B完全不接受异地且不在同一城市
      if (longDistanceB === '完全不行' && !isSameCity) {
        return { passed: false, reason: 'location' };
      }
      return { passed: true };

    case 'education_min':
      // 学历最低要求
      const educationOrder = ['高中', '大专', '本科', '硕士', '博士'];
      const eduA = String(answersA.education || '');
      const eduB = String(answersB.education || '');
      const minEduA = String(profileA.accept_education_min || '高中');
      const minEduB = String(profileB.accept_education_min || '高中');

      const idxA = educationOrder.indexOf(eduA);
      const idxB = educationOrder.indexOf(eduB);
      const minIdxA = educationOrder.indexOf(minEduA);
      const minIdxB = educationOrder.indexOf(minEduB);

      if (idxB < minIdxA || idxA < minIdxB) {
        return { passed: false, reason: 'education' };
      }
      return { passed: true };

    case 'diet_compatible':
      // 饮食兼容性检查 - 基于标准化后的diet标签
      const dietA = Array.isArray(answersA.diet) ? answersA.diet : [];
      const dietB = Array.isArray(answersB.diet) ? answersB.diet : [];
      
      // 如果任一方无特殊要求，直接通过
      if (dietA.includes('无特殊要求') || dietB.includes('无特殊要求')) {
        return { passed: true };
      }
      
      // 核心冲突逻辑：如果A有某种饮食习惯，B明确排斥这种习惯
      // 目前简化处理：只要两个人的diet标签有交集，或者一方包含另一方，就认为兼容
      const hasOverlap = dietA.some((tag: string) => dietB.includes(tag));
      const aContainsB = dietB.every((tag: string) => dietA.includes(tag));
      const bContainsA = dietA.every((tag: string) => dietB.includes(tag));
      
      if (!hasOverlap && !aContainsB && !bContainsA) {
        // 标签完全不相关，可能存在潜在冲突
        // 但为了不过度筛选，这里还是允许通过
        return { passed: true };
      }
      
      return { passed: true };

    default:
      return { passed: true };
  }
}
