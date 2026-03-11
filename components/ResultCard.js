import React from 'react';

export default function ResultCard({ title, content, icon }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-warm-100 mb-4">
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="text-gray-600 leading-relaxed">{content}</div>
    </div>
  );
}