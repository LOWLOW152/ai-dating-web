import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

function MatchTestPage() {
  const [algorithms, setAlgorithms] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    algorithm: 'set_similarity',
    config: {},
    answerA: '跑步,游泳,摄影',
    answerB: '跑步,篮球,电影',
    preferenceA: 'same'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    loadData(token);
  }, []);

  const loadData = async (token) => {
    try {
      const [aRes, qRes] = await Promise.all([
        fetch('/api/admin/match-algorithms', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/questions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const aData = await aRes.json();
      const qData = await qRes.json();
      
      if (aData.success) {
        setAlgorithms(aData.data);
        // 设置默认算法的参数
        const defaultAlgo = aData.data.find(a => a.key === 'set_similarity');
        if (defaultAlgo?.paramsSchema) {
          const defaultConfig = {};
          Object.entries(defaultAlgo.paramsSchema).forEach(([key, schema]) => {
            if (schema.default !== undefined) {
              defaultConfig[key] = schema.default;
            }
          });
          setForm(prev => ({ ...prev, config: defaultConfig }));
        }
      }
      
      if (qData.success) {
        setQuestions(qData.data);
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/match-algorithms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      }
    } catch (err) {
      console.error('测试失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionConfig = (questionKey) => {
    const q = questions.find(q => q.question_key === questionKey);
    if (q) {
      setForm({
        algorithm: q.match_algorithm,
        config: q.match_config || {},
        answerA: '',
        answerB: '',
        preferenceA: q.preference_default || 'dontcare'
      });
    }
  };

  const currentAlgo = algorithms.find(a => a.key === form.algorithm);

  if (loadingData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: '18px' }}>算法测试工具</h1>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* 左侧：测试配置 */}
          <div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>测试配置</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>快速加载问题配置</label>
                <select
                  onChange={(e) => loadQuestionConfig(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                >
                  <option value="">选择问题...</option>
                  {questions.map(q => (
                    <option key={q.question_key} value={q.question_key}>{q.main_text}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>选择算法 *</label>
                <select
                  value={form.algorithm}
                  onChange={(e) => setForm({ ...form, algorithm: e.target.value, config: {} })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                >
                  {algorithms.map(a => (
                    <option key={a.key} value={a.key}>{a.displayName}</option>
                  ))}
                </select>
                
                {currentAlgo?.description && (
                  <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>{currentAlgo.description}</p>
                )}
              </div>

              {currentAlgo?.paramsSchema && Object.keys(currentAlgo.paramsSchema).length > 0 && (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 500 }}>算法参数</label>
                  
                  {Object.entries(currentAlgo.paramsSchema).map(([key, schema]) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>{schema.label} {schema.required && <span style={{ color: 'red' }}>*</span>}</label>
                      
                      {schema.type === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={form.config[key] || false}
                          onChange={(e) => setForm({
                            ...form,
                            config: { ...form.config, [key]: e.target.checked }
                          })}
                        />
                      ) : schema.type === 'select' ? (
                        <select
                          value={form.config[key] || schema.default || ''}
                          onChange={(e) => setForm({
                            ...form,
                            config: { ...form.config, [key]: e.target.value }
                          })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        >
                          {schema.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : schema.type === 'object' || schema.type === 'array' ? (
                        <textarea
                          value={JSON.stringify(form.config[key] || schema.default || (schema.type === 'array' ? [] : {}), null, 2)}
                          onChange={(e) => {
                            try {
                              setForm({
                                ...form,
                                config: { ...form.config, [key]: JSON.parse(e.target.value) }
                              });
                            } catch {}
                          }}
                          rows={4}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                        />
                      ) : (
                        <input
                          type={schema.type === 'number' ? 'number' : 'text'}
                          value={form.config[key] || schema.default || ''}
                          onChange={(e) => setForm({
                            ...form,
                            config: { ...form.config, [key]: schema.type === 'number' ? parseFloat(e.target.value) : e.target.value }
                          })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>用户A的答案 *</label>
                <input
                  value={form.answerA}
                  onChange={(e) => setForm({ ...form, answerA: e.target.value })}
                  placeholder="如：跑步,游泳,摄影"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>用户B的答案 *</label>
                <input
                  value={form.answerB}
                  onChange={(e) => setForm({ ...form, answerB: e.target.value })}
                  placeholder="如：跑步,篮球,电影"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>A的偏好设置</label>
                <select
                  value={form.preferenceA}
                  onChange={(e) => setForm({ ...form, preferenceA: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                >
                  <option value="same">相同 - 希望找到相似的</option>
                  <option value="complementary">互补 - 希望找到互补的</option>
                  <option value="dontcare">无所谓 - 对此没有偏好</option>
                </select>
              </div>

              <button
                onClick={handleTest}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#07c160', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                {loading ? '计算中...' : '▶ 运行测试'}
              </button>
            </div>
          </div>

          {/* 右侧：测试结果 */}
          <div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', minHeight: '400px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>测试结果</h3>

              {!result && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧪</div>
                  <p>配置测试参数并点击「运行测试」</p>
                </div>
              )}

              {loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                  计算中...
                </div>
              )}

              {result && (
                <div>
                  {/* 总分 */}
                  <div style={{ textAlign: 'center', padding: '24px', background: result.finalScore >= 70 ? '#f6ffed' : result.finalScore >= 40 ? '#fffbe6' : '#fff2f0', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>最终匹配分数</div>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: result.finalScore >= 70 ? '#52c41a' : result.finalScore >= 40 ? '#faad14' : '#ff4d4f' }}>{result.finalScore}</div>
                    
                    {result.isDealBreaker && (
                      <div style={{ color: '#ff4d4f', marginTop: '8px' }}>⚠️ 触发一票否决</div>
                    )}
                  </div>

                  {/* 分数构成 */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span>基础相似度</span>
                      <span style={{ fontWeight: 500 }}>{result.baseScore}分</span>
                    </div>
                    
                    {result.preference && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <span>用户偏好</span>
                          <span style={{ fontWeight: 500 }}>
                            {result.preference.preference === 'same' ? '相同' : 
                             result.preference.preference === 'complementary' ? '互补' : '无所谓'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <span>偏好调整后</span>
                          <span style={{ fontWeight: 500, color: '#07c160' }}>{result.preference.finalScore}分</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 解释 */}
                  {result.preference?.explanation && (
                    <div style={{ padding: '16px', background: '#e6f7ff', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                      <strong>分析：</strong> {result.preference.explanation}
                    </div>
                  )}

                  {/* 详情 */}
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>匹配详情</div>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(MatchTestPage), { ssr: false });