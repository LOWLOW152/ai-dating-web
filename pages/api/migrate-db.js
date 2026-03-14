import { sql } from '../../lib/db';

export default async function handler(req, res) {
  // 简单验证
  const { key } = req.query;
  if (key !== 'migrate_db_2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // 添加新字段
    const migrations = [
      // 第二部分追问字段
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobby_match_preference TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_match_preference TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_circle TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_circle_preference TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_role TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_role_preference TEXT",
      // 第三部分追问字段
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spending_consistency TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_consistency TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tidiness_consistency TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stress_consistency TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_consistency TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_consistency TEXT",
      // 权重字段
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_weights JSONB"
    ];

    const results = [];
    for (const migration of migrations) {
      try {
        await sql.query(migration);
        results.push({ sql: migration, status: 'success' });
      } catch (err) {
        results.push({ sql: migration, status: 'error', error: err.message });
      }
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
