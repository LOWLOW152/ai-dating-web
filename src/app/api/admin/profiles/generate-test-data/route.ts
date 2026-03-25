import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// VERSION: 2026-03-25-2140 - Force redeploy

export async function GET(request: NextRequest) {
  try {
    // 测试各种查询方式
    const tests = [];
    
    // 1. 直接查询所有档案
    try {
      const all = await sql.query('SELECT COUNT(*) as c FROM profiles');
      tests.push({ query: 'SELECT COUNT(*) FROM profiles', result: all.rows[0]?.c ?? 'error' });
    } catch (e) {
      tests.push({ query: 'SELECT COUNT(*) FROM profiles', error: String(e) });
    }
    
    // 2. LIKE查询
    try {
      const likeTest = await sql.query(`SELECT COUNT(*) as c FROM profiles WHERE invite_code LIKE 'TEST%'`);
      tests.push({ query: `LIKE 'TEST%'`, result: likeTest.rows[0]?.c ?? 'error' });
    } catch (e) {
      tests.push({ query: `LIKE 'TEST%'`, error: String(e) });
    }
    
    // 3. 使用POSITION
    try {
      const posTest = await sql.query(`SELECT COUNT(*) as c FROM profiles WHERE POSITION('TEST' IN invite_code) = 1`);
      tests.push({ query: `POSITION('TEST' IN invite_code) = 1`, result: posTest.rows[0]?.c ?? 'error' });
    } catch (e) {
      tests.push({ query: `POSITION`, error: String(e) });
    }
    
    // 4. 查看前3个invite_code
    try {
      const samples = await sql.query(`SELECT invite_code FROM profiles LIMIT 3`);
      tests.push({ query: 'samples', result: samples.rows.map(r => r.invite_code) });
    } catch (e) {
      tests.push({ query: 'samples', error: String(e) });
    }
    
    return Response.json({
      success: true,
      tests
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
