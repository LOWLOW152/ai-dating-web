import Link from 'next/link';

export default function AdminHome() {
  const links = [
    { href: '/admin/questions', label: '题库管理', desc: '管理所有题目、配置AI提示词', color: 'blue' },
    { href: '/admin/profile-templates', label: '资料库管理', desc: '管理匹配模板、设置权重算法、第一层筛选规则', color: 'indigo' },
    { href: '/admin/match', label: '匹配测试', desc: '第一层筛选、两人匹配度测试', color: 'green' },
    { href: '/admin/profiles', label: '档案管理', desc: '查看所有用户档案', color: 'purple' },
    { href: '/admin/evaluation', label: 'AI评价', desc: 'AI自动评价档案，生成匹配标签', color: 'cyan' },
    { href: '/admin/beauty-score', label: '颜值打分', desc: 'P图程度、颜值类型、颜值评分', color: 'pink' },
    { href: '/admin/token-stats', label: 'Token统计', desc: '查看AI调用费用和Token使用情况', color: 'orange' },
    { href: '/admin/invite-codes', label: '邀请码管理', desc: '生成和管理邀请码', color: 'gray' },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100' },
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 text-gray-800">AI相亲管理后台</h1>
          <p className="text-gray-500 text-lg">狗蛋相亲实验室 · 全流程管理系统</p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {links.map((link) => {
            const colors = colorClasses[link.color];
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-5 border ${colors.border} group`}
              >
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <span className={`text-lg font-bold ${colors.text}`}>
                    {link.label.charAt(0)}
                  </span>
                </div>
                <h2 className={`font-semibold ${colors.text} mb-1`}>{link.label}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{link.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* 快捷操作 */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">快捷操作</h3>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/admin/profiles" 
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
              >
                查看档案
              </Link>
              <Link 
                href="/admin/match" 
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
              >
                匹配测试
              </Link>
              <Link 
                href="/admin/beauty-score" 
                className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-200 transition-colors"
              >
                颜值打分
              </Link>
              <Link 
                href="/admin/invite-codes" 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                生成邀请码
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <h3 className="font-semibold mb-2">⚙️ 系统维护</h3>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/admin/migrate" 
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                数据库迁移
              </Link>
            </div>
            <p className="text-xs opacity-75 mt-2">执行数据库结构升级</p>
          </div>
        </div>

        {/* API链接 */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">API 快速链接</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/api/questions" target="_blank" className="text-sm text-blue-600 hover:underline">
              获取题目 →
            </Link>
            <Link href="/api/admin/profile-templates" target="_blank" className="text-sm text-blue-600 hover:underline">
              资料库模板 →
            </Link>
            <Link href="/api/admin/token-stats" target="_blank" className="text-sm text-blue-600 hover:underline">
              Token统计 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}