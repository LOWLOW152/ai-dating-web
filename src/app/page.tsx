export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">AI相亲系统 API</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">系统状态</h2>
          <p className="text-gray-600">后端服务运行中</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">可用接口</h2>
          <ul className="space-y-2 text-gray-600">
            <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/questions</code> - 获取题目列表</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/profiles/:id</code> - 获取档案</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">POST /api/profiles</code> - 创建档案</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/admin/profile-templates</code> - 资料库模板</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">POST /api/admin/match</code> - 执行匹配</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">数据库初始化</h2>
          <p className="text-blue-700 mb-4">首次使用请在 Vercel Dashboard 中运行 SQL 文件：</p>
          <code className="bg-white px-3 py-2 rounded block text-blue-600">schema.sql</code>
        </div>
      </div>
    </main>
  );
}