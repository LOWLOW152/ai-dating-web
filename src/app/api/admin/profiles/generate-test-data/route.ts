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
    
    for (let i = 0; i < count; i++) {
      const g = gender === 'mixed' ? (Math.random() > 0.5 ? '男' : '女') : gender;
      const name = rand(g === '男' ? MALE_NAMES : FEMALE_NAMES);
      const birthYear = randInt(1988, 1998);
      const city = rand(CITIES);
      
      const inviteCode = `TEST${Date.now()}${i.toString().padStart(3, '0')}`;
      
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
      
      // 简化插入，只保留核心字段
      const res = await sql.query(
        `INSERT INTO profiles (id, invite_code, status, answers, completed_at)
         VALUES (gen_random_uuid(), $1, 'completed', $2::jsonb, NOW())
         RETURNING id, invite_code, answers->>'nickname' as nickname, answers->>'gender' as gender`,
        [inviteCode, JSON.stringify(answers)]
      );
      
      generated.push(res.rows[0]);
    }

    return Response.json({
      success: true,
      message: `成功生成 ${generated.length} 个测试档案`,
      data: generated
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
    const res = await sql.query(
      `DELETE FROM profiles WHERE invite_code LIKE 'TEST%' RETURNING id, invite_code`
    );
    return Response.json({
      success: true,
      message: `成功删除 ${res.rows.length} 个测试档案`,
      data: res.rows
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
