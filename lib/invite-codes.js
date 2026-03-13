// 邀请码管理系统
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'invite-codes.json');
const DAILY_LIMIT = 50;

// 初始化或加载数据
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  return { codes: {}, lastGenerated: null };
}

// 保存数据
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成随机邀请码
function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 检查是否需要生成新的邀请码（每天）
function shouldGenerateNewCodes() {
  const data = loadData();
  if (!data.lastGenerated) return true;
  
  const lastDate = new Date(data.lastGenerated).toDateString();
  const today = new Date().toDateString();
  return lastDate !== today;
}

// 生成今日邀请码
function generateDailyCodes() {
  if (!shouldGenerateNewCodes()) {
    return getTodayCodes();
  }
  
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  
  // 生成50个新码
  const newCodes = {};
  for (let i = 0; i < DAILY_LIMIT; i++) {
    let code;
    do {
      code = generateCode();
    } while (newCodes[code] || data.codes[code]); // 避免重复
    
    newCodes[code] = {
      date: today,
      used: false,
      usedAt: null,
      usedBy: null
    };
  }
  
  // 合并到总数据
  data.codes = { ...data.codes, ...newCodes };
  data.lastGenerated = new Date().toISOString();
  saveData(data);
  
  return newCodes;
}

// 获取今日可用邀请码
function getTodayCodes() {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  
  return Object.entries(data.codes)
    .filter(([_, info]) => info.date === today && !info.used)
    .reduce((acc, [code, info]) => {
      acc[code] = info;
      return acc;
    }, {});
}

// 验证邀请码
function validateCode(code) {
  if (!code) return { valid: false, message: '请输入邀请码' };
  
  const data = loadData();
  const upperCode = code.toUpperCase().trim();
  
  if (!data.codes[upperCode]) {
    return { valid: false, message: '无效的邀请码' };
  }
  
  if (data.codes[upperCode].used) {
    return { valid: false, message: '该邀请码已被使用' };
  }
  
  // 标记为已使用
  data.codes[upperCode].used = true;
  data.codes[upperCode].usedAt = new Date().toISOString();
  saveData(data);
  
  return { valid: true, message: '验证通过' };
}

// 获取今日剩余可用码数量
function getRemainingCount() {
  const todayCodes = getTodayCodes();
  return Object.keys(todayCodes).length;
}

// 获取今日所有码（用于管理员查看）
function getAllTodayCodes() {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  
  return Object.entries(data.codes)
    .filter(([_, info]) => info.date === today)
    .map(([code, info]) => ({
      code,
      used: info.used,
      usedAt: info.usedAt
    }));
}

// 手动生成一批码（管理员用）
function generateManualCodes(count = 10) {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  
  const newCodes = [];
  for (let i = 0; i < count; i++) {
    let code;
    do {
      code = generateCode();
    } while (data.codes[code]);
    
    data.codes[code] = {
      date: today,
      used: false,
      usedAt: null,
      usedBy: null
    };
    newCodes.push(code);
  }
  
  saveData(data);
  return newCodes;
}

module.exports = {
  generateDailyCodes,
  getTodayCodes,
  validateCode,
  getRemainingCount,
  getAllTodayCodes,
  generateManualCodes,
  DAILY_LIMIT
};

// 如果直接运行此文件，生成今日邀请码
if (require.main === module) {
  const codes = generateDailyCodes();
  console.log(`已生成 ${Object.keys(codes).length} 个今日邀请码`);
  console.log('剩余可用:', getRemainingCount());
}
