import { sql } from '@/lib/db';

// GET /api/admin/migrate/interests-split
export async function GET() {
  try {
    // 1. 禁用旧题目
    await sql.query(`
      UPDATE questions SET is_active = false 
      WHERE id IN ('interests', 'exercise')
    `);

    // 2. 插入新题目
    await sql.query(`
      INSERT INTO questions (id, category, type, "order", question_text, field_type, validation, options, ai_prompt, max_questions, use_closing_message, is_active, is_required) VALUES
      ('exercise_hobby', 'lifestyle', 'semi', 9, '你喜欢运动吗？平时做什么运动？', 'text', '{"required": true}', NULL, '【兴趣爱好系列第1题-运动】只聊运动，不要问游戏、音乐等其他爱好。如有运动习惯，追问项目和频率；如无，追问原因和态度。"具体做什么运动？一周几次？""是喜欢户外运动还是室内健身？""如果没有运动习惯，追问"是没时间，还是不喜欢运动？"运动话题结束后会单独聊其他兴趣。', 4, false, true, true),
      ('gaming_hobby', 'lifestyle', 'semi', 10, '你喜欢打游戏或者看动漫吗？', 'text', '{"required": true}', NULL, '【兴趣爱好系列第2题-游戏/动漫】只聊游戏和动漫，不要回头问运动。如有游戏/动漫爱好，追问类型和投入时间；如无，了解态度。"平时玩什么类型的游戏？手游/主机/Steam？""追哪些动漫？是资深二次元还是偶尔看看？""一周大概花多少时间在这上面？""如果回答说完全不接触，追问"是尝试过不喜欢，还是一直没机会了解？"', 4, false, true, true),
      ('music_hobby', 'lifestyle', 'semi', 11, '你喜欢音乐或者什么艺术形式吗？', 'text', '{"required": true}', NULL, '【兴趣爱好系列第3题-音乐/艺术】只聊音乐和艺术相关，不要重复问运动和游戏。了解音乐喜好和艺术兴趣。"平时听什么类型的音乐？流行/古典/摇滚/说唱？""会乐器吗？或者喜欢唱歌、看演唱会？""还有其他艺术爱好吗？绘画/摄影/看展/看剧？""音乐和 art 对你来说意味着什么？"', 4, false, true, true)
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        type = EXCLUDED.type,
        "order" = EXCLUDED."order",
        question_text = EXCLUDED.question_text,
        field_type = EXCLUDED.field_type,
        validation = EXCLUDED.validation,
        options = EXCLUDED.options,
        ai_prompt = EXCLUDED.ai_prompt,
        max_questions = EXCLUDED.max_questions,
        use_closing_message = EXCLUDED.use_closing_message,
        is_active = EXCLUDED.is_active,
        is_required = EXCLUDED.is_required,
        updated_at = NOW()
    `);

    // 3. 更新被影响题目的顺序
    const updates = [
      { id: 'weekend', order: 12 },
      { id: 'spending', order: 13 },
      { id: 'sleep_schedule', order: 14 },
      { id: 'diet', order: 15 },
      { id: 'pets', order: 16 },
      { id: 'travel', order: 17 },
      { id: 'social', order: 18 },
      { id: 'family_relationship', order: 19 },
      { id: 'current_status', order: 20 },
      { id: 'trust_point', order: 21 },
      { id: 'relationship_blindspot', order: 22 },
      { id: 'core_needs', order: 23 },
      { id: 'red_lines', order: 24 },
      { id: 'relationship_expectation', order: 25 },
      { id: 'values_priority', order: 26 },
      { id: 'life_goals', order: 27 },
      { id: 'deal_breakers', order: 28 },
    ];

    for (const { id, order } of updates) {
      await sql.query('UPDATE questions SET "order" = $1 WHERE id = $2', [order, id]);
    }

    // 4. 查看结果
    const result = await sql.query(`
      SELECT id, "order", question_text, is_active 
      FROM questions 
      WHERE category = 'lifestyle' 
      ORDER BY "order"
    `);

    return Response.json({
      success: true,
      message: '题库更新完成',
      lifestyle_questions: result.rows
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
