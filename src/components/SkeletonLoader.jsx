import React from 'react';

export const SkeletonLoader = ({ type = 'card', height = 150 }) => {
  const isCard = type === 'card';
  const isCircle = type === 'circle';
  const isText = type === 'text';

  return (
    <div style={{
      width: isCircle ? height : '100%',
      height: isCircle ? height : (isText ? 20 : height),
      borderRadius: isCircle ? '50%' : 22,
      background: 'var(--bg-card)',
      position: 'relative',
      overflow: 'hidden',
      border: isCard ? '1px solid var(--border-light)' : 'none',
      boxShadow: isCard ? 'var(--shadow-sm)' : 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        animation: 'pulse 1.5s infinite ease-in-out'
      }} />
      <style>{`
        @keyframes pulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
