import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Result() {
  const router = useRouter();
  const [answers, setAnswers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (router.query.answers) {
      try {
        const parsed = JSON.parse(router.query.answers);
        setAnswers(parsed);
        setLoading(false);
      } catch (e) {
        console.error('解析答案失败:', e);
      }
    }
  }, [router.query]);

  const handleRestart = () => {
    router.push('/');
  };

  const handleDownload = () => {
    // 重新触发下载
    const event = new CustomEvent('reDownloadProfile');
    window.dispatchEvent(event);
  };

  if (loading || !answers) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 16px',
            border: '3px solid #e5e5e5',
            borderTopColor: '#07c160',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#666' }}>正在生成档案报告...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 计算年龄
  const age = answers.birthYear 
    ? new Date().getFullYear() - parseInt(answers.birthYear) 
    : '-';

  // 生成档案摘要
  const generateSummary = () => {
    const parts = [];
    if (answers.city) parts.push(answers.city);
    if (answers.occupation) parts.push(answers.occupation);
    if (parts.length === 0) parts.push('一位有趣的灵魂');
    return parts.join(' · ');
  };

  // 提取关键标签
  const tags = [
    answers.gender,
    age !== '-' ? `${age}岁` : null,
    answers.education,
    answers.sleepSchedule,
    answers.planningStyle,
  ].filter(Boolean);

  return (
    <>
      <Head>
        <title>{answers.nickname || '用户'} - 相亲档案</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* 报告头部 */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
            color: '#fff',
            padding: '40px 32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              backgroundColor: '#07c160',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px'
            }}>
              🐶
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              AI相亲档案
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              编号：{Date.now().toString(36).toUpperCase()} · 生成时间：{new Date().toLocaleDateString()}
            </p>
          </div>

          {/* 基本信息区 */}
          <div style={{ padding: '32px' }}>
            {/* 姓名和摘要 */}
            <div style={{
              textAlign: 'center',
              marginBottom: '32px',
              paddingBottom: '24px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '8px'
              }}>
                {answers.nickname || '未填写昵称'}
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#666'
              }}>
                {generateSummary()}
              </p>
              
              {/* 标签 */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px'
              }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{
                    padding: '4px 12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 信息表格 */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '16px',
                paddingLeft: '12px',
                borderLeft: '3px solid #07c160'
              }}>
                基础信息
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {[
                  { label: '性别', value: answers.gender },
                  { label: '年龄', value: age !== '-' ? `${age}岁` : '-' },
                  { label: '出生年份', value: answers.birthYear },
                  { label: '所在城市', value: answers.city },
                  { label: '职业领域', value: answers.occupation },
                  { label: '学历', value: answers.education },
                  { label: '能否接受异地', value: answers.acceptLongDistance },
                  { label: '接受年龄差', value: answers.ageRange },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '4px'
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '15px',
                      color: '#333',
                      fontWeight: 500
                    }}>
                      {item.value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 深度画像 */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '16px',
                paddingLeft: '12px',
                borderLeft: '3px solid #07c160'
              }}>
                深度画像
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: '兴趣爱好', value: answers.hobbyType },
                  { label: '周末生活方式', value: answers.weekendStyle },
                  { label: '长期坚持的事', value: answers.longTermHobby },
                  { label: '旅行偏好', value: answers.travelStyle },
                  { label: '独处时的思考', value: answers.spiritualEnjoyment },
                  { label: '消费观', value: answers.spendingHabit || answers.recentInterest },
                  { label: '交友偏好', value: answers.friendPreference },
                  { label: '理想日常', value: answers.uniqueHobby },
                  { label: '作息类型', value: answers.sleepSchedule },
                  { label: '压力应对方式', value: answers.stressResponse },
                  { label: '家庭关系', value: answers.familyRelationship },
                  { label: '当前状态', value: answers.currentState },
                  { label: '核心需求', value: answers.coreNeed },
                  { label: '冲突处理方式', value: answers.conflictHandling },
                  { label: '关系红线', value: answers.dealBreakers },
                  { label: '理想关系', value: answers.idealRelationship },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '6px'
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '15px',
                      color: '#333',
                      lineHeight: 1.6
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 备注说明 */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              marginBottom: '24px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '8px'
              }}>
                📋 档案说明
              </h4>
              <p style={{
                fontSize: '13px',
                color: '#666',
                lineHeight: 1.8
              }}>
                本档案由AI通过30道深度问题生成，涵盖基础信息、兴趣爱好、生活方式、人格特质、情感需求等维度。
                深度题（核心需求、关系盲点、理想关系等）需要人工进一步追问和验证。
                <br /><br />
                <strong>下一步：</strong>将此档案发送给匹配顾问，进行人工审核和配对推荐。
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleRestart}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  backgroundColor: '#fff',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                返回首页
              </button>
            </div>
          </div>

          {/* 页脚 */}
          <div style={{
            padding: '20px 32px',
            backgroundColor: '#fafafa',
            textAlign: 'center',
            borderTop: '1px solid #f0f0f0'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#999'
            }}>
              由狗蛋AI生成 · 仅供相亲匹配参考
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
