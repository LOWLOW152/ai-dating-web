import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
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
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ categories })
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

  const updateWeight = (key, weight) => {
    setCategories(prev => prev.map(c =
003e 
      c.category_key === key ? { ...c, default_weight: weight } : c
    ));
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
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>← 返回</Link>
            <h1 style={{ margin: 0, fontSize: '18px' }}>类别权重管理</h1>
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

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        {error && (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '4px', marginBottom: '16px', color: '#cf1322' }}>{error}</div>
        )}

        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#096dd9' }}>
            <strong>说明：</strong>
            权重用于计算最终匹配分数。每个类别的题目会先计算平均分，然后乘以类别权重得到加权分数。
            用户可以在自己的匹配报告中调整这些权重。
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {categories.map((cat, idx) => (
            <div 
              key={cat.category_key}
              style={{ 
                padding: '20px 24px',
                borderBottom: idx < categories.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: '16px' }}>{cat.category_name}</span>
                  <span style={{ fontSize: '12px', color: '#999', marginLeft: '12px' }}>{cat.category_key}</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#07c160' }}>{cat.default_weight}</span>
              </div>
              
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{cat.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#999' }}>不重要</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={cat.default_weight}
                  onChange={(e) => updateWeight(cat.category_key, parseInt(e.target.value))}
                  style={{ flex: 1, height: '6px' }}
                />
                <span style={{ fontSize: '12px', color: '#999' }}>非常重要</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => loadData(localStorage.getItem('adminToken'))}
            style={{ padding: '8px 16px', border: '1px solid #d9d9d9', background: 'white', borderRadius: '4px', cursor: 'pointer' }}
          >
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(CategoriesPage), { ssr: false });