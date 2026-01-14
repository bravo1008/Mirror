// src/components/MeteorRain.jsx
import React, { useEffect } from 'react';
import './MeteorRain.css';

const MeteorRain = () => {
  useEffect(() => {
    const container = document.querySelector('.meteor-rain');
    if (!container) return;

    const createMeteor = () => {
      const meteor = document.createElement('div');

      // 线条 + 圆点 混合效果，40% 圆点、60% 线条
      const isDot = Math.random() < 0.4;
      meteor.className = isDot ? 'meteor dot' : 'meteor line';

      // 随机起始位置与动画参数（垂直坠落，X 全屏随机）
      const startX = Math.random() * window.innerWidth; // 任意横向位置
      const duration = 0.35 + Math.random() * 0.55; // 0.35s ～ 0.9s
      const opacity = 0.7 + Math.random() * 0.3;

      meteor.style.left = `${startX}px`;
      // 起始 Y 略高于视口，保证从外面飞入
      const startY = -100 - Math.random() * 150;
      meteor.style.top = `${startY}px`;
      meteor.style.animationDuration = `${duration}s`;
      meteor.style.opacity = `${opacity}`;

      container.appendChild(meteor);

      // 自动清理节点，防止内存泄漏
      setTimeout(() => {
        meteor.remove();
      }, duration * 1000 + 100);
    };

    // 每 20～50ms 创建一颗流星（进一步减少数量）
    const interval = setInterval(() => {
      createMeteor();
    }, 20 + Math.random() * 30);

    return () => clearInterval(interval);
  }, []);

  return <div className="meteor-rain" aria-hidden="true"></div>;
};

export default MeteorRain;