// 临时脚本：手动完成档案
// 使用方法：在 Vercel 控制台或本地运行

const { sql } = require('./src/lib/db');

async function completeProfile(inviteCode) {
  try {
    // 1. 查询当前档案
    const profileRes = await sql.query(
      'SELECT id, answers, completed_at FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );
    
    if (profileRes.rows.length === 0) {
      console.log('❌ 档案不存在');
      return;
    }
    
    const profile = profileRes.rows[0];
    console.log('📋 当前档案:', {
      id: profile.id,
      hasAnswers: !!profile.answers,
      answerCount: profile.answers ? Object.keys(profile.answers).length : 0,
      completed_at: profile.completed_at
    });
    
    if (!profile.answers) {
      console.log('❌ 没有答题数据！');
      return;
    }
    
    // 2. 更新档案为完成状态
    await sql.query(
      `UPDATE profiles 
       SET status = 'completed', 
           completed_at = NOW(),
           updated_at = NOW()
       WHERE invite_code = $1`,
      [inviteCode]
    );
    
    console.log('✅ 档案已标记为完成！');
    
    // 3. 更新邀请码为已使用（如果还没更新）
    await sql.query(
      `UPDATE invite_codes 
       SET used = true, 
           used_at = NOW()
       WHERE code = $1`,
      [inviteCode]
    );
    
    console.log('✅ 邀请码已标记为已使用！');
    
    // 4. 验证更新
    const verifyRes = await sql.query(
      'SELECT id, status, completed_at, answers FROM profiles WHERE invite_code = $1',
      [inviteCode]
    );
    
    console.log('\n📋 更新后的档案:', {
      id: verifyRes.rows[0].id,
      status: verifyRes.rows[0].status,
      completed_at: verifyRes.rows[0].completed_at,
      answerCount: Object.keys(verifyRes.rows[0].answers).length
    });
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    process.exit(0);
  }
}

// 执行
const inviteCode = process.argv[2] || 'PQMU4BUK';
console.log(`正在处理邀请码: ${inviteCode}...\n`);
completeProfile(inviteCode);
