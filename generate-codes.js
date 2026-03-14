const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  try {
    await client.connect();
    const today = '2026-03-14';
    
    // Check existing
    const existing = await client.query('SELECT COUNT(*) as count FROM invite_codes WHERE created_at = $1', [today]);
    
    if (existing.rows[0].count > 0) {
      const codes = await client.query('SELECT code, used FROM invite_codes WHERE created_at = $1 ORDER BY code', [today]);
      console.log('今日已存在邀请码：');
      codes.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.code} ${row.used ? '(已使用)' : '(未使用)'}`);
      });
    } else {
      // Generate 10 new codes
      const codes = [];
      for (let i = 0; i < 10; i++) {
        let code;
        let exists = true;
        while (exists) {
          code = generateCode();
          const check = await client.query('SELECT 1 FROM invite_codes WHERE code = $1', [code]);
          exists = check.rows.length > 0;
        }
        await client.query('INSERT INTO invite_codes (code, created_at, used) VALUES ($1, $2, false)', [code, today]);
        codes.push(code);
      }
      console.log('今日新生成邀请码：');
      codes.forEach((code, i) => console.log(`${i + 1}. ${code}`));
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
