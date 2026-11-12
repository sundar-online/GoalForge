import React from 'react';
import { Lock, Unlock, ArrowLeft } from 'lucide-react';
import { GoalProgressCircle } from './GoalProgressCircle';

/**
 * Minimal pure-black GoalForge Discipline Lock interface.
 * Rendered as a preview modal on Web and mirrored by native DisciplineLockActivity on Android.
 */
export const DisciplineLockScreen = ({
  dailyProgress,
  decision,
  onClose,
  onGoToGoals,
}) => {
  const goals = dailyProgress?.goals || [];
  const completedTasks = dailyProgress?.completedRequiredTasks ?? 0;
  const totalTasks = dailyProgress?.totalRequiredTasks ?? 0;
  const remainingTasks = dailyProgress?.remainingRequiredTasks ?? 0;
  const isUnlocked = !decision?.shouldLockInstagram;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discipline-lock-title"
      className="fixed inset-0 z-[260] bg-black text-white flex flex-col items-center justify-between px-6 py-8 sm:py-12 overflow-y-auto"
    >
      {/* HEADER */}
      <header className="w-full max-w-md flex flex-col items-center gap-2 pt-2">
        <span
          id="discipline-lock-title"
          className="text-sm font-black uppercase tracking-[0.38em] text-white/90"
        >
          GOALFORGE
        </span>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            isUnlocked
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
          }`}
        >
          {isUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
          <span>{isUnlocked ? 'Discipline unlocked!' : 'Instagram Locked.'}</span>
        </div>
      </header>

      {/* MAIN CONTENT: Up to Three Circular Goal Progress Indicators */}
      <main className="w-full max-w-lg flex flex-col items-center gap-8 my-auto py-8">
        {goals.length > 0 ? (
          <div
            className={`grid gap-6 sm:gap-8 w-full justify-items-center ${
              goals.length === 1
                ? 'grid-cols-1'
                : goals.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            {goals.map((g) => (
              <GoalProgressCircle
                key={g.id}
                title={g.title}
                percentage={g.completionPercentage}
                completedTasks={g.completedTasks}
                totalTasks={g.totalTasks}
                isRestDay={g.isRestDay}
                size={118}
                strokeWidth={9}
                pureBlackMode
              />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.03] text-center max-w-sm">
            <p className="text-sm font-black text-white">No active goals found</p>
            <p className="text-xs font-medium text-white/55 mt-1.5 leading-relaxed">
              Create at least one active goal with daily tasks, or disable Discipline Lock in Settings.
            </p>
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isUnlocked ? 'Discipline unlocked!' : 'Complete your goals before scrolling.'}
          </h2>
          {!isUnlocked && totalTasks === 0 && goals.length > 0 && (
            <p className="text-xs font-medium text-white/55 max-w-sm mx-auto">
              Safe empty-state policy: no required tasks scheduled today. Add a daily task due today or pause Discipline Lock in Settings.
            </p>
          )}
        </div>

        {/* DAILY PROGRESS */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
          <div>
            <p className="text-lg font-black text-emerald-400">{completedTasks}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Completed</p>
          </div>
          <div>
            <p className="text-lg font-black text-white">{totalTasks}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Total</p>
          </div>
          <div>
            <p className="text-lg font-black text-accent-blue">{remainingTasks}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Remaining</p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-sm flex flex-col items-center gap-3 pb-4">
        <p className="text-xs font-black uppercase tracking-widest text-white/60">
          STATUS: {isUnlocked ? 'Discipline unlocked!' : 'Instagram Locked.'}
        </p>

        <button
          type="button"
          onClick={() => {
            if (onGoToGoals) onGoToGoals();
            else if (onClose) onClose();
          }}
          className="w-full py-3.5 px-5 rounded-2xl bg-accent-blue hover:bg-accent-blue/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <ArrowLeft size={15} />
          <span>{isUnlocked ? 'Close Preview' : 'Complete Tasks in GoalForge'}</span>
        </button>

        {onClose && onGoToGoals && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-white/45 hover:text-white/80 py-1 transition-colors"
          >
            Dismiss Preview
          </button>
        )}
      </footer>
    </div>
  );
};

export default DisciplineLockScreen;

