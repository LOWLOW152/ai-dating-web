// 图形验证码 - 使用 Cookie 加密存储（适配 Serverless 环境）
import { createHmac } from 'crypto';

// 简单的验证码签名密钥（生产环境建议用环境变量）
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'ai-dating-captcha-secret-key-2024';

// 生成验证码
export function generateCaptcha(): { id: string; code: string } {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const captchaId = generateId();
  
  return { id: captchaId, code };
}

// 对验证码进行签名（存储在 cookie 中）
export function signCaptcha(captchaId: string, code: string): string {
  const data = `${captchaId}:${code}`;
  const signature = createHmac('sha256', CAPTCHA_SECRET)
    .update(data)
    .digest('hex')
    .slice(0, 16);
  return `${data}:${signature}`;
}

// 验证验证码
export function verifyCaptcha(signedData: string, inputCode: string): boolean {
  try {
    const parts = signedData.split(':');
    if (parts.length !== 3) return false;
    
    const [captchaId, code, signature] = parts;
    
    // 验证签名
    const expectedSignature = createHmac('sha256', CAPTCHA_SECRET)
      .update(`${captchaId}:${code}`)
      .digest('hex')
      .slice(0, 16);
    
    if (signature !== expectedSignature) {
      return false;
    }
    
    // 验证输入的验证码（不区分大小写）
    return code.toLowerCase() === inputCode.toLowerCase();
  } catch {
    return false;
  }
}

// 生成唯一 ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// 生成 SVG 验证码图片
export function generateCaptchaSVG(code: string): string {
  const width = 120;
  const height = 40;
  
  // 生成干扰线
  const lines = Array.from({ length: 5 }, () => {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ccc" stroke-width="1"/>`;
  }).join('');
  
  // 生成噪点
  const noise = Array.from({ length: 30 }, () => {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 2;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ddd"/>`;
  }).join('');
  
  // 生成文字（带随机偏移和旋转）
  const chars = code.split('').map((char, i) => {
    const x = 25 + i * 20 + (Math.random() * 10 - 5);
    const y = 28 + (Math.random() * 10 - 5);
    const rotate = Math.random() * 30 - 15;
    const color = ['#333', '#555', '#444', '#666'][Math.floor(Math.random() * 4)];
    return `<text x="${x}" y="${y}" fill="${color}" font-size="20" font-family="Arial" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
  ${lines}
  ${noise}
  ${chars}
</svg>`;
}
