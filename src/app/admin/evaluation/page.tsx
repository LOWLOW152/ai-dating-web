'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// AI评价提示词 - 与后端保持一致
const EVALUATION_PROMPT = `你是狗蛋，一个专业的交友档案分析师。

【任务】
分析用户的交友档案，完成两件事：
1. 生成结构化标签和匹配报告
2. 从用户回答中提取/推断标准化字段值（用于系统硬性条件筛选）

【标签提取规则 - 19个维度】
必须从以下维度提取标签，每个维度必须选一个值（选最接近的，不要编造）：

基础条件：
1. 年龄段: 18-21岁 / 22-25岁 / 26-30岁 / 31-35岁 / 35岁以上 / 未提及
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
  
- diet: 饮食习惯，字符串数组，只能从以下标准标签中选择（不要自创）：
  ["素食", "不吃辣", "不吃海鲜", "不吃牛羊肉", "清真", "无特殊要求"]
  根据用户回答归类到最接近的标准标签
  示例：
  - "我是素食主义者" → ["素食"]
  - "我不吃辣，海鲜也不吃" → ["不吃辣", "不吃海鲜"]
  - "我什么都吃" → ["无特殊要求"]
  - "不吃辣" → ["不吃辣"]

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

interface EvaluationStats {
  status: string;
  count: number;
}

interface EvaluationLog {
  id: string;
  invite_code: string;
  status: string;
  created_at: string;
  error_message: string | null;
  evaluation_result?: {
    tags?: Record<string, unknown>;
    standardized_answers?: {
      gender?: string;
      birth_year?: number;
      city?: string;
      long_distance?: string;
      education?: string;
      diet?: string[];
    };
    summary?: string;
  };
}

export default function EvaluationPage() {
  const [stats, setStats] = useState<EvaluationStats[]>([]);
  const [logs, setLogs] = useState<EvaluationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [runResult, setRunResult] = useState<{ processed: number; results: { id: string; status: string; error?: string }[] } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/admin/evaluation/run');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLogs(data.recentLogs);
      }
    } catch (error) {
      console.error('Fetch status error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runEvaluation() {
    setRunning(true);
    setRunResult(null);
    
    try {
      const res = await fetch('/api/admin/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 })
      });
      
      const data = await res.json();
      if (data.success) {
        setRunResult(data);
        fetchStatus(); // 刷新状态
      } else {
        alert('执行失败: ' + data.error);
      }
    } catch (error) {
      console.error('Run evaluation error:', error);
      alert('执行出错');
    } finally {
      setRunning(false);
    }
  }

  async function runReEvaluation() {
    if (!confirm('确定要重新评价所有已完成的档案吗？这将覆盖原有评价结果并消耗Token。')) return;
    
    setReEvaluating(true);
    setRunResult(null);
    
    try {
      const res = await fetch('/api/admin/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10, reEvaluate: true })
      });
      
      const data = await res.json();
      if (data.success) {
        setRunResult(data);
        fetchStatus(); // 刷新状态
      } else {
        alert('执行失败: ' + data.error);
      }
    } catch (error) {
      console.error('Run re-evaluation error:', error);
      alert('执行出错');
    } finally {
      setReEvaluating(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const pendingCount = stats.find(s => s.status === 'pending')?.count || 0;
  const completedCount = stats.find(s => s.status === 'completed')?.count || 0;
  const failedCount = stats.find(s => s.status === 'failed')?.count || 0;
  const processingCount = stats.find(s => s.status === 'processing')?.count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/profiles" className="text-blue-600 hover:underline text-sm">
            ← 返回档案管理
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">AI评价管理</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            {showPrompt ? '隐藏提示词' : '查看提示词'}
          </button>
          {completedCount > 0 && (
            <button
              onClick={runReEvaluation}
              disabled={reEvaluating}
              className="px-4 py-2 text-orange-600 border border-orange-300 rounded hover:bg-orange-50 disabled:bg-gray-100"
            >
              {reEvaluating ? '重新评价中...' : `重新评价 (${completedCount}个)`}
            </button>
          )}
          <button
            onClick={runEvaluation}
            disabled={running || pendingCount === 0}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {running ? '评价中...' : `开始评价 (${pendingCount}个待处理)`}
          </button>
        </div>
      </div>

      {/* 提示词调试窗口 */}
      {showPrompt && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-300">🛠️ AI评价提示词（调试）</h3>
            <button
              onClick={() => navigator.clipboard.writeText(EVALUATION_PROMPT)}
              className="text-xs text-gray-400 hover:text-white"
            >
              复制
            </button>
          </div>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono leading-relaxed">
            {EVALUATION_PROMPT}
          </pre>
        </div>
      )}

      {/* 统计卡片 */}
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">待评价</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">评价中</p>
              <p className="text-2xl font-bold text-blue-600">{processingCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">失败</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
          </div>

          {/* 执行结果 */}
          {runResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="font-medium text-blue-800">本次处理: {runResult.processed} 个档案</p>
              <div className="mt-2 space-y-1">
                {runResult.results.map((r, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {r.status === 'success' ? '✓' : '✗'}
                    </span>
                    <Link href={`/admin/profiles/${r.id}`} className="font-mono text-blue-600 hover:underline">
                      {r.id}
                    </Link>
                    {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最近日志 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold">最近评价记录</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">档案ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">邀请码</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">时间</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">错误</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <>
                    <tr key={`${log.id}-${log.created_at}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono">
                        <Link href={`/admin/profiles/${log.id}`} className="text-blue-600 hover:underline">
                          {log.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">{log.invite_code}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.status === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'success' ? '成功' : '失败'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-500 max-w-xs truncate">
                        {log.error_message || '-'}
                      </td>
                      <td className="px-4 py-2">
                        {log.status === 'success' && (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-xs text-purple-600 hover:text-purple-800 underline"
                          >
                            {expandedId === log.id ? '收起' : '查看详情'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.evaluation_result && (
                      <tr className="bg-purple-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-4">
                            {/* 标准化答案 */}
                            {log.evaluation_result.standardized_answers && (
                              <div>
                                <h4 className="text-sm font-semibold text-purple-800 mb-2">标准化词条</h4>
                                <div className="grid grid-cols-6 gap-2 text-xs">
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">性别</span>
                                    <p className="font-medium">{log.evaluation_result.standardized_answers.gender || '-'}</p>
                                  </div>
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">出生年</span>
                                    <p className="font-medium">{log.evaluation_result.standardized_answers.birth_year || '-'}</p>
                                  </div>
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">城市</span>
                                    <p className="font-medium">{log.evaluation_result.standardized_answers.city || '-'}</p>
                                  </div>
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">异地接受</span>
                                    <p className="font-medium">{log.evaluation_result.standardized_answers.long_distance || '-'}</p>
                                  </div>
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">学历</span>
                                    <p className="font-medium">{log.evaluation_result.standardized_answers.education || '-'}</p>
                                  </div>
                                  <div className="bg-white rounded p-2">
                                    <span className="text-gray-500">饮食</span>
                                    <p className="font-medium">
                                      {log.evaluation_result.standardized_answers.diet?.join(', ') || '-'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* 标签 */}
                            {log.evaluation_result.tags && (
                              <div>
                                <h4 className="text-sm font-semibold text-purple-800 mb-2">19维标签</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  {Object.entries(log.evaluation_result.tags).map(([key, value]) => (
                                    <div key={key} className="bg-white rounded p-2">
                                      <span className="text-gray-500 truncate block">{key}</span>
                                      <p className="font-medium truncate">
                                        {Array.isArray(value) ? value.join(', ') : String(value)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 总结 */}
                            {log.evaluation_result.summary && (
                              <div className="bg-white rounded p-3">
                                <span className="text-gray-500 text-xs">AI总结</span>
                                <p className="text-sm mt-1">{log.evaluation_result.summary}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                暂无评价记录
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
