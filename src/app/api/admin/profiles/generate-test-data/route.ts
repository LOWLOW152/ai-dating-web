import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

const MALE_NAMES = ['伟','强','磊','明','辉','杰','浩','宇','鑫','俊'];
const FEMALE_NAMES = ['芳','娜','敏','静','丽','艳','娟','霞','秀兰','燕'];
const CITIES = ['北京','上海','广州','深圳','杭州','南京','成都','武汉','西安'];
const EDUS = ['高中','大专','本科','硕士'];
const INTERESTS = ['阅读','旅行','电影','音乐','健身','摄影','美食','游戏'];

function rand(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function POST(request: NextRequest) {
  try {
    const { count = 10, gender = 'mixed' } = await request.json();
    
    if (count < 1 || count > 100) {
      return Response.json({ success: false, error: '数量必须在1-100之间' }, { status: 400 });
    }

    const generated = [];
    const errors = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const g = gender === 'mixed' ? (Math.random() > 0.5 ? '男' : '女') : gender;
        const name = rand(g === '男' ? MALE_NAMES : FEMALE_NAMES);
        const birthYear = randInt(1988, 1998);
        const city = rand(CITIES);
        
        // 使用uuid确保唯一性
        const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
        const inviteCode = `TEST${uniqueId}${i.toString().padStart(3, '0')}`;
        
        const answers = {
          nickname: name,
          gender: g,
          birthYear: String(birthYear),
          city: city,
          education: rand(EDUS),
          long_distance: Math.random() > 0.7 ? '接受' : '不接受',
          diet: ['无特殊要求'],
          interests: [rand(INTERESTS), rand(INTERESTS), rand(INTERESTS)],
          sleep_schedule: '早睡早起',
          social_mode: '外向健谈',
          topics: ['社会热点'],
          exercise: '经常运动',
        };
        
        // 先创建档案（不依赖invite_codes表）
        const res = await sql.query(
          `INSERT INTO profiles (id, invite_code, status, answers, completed_at)
           VALUES (gen_random_uuid(), $1, 'completed', $2::jsonb, NOW())
           ON CONFLICT (invite_code) DO NOTHING
           RETURNING id, invite_code, answers->>'nickname' as nickname, answers->>'gender' as gender`,
          [inviteCode, JSON.stringify(answers)]
        );
        
        if (res.rows.length > 0) {
          generated.push(res.rows[0]);
          
          // 同时创建邀请码记录（忽略冲突）
          await sql.query(
            `INSERT INTO invite_codes (code, status, max_uses, use_count, created_at, used_by, used_at)
             VALUES ($1, 'used', 1, 1, NOW(), $2, NOW())
             ON CONFLICT (code) DO NOTHING`,
            [inviteCode, res.rows[0].id]
          );
        } else {
          errors.push(`第${i+1}个: 邀请码冲突`);
        }
      } catch (itemError) {
        errors.push(`第${i+1}个: ${String(itemError)}`);
      }
    }

    return Response.json({
      success: generated.length > 0,
      message: `成功生成 ${generated.length} 个测试档案${errors.length > 0 ? `，${errors.length}个失败` : ''}`,
      data: generated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Generate error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await sql.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE answers->>'gender' = '男') as male_count,
        COUNT(*) FILTER (WHERE answers->>'gender' = '女') as female_count,
        COUNT(*) FILTER (WHERE invite_code LIKE 'TEST%') as test_count
       FROM profiles WHERE status = 'completed'`
    );
    return Response.json({ success: true, data: res.rows[0] });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // 使用 ILIKE 进行不区分大小写的匹配
    const testProfiles = await sql.query(
      `SELECT id, invite_code FROM profiles WHERE invite_code ILIKE 'TEST%'`
    );
    
    if (testProfiles.rows.length === 0) {
      return Response.json({
        success: true,
        message: '没有测试档案可删除',
        data: [],
        debug: { count: 0 }
      });
    }
    
    const testIds = testProfiles.rows.map(r => r.id);
    const inviteCodes = testProfiles.rows.map(r => r.invite_code);
    
    // 先删除关联的匹配结果
    await sql.query(
      `DELETE FROM match_results 
       WHERE profile_a_id = ANY($1) OR profile_b_id = ANY($1)`,
      [testIds]
    );
    
    // 删除第一层候选匹配
    await sql.query(
      `DELETE FROM match_candidates 
       WHERE profile_id = ANY($1) OR candidate_id = ANY($1)`,
      [testIds]
    );
    
    // 删除测试档案
    const res = await sql.query(
      `DELETE FROM profiles WHERE invite_code ILIKE 'TEST%' RETURNING id, invite_code`
    );
    
    // 同时删除对应的邀请码
    await sql.query(
      `DELETE FROM invite_codes WHERE code ILIKE 'TEST%'`
    );
    
    return Response.json({
      success: true,
      message: `成功删除 ${res.rows.length} 个测试档案`,
      data: res.rows,
      debug: { 
        found: testProfiles.rows.length,
        deleted: res.rows.length,
        inviteCodes: inviteCodes.slice(0, 5) // 显示前5个
      }
    });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
