import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 匹配调试页面
 * 查看档案的详细匹配状态
 * GET /api/admin/match/debug?profileId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      // 返回整体统计页面
      const statsRes = await sql.query(`
        SELECT 
          COUNT(*) FILTER (WHERE match_level2_status = 'completed') as l2_completed,
          COUNT(*) FILTER (WHERE match_level2_status = 'completed' AND level2_max_score > 0) as l2_with_score,
          COUNT(*) FILTER (WHERE match_level3_status = 'completed') as l3_completed
        FROM profiles
        WHERE ai_evaluation_status = 'completed'
      `);
      
      const candidatesRes = await sql.query(`
        SELECT 
          COUNT(DISTINCT profile_id) as profiles_with_candidates,
          COUNT(*) FILTER (WHERE passed_level_1 = true) as l1_passed,
          COUNT(*) FILTER (WHERE level_2_score IS NOT NULL) as l2_scored,
          COUNT(*) FILTER (WHERE level_2_passed = true) as l2_passed,
          COUNT(*) FILTER (WHERE level_3_calculated_at IS NOT NULL) as l3_calculated
        FROM match_candidates
      `);

      const sampleProfilesRes = await sql.query(`
        SELECT DISTINCT ON (p.id)
          p.id, p.invite_code, p.match_level2_status, p.match_level3_status,
          COUNT(mc.candidate_id) as total_candidates,
          COUNT(*) FILTER (WHERE mc.level_2_passed = true) as l2_passed_count
        FROM profiles p
        JOIN match_candidates mc ON p.id = mc.profile_id
        WHERE p.ai_evaluation_status = 'completed'
        GROUP BY p.id
        ORDER BY p.id
        LIMIT 20
      `);

      const s = statsRes.rows[0];
      const c = candidatesRes.rows[0];

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>匹配调试 - 统计概览</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { margin: 0 0 10px 0; color: #667eea; font-size: 14px; text-transform: uppercase; }
    .stat-card .number { font-size: 32px; font-weight: bold; color: #333; }
    .stat-card .label { color: #666; font-size: 14px; margin-top: 5px; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #667eea; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-green { background: #d4edda; color: #155724; }
    .badge-gray { background: #e2e3e5; color: #383d41; }
    .badge-blue { background: #cce5ff; color: #004085; }
  </style>
</head>
<body>
  <h1>🎯 匹配系统调试 - 统计概览</h1>
  
  <div class="stats-grid">
    <div class="stat-card">
      <h3>第二层完成</h3>
      <div class="number">${s.l2_completed}</div>
      <div class="label">个档案</div>
    </div>
    <div class="stat-card">
      <h3>有分数的档案</h3>
      <div class="number">${s.l2_with_score}</div>
      <div class="label">个档案</div>
    </div>
    <div class="stat-card">
      <h3>第三层完成</h3>
      <div class="number">${s.l3_completed}</div>
      <div class="label">个档案</div>
    </div>
    <div class="stat-card">
      <h3>第一层通过</h3>
      <div class="number">${c.l1_passed}</div>
      <div class="label">个候选人</div>
    </div>
    <div class="stat-card">
      <h3>第二层已评分</h3>
      <div class="number">${c.l2_scored}</div>
      <div class="label">个候选人</div>
    </div>
    <div class="stat-card">
      <h3>第二层通过</h3>
      <div class="number">${c.l2_passed}</div>
      <div class="label">个候选人</div>
    </div>
    <div class="stat-card">
      <h3>第三层已计算</h3>
      <div class="number">${c.l3_calculated}</div>
      <div class="label">个候选人</div>
    </div>
  </div>

  <h2>📋 档案列表（点击ID查看详情）</h2>
  <table>
    <thead>
      <tr>
        <th>档案ID</th>
        <th>邀请码</th>
        <th>第二层状态</th>
        <th>第三层状态</th>
        <th>候选人总数</th>
        <th>第二层通过</th>
      </tr>
    </thead>
    <tbody>
      ${sampleProfilesRes.rows.map(p => `
        <tr>
          <td><a href="?profileId=${p.id}">${p.id.substring(0, 8)}...</a></td>
          <td>${p.invite_code || '-'}</td>
          <td><span class="badge ${p.match_level2_status === 'completed' ? 'badge-green' : 'badge-gray'}">${p.match_level2_status || 'pending'}</span></td>
          <td><span class="badge ${p.match_level3_status === 'completed' ? 'badge-green' : 'badge-gray'}">${p.match_level3_status || 'pending'}</span></td>
          <td>${p.total_candidates}</td>
          <td>${p.l2_passed_count}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // 获取单个档案详情
    const profileRes = await sql.query(`
      SELECT 
        id, invite_code, status,
        ai_evaluation_status,
        match_level1_status, match_level1_at,
        match_level2_status, match_level2_at, level2_max_score,
        match_level3_status, match_level3_at
      FROM profiles
      WHERE id = $1
    `, [profileId]);

    if (profileRes.rows.length === 0) {
      return Response.json({ success: false, error: '档案不存在' }, { status: 404 });
    }

    const profile = profileRes.rows[0];

    const candidatesRes = await sql.query(`
      SELECT 
        mc.candidate_id,
        p.invite_code as candidate_code,
        mc.passed_level_1,
        mc.failed_reason as l1_failed_reason,
        mc.level_2_score,
        mc.level_2_passed,
        mc.level_2_calculated_at,
        mc.level_3_calculated_at
      FROM match_candidates mc
      JOIN profiles p ON mc.candidate_id = p.id
      WHERE mc.profile_id = $1
      ORDER BY mc.level_2_score DESC NULLS LAST
    `, [profileId]);

    const reportsRes = await sql.query(`
      SELECT candidate_id, overall_score, created_at
      FROM level3_reports
      WHERE profile_id = $1
    `, [profileId]);

    const summary = {
      total: candidatesRes.rows.length,
      l1Passed: candidatesRes.rows.filter(r => r.passed_level_1).length,
      l2Scored: candidatesRes.rows.filter(r => r.level_2_score !== null).length,
      l2Passed: candidatesRes.rows.filter(r => r.level_2_passed).length,
      l3Calculated: reportsRes.rows.length
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>匹配调试 - 档案详情</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .back-link { color: #667eea; text-decoration: none; display: inline-block; margin-bottom: 20px; }
    .back-link:hover { text-decoration: underline; }
    .profile-info { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .info-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }
    .info-item label { display: block; color: #666; font-size: 12px; margin-bottom: 4px; }
    .info-item value { font-weight: 600; color: #333; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-green { background: #d4edda; color: #155724; }
    .badge-red { background: #f8d7da; color: #721c24; }
    .badge-gray { background: #e2e3e5; color: #383d41; }
    .badge-blue { background: #cce5ff; color: #004085; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #667eea; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .score { font-weight: bold; }
    .score-high { color: #28a745; }
    .score-mid { color: #ffc107; }
    .score-low { color: #dc3545; }
    .summary { display: flex; gap: 15px; flex-wrap: wrap; margin: 20px 0; }
    .summary-item { background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .summary-item .number { font-size: 24px; font-weight: bold; color: #667eea; }
    .summary-item .label { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <a href="/api/admin/match/debug" class="back-link">← 返回统计概览</a>
  
  <h1>📁 档案详情</h1>
  
  <div class="profile-info">
    <div class="info-grid">
      <div class="info-item">
        <label>档案ID</label>
        <value>${profile.id}</value>
      </div>
      <div class="info-item">
        <label>邀请码</label>
        <value>${profile.invite_code || '-'}</value>
      </div>
      <div class="info-item">
        <label>AI评价</label>
        <value><span class="badge ${profile.ai_evaluation_status === 'completed' ? 'badge-green' : 'badge-gray'}">${profile.ai_evaluation_status || 'pending'}</span></value>
      </div>
      <div class="info-item">
        <label>第一层</label>
        <value><span class="badge ${profile.match_level1_status === 'completed' ? 'badge-green' : 'badge-gray'}">${profile.match_level1_status || 'pending'}</span></value>
      </div>
      <div class="info-item">
        <label>第二层</label>
        <value><span class="badge ${profile.match_level2_status === 'completed' ? 'badge-green' : 'badge-gray'}">${profile.match_level2_status || 'pending'}</span></value>
      </div>
      <div class="info-item">
        <label>第二层最高分</label>
        <value>${profile.level2_max_score || '-'}</value>
      </div>
      <div class="info-item">
        <label>第三层</label>
        <value><span class="badge ${profile.match_level3_status === 'completed' ? 'badge-green' : 'badge-gray'}">${profile.match_level3_status || 'pending'}</span></value>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="number">${summary.total}</div>
      <div class="label">候选人总数</div>
    </div>
    <div class="summary-item">
      <div class="number">${summary.l1Passed}</div>
      <div class="label">第一层通过</div>
    </div>
    <div class="summary-item">
      <div class="number">${summary.l2Scored}</div>
      <div class="label">第二层已评分</div>
    </div>
    <div class="summary-item">
      <div class="number">${summary.l2Passed}</div>
      <div class="label">第二层通过</div>
    </div>
    <div class="summary-item">
      <div class="number">${summary.l3Calculated}</div>
      <div class="label">第三层已计算</div>
    </div>
  </div>

  <h2>👥 候选人列表</h2>
  <table>
    <thead>
      <tr>
        <th>候选人ID</th>
        <th>邀请码</th>
        <th>第一层</th>
        <th>第二层分数</th>
        <th>第二层通过</th>
        <th>第三层</th>
      </tr>
    </thead>
    <tbody>
      ${candidatesRes.rows.map(c => {
        const l3Done = reportsRes.rows.find(r => r.candidate_id === c.candidate_id);
        const scoreClass = c.level_2_score >= 80 ? 'score-high' : c.level_2_score >= 60 ? 'score-mid' : 'score-low';
        return `
        <tr>
          <td>${c.candidate_id.substring(0, 8)}...</td>
          <td>${c.candidate_code || '-'}</td>
          <td><span class="badge ${c.passed_level_1 ? 'badge-green' : 'badge-red'}">${c.passed_level_1 ? '通过' : '失败'}</span></td>
          <td class="score ${scoreClass}">${c.level_2_score !== null ? c.level_2_score : '-'}</td>
          <td><span class="badge ${c.level_2_passed ? 'badge-green' : 'badge-gray'}">${c.level_2_passed ? '通过' : '未通过'}</span></td>
          <td><span class="badge ${l3Done ? 'badge-green' : 'badge-gray'}">${l3Done ? '已计算' : '未计算'}</span></td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
