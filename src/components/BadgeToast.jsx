import React, { useEffect, useState } from 'react';

/**
 * Slide-in toast notification when a badge is earned.
 * @param {{ badge: { icon: string, title: string, description: string }, onClose: () => void }} props
 */
export const BadgeToast = ({ badge, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div className={`fixed bottom-24 md:bottom-8 left-1/2 z-[9998] transition-all duration-500 ${visible ? 'opacity-100 translate-y-0 -translate-x-1/2' : 'opacity-0 translate-y-8 -translate-x-1/2'}`}>
      <div className="bg-bg-float/95 backdrop-blur-2xl border border-accent-blue/30 rounded-2xl px-6 py-4 shadow-2xl shadow-accent-blue/20 flex items-center gap-4 min-w-[280px] max-w-[400px]">
        {/* Badge Icon */}
        <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0 badge-toast-glow">
          <span className="text-2xl">{badge.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[9px] font-black text-accent-blue uppercase tracking-[0.2em]">Badge Unlocked</p>
          </div>
          <p className="text-sm font-black text-text-main tracking-tight truncate">{badge.title}</p>
          <p className="text-xs font-bold text-text-muted truncate">{badge.description}</p>
        </div>

        {/* Dismiss */}
        <button onClick={() => { setVisible(false); setTimeout(onClose, 400); }} className="text-text-muted hover:text-text-main transition-colors text-lg font-bold shrink-0">
          ×
        </button>
      </div>

      <style>{`
        .badge-toast-glow {
          animation: badge-glow 2s ease-in-out infinite alternate;
        }
        @keyframes badge-glow {
          0% { box-shadow: 0 0 8px rgba(90, 133, 255, 0.2); }
          100% { box-shadow: 0 0 20px rgba(90, 133, 255, 0.4), 0 0 40px rgba(90, 133, 255, 0.1); }
        }
      `}</style>
    </div>
  );
};
