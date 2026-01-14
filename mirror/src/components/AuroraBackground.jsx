// 简单极光动态背景组件（不影响现有流星雨，按需替换使用）
import React from 'react';
import './AuroraBackground.css';

const AuroraBackground = () => {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-layer layer-1" />
      <div className="aurora-layer layer-2" />
      <div className="aurora-layer layer-3" />
      <div className="aurora-stars">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="star" />
        ))}
      </div>
    </div>
  );
};

export default AuroraBackground;

