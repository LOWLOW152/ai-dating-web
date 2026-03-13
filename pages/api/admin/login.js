import { sql } from '../../../lib/db';
import crypto from 'crypto';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

// 简单 session 存储（内存版，Vercel 上每次部署会清空，但够用）
const sessions = new Map();

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateSession(token) {
  return sessions.has(token);
}

export function createSession() {
  const token = generateSessionToken();
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

export default async function handler(req, res) {
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
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = createSession();
      return res.status(200).json({ 
        success: true, 
        token,
        message: '登录成功'
      });
    }
    
    res.status(401).json({ success: false, message: '账号或密码错误' });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
