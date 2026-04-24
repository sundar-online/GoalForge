import React from 'react';

export const SkeletonLoader = ({ type = 'card', height = 150 }) => {
  const isCircle = type === 'circle';
  const isText = type === 'text';

  return (
    <div 
      className={`
        bg-bg-card relative overflow-hidden animate-pulse
        ${isCircle ? 'rounded-full' : 'rounded-[22px]'}
        ${type === 'card' ? 'border border-border-light shadow-sm' : ''}
      `}
      style={{
        width: isCircle ? height : '100%',
        height: isCircle ? height : (isText ? 20 : height),
      }}
    >
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
