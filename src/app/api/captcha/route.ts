import { generateCaptcha, generateCaptchaSVG } from '@/lib/captcha';

// GET /api/captcha - 生成验证码
export async function GET() {
  try {
    const { id: captchaId, code } = generateCaptcha();
    const svg = generateCaptchaSVG(code);
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Set-Cookie': `captcha_id=${captchaId}; Path=/; Max-Age=300; HttpOnly; SameSite=Strict`
      }
    });
    
  } catch (error) {
    console.error('Generate captcha error:', error);
    return Response.json(
      { success: false, error: '生成验证码失败' },
      { status: 500 }
    );
  }
}
