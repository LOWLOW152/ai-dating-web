import React from 'react';

export default function ProgressBar({ current, total }) {
  const progress = Math.round((current / total) * 100);
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">进度</span>
        <span className="text-sm font-medium text-warm-600">{current} / {total}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}