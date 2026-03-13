import { generateDailyCodes, validateInviteCode, getRemainingCodes, getTodayCodes } from '../../lib/db';

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { code, action } = req.body;
    
    // 生成今日邀请码（内部使用，需要管理员权限）
    if (action === 'generate') {
      // 简单权限检查：需要传管理员密码
      const { adminPassword } = req.body;
      if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const codes = await generateDailyCodes();
      return res.status(200).json({ 
        success: true, 
        codes: codes.map(c => c.code),
        remaining: codes.filter(c => !c.used).length
      });
    }
    
    // 获取今日邀请码列表（管理员）
    if (action === 'list') {
      const { adminPassword } = req.body;
      if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const codes = await getTodayCodes();
      return res.status(200).json({ success: true, codes });
    }
    
    // 检查剩余数量
    if (action === 'check') {
      const remaining = await getRemainingCodes();
      return res.status(200).json({ remaining });
    }
    
    // 验证邀请码
    if (action === 'validate') {
      const result = await validateInviteCode(code);
      return res.status(200).json(result);
    }
    
    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('邀请码 API 错误:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
