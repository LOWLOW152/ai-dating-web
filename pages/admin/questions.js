import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ category: '', part: '', search: '' });
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadData(token);
  }, []);

  const loadData = async (token) => {
    try {
      const [qRes, cRes] = await Promise.all([
        fetch('/api/admin/questions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (qRes.status === 401 || cRes.status === 401) {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
      
      const qData = await qRes.json();
      const cData = await cRes.json();
      
      if (qData.success) setQuestions(qData.data);
      if (cData.success) setCategories(cData.data);
    } catch (err) {
      setError('加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter.category && q.category_key !== filter.category) return false;
    if (filter.part && q.part !== parseInt(filter.part)) return false;
    if (filter.search) {
      const s = filter.search.toLowerCase();
      return q.question_key.toLowerCase().includes(s) || 
             q.main_text.toLowerCase().includes(s);
    }
    return true;
  });

  const getCategoryName = (key) => {
    const cat = categories.find(c => c.category_key === key);
    return cat?.category_name || key;
  };

  const getPartLabel = (part) => {
    return part === 1 ? 'Auto' : part === 2 ? 'Semi' : 'Dog';
  };

  const getAlgorithmName = (algo) => {
    const names = {
      must_match: '必须相同',
      set_similarity: '集合相似度',
      level_similarity: '等级相似',
      level_complementary: '等级互补',
      range_compatible: '范围相容',
      keyword_blocker: '关键词红线',
      semantic_similarity: '语义相似度',
      no_match: '不参与匹配'
    };
    return names[algo] || algo;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, sans-serif' }}>
      {/* 头部 */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
          <h1 style={{ margin: 0, fontSize: '18px' }}>题库管理</h1>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 16px', background: '#07c160', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + 新增问题
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* 筛选栏 */}
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <select 
            value={filter.category} 
            onChange={(e) => setFilter({...filter, category: e.target.value})}
            style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          >
            <option value="">全部分类</option>
            {categories.map(c => (
              <option key={c.category_key} value={c.category_key}>{c.category_name}</option>
            ))}
          </select>
          
          <select 
            value={filter.part} 
            onChange={(e) => setFilter({...filter, part: e.target.value})}
            style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          >
            <option value="">全部部分</option>
            <option value="1">第1部分 - Auto</option>
            <option value="2">第2部分 - Semi</option>
            <option value="3">第3部分 - Dog</option>
          </select>
          
          <input
            type="text"
            placeholder="搜索问题..."
            value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
            style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', flex: 1, minWidth: '200px' }}
          />
        </div>

        {error && (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '4px', marginBottom: '16px', color: '#cf1322' }}>
            {error}
          </div>
        )}

        {/* 问题列表 */}
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {filteredQuestions.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>
              暂无问题
            </div>
          ) : (
            <div>
              {filteredQuestions.map((q, idx) => (
                <div 
                  key={q.id}
                  onClick={() => router.push(`/admin/questions/${q.id}`)}
                  style={{ 
                    padding: '16px 20px', 
                    borderBottom: idx < filteredQuestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#999' }}>#{q.display_order || idx + 1}</span>
                      <span style={{ fontWeight: 500 }}>{q.main_text}</span>
                      {!q.is_active && <span style={{ fontSize: '12px', color: '#999', background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px' }}>已停用</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#07c160', background: '#f6ffed', padding: '2px 8px', borderRadius: '4px' }}>
                        {getPartLabel(q.part)}
                      </span>
                      {q.is_deal_breaker && <span style={{ fontSize: '12px', color: '#ff4d4f', background: '#fff2f0', padding: '2px 8px', borderRadius: '4px' }}>一票否决</span>}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666', marginLeft: '28px' }}>
                    <span>分类: {getCategoryName(q.category_key)}</span>
                    <span>标识: {q.question_key}</span>
                    <span>算法: {getAlgorithmName(q.match_algorithm)}</span>
                    {q.has_preference && <span style={{ color: '#1890ff' }}>有偏好问题</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新增弹窗 */}
      {showAddModal && (
        <AddQuestionModal 
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            const token = localStorage.getItem('adminToken');
            loadData(token);
          }}
        />
      )}
    </div>
  );
}

// 新增问题弹窗
function AddQuestionModal({ categories, onClose, onSuccess }) {
  const [form, setForm] = useState({
    question_key: '',
    category_key: categories[0]?.category_key || '',
    part: 2,
    main_text: '',
    main_type: 'text',
    match_algorithm: 'no_match'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || '创建失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ background: 'white', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>新增问题</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '4px', marginBottom: '16px', color: '#cf1322' }}>{error}</div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>问题标识 *</label>
            <input
              value={form.question_key}
              onChange={(e) => setForm({...form, question_key: e.target.value})}
              placeholder="如: hobby, age_range"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>所属分类 *</label>
            <select
              value={form.category_key}
              onChange={(e) => setForm({...form, category_key: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              required
            >
              {categories.map(c => (
                <option key={c.category_key} value={c.category_key}>{c.category_name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>问卷部分 *</label>
            <select
              value={form.part}
              onChange={(e) => setForm({...form, part: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value={1}>第1部分 - Auto (自动收集)</option>
              <option value={2}>第2部分 - Semi (半自动)</option>
              <option value={3}>第3部分 - Dog (AI追问)</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>问题文案 *</label>
            <input
              value={form.main_text}
              onChange={(e) => setForm({...form, main_text: e.target.value})}
              placeholder="如：你的兴趣爱好是什么？"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>问题类型</label>
            <select
              value={form.main_type}
              onChange={(e) => setForm({...form, main_type: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value="text">文本输入</option>
              <option value="radio">单选</option>
              <option value="select">下拉选择</option>
              <option value="multiple">多选</option>
              <option value="number">数字</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #d9d9d9', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>取消</button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '8px 16px', background: '#07c160', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(QuestionsPage), { ssr: false });