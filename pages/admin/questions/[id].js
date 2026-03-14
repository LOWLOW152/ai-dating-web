import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

function QuestionEditPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadData(token);
  }, [id]);

  const loadData = async (token) => {
    try {
      const [qRes, cRes, aRes] = await Promise.all([
        fetch(`/api/admin/questions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/match-algorithms', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (qRes.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const qData = await qRes.json();
      const cData = await cRes.json();
      const aData = await aRes.json();
      
      if (qData.success) {
        setForm(qData.data);
      } else {
        setError('加载问题失败: ' + qData.error);
      }
      
      if (cData.success) setCategories(cData.data);
      if (aData.success) setAlgorithms(aData.data);
    } catch (err) {
      setError('加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (data.success) {
        alert('保存成功');
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateMatchConfig = (key, value) => {
    setForm(prev => ({
      ...prev,
      match_config: { ...prev.match_config, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <p style={{ color: '#999' }}>{error || '问题不存在'}</p>
        <Link href="/admin/questions" style={{ color: '#07c160', marginTop: '16px' }}>返回列表</Link>
      </div>
    );
  }

  const currentAlgo = algorithms.find(a => a.key === form.match_algorithm);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin/questions" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
            <h1 style={{ margin: 0, fontSize: '18px' }}>编辑问题</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 20px', background: '#07c160', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {error && (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '4px', marginBottom: '16px', color: '#cf1322' }}>{error}</div>
        )}

        {/* Tab导航 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'white', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
          {[
            { key: 'basic', label: '基本信息' },
            { key: 'match', label: '匹配设置' },
            { key: 'ai', label: 'AI追问' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: activeTab === tab.key ? '#07c160' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#666',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 基本信息Tab */}
        {activeTab === 'basic' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <Section title="问题标识">
              <input
                value={form.question_key}
                disabled
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#f5f5f5' }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>问题标识不可修改</p>
            </Section>

            <Section title="所属分类 *">
              <select
                value={form.category_key}
                onChange={(e) => updateForm('category_key', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                {categories.map(c => (
                  <option key={c.category_key} value={c.category_key}>{c.category_name}</option>
                ))}
              </select>
            </Section>

            <Section title="问卷部分 *">
              <select
                value={form.part}
                onChange={(e) => updateForm('part', parseInt(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                <option value={1}>第1部分 - Auto (自动收集)</option>
                <option value={2}>第2部分 - Semi (半自动追问)</option>
                <option value={3}>第3部分 - Dog (AI深度追问)</option>
              </select>
            </Section>

            <Section title="排序">
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => updateForm('display_order', parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </Section>

            <Section title="问题文案 *">
              <input
                value={form.main_text}
                onChange={(e) => updateForm('main_text', e.target.value)}
                placeholder="如：你的兴趣爱好是什么？"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </Section>

            <Section title="问题类型">
              <select
                value={form.main_type}
                onChange={(e) => updateForm('main_type', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                <option value="text">文本输入</option>
                <option value="radio">单选</option>
                <option value="select">下拉选择</option>
                <option value="multiple">多选</option>
                <option value="number">数字</option>
              </select>
            </Section>

            <Section title="提示文字">
              <input
                value={form.main_placeholder || ''}
                onChange={(e) => updateForm('main_placeholder', e.target.value)}
                placeholder="如：跑步、阅读、电影..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </Section>

            {(form.main_type === 'radio' || form.main_type === 'select' || form.main_type === 'multiple') && (
              <Section title="选项配置 (JSON格式)">
                <textarea
                  value={form.main_options ? JSON.stringify(form.main_options, null, 2) : '[]'}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateForm('main_options', parsed);
                    } catch {}
                  }}
                  rows={6}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}
                />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}
003e格式：[{`{"value": "跑步", "label": "跑步"}`}]</p>
              </Section>
            )}

            <Section title="状态">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateForm('is_active', e.target.checked)}
                />
                <span>启用此问题</span>
              </label>
            </Section>

            {/* 偏好题设置 - 直接关联 */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e8e8e8' }}>
              <Section title="偏好题设置">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.has_preference}
                    onChange={(e) => updateForm('has_preference', e.target.checked)}
                  />
                  <span>为此问题添加偏好题（询问用户希望对方与自己相同/互补/无所谓）</span>
                </label>
              </Section>

              {form.has_preference && (
                <div style={{ 
                  marginLeft: '24px', 
                  padding: '16px', 
                  background: '#f6ffed', 
                  borderRadius: '8px',
                  border: '1px solid '#b7eb8f'
                }}>
                  <Section title="偏好问题文案">
                    <input
                      value={form.preference_text || ''}
                      onChange={(e) => updateForm('preference_text', e.target.value)}
                      placeholder="如：你希望对方的兴趣爱好与你？"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    />
                  </Section>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <Section title="默认选项">
                        <select
                          value={form.preference_default || 'dontcare'}
                          onChange={(e) => updateForm('preference_default', e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                        >
                          <option value="same">相同</option>
                          <option value="complementary">互补</option>
                          <option value="dontcare">无所谓</option>
                        </select>
                      </Section>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Section title="偏好题设置">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 0' }}>
                          <input
                            type="checkbox"
                            checked={form.preference_required}
                            onChange={(e) => updateForm('preference_required', e.target.checked)}
                          />
                          <span>偏好题必填</span>
                        </label>
                      </Section>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                    <strong>选项说明：</strong>
                    <span style={{ marginLeft: '12px' }}>相同 = 相似度越高越好</span>
                    <span style={{ marginLeft: '12px' }}>互补 = 40-70%相似度最佳</span>
                    <span style={{ marginLeft: '12px' }}>无所谓 = 固定70分</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 匹配设置Tab */}
        {activeTab === 'match' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <Section title="匹配算法">
              <select
                value={form.match_algorithm}
                onChange={(e) => updateForm('match_algorithm', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                {algorithms.map(a => (
                  <option key={a.key} value={a.key}>{a.displayName}</option>
                ))}
              </select>
              
              {currentAlgo?.description && (
                <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>{currentAlgo.description}</p>
              )}
            </Section>

            <Section title="算法参数配置">
              <textarea
                value={JSON.stringify(form.match_config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateForm('match_config', JSON.parse(e.target.value));
                  } catch {}
                }}
                rows={10}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}
              />
              
              {currentAlgo?.paramsSchema && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f6ffed', borderRadius: '4px', fontSize: '13px' }}>
                  <strong>参数说明：</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    {Object.entries(currentAlgo.paramsSchema).map(([key, schema]) => (
                      <li key={key}><code>{key}</code>: {schema.label} {schema.required && '(必填)'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            <Section title="一票否决">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_deal_breaker}
                  onChange={(e) => updateForm('is_deal_breaker', e.target.checked)}
                />
                <span>启用一票否决（答案不匹配时总分为0）</span>
              </label>
            </Section>

            <div style={{ marginTop: '24px', padding: '16px', background: '#e6f7ff', borderRadius: '8px' }}>
              <Link href={`/admin/match-test?question=${form.question_key}`} style={{ color: '#1890ff', textDecoration: 'none' }}>
                → 去测试这个算法的匹配效果
              </Link>
            </div>
          </div>
        )}

        {/* AI追问Tab */}
        {activeTab === 'ai' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <Section title="启用AI追问">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.ai_enabled}
                  onChange={(e) => updateForm('ai_enabled', e.target.checked)}
                />
                <span>启用AI追问</span>
              </label>
            </Section>

            {form.ai_enabled && (
              <Section title="AI追问提示词">
                <textarea
                  value={form.ai_prompt || ''}
                  onChange={(e) => updateForm('ai_prompt', e.target.value)}
                  placeholder="如：可以具体说说你最喜欢的兴趣爱好是什么吗？为什么喜欢它？"
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                />
                <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}
003e这个提示词会发送给AI，让它根据用户的回答进行追问</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{title}</label>
      {children}
    </div>
  );
}

export default dynamic(() => Promise.resolve(QuestionEditPage), { ssr: false });