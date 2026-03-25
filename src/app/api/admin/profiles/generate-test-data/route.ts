import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 测试各种查询方式
    const tests = [];
    
    // 1. 直接查询所有档案
    const all = await sql.query('SELECT COUNT(*) as c FROM profiles');
    tests.push({ query: 'SELECT COUNT(*) FROM profiles', result: all.rows[0].c });
    
    // 2. LIKE查询
    const likeTest = await sql.query(`SELECT COUNT(*) as c FROM profiles WHERE invite_code LIKE 'TEST%'`);
    tests.push({ query: `LIKE 'TEST%'`, result: likeTest.rows[0].c });
    
    // 3. 使用POSITION
    const posTest = await sql.query(`SELECT COUNT(*) as c FROM profiles WHERE POSITION('TEST' IN invite_code) = 1`);
    tests.push({ query: `POSITION('TEST' IN invite_code) = 1`, result: posTest.rows[0].c });
    
    // 4. 使用SUBSTRING
    const subTest = await sql.query(`SELECT COUNT(*) as c FROM profiles WHERE SUBSTRING(invite_code FROM 1 FOR 4) = 'TEST'`);
    tests.push({ query: `SUBSTRING(invite_code FROM 1 FOR 4) = 'TEST'`, result: subTest.rows[0].c });
    
    // 5. 查看invite_code字段类型
    const colInfo = await sql.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'invite_code'
    `);
    tests.push({ query: 'invite_code字段类型', result: colInfo.rows[0]?.data_type || 'unknown' });
    
    // 6. 查看前3个invite_code的实际字节
    const samples = await sql.query(`SELECT invite_code, ENCODE(invite_code::bytea, 'hex') as hex FROM profiles LIMIT 3`);
    
    return Response.json({
      success: true,
      tests,
      samples: samples.rows
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
