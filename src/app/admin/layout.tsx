import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: '/admin', label: '首页' },
    { href: '/admin/questions', label: '题库' },
    { href: '/admin/profile-templates', label: '资料库' },
    { href: '/admin/match', label: '匹配测试' },
    { href: '/admin/profiles', label: '档案' },
    { href: '/admin/evaluation', label: 'AI评价' },
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