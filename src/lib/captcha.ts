// 图形验证码生成和验证
import { randomBytes } from 'crypto';

// 内存存储验证码（生产环境建议用 Redis）
const captchaStore = new Map<string, { code: string; expires: number }>();

// 清理过期验证码（每小时）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (value.expires < now) {
      captchaStore.delete(key);
    }
  }
}, 3600000);

// 验证验证码（供其他 API 调用）
export function verifyCaptcha(captchaId: string, code: string): boolean {
  const stored = captchaStore.get(captchaId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return false;
  }
  const valid = stored.code.toLowerCase() === code.toLowerCase();
  if (valid) {
    captchaStore.delete(captchaId); // 验证成功后删除
  }
  return valid;
}

// 生成并存储验证码
export function generateCaptcha(): { id: string; code: string } {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const captchaId = randomBytes(16).toString('hex');
  
  captchaStore.set(captchaId, {
    code,
    expires: Date.now() + 5 * 60 * 1000
  });
  
  return { id: captchaId, code };
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
