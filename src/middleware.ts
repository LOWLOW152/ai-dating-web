import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 后台路径保护
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 只保护 /admin 路径
  if (pathname.startsWith('/admin')) {
    const auth = request.headers.get('authorization');
    
    if (!auth) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin"',
        },
      });
    }
    
    try {
      const base64 = auth.split(' ')[1];
      const credentials = Buffer.from(base64, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      // 从环境变量读取，默认 admin/luo2026
      const adminUser = process.env.ADMIN_USER || 'admin';
      const adminPass = process.env.ADMIN_PASS || 'luo2026';
      
      if (username !== adminUser || password !== adminPass) {
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Admin"',
          },
        });
      }
    } catch {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin"',
        },
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
