import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// 调试接口 - 查看TEST档案详情
export async function GET(request: NextRequest) {
  try {
    // 查看所有TEST档案的status分布
    const statusDist = await sql.query(
      `SELECT status, COUNT(*) as count 
       FROM profiles 
       WHERE invite_code ILIKE 'TEST%'
       GROUP BY status`
    );
    
    // 查看前10个TEST档案的详细信息
    const details = await sql.query(
      `SELECT id, invite_code, status, answers->>'gender' as gender
       FROM profiles 
       WHERE invite_code ILIKE 'TEST%'
       ORDER BY created_at DESC
       LIMIT 10`
    );
    
    // 查看completed状态的TEST档案
    const completed = await sql.query(
      `SELECT COUNT(*) as count
       FROM profiles 
       WHERE invite_code ILIKE 'TEST%' AND status = 'completed'`
    );
    
    return Response.json({
      success: true,
      statusDistribution: statusDist.rows,
      testCountCompleted: completed.rows[0],
      recentTestProfiles: details.rows
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// 强制删除所有TEST档案（无论status）
export async function DELETE() {
  try {
    const testProfiles = await sql.query(
      `SELECT id, invite_code, status FROM profiles WHERE invite_code ILIKE 'TEST%'`
    );
    
    if (testProfiles.rows.length === 0) {
      return Response.json({ success: true, message: '没有TEST档案', data: [] });
    }
    
    const testIds = testProfiles.rows.map(r => r.id);
    
    // 删除关联数据
    await sql.query(`DELETE FROM match_results WHERE profile_a_id = ANY($1) OR profile_b_id = ANY($1)`, [testIds]);
    await sql.query(`DELETE FROM match_candidates WHERE profile_id = ANY($1) OR candidate_id = ANY($1)`, [testIds]);
    
    // 删除档案
    const res = await sql.query(`DELETE FROM profiles WHERE invite_code ILIKE 'TEST%' RETURNING id, invite_code, status`);
    
    // 删除邀请码
    await sql.query(`DELETE FROM invite_codes WHERE code ILIKE 'TEST%'`);
    
    return Response.json({
      success: true,
      message: `成功删除 ${res.rows.length} 个TEST档案`,
      deleted: res.rows
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// 生成测试档案
export async function POST(request: NextRequest) {
  try {
    const { count = 10, gender = 'mixed' } = await request.json();
    
    if (count < 1 || count > 100) {
      return Response.json({ success: false, error: '数量必须在1-100之间' }, { status: 400 });
    }

    const MALE_NAMES = ['伟','强','磊','明','辉','杰','浩','宇','鑫','俊'];
    const FEMALE_NAMES = ['芳','娜','敏','静','丽','艳','娟','霞','秀兰','燕'];
    const CITIES = ['北京','上海','广州','深圳','杭州','南京','成都','武汉','西安'];
    const EDUS = ['高中','大专','本科','硕士'];
    const INTERESTS = ['阅读','旅行','电影','音乐','健身','摄影','美食','游戏'];
    
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const generated = [];
    
    for (let i = 0; i < count; i++) {
      const g = gender === 'mixed' ? (Math.random() > 0.5 ? '男' : '女') : gender;
      const name = rand(g === '男' ? MALE_NAMES : FEMALE_NAMES);
      const birthYear = randInt(1988, 1998);
      const city = rand(CITIES);
      
      const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
      const inviteCode = `TEST${uniqueId}${i.toString().padStart(3, '0')}`;
      
      const answers = {
        nickname: name, gender: g, birthYear: String(birthYear), city: city,
        education: rand(EDUS), long_distance: Math.random() > 0.7 ? '接受' : '不接受',
        diet: ['无特殊要求'], interests: [rand(INTERESTS), rand(INTERESTS), rand(INTERESTS)],
        sleep_schedule: '早睡早起', social_mode: '外向健谈', topics: ['社会热点'], exercise: '经常运动',
      };
      
      const res = await sql.query(
        `INSERT INTO profiles (id, invite_code, status, answers, completed_at)
         VALUES (gen_random_uuid(), $1, 'completed', $2::jsonb, NOW())
         RETURNING id, invite_code, answers->>'nickname' as nickname, answers->>'gender' as gender`,
        [inviteCode, JSON.stringify(answers)]
      );
      
      if (res.rows.length > 0) {
        generated.push(res.rows[0]);
        await sql.query(
          `INSERT INTO invite_codes (code, status, max_uses, use_count, created_at, used_by, used_at)
           VALUES ($1, 'used', 1, 1, NOW(), $2, NOW()) ON CONFLICT (code) DO NOTHING`,
          [inviteCode, res.rows[0].id]
        );
      }
    }

    return Response.json({ success: true, message: `成功生成 ${generated.length} 个测试档案`, data: generated });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
