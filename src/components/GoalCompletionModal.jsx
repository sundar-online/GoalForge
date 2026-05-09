import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Premium Goal Completion & Story Moment Memory Creation Modal.
 * Displays celebration animation, canvas confetti, achievements stats,
 * and allows saving the journey as a permanent Profile Memory.
 * 
 * @param {{ goal: object, onClose: () => void }} props
 */
export const GoalCompletionModal = ({ goal, onClose }) => {
  const { addMemory, awardXP } = useAppContext();
  const [phase, setPhase] = useState('enter'); // enter → show → save_flow
  const [userNote, setUserNote] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('🏆'); // Preset emojis/stickers for the story moment
  const canvasRef = useRef(null);
  
  // Curated list of premium story memory themes/moods
  const MEMORY_THEMES = [
    { emoji: '🏆', label: 'Triumph', color: 'from-amber-400 to-yellow-600', text: 'text-amber-400' },
    { emoji: '⚡', label: 'Energy', color: 'from-orange-500 to-red-600', text: 'text-orange-400' },
    { emoji: '💡', label: 'Idea', color: 'from-blue-400 to-indigo-600', text: 'text-blue-400' },
    { emoji: '🌱', label: 'Growth', color: 'from-emerald-400 to-teal-600', text: 'text-emerald-400' },
    { emoji: '💖', label: 'Passion', color: 'from-pink-500 to-rose-600', text: 'text-pink-400' },
    { emoji: '🪐', label: 'Cosmic', color: 'from-purple-500 to-fuchsia-600', text: 'text-purple-400' },
  ];

  // Confetti Particle Simulation
  useEffect(() => {
    setPhase('show');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
      speed: Math.random() * 3 + 2
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.speed;
        p.x += Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle - index / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Calculate stats
  const totalHabits = goal.habits?.length || 0;
  const activeHabits = goal.habits?.filter(h => h.completed)?.length || 0;
  const streakAchieved = goal.streak || 0;
  const consistencyPercentage = goal.progress || 100;
  const tag = goal.tag || 'General';

  const handleSaveMemory = () => {
    // Award bonus completion XP
    awardXP(150, `Unlocked Story Moment Memory for "${goal.title}"`);

    // Create memory object
    const memory = {
      goalId: goal.id,
      title: goal.title,
      completionDate: new Date().toISOString().split('T')[0],
      streak: streakAchieved,
      consistency: consistencyPercentage,
      userNote: userNote.trim(),
      userPhoto: selectedPhoto,
      achievementStats: {
        daysCompleted: goal.completedDates?.length || 0,
        totalHabits,
        tag
      }
    };

    addMemory(memory);
    setPhase('exit');
    setTimeout(onClose, 600);
  };

  const handleSkipSave = () => {
    setPhase('exit');
    setTimeout(onClose, 600);
  };

  const currentThemeInfo = MEMORY_THEMES.find(t => t.emoji === selectedPhoto) || MEMORY_THEMES[0];

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 transition-all duration-700 ${
      phase === 'exit' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-700" 
        onClick={handleSkipSave}
      />

      {/* Confetti Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Emotional Celebration Card */}
      <div className={`relative z-10 w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-700 ${
        phase === 'show' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'
      }`}>
        {/* Glow Header */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-gradient-to-r ${currentThemeInfo.color} opacity-20 blur-3xl pointer-events-none`} />

        {/* Story Moment Cover Emoji */}
        <div className="pt-8 pb-4 flex flex-col items-center">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${currentThemeInfo.color} flex items-center justify-center text-4xl shadow-xl shadow-black/40 border border-white/20 animate-bounce`}>
            {selectedPhoto}
          </div>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-accent-blue mt-4">
            Goal Mastered 🎉
          </span>
        </div>

        {/* Body Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[70vh] custom-scroll space-y-5">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              {goal.title}
            </h3>
            <p className="text-sm text-white/50 font-medium">
              You finished this journey with pure discipline!
            </p>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Streak</span>
              <span className="text-lg font-extrabold text-amber-400 mt-1 flex items-center gap-1">
                🔥 {streakAchieved}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Consistency</span>
              <span className="text-lg font-extrabold text-emerald-400 mt-1">
                {consistencyPercentage}%
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center">
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Habits</span>
              <span className="text-lg font-extrabold text-accent-blue mt-1">
                {activeHabits}/{totalHabits}
              </span>
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>🎉</span> Store this as a Permanent Story Memory?
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Memories are permanent achievements saved in your profile timeline, remaining safe even if you delete or archive this goal.
            </p>

            {/* Note & Customization Expand */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">
                  Choose a Memory Icon Theme
                </label>
                <div className="flex gap-2 justify-between">
                  {MEMORY_THEMES.map(theme => (
                    <button
                      key={theme.emoji}
                      onClick={() => setSelectedPhoto(theme.emoji)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all border ${
                        selectedPhoto === theme.emoji 
                          ? 'bg-white/10 border-white/30 scale-110 shadow-lg' 
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                      }`}
                      title={theme.label}
                    >
                      {theme.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Write a Journal Reflection (Optional)
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="How did this goal transform your lifestyle? What was your biggest challenge?"
                  className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-blue resize-none custom-scroll transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3">
          <button
            onClick={handleSkipSave}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-center"
          >
            No, Skip & Dismiss
          </button>
          <button
            onClick={handleSaveMemory}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold text-black bg-gradient-to-r ${currentThemeInfo.color} hover:shadow-lg hover:shadow-black/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-center`}
          >
            ✨ Save Story Memory (+150 XP)
          </button>
        </div>
      </div>
    </div>
  );
};
