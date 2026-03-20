const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_NsYJ7FrcjW8H@ep-falling-smoke-am9zvwb8.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function init() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Drop existing tables to start fresh
    await client.query(`DROP TABLE IF EXISTS match_results CASCADE`);
    await client.query(`DROP TABLE IF EXISTS template_weights CASCADE`);
    await client.query(`DROP TABLE IF EXISTS invite_codes CASCADE`);
    await client.query(`DROP TABLE IF EXISTS profiles CASCADE`);
    await client.query(`DROP TABLE IF EXISTS profile_templates CASCADE`);
    await client.query(`DROP TABLE IF EXISTS questions CASCADE`);
    console.log('Existing tables dropped');
    
    // Create tables
    await client.query(`
      CREATE TABLE questions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        field_type TEXT NOT NULL,
        validation JSONB DEFAULT '{}',
        options JSONB DEFAULT NULL,
        ai_prompt TEXT,
        closing_message TEXT DEFAULT NULL,
        hierarchy JSONB DEFAULT NULL,
        is_active BOOLEAN DEFAULT true,
        is_required BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('questions table created');
    
    await client.query(`
      CREATE TABLE profile_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('profile_templates table created');
    
    await client.query(`
      CREATE TABLE template_weights (
        id SERIAL PRIMARY KEY,
        template_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        match_enabled BOOLEAN DEFAULT true,
        match_algorithm TEXT,
        match_weight INTEGER DEFAULT 10,
        algorithm_params JSONB DEFAULT '{}',
        is_veto BOOLEAN DEFAULT false,
        veto_condition JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(template_id, question_id),
        CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES profile_templates(id) ON DELETE CASCADE,
        CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);
    console.log('template_weights table created');
    
    await client.query(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        invite_code TEXT NOT NULL UNIQUE,
        question_version TEXT,
        answers JSONB NOT NULL DEFAULT '{}',
        ai_summary JSONB,
        status TEXT DEFAULT 'active',
        manual_tags TEXT[],
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);
    console.log('profiles table created');
    
    await client.query(`
      CREATE TABLE invite_codes (
        code TEXT PRIMARY KEY,
        status TEXT DEFAULT 'unused',
        used_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
        used_at TIMESTAMP,
        expires_at TIMESTAMP,
        max_uses INTEGER DEFAULT 1,
        use_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('invite_codes table created');
    
    await client.query(`
      CREATE TABLE match_results (
        id SERIAL PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES profile_templates(id),
        profile_a_id TEXT NOT NULL REFERENCES profiles(id),
        profile_b_id TEXT NOT NULL REFERENCES profiles(id),
        overall_score INTEGER NOT NULL,
        category_scores JSONB,
        details JSONB,
        veto_flags TEXT[],
        suggestions TEXT[],
        calculated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(template_id, profile_a_id, profile_b_id)
      )
    `);
    console.log('match_results table created');
    
    // Insert default data
    await client.query(`
      INSERT INTO profile_templates (id, name, description, is_default, is_active)
      VALUES ('v1_default', '默认版本', '适合大多数用户的匹配算法', true, true)
    `);
    console.log('Default template inserted');
    
    await client.query(`
      INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, ai_prompt, is_active, is_required)
      VALUES 
      ('nickname', 'basic', 'auto', 1, '怎么称呼你？', 'text', '{"required": true, "maxLength": 20}', '询问用户昵称', true, true),
      ('gender', 'basic', 'auto', 2, '你的性别是？', 'select', '{"required": true}', '确认性别', true, true),
      ('birth_year', 'basic', 'auto', 3, '你哪一年出生的？', 'number', '{"required": true, "min": 1970, "max": 2005}', '确认出生年份', true, true),
      ('city', 'basic', 'auto', 4, '你现在在哪个城市？', 'text', '{"required": true}', '确认城市', true, true),
      ('interests', 'lifestyle', 'semi', 5, '平时有什么兴趣爱好？', 'multi_text', '{"required": true}', '追问具体类型', true, true)
    `);
    console.log('Default questions inserted');
    
    await client.query(`
      INSERT INTO template_weights (template_id, question_id, match_enabled, match_algorithm, match_weight, is_veto)
      VALUES 
      ('v1_default', 'nickname', false, null, 0, false),
      ('v1_default', 'gender', true, 'must_match', 20, false),
      ('v1_default', 'birth_year', true, 'range_compatible', 15, false),
      ('v1_default', 'city', true, 'must_match', 20, true),
      ('v1_default', 'interests', true, 'set_similarity', 15, false)
    `);
    console.log('Default weights inserted');
    
    console.log('\n✅ Database initialized successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

init();