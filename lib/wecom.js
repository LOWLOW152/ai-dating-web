// 企业微信机器人通知

const WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL;

export async function sendWecomNotification(message) {
  if (!WEBHOOK_URL) {
    console.warn('未配置企业微信 Webhook，跳过通知');
    return { success: false, error: '未配置 Webhook' };
  }
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: {
          content: message
        }
      })
    });
    
    const data = await response.json();
    
    if (data.errcode === 0) {
      console.log('企业微信通知发送成功');
      return { success: true };
    } else {
      console.error('企业微信通知失败:', data);
      return { success: false, error: data.errmsg };
    }
  } catch (error) {
    console.error('发送企业微信通知出错:', error);
    return { success: false, error: error.message };
  }
}

// 新档案通知模板
export function formatNewProfileMessage(profile) {
  const date = new Date().toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `🎯 新相亲档案提交

📅 ${date}
🆔 档案ID: ${profile.id}
👤 ${profile.gender === '男' ? '男士' : '女士'} | ${profile.birth_year ? new Date().getFullYear() - profile.birth_year + '岁' : '年龄未知'} | ${profile.city || '城市未知'}
💼 ${profile.occupation || '职业未知'} | ${profile.education || '学历未知'}

📊 当前状态: ${profile.status}

🔗 登录后台查看详情: https://ai-dating.top/admin`;
}
