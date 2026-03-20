import Link from 'next/link';

export default function AdminHome() {
  const links = [
    { href: '/admin/questions', label: '题库管理', desc: '管理所有题目、配置AI提示词' },
    { href: '/admin/profile-templates', label: '资料库管理', desc: '管理匹配模板、设置权重算法' },
    { href: '/admin/match', label: '匹配测试', desc: '测试两个档案的匹配度' },
    { href: '/admin/profiles', label: '档案管理', desc: '查看所有用户档案' },
    { href: '/admin/invite-codes', label: '邀请码管理', desc: '生成和管理邀请码' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">AI相亲管理后台</h1>
        <p className="text-gray-500 mb-8">点击下方卡片进入对应功能模块</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-100"
            >
              <h2 className="text-xl font-semibold text-blue-600 mb-2">{link.label}</h2>
              <p className="text-gray-600">{link.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">快速链接</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/api/questions" target="_blank" className="text-blue-600 hover:underline">
              API: 获取题目 →
            </Link>
            <Link href="/api/admin/profile-templates" target="_blank" className="text-blue-600 hover:underline">
              API: 资料库模板 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}