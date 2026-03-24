import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface Profile {
  id: string;
  invite_code: string;
  answers: Record<string, unknown>;
  ai_summary: Record<string, unknown> | null;
}

// AI评价提示词模板 - 输出结构化标签 + 标准化答案
const EVALUATION_PROMPT = `你是狗蛋，一个专业的相亲档案分析师。

【任务】
分析用户的相亲档案，完成两件事：
1. 生成结构化标签和匹配报告
2. 从用户回答中提取/推断标准化字段值（用于系统硬性条件筛选）

【标签提取规则 - 19个维度】
必须从以下维度提取标签，每个维度必须选一个值（选最接近的，不要编造）：

基础条件：
1. 年龄段: 22岁以下 / 22-25岁 / 26-30岁 / 31-35岁 / 35岁以上 / 未提及
2. 地区: 一线城市(北上广深) / 新一线(杭蓉渝等) / 二线城市 / 三线及以下 / 海外 / 未提及
3. 同城偏好: 必须同城 / 同城+周边可接受 / 省内可接受 / 全国可接受 / 未提及
4. 学历: 高中及以下 / 专科 / 本科 / 硕士 / 博士 / 未提及
5. 职业稳定性: 体制内(公务员/事业编/国企) / 大厂/上市公司 / 中小公司 / 创业/自由职业 / 未提及

生活方式：
6. 消费观: 节俭存钱型 / 量入为出型 / 适度享受型 / 品质优先型 / 未提及
7. 作息类型: 早睡早起(7点前起) / 正常作息(8-9点起) / 弹性作息 / 夜猫子(12点后睡) / 未提及
8. 周末偏好: 居家休息型 / 外出社交型 / 平衡型 / 户外/运动型 / 未提及
9. 兴趣爱好大类: 文艺类(书/影/音/展) / 运动健身类 / 游戏/动漫类 / 户外/旅行类 / 未提及

情感模式：
10. 依恋类型: 安全型 / 焦虑型(需要频繁确认) / 回避型(需要独处空间) / 恐惧型(既渴望又害怕) / 未明确
11. 情感需求等级: 高(需要大量陪伴) / 中高 / 中等 / 较低 / 未提及
12. 冲突处理风格: 直接沟通型 / 冷静后沟通型 / 回避退让型 / 需要调解型 / 未提及
13. 关系主动性: 主动追求型 / 互动回应型 / 被动慢热型 / 佛系随缘型 / 未提及

价值观：
14. 婚育时间观: 1年内结婚 / 2-3年结婚 / 3-5年结婚 / 看感情发展 / 未提及
15. 家庭角色观: 传统分工(男主外女主内) / 平等分担 / 灵活协商 / 以事业为重 / 未提及
16. 经济共享观: 完全共同 / 部分共同+各自支配 / 完全各自独立 / 一方主导 / 未提及

AI综合判断：
17. 性格关键词: 提取3-5个核心性格特征词
18. 匹配优势: 这个人最吸引人的2-3个点
19. 匹配风险: 可能影响关系的1-2个红旗（没有就写"无明显风险"）

【标准化答案提取规则】
从用户回答中提取以下字段的标准值，用于系统第一层硬性条件筛选：

- gender: 性别，必须是"男"或"女"
  如果用户回答模糊（如"男生""女的"），标准化为"男"/"女"
  
- birth_year: 出生年份，必须是4位数字年份（如2000）
  如果用户回答"21岁"，计算为当前年份-21
  如果回答"2000年出生"，提取2000
  如果只有年龄段，取中间值推算（如"26-30岁"→1998）
  
- city: 城市，必须是标准城市名（如"北京"、"上海"、"杭州"）
  去掉"市""区"等后缀，只保留城市名
  如果回答模糊，选最接近的标准城市
  
- long_distance: 异地接受度，必须是以下之一：
  "完全不行" / "短期可接受" / "完全OK"
  根据用户回答判断归类
  
- education: 学历，必须是以下之一：
  "高中" / "大专" / "本科" / "硕士" / "博士"
  如果回答"大学本科"→"本科"，"研究生"→"硕士"
  
- diet: 饮食习惯，字符串数组，如["素食", "不吃辣"]
  从用户回答中提取所有饮食相关标签

【输出格式】
必须用JSON格式返回，不要有任何其他文字：

{
  "tags": {
    "基础条件_年龄段": "具体值",
    "基础条件_地区": "具体值",
    "基础条件_同城偏好": "具体值",
    "基础条件_学历": "具体值",
    "基础条件_职业稳定性": "具体值",
    "生活方式_消费观": "具体值",
    "生活方式_作息类型": "具体值",
    "生活方式_周末偏好": "具体值",
    "生活方式_兴趣爱好大类": "具体值",
    "情感模式_依恋类型": "具体值",
    "情感模式_情感需求等级": "具体值",
    "情感模式_冲突处理风格": "具体值",
    "情感模式_关系主动性": "具体值",
    "价值观_婚育时间观": "具体值",
    "价值观_家庭角色观": "具体值",
    "价值观_经济共享观": "具体值",
    "AI综合_性格关键词": ["词1", "词2", "词3"],
    "AI综合_匹配优势": ["优势1", "优势2"],
    "AI综合_匹配风险": ["风险1"] 
  },
  "standardized_answers": {
    "gender": "男"或"女",
    "birth_year": 数字如2000,
    "city": "城市名",
    "long_distance": "完全不行"或"短期可接受"或"完全OK",
    "education": "高中"/"大专"/"本科"/"硕士"/"博士",
    "diet": ["标签1", "标签2"]
  },
  "summary": "50字以内的整体评价"
}

【档案数据】
`;

// 执行AI评价
async function evaluateProfile(profile: Profile): Promise<{
  success: boolean;
  result?: Record<string, unknown>;
  tokens?: { request: number; response: number; total: number };
  error?: string;
}> {
  const apiKey = process.env.DOUBAO_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'AI API未配置' 
    };
  }

  // 构建提示词
  const prompt = EVALUATION_PROMPT + JSON.stringify({
    answers: profile.answers,
    ai_summary: profile.ai_summary
  }, null, 2);

  try {
    const requestTokens = Math.ceil(prompt.length / 4);
    
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DOUBAO_MODEL || 'doubao-1-5-pro-32k-250115',
        messages: [
          { role: 'system', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      throw new Error(`API请求失败: ${res.status}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    const responseTokens = Math.ceil(reply.length / 4);
    const totalTokens = requestTokens + responseTokens;
    
    // 提取JSON
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确，未找到JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return { 
      success: true, 
      result,
      tokens: { request: requestTokens, response: responseTokens, total: totalTokens }
    };
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return { success: false, error: errorMessage };
  }
}

// POST /api/admin/evaluation/run - 执行评价任务
export async function POST(request: NextRequest) {
  try {
    // 获取请求参数
    const body = await request.json().catch(() => ({}));
    const { profileId, batchSize = 10 } = body;
    
    // 如果指定了profileId，只评价这一个
    if (profileId) {
      const profileRes = await sql.query(
        'SELECT * FROM profiles WHERE id = $1',
        [profileId]
      );
      
      if (profileRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '档案不存在' },
          { status: 404 }
        );
      }
      
      const profile = profileRes.rows[0];
      
      // 检查是否有答题数据
      if (!profile.answers || typeof profile.answers !== 'object' || Object.keys(profile.answers).length === 0) {
        return NextResponse.json(
          { success: false, error: '该档案未完成答题，无法评价' },
          { status: 400 }
        );
      }
      
      // 更新为处理中
      await sql.query(
        'UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2',
        ['processing', profileId]
      );
      
      // 执行评价
      const evalResult = await evaluateProfile(profile);
      
      if (evalResult.success && evalResult.result && evalResult.tokens) {
        // 记录 token 使用 (豆包 Pro 32K: 0.008元/千token)
        const costCny = (evalResult.tokens.total / 1000) * 0.008;
        await sql.query(
          `INSERT INTO token_usage (profile_id, api_endpoint, request_tokens, response_tokens, total_tokens, cost_cny)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [profileId, '/api/admin/evaluation/run', evalResult.tokens.request, evalResult.tokens.response, evalResult.tokens.total, costCny]
        );
        
        // 保存AI评价结果到 profiles 表
        const standardizedAnswers = evalResult.result.standardized_answers || {};
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation = $1, 
               ai_evaluated_at = NOW(),
               ai_evaluation_status = $2,
               standardized_answers = $3
           WHERE id = $4`,
          [JSON.stringify(evalResult.result), 'completed', JSON.stringify(standardizedAnswers), profileId]
        );
        
        // 保存标签到 profile_ai_tags 表
        const tags = evalResult.result.tags || {};
        await sql.query(
          `INSERT INTO profile_ai_tags (profile_id, tags, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (profile_id) 
           DO UPDATE SET tags = $2, updated_at = NOW()`,
          [profileId, JSON.stringify(tags)]
        );
        
        // 记录日志
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, evaluation_result)
           VALUES ($1, $2, $3)`,
          [profileId, 'success', JSON.stringify(evalResult.result)]
        );
        
        return NextResponse.json({ 
          success: true, 
          data: evalResult.result,
          tokens: evalResult.tokens
        });
      } else {
        // 更新失败状态
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation_status = $1
           WHERE id = $2`,
          ['failed', profileId]
        );
        
        // 记录失败日志
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, error_message)
           VALUES ($1, $2, $3)`,
          [profileId, 'failed', evalResult.error]
        );
        
        return NextResponse.json(
          { success: false, error: evalResult.error },
          { status: 500 }
        );
      }
    }
    
    // 批量模式：获取未评价的档案（排除已删除标签，且必须有答题数据）
    const pendingRes = await sql.query(
      `SELECT * FROM profiles 
       WHERE (ai_evaluation_status IN ('pending', 'failed')
          OR ai_evaluation IS NULL)
       AND (tags IS NULL OR NOT (tags @> '["deleted"]'::jsonb))
       AND (answers IS NOT NULL AND jsonb_typeof(answers) = 'object' AND answers != '{}'::jsonb)
       ORDER BY created_at ASC
       LIMIT $1`,
      [batchSize]
    );
    
    const pendingProfiles = pendingRes.rows;
    
    if (pendingProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待评价的档案',
        processed: 0
      });
    }
    
    // 逐个处理
    const results = [];
    for (const profile of pendingProfiles) {
      // 更新为处理中
      await sql.query(
        'UPDATE profiles SET ai_evaluation_status = $1 WHERE id = $2',
        ['processing', profile.id]
      );
      
      const evalResult = await evaluateProfile(profile);
      
      if (evalResult.success && evalResult.result && evalResult.tokens) {
        // 记录 token 使用
        const costCny = (evalResult.tokens.total / 1000) * 0.008;
        await sql.query(
          `INSERT INTO token_usage (profile_id, api_endpoint, request_tokens, response_tokens, total_tokens, cost_cny)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [profile.id, '/api/admin/evaluation/run', evalResult.tokens.request, evalResult.tokens.response, evalResult.tokens.total, costCny]
        );
        
        const standardizedAnswers = evalResult.result.standardized_answers || {};
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation = $1, 
               ai_evaluated_at = NOW(),
               ai_evaluation_status = $2,
               standardized_answers = $3
           WHERE id = $4`,
          [JSON.stringify(evalResult.result), 'completed', JSON.stringify(standardizedAnswers), profile.id]
        );
        
        // 保存标签到 profile_ai_tags 表
        const tags = evalResult.result.tags || {};
        await sql.query(
          `INSERT INTO profile_ai_tags (profile_id, tags, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (profile_id) 
           DO UPDATE SET tags = $2, updated_at = NOW()`,
          [profile.id, JSON.stringify(tags)]
        );
        
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, evaluation_result)
           VALUES ($1, $2, $3)`,
          [profile.id, 'success', JSON.stringify(evalResult.result)]
        );
        
        results.push({ id: profile.id, status: 'success', tokens: evalResult.tokens });
      } else {
        await sql.query(
          `UPDATE profiles 
           SET ai_evaluation_status = $1
           WHERE id = $2`,
          ['failed', profile.id]
        );
        
        await sql.query(
          `INSERT INTO evaluation_logs (profile_id, status, error_message)
           VALUES ($1, $2, $3)`,
          [profile.id, 'failed', evalResult.error]
        );
        
        results.push({ id: profile.id, status: 'failed', error: evalResult.error });
      }
      
      // 间隔一下避免API限流
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return NextResponse.json({
      success: true,
      processed: pendingProfiles.length,
      results
    });
    
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/evaluation/status - 获取评价状态统计
export async function GET() {
  try {
    const statsRes = await sql.query(`
      SELECT 
        ai_evaluation_status as status,
        COUNT(*) as count
      FROM profiles
      GROUP BY ai_evaluation_status
    `);
    
    const recentLogsRes = await sql.query(`
      SELECT 
        p.id,
        p.invite_code,
        el.status,
        el.created_at,
        el.error_message
      FROM evaluation_logs el
      JOIN profiles p ON el.profile_id = p.id
      ORDER BY el.created_at DESC
      LIMIT 20
    `);
    
    return NextResponse.json({
      success: true,
      stats: statsRes.rows,
      recentLogs: recentLogsRes.rows
    });
    
  } catch (error) {
    console.error('Get evaluation status error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
