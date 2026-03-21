-- 颜值打分系统
-- 照片存储和评分记录

CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_profile ON photos(profile_id);

CREATE TABLE IF NOT EXISTS beauty_scores (
  id SERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
  overall_score DECIMAL(3, 1) NOT NULL, -- 总分 0-10
  facial_features DECIMAL(3, 1), -- 五官
  temperament DECIMAL(3, 1), -- 气质
  expression DECIMAL(3, 1), -- 表情自然度
  photo_quality DECIMAL(3, 1), -- 照片质量
  ai_comment TEXT, -- AI评语
  ai_tags TEXT[], -- AI标签
  scored_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beauty_scores_profile ON beauty_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_beauty_scores_overall ON beauty_scores(overall_score);

-- 在 profiles 表添加颜值相关字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_photos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avg_beauty_score DECIMAL(3, 1) DEFAULT NULL;
