import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/admin/fix-tags
export async function GET() {
  try {
    // 1. 检查表结构
    const tableInfo = await sql.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'tags'
    `);
    
    // 2. 检查一个档案的当前tags值
    const current = await sql.query(
      `SELECT id, invite_code, tags, pg_typeof(tags) as pg_type 
       FROM profiles WHERE invite_code = 'PQMU4BUK'`
    );
    
    // 3. 尝试多种方式更新
    const results = [];
    
    // 方式1: 使用 to_jsonb
    try {
      await sql.query(
        `UPDATE profiles SET tags = to_jsonb($1::text[]) WHERE invite_code = 'PQMU4BUK'`,
        [['测试1']]
      );
      results.push('方式1(to_jsonb)成功');
    } catch (e) {
      results.push(`方式1失败: ${e instanceof Error ? e.message : '未知'}`);
    }
    
    // 方式2: 直接字符串
    try {
      await sql.query(
        `UPDATE profiles SET tags = '["测试2"]'::jsonb WHERE invite_code = 'PQMU4BUK'`
      );
      results.push('方式2(直接字符串)成功');
    } catch (e) {
      results.push(`方式2失败: ${e instanceof Error ? e.message : '未知'}`);
    }
    
    return NextResponse.json({
      success: true,
      tableInfo: tableInfo.rows[0],
      current: current.rows[0],
      testResults: results
    });
    
  } catch (error) {
    console.error('Fix tags error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
