-- 数据库 Schema for AI Dating

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  profile_id VARCHAR(20)
);

-- 档案表
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(20) PRIMARY KEY,  -- 格式: YYYYMMDD-CODE
  invite_code VARCHAR(10) NOT NULL REFERENCES invite_codes(code),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 基础信息 (Auto)
  nickname VARCHAR(50),
  gender VARCHAR(10),
  birth_year INTEGER,
  city VARCHAR(50),
  occupation VARCHAR(50),
  education VARCHAR(20),
  accept_long_distance VARCHAR(20),
  age_range VARCHAR(20),
  
  -- 兴趣爱好 (Semi)
  hobby_type TEXT,
  weekend_style TEXT,
  long_term_hobby TEXT,
  travel_style TEXT,
  spiritual_enjoyment TEXT,
  recent_interest TEXT,
  friend_preference TEXT,
  unique_hobby TEXT,
  
  -- 生活底色 (Semi)
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
  
  -- 核心人格 (Dog)
  current_state TEXT,
  trusted_for TEXT,
  understood_moment TEXT,
  relationship_blindspot TEXT,
  ideal_relationship TEXT,
  
  -- 相处偏好 (Dog)
  core_need TEXT,
  conflict_handling TEXT,
  contact_frequency TEXT,
  deal_breakers TEXT,
  future_vision TEXT,
  
  -- 追问记录
  followup_logs JSONB DEFAULT '[]',
  
  -- 状态管理
  status VARCHAR(20) DEFAULT '待处理',
  notes TEXT,
  
  -- 索引
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  INDEX idx_invite_code (invite_code)
);

-- 管理员账号表（简单版）
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
