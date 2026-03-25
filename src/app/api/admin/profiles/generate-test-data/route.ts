import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 批量生成测试档案数据
 * POST /api/admin/profiles/generate-test-data
 * Body: { count: number, gender?: '男'|'女'|'mixed' }
 */

const MALE_NAMES = ['伟', '强', '磊', '明', '辉', '杰', '浩', '宇', '鑫', '俊', '峰', '建军', '志强', '文博', '思远', '子涵', '浩然', '泽宇', '博文', '俊杰'];
const FEMALE_NAMES = ['芳', '娜', '敏', '静', '丽', '艳', '娟', '霞', '秀兰', '燕', '玲', '婷婷', '晓燕', '丽华', '雅琪', '思琪', '雨萱', '诗涵', '梦瑶', '婉儿'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '苏州', '天津', '重庆', '长沙', '郑州', '青岛', '大连', '厦门', '宁波', '无锡', '合肥'];
const EDUCATIONS = ['高中', '大专', '本科', '硕士', '博士'];
const DIETS = ['无特殊要求', ' vegetarian', ' vegan', '不吃辣', '不吃海鲜', '清真'];
const INTERESTS_POOL = ['阅读', '旅行', '电影', '音乐', '健身', '摄影', '美食', '游戏', '动漫', '徒步', '瑜伽', '跑步', '游泳', '羽毛球', '篮球', '足球', '滑雪', '攀岩', '钓鱼', '桌游', '剧本杀', '密室逃脱', 'K歌', '画画', '乐器', '烘焙', '园艺', '宠物', '收藏', '投资'];
const TOPICS_POOL = ['社会热点', '科技数码', '娱乐八卦', '体育赛事', '财经投资', '历史文化', '心理情感', '职场发展', '美食探店', '旅游攻略', '育儿教育', '健康养生', '军事政治', '艺术设计', '哲学思考'];
const SLEEP_SCHEDULES = ['早睡早起', '晚睡晚起', '作息规律', '偶尔熬夜', '经常熬夜'];
const SOCIAL_MODES = ['外向健谈', '内向安静', '对熟人社牛', '看场合', '慢热型'];
const EXERCISE_HABITS = ['经常运动', '偶尔运动', '很少运动', '完全不运动', '看心情'];
const CONSUMPTION_VIEWS = ['实用主义', '品质优先', '性价比为王', '偶尔奢侈', '节俭为主'];
const LIFE_PRIORITIES = ['事业发展', '家庭幸福', '个人成长', '生活质量', '财富积累'];
const MARRIAGE_VIEWS = ['早点结婚', '顺其自然', '先立业', '享受单身', '看缘分'];

function randomPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNickname(gender: string): string {
  const prefixes = ['小', '大', '阿', '老', ''];
  const prefix = prefixes[randomInt(0, prefixes.length - 1)];
  if (gender === '男') {
    return prefix + MALE_NAMES[randomInt(0, MALE_NAMES.length - 1)];
  }
  return prefix + FEMALE_NAMES[randomInt(0, FEMALE_NAMES.length - 1)];
}

function generateProfile(gender: string, index: number) {
  const birthYear = randomInt(1988, 1998);
  const age = 2026 - birthYear;
  const city = CITIES[randomInt(0, CITIES.length - 1)];
  
  return {
    invite_code: `TEST${Date.now()}${index.toString().padStart(4, '0')}`,
    status: 'completed',
    answers: {
      nickname: generateNickname(gender),
      gender,
      birthYear: birthYear.toString(),
      city,
      education: EDUCATIONS[randomInt(0, EDUCATIONS.length - 1)],
      long_distance: Math.random() > 0.7 ? '接受' : '不接受',
      diet: randomPick(DIETS, randomInt(1, 2)),
      interests: randomPick(INTERESTS_POOL, randomInt(3, 6)),
      sleep_schedule: SLEEP_SCHEDULES[randomInt(0, SLEEP_SCHEDULES.length - 1)],
      social_mode: SOCIAL_MODES[randomInt(0, SOCIAL_MODES.length - 1)],
      topics: randomPick(TOPICS_POOL, randomInt(2, 4)),
      exercise: EXERCISE_HABITS[randomInt(0, EXERCISE_HABITS.length - 1)],
      consumption_view: CONSUMPTION_VIEWS[randomInt(0, CONSUMPTION_VIEWS.length - 1)],
      life_priority: randomPick(LIFE_PRIORITIES, randomInt(1, 2)),
      marriage_view: MARRIAGE_VIEWS[randomInt(0, MARRIAGE_VIEWS.length - 1)],
    },
    // AI摘要和标签（简化版）
    ai_summary: `这是一位${age}岁的${gender}性用户，来自${city}。`,
    tags: randomPick(['开朗', '稳重', '幽默', '细心', '独立', '温柔', '上进', '顾家'], randomInt(2, 4)),
    // 年龄接受范围
    accept_age_min: randomInt(-8, -3),
    accept_age_max: randomInt(3, 8),
    // 标准化答案
    standardized_answers: {
      gender,
      birth_year: birthYear,
      city,
      long_distance: Math.random() > 0.7,
      education: EDUCATIONS[randomInt(0, EDUCATIONS.length - 1)],
      diet: DIETS[randomInt(0, DIETS.length - 1)],
    },
    completed_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { count = 10, gender = 'mixed' } = await request.json();
    
    if (count < 1 || count > 100) {
      return Response.json({ success: false, error: '数量必须在1-100之间' }, { status: 400 });
    }

    const generated = [];
    
    for (let i = 0; i < count; i++) {
      let profileGender: string;
      if (gender === 'mixed') {
        profileGender = Math.random() > 0.5 ? '男' : '女';
      } else {
        profileGender = gender;
      }
      
      // 生成完整档案数据
      const profile = generateProfile(profileGender, i);
      
      const res = await sql.query(
        `INSERT INTO profiles (id, invite_code, status, answers, ai_summary, tags, 
         accept_age_min, accept_age_max, standardized_answers, completed_at)
         VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, $5::jsonb, $6, $7, $8::jsonb, $9)
         RETURNING id, invite_code, answers->>'nickname' as nickname, answers->>'gender' as gender`,
        [
          profile.invite_code,
          profile.status,
          JSON.stringify(profile.answers),
          profile.ai_summary,
          JSON.stringify(profile.tags),
          profile.accept_age_min,
          profile.accept_age_max,
          JSON.stringify(profile.standardized_answers),
          profile.completed_at,
        ]
      );
      
      generated.push(res.rows[0]);
    }

    return Response.json({
      success: true,
      message: `成功生成 ${generated.length} 个测试档案`,
      data: generated
    });

  } catch (error) {
    console.error('Generate test data error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    return Response.json(
      { success: false, error: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

// GET - 统计当前档案数量
export async function GET() {
  try {
    const res = await sql.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE answers->>'gender' = '男') as male_count,
        COUNT(*) FILTER (WHERE answers->>'gender' = '女') as female_count
       FROM profiles WHERE status = 'completed'`
    );

    return Response.json({
      success: true,
      data: res.rows[0]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
