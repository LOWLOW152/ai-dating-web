import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// 匹配算法
const algorithms: Record<string, (ctx: { valueA: unknown; valueB: unknown; params?: Record<string, unknown> }) => { score: number; details: string }> = {
  must_match: ({ valueA, valueB }) => ({
    score: valueA === valueB ? 100 : 0,
    details: valueA === valueB ? '一致' : '不一致'
  }),
  
  range_compatible: ({ valueA, valueB, params }) => {
    const a = Number(valueA);
    const b = Number(valueB);
    const buffer = Number(params?.buffer || 0);
    const diff = Math.abs(a - b);
    const maxDiff = Math.max(a, b) * 0.1 + buffer;
    const score = diff <= maxDiff ? 100 - (diff / maxDiff) * 50 : Math.max(0, 100 - diff * 2);
    return { score: Math.round(score), details: `差值: ${diff}` };
  },
  
  set_similarity: ({ valueA, valueB }) => {
    const arrA = Array.isArray(valueA) ? valueA : [valueA];
    const arrB = Array.isArray(valueB) ? valueB : [valueB];
    const setB = new Set(arrB);
    const intersection = arrA.filter(x => setB.has(x));
    const union = Array.from(new Set([...arrA, ...arrB]));
    const jaccard = intersection.length / union.length;
    return { score: Math.round(jaccard * 100), details: `共同: ${intersection.length}` };
  },
  
  no_match: () => ({ score: 70, details: '不参与' })
};

function calculateMatch(algorithm: string, ctx: { valueA: unknown; valueB: unknown; params?: Record<string, unknown> }) {
  const fn = algorithms[algorithm] || algorithms.no_match;
  return fn(ctx);
}

function average(arr: number[]) {
  if (arr.length === 0) return 70;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

// POST /api/admin/match
export async function POST(request: NextRequest) {
  try {
    const { templateId, profileA, profileB } = await request.json();
    
    const [profileARes, profileBRes] = await Promise.all([
      sql.query('SELECT * FROM profiles WHERE id = $1', [profileA]),
      sql.query('SELECT * FROM profiles WHERE id = $1', [profileB])
    ]);
    
    if (profileARes.rows.length === 0 || profileBRes.rows.length === 0) {
      return Response.json(
        { success: false, error: '档案不存在' },
        { status: 404 }
      );
    }
    
    const profileAData = profileARes.rows[0];
    const profileBData = profileBRes.rows[0];
    
    const weightsRes = await sql.query(
      `SELECT tw.*, q.question_text, q.category
       FROM template_weights tw
       JOIN questions q ON tw.question_id = q.id
       WHERE tw.template_id = $1 AND tw.match_enabled = true`,
      [templateId]
    );
    
    const categoryScores: Record<string, number[]> = { basic: [], lifestyle: [], emotion: [] };
    const vetoFlags: string[] = [];
    
    for (const config of weightsRes.rows) {
      const answerA = profileAData.answers[config.question_id]?.value;
      const answerB = profileBData.answers[config.question_id]?.value;
      
      if (answerA === undefined || answerB === undefined) continue;
      
      const result = calculateMatch(config.match_algorithm, {
        valueA: answerA,
        valueB: answerB,
        params: config.algorithm_params
      });
      
      const weightedScore = result.score * (config.match_weight / 100);
      categoryScores[config.category].push(weightedScore);
      
      if (config.is_veto && result.score < 50) {
        vetoFlags.push(config.question_text);
      }
    }
    
    const categoryAverages = {
      basic: average(categoryScores.basic),
      lifestyle: average(categoryScores.lifestyle),
      emotion: average(categoryScores.emotion)
    };
    
    const weights = { basic: 0.3, lifestyle: 0.3, emotion: 0.4 };
    const overallScore = vetoFlags.length > 0 ? 0 : Math.round(
      categoryAverages.basic * weights.basic +
      categoryAverages.lifestyle * weights.lifestyle +
      categoryAverages.emotion * weights.emotion
    );
    
    return Response.json({
      success: true,
      data: {
        overallScore,
        categoryScores: categoryAverages,
        vetoFlags
      }
    });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}