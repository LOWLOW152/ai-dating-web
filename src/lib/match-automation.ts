import { sql } from '@/lib/db';

/**
 * 自动化匹配服务
 * 整合三层匹配：第一层(硬性筛选) → 第二层(AI初筛) → 第三层(AI深度匹配)
 */

const CONCURRENCY_LIMIT = 5;  // 并发控制
const DELAY_BETWEEN_REQUESTS = 1000;  // 请求间隔1秒

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 第一层：硬性条件筛选
async function runLevel1(profileId: string): Promise<{ success: boolean; error?: string; candidatesCount?: number }> {
  try {
    const res = await fetch('https://www.ai-dating.top/api/admin/match/level1-calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId })
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Level1 failed: ${error}`);
    }
    
    const data = await res.json();
    return { 
      success: true, 
      candidatesCount: data.data?.candidates?.length || 0 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// 第二层：AI初筛
async function runLevel2(profileId: string): Promise<{ success: boolean; error?: string; processed?: number }> {
  try {
    const res = await fetch('https://www.ai-dating.top/api/admin/match/level2-calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, templateId: 'v1_default' })
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Level2 failed: ${error}`);
    }
    
    const data = await res.json();
    return { 
      success: true, 
      processed: data.data?.processed || 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// 第三层：AI深度匹配
async function runLevel3(profileId: string): Promise<{ success: boolean; error?: string; processed?: number }> {
  try {
    const res = await fetch('https://www.ai-dating.top/api/admin/match/level3-calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId })
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Level3 failed: ${error}`);
    }
    
    const data = await res.json();
    return { 
      success: true, 
      processed: data.data?.processed || 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// 获取待处理的档案列表
async function getPendingProfiles(level: number): Promise<string[]> {
  let query = '';
  
  switch (level) {
    case 1:
      // 第一层：AI评价已完成，第一层未开始
      query = `
        SELECT id FROM profiles 
        WHERE ai_evaluation_status = 'completed' 
          AND (match_level1_status IS NULL OR match_level1_status = 'pending')
        ORDER BY ai_evaluated_at ASC
        LIMIT 50
      `;
      break;
      
    case 2:
      // 第二层：第一层已完成，第二层未开始
      query = `
        SELECT id FROM profiles 
        WHERE match_level1_status = 'completed' 
          AND (match_level2_status IS NULL OR match_level2_status = 'pending')
        ORDER BY match_level1_at ASC
        LIMIT 50
      `;
      break;
      
    case 3:
      // 第三层：第二层已完成，有候选人分数>80且>现有最高分
      query = `
        SELECT DISTINCT p.id 
        FROM profiles p
        JOIN match_candidates mc ON p.id = mc.profile_id
        WHERE p.match_level2_status = 'completed'
          AND (p.match_level3_status IS NULL OR p.match_level3_status = 'pending')
          AND mc.level_2_passed = true
          AND mc.level_3_calculated_at IS NULL
        ORDER BY mc.level_2_score DESC
        LIMIT 30
      `;
      break;
      
    default:
      return [];
  }
  
  const result = await sql.query(query);
  return result.rows.map(r => r.id);
}

// 更新档案状态
async function updateProfileStatus(
  profileId: string, 
  level: number, 
  status: string, 
  error?: string
): Promise<void> {
  const fields: Record<number, { status: string; time: string; error?: string }> = {
    1: { status: 'match_level1_status', time: 'match_level1_at', error: 'match_error' },
    2: { status: 'match_level2_status', time: 'match_level2_at', error: 'match_error' },
    3: { status: 'match_level3_status', time: 'match_level3_at', error: 'match_error' }
  };
  
  const field = fields[level];
  if (!field) return;
  
  const updates: string[] = [`${field.status} = $1`];
  const values: (string | null)[] = [status];
  
  if (status === 'completed' || status === 'failed') {
    updates.push(`${field.time} = NOW()`);
  }
  
  if (error) {
    updates.push(`${field.error} = $${values.length + 1}`);
    values.push(error);
  }
  
  values.push(profileId);
  
  await sql.query(
    `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${values.length}`,
    values
  );
}

// 记录日志
async function logAutomation(
  runType: string,
  status: string,
  stats: { total: number; success: number; failed: number; skipped: number },
  details?: Record<string, unknown>
): Promise<void> {
  await sql.query(
    `INSERT INTO match_automation_logs (run_type, status, total_profiles, success_count, failed_count, skipped_count, details, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [runType, status, stats.total, stats.success, stats.failed, stats.skipped, JSON.stringify(details || {})]
  );
}

// 批量运行第一层
export async function batchRunLevel1(): Promise<{ success: boolean; stats: { total: number; success: number; failed: number } }> {
  const profileIds = await getPendingProfiles(1);
  
  if (profileIds.length === 0) {
    return { success: true, stats: { total: 0, success: 0, failed: 0 } };
  }
  
  let successCount = 0;
  let failedCount = 0;
  
  // 并发控制处理
  for (let i = 0; i < profileIds.length; i += CONCURRENCY_LIMIT) {
    const batch = profileIds.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (profileId) => {
      await updateProfileStatus(profileId, 1, 'running');
      
      const result = await runLevel1(profileId);
      
      if (result.success) {
        await updateProfileStatus(profileId, 1, 'completed');
        successCount++;
      } else {
        await updateProfileStatus(profileId, 1, 'failed', result.error);
        failedCount++;
      }
    }));
    
    await delay(DELAY_BETWEEN_REQUESTS);
  }
  
  await logAutomation('level1', failedCount === 0 ? 'completed' : 'partial', {
    total: profileIds.length,
    success: successCount,
    failed: failedCount,
    skipped: 0
  });
  
  return {
    success: failedCount === 0,
    stats: { total: profileIds.length, success: successCount, failed: failedCount }
  };
}

// 批量运行第二层
export async function batchRunLevel2(): Promise<{ success: boolean; stats: { total: number; success: number; failed: number } }> {
  const profileIds = await getPendingProfiles(2);
  
  if (profileIds.length === 0) {
    return { success: true, stats: { total: 0, success: 0, failed: 0 } };
  }
  
  let successCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < profileIds.length; i += CONCURRENCY_LIMIT) {
    const batch = profileIds.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (profileId) => {
      await updateProfileStatus(profileId, 2, 'running');
      
      const result = await runLevel2(profileId);
      
      if (result.success) {
        await updateProfileStatus(profileId, 2, 'completed');
        successCount++;
      } else {
        await updateProfileStatus(profileId, 2, 'failed', result.error);
        failedCount++;
      }
    }));
    
    await delay(DELAY_BETWEEN_REQUESTS);
  }
  
  await logAutomation('level2', failedCount === 0 ? 'completed' : 'partial', {
    total: profileIds.length,
    success: successCount,
    failed: failedCount,
    skipped: 0
  });
  
  return {
    success: failedCount === 0,
    stats: { total: profileIds.length, success: successCount, failed: failedCount }
  };
}

// 批量运行第三层
export async function batchRunLevel3(): Promise<{ success: boolean; stats: { total: number; success: number; failed: number; skipped: number } }> {
  const profileIds = await getPendingProfiles(3);
  
  if (profileIds.length === 0) {
    return { success: true, stats: { total: 0, success: 0, failed: 0, skipped: 0 } };
  }
  
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < profileIds.length; i += CONCURRENCY_LIMIT) {
    const batch = profileIds.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(batch.map(async (profileId) => {
      await updateProfileStatus(profileId, 3, 'running');
      
      const result = await runLevel3(profileId);
      
      if (result.success) {
        await updateProfileStatus(profileId, 3, 'completed');
        successCount++;
      } else {
        await updateProfileStatus(profileId, 3, 'failed', result.error);
        failedCount++;
      }
    }));
    
    await delay(DELAY_BETWEEN_REQUESTS);
  }
  
  await logAutomation('level3', failedCount === 0 ? 'completed' : 'partial', {
    total: profileIds.length,
    success: successCount,
    failed: failedCount,
    skipped: skippedCount
  });
  
  return {
    success: failedCount === 0,
    stats: { total: profileIds.length, success: successCount, failed: failedCount, skipped: skippedCount }
  };
}

// 获取自动化状态统计
export async function getAutomationStats(): Promise<{
  pending: { level1: number; level2: number; level3: number };
  completed: { level1: number; level2: number; level3: number };
  failed: { level1: number; level2: number; level3: number };
}> {
  const result = await sql.query(`
    SELECT 
      COUNT(*) FILTER (WHERE match_level1_status = 'pending') as l1_pending,
      COUNT(*) FILTER (WHERE match_level1_status = 'completed') as l1_completed,
      COUNT(*) FILTER (WHERE match_level1_status = 'failed') as l1_failed,
      COUNT(*) FILTER (WHERE match_level2_status = 'pending') as l2_pending,
      COUNT(*) FILTER (WHERE match_level2_status = 'completed') as l2_completed,
      COUNT(*) FILTER (WHERE match_level2_status = 'failed') as l2_failed,
      COUNT(*) FILTER (WHERE match_level3_status = 'pending') as l3_pending,
      COUNT(*) FILTER (WHERE match_level3_status = 'completed') as l3_completed,
      COUNT(*) FILTER (WHERE match_level3_status = 'failed') as l3_failed
    FROM profiles
    WHERE ai_evaluation_status = 'completed'
  `);
  
  const row = result.rows[0];
  
  return {
    pending: {
      level1: parseInt(row.l1_pending) || 0,
      level2: parseInt(row.l2_pending) || 0,
      level3: parseInt(row.l3_pending) || 0
    },
    completed: {
      level1: parseInt(row.l1_completed) || 0,
      level2: parseInt(row.l2_completed) || 0,
      level3: parseInt(row.l3_completed) || 0
    },
    failed: {
      level1: parseInt(row.l1_failed) || 0,
      level2: parseInt(row.l2_failed) || 0,
      level3: parseInt(row.l3_failed) || 0
    }
  };
}
