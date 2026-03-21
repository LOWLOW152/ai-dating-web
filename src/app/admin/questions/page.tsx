import { sql } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getQuestions() {
  const result = await sql.query('SELECT * FROM questions ORDER BY "order" ASC');
  return result.rows;
}

export default async function QuestionsPage() {
  const questions = await getQuestions();

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">题库管理</h1>
        <div className="flex gap-2">
          <Link 
            href="/admin/questions/prompt"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            全局AI提示词
          </Link>
          <Link 
            href="/admin/questions/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 新建题目
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">序号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">题目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {questions.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{q.order}</td>
                <td className="px-4 py-3 text-sm font-medium">{q.question_text}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    q.category === 'basic' ? 'bg-blue-100 text-blue-700' :
                    q.category === 'lifestyle' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {q.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{q.type}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={q.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {q.is_active ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link href={`/admin/questions/${q.id}`} className="text-blue-600 hover:underline">编辑</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}