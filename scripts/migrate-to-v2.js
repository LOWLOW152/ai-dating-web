#!/usr/bin/env node
/**
 * 数据迁移脚本：从旧系统迁移到新题库系统
 * 1. 迁移 question_bank -> questions + question_categories
 * 2. 迁移 profiles 字段 -> user_answers
 */

const { sql } = require('../lib/db');

async function migrate() {
  console.log('🚀 开始数据迁移...\n');
  
  try {
    // ========== 步骤1: 确保分类表有数据 ==========
    console.log('📋 步骤1: 初始化分类表...');
    await sql`
      INSERT INTO question_categories (category_key, category_name, description, default_weight, sort_order) VALUES
      ('basic', '基础条件', '年龄、城市、异地等硬性条件', 7, 1),
      ('interest', '兴趣话题', '爱好、旅行、社交偏好', 6, 2),
      ('lifestyle', '生活方式', '消费观、作息、整洁度', 6, 3),
      ('values', '价值观', '家庭关系、人生选择', 8, 4),
      ('emotion', '情感核心', '依恋类型、核心需求、冲突处理', 9, 5),
      ('social', '社交模式', '社交圈子、角色定位', 5, 6)
      ON CONFLICT (category_key) DO NOTHING
    `;
    console.log('✅ 分类表初始化完成\n');

    // ========== 步骤2: 迁移 question_bank 到 questions ==========
    console.log('📋 步骤2: 迁移题库数据...');
    
    // 获取旧数据
    const oldQuestions = await sql`SELECT * FROM question_bank ORDER BY display_order`;
    console.log(`   找到 ${oldQuestions.rows.length} 道旧题目`);
    
    // 映射算法类型
    const algorithmMap = {
      'deal_breaker': 'must_match',
      'similarity_match': 'set_similarity', 
      'consistency_match': 'level_similarity',
      'semantic_similarity': 'semantic_similarity',
      'deal_breaker_check': 'keyword_blocker',
      'age_match': 'range_compatible',
      'age_range_match': 'range_compatible',
      'location_match': 'must_match'
    };
    
    // 映射分类
    const categoryMap = {
      'basic': 'basic',
      'interest': 'interest',
      'social': 'social',
      'lifestyle': 'lifestyle',
      'values': 'values',
      'emotion': 'emotion'
    };
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const q of oldQuestions.rows) {
      try {
        // 解析 match_logic
        let matchConfig = {};
        let algorithm = 'no_match';
        let isDealBreaker = false;
        
        if (q.match_logic) {
          const logic = typeof q.match_logic === 'string' ? JSON.parse(q.match_logic) : q.match_logic;
          algorithm = algorithmMap[logic.type] || 'no_match';
          
          // 特殊配置
          if (logic.type === 'consistency_match' && logic.consistency_field) {
            // 消费观等级
            if (q.question_key === 'spending_habit') {
              matchConfig = {
                levels: { '节俭型': 1, '理性消费': 2, '平衡型': 3, '享受型': 4, '奢侈型': 5 },
                maxDiff: 1,
                diffPenalty: 30
              };
            } else if (q.question_key === 'tidiness') {
              matchConfig = {
                levels: { '洁癖级': 1, '整洁有序': 2, '随意随性': 3 },
                maxDiff: 1,
                diffPenalty: 30
              };
            }
          }
          
          if (logic.type === 'deal_breaker' || logic.type === 'deal_breaker_check') {
            isDealBreaker = true;
          }
          
          if (logic.type === 'age_match' || logic.type === 'age_range_match') {
            matchConfig = { perfectRange: 0, acceptableRange: 5 };
          }
        }
        
        // 判断是否有偏好问题（根据旧数据的 preference_field）
        const hasPreference = q.question_key.includes('_preference') === false && 
          (q.question_key === 'hobby_type' || 
           q.question_key === 'travel_style' ||
           q.question_key === 'social_circle' ||
           q.question_key === 'social_role' ||
           q.question_key === 'spending_habit' ||
           q.question_key === 'sleep_schedule' ||
           q.question_key === 'tidiness');
        
        // 插入新表
        await sql`
          INSERT INTO questions (
            question_key, category_key, part, display_order,
            main_text, main_type, main_options, main_placeholder, main_required,
            ai_enabled, ai_prompt,
            match_algorithm, match_config, is_deal_breaker,
            has_preference, preference_text, preference_required, preference_default,
            is_active
          ) VALUES (
            ${q.question_key},
            ${categoryMap[q.category] || 'basic'},
            ${q.part},
            ${q.display_order},
            ${q.question_text},
            ${q.question_type},
            ${q.options},
            ${null},
            ${q.is_required !== false},
            ${q.is_ai_monitored || false},
            ${q.ai_prompt},
            ${algorithm},
            ${JSON.stringify(matchConfig)},
            ${isDealBreaker},
            ${hasPreference},
            ${hasPreference ? generatePreferenceText(q.question_key) : null},
            ${false},
            ${'dontcare'},
            ${q.is_active !== false}
          )
          ON CONFLICT (question_key) 
          DO UPDATE SET
            category_key = EXCLUDED.category_key,
            match_algorithm = EXCLUDED.match_algorithm,
            match_config = EXCLUDED.match_config,
            has_preference = EXCLUDED.has_preference,
            preference_text = EXCLUDED.preference_text
        `;
        
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ 迁移失败 ${q.question_key}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`✅ 题库迁移完成: ${migratedCount} 成功, ${errorCount} 失败\n`);

    // ========== 步骤3: 迁移 profiles 到 user_answers ==========
    console.log('📋 步骤3: 迁移用户答案数据...');
    
    // 获取所有档案
    const profiles = await sql`SELECT * FROM profiles`;
    console.log(`   找到 ${profiles.rows.length} 个档案`);
    
    // 字段到 question_key 的映射
    const fieldMapping = {
      // 基础条件
      'nickname': 'nickname',
      'gender': 'gender',
      'birth_year': 'birth_year',
      'city': 'city',
      'occupation': 'occupation',
      'education': 'education',
      'accept_long_distance': 'accept_long_distance',
      'age_range': 'age_range',
      
      // 兴趣话题
      'hobby_type': 'hobby_type',
      'travel_style': 'travel_style',
      'social_circle': 'social_circle',
      'social_role': 'social_role',
      
      // 生活方式
      'spending_habit': 'spending_habit',
      'sleep_schedule': 'sleep_schedule',
      'tidiness': 'tidiness',
      'stress_response': 'stress_response',
      
      // 价值观
      'family_relationship': 'family_relationship',
      'life_preference': 'life_preference',
      
      // 情感核心
      'current_state': 'current_state',
      'trusted_for': 'trusted_for',
      'understood_moment': 'understood_moment',
      'relationship_blindspot': 'relationship_blindspot',
      'ideal_relationship': 'ideal_relationship',
      'core_need': 'core_need',
      'conflict_handling': 'conflict_handling',
      'contact_frequency': 'contact_frequency',
      'deal_breakers': 'deal_breakers',
      'future_vision': 'future_vision',
      
      // 偏好问题
      'hobby_match_preference': 'hobby_type',
      'travel_match_preference': 'travel_style',
      'social_circle_preference': 'social_circle',
      'social_role_preference': 'social_role',
      'spending_consistency': 'spending_habit',
      'sleep_consistency': 'sleep_schedule',
      'tidiness_consistency': 'tidiness',
      'stress_consistency': 'stress_response',
      'family_consistency': 'family_relationship',
      'life_consistency': 'life_preference'
    };
    
    let answerMigrated = 0;
    let answerErrors = 0;
    
    for (const profile of profiles.rows) {
      try {
        // 遍历所有字段
        for (const [field, value] of Object.entries(profile)) {
          if (!value || !fieldMapping[field]) continue;
          
          const questionKey = fieldMapping[field];
          
          // 检查是否是偏好字段
          const isPreferenceField = field.includes('_preference') || field.includes('_consistency');
          
          if (isPreferenceField) {
            // 更新偏好答案
            await sql`
              UPDATE user_answers 
              SET preference_answer = ${normalizePreference(value)},
                  updated_at = NOW()
              WHERE profile_id = ${profile.id} AND question_key = ${questionKey}
            `;
          } else {
            // 插入主答案
            await sql`
              INSERT INTO user_answers (
                profile_id, question_key, main_answer, main_answer_normalized, answered_at
              ) VALUES (
                ${profile.id},
                ${questionKey},
                ${String(value)},
                ${JSON.stringify(normalizeAnswer(value))},
                ${profile.created_at}
              )
              ON CONFLICT (profile_id, question_key) 
              DO UPDATE SET
                main_answer = EXCLUDED.main_answer,
                main_answer_normalized = EXCLUDED.main_answer_normalized
            `;
          }
          
          answerMigrated++;
        }
      } catch (err) {
        console.error(`   ❌ 档案 ${profile.id} 迁移失败:`, err.message);
        answerErrors++;
      }
    }
    
    console.log(`✅ 答案迁移完成: ${answerMigrated} 条, ${answerErrors} 错误\n`);

    console.log('🎉 数据迁移完成！');
    console.log('\n下一步：');
    console.log('  1. 检查后台题库管理页面');
    console.log('  2. 验证算法配置是否正确');
    console.log('  3. 测试匹配计算功能');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 生成偏好问题文本
function generatePreferenceText(questionKey) {
  const map = {
    'hobby_type': '你希望对方的兴趣爱好与你？',
    'travel_style': '你希望对方的旅行风格与你？',
    'social_circle': '你希望对方的社交圈子与你？',
    'social_role': '你希望对方在社交中的角色与你？',
    'spending_habit': '你希望对方的消费观念与你？',
    'sleep_schedule': '你希望对方的作息类型与你？',
    'tidiness': '你希望对方的整洁程度与你？'
  };
  return map[questionKey] || '你希望对方与你？';
}

// 标准化偏好值
function normalizePreference(value) {
  const map = {
    '必须相同': 'same',
    '相同': 'same',
    '互补更好': 'complementary',
    '互补': 'complementary',
    '无所谓': 'dontcare',
    '希望一致': 'same',
    '希望相似': 'same',
    null: 'dontcare'
  };
  return map[value] || 'dontcare';
}

// 标准化答案
function normalizeAnswer(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // 逗号分隔的转为数组
    if (value.includes(',') || value.includes('，')) {
      return value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }
  }
  return value;
}

migrate();
