import React from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo/头像 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-warm-500 rounded-full flex items-center justify-center text-white text-4xl shadow-lg">
            🐶
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          AI 相亲助手
        </h1>
        <p className="text-lg text-warm-600 font-medium mb-2">
          狗蛋
        </p>

        {/* 介绍 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-8">
          <p className="text-gray-600 leading-relaxed mb-4">
            你好，我是狗蛋。我会通过30个问题，了解真实的你。
          </p>
          <ul className="text-left text-gray-600 space-y-2 text-sm">
            <li className="flex items-start">
              <span className="text-warm-500 mr-2">✓</span>
              全程对话式交互，轻松自然
            </li>
            <li className="flex items-start">
              <span className="text-warm-500 mr-2">✓</span>
              深度追问，不只停留在表面
            </li>
            <li className="flex items-start">
              <span className="text-warm-500 mr-2">✓</span>
              生成专属相亲档案
            </li>
          </ul>
        </div>

        {/* 开始按钮 */}
        <button
          onClick={() => router.push('/chat')}
          className="btn-primary w-full text-lg"
        >
          开始了解我
        </button>

        <p className="mt-6 text-sm text-gray-400">
          预计用时 10-15 分钟
        </p>
      </div>
    </div>
  );
}