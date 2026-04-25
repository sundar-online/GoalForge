import React, { useEffect, useState } from 'react';

/**
 * Full-screen level-up celebration modal.
 * Shows when the user reaches a new level.
 * @param {{ level: number, title: string, onClose: () => void }} props
 */
export const LevelUpModal = ({ level, title, onClose }) => {
  const [phase, setPhase] = useState('enter'); // enter → show → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => {
      setPhase('exit');
      setTimeout(onClose, 600);
    }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const handleDismiss = () => {
    setPhase('exit');
    setTimeout(onClose, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-700 ${phase === 'exit' ? 'opacity-0 scale-110' : phase === 'show' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      {/* Animated Glow Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="levelup-ring levelup-ring-1" />
        <div className="levelup-ring levelup-ring-2" />
        <div className="levelup-ring levelup-ring-3" />
      </div>

      {/* Particle Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="levelup-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              '--particle-x': `${(Math.random() - 0.5) * 200}px`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center gap-6 px-8 transition-all duration-700 delay-300 ${phase === 'show' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Pre-title */}
        <p className="text-sm font-black uppercase tracking-[0.4em] text-accent-blue animate-pulse">
          You've Ascended
        </p>

        {/* Level Badge */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent-blue via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-accent-blue/50 levelup-badge-glow">
            <div className="w-28 h-28 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
              <span className="text-5xl font-black text-white tracking-tighter">{level}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
            {title}
          </h2>
          <p className="text-base text-white/50 font-bold">
            Level {level} Unlocked
          </p>
        </div>

        {/* Dismiss hint */}
        <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-4 animate-pulse">
          Tap anywhere to continue
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        .levelup-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(90, 133, 255, 0.3);
          animation: levelup-ring-expand 3s ease-out infinite;
        }
        .levelup-ring-1 { width: 100px; height: 100px; animation-delay: 0s; }
        .levelup-ring-2 { width: 100px; height: 100px; animation-delay: 1s; }
        .levelup-ring-3 { width: 100px; height: 100px; animation-delay: 2s; }

        @keyframes levelup-ring-expand {
          0% { transform: scale(1); opacity: 0.8; border-color: rgba(90, 133, 255, 0.6); }
          100% { transform: scale(8); opacity: 0; border-color: rgba(90, 133, 255, 0); }
        }

        .levelup-badge-glow {
          animation: levelup-glow 2s ease-in-out infinite alternate;
        }
        @keyframes levelup-glow {
          0% { box-shadow: 0 0 30px rgba(90, 133, 255, 0.4), 0 0 60px rgba(90, 133, 255, 0.2); }
          100% { box-shadow: 0 0 50px rgba(90, 133, 255, 0.6), 0 0 100px rgba(90, 133, 255, 0.3), 0 0 150px rgba(129, 140, 248, 0.2); }
        }

        .levelup-particle {
          position: absolute;
          bottom: -10px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5a85ff, #a78bfa);
          animation: levelup-particle-rise linear infinite;
        }
        @keyframes levelup-particle-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(var(--particle-x, 0)); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
