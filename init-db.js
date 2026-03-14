const { sql } = require('./lib/db');

const schema = \`
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  profile_id VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(20) PRIMARY KEY,
  invite_code VARCHAR(10) NOT NULL REFERENCES invite_codes(code),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  nickname VARCHAR(50),
  gender VARCHAR(10),
  birth_year INTEGER,
  city VARCHAR(50),
  occupation VARCHAR(50),
  education VARCHAR(20),
  accept_long_distance VARCHAR(20),
  age_range VARCHAR(20),
  hobby_type TEXT,
  weekend_style TEXT,
  long_term_hobby TEXT,
  travel_style TEXT,
  spiritual_enjoyment TEXT,
  recent_interest TEXT,
  friend_preference TEXT,
  unique_hobby TEXT,
  spending_habit TEXT,
  sleep_schedule TEXT,
  tidiness TEXT,
  stress_response TEXT,
  decision_style TEXT,
  family_relationship TEXT,
  planning_style TEXT,
  achievement_source TEXT,
  solitude_feeling TEXT,
  life_preference TEXT,
  current_state TEXT,
  trusted_for TEXT,
  understood_moment TEXT,
  relationship_blindspot TEXT,
  ideal_relationship TEXT,
  core_need TEXT,
  conflict_handling TEXT,
  contact_frequency TEXT,
  deal_breakers TEXT,
  future_vision TEXT,
  followup_logs JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT '待处理',
  notes TEXT
);
\`;

async function init() {
  try {
    await sql\`\${sql.unsafe(schema)}\`;
    console.log('Database initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

init();
