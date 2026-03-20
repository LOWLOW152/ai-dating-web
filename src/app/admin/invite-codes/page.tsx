'use client';

import { useState } from 'react';

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function handleGenerate() {
    setGenerating(true);
    const newCodes = [];
    for (let i = 0; i < 10; i++) {
      newCodes.push(generateCode());
    }
    setCodes(newCodes);
    setGenerating(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">邀请码管理</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          生成10个邀请码
        </button>
      </div>

      {codes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">新生成的邀请码</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {codes.map((code, i) => (
              <div
                key={i}
                className="bg-gray-100 rounded px-3 py-2 text-center font-mono text-sm"
              >
                {code}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            提示：请保存这些邀请码，页面刷新后将无法再次查看
          </p>
        </div>
      )}

      {codes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">点击上方按钮生成新的邀请码</p>
        </div>
      )}
    </div>
  );
}