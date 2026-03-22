import Link from 'next/link';
import { headers } from 'next/headers';

// 简单的 Basic Auth 验证
function checkAuth(): boolean {
  const headersList = headers();
  const auth = headersList.get('authorization');
  
  if (!auth) return false;
  
  try {
    const base64 = auth.split(' ')[1];
    const credentials = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    // 从环境变量读取密码，默认用简单密码（部署前记得改）
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'luo2026';
    
    return username === adminUser && password === adminPass;
  } catch {
    return false;
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 验证失败时返回 401
  if (!checkAuth()) {
    return (
      <html>
        <head>
          <meta httpEquiv="refresh" content="0; url=/admin/login" />
        </head>
        <body>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontFamily: 'system-ui'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h1>🔒 需要登录</h1>
              <p>请使用用户名密码访问后台</p>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
                默认账号: admin / luo2026<br/>
                建议部署后修改环境变量
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const navItems = [
    { href: '/admin', label: '首页' },
    { href: '/admin/questions', label: '题库' },
    { href: '/admin/profile-templates', label: '资料库' },
    { href: '/admin/match', label: '匹配测试' },
    { href: '/admin/profiles', label: '档案' },
    { href: '/admin/evaluation', label: 'AI评价' },
    { href: '/admin/beauty-score', label: '颜值打分' },
    { href: '/admin/token-stats', label: 'Token统计' },
    { href: '/admin/invite-codes', label: '邀请码' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-14">
            <Link href="/admin" className="font-bold text-lg text-blue-600 mr-8">
              AI相亲后台
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}