import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ArrowLeft, Clock, Target } from 'lucide-react';
import { TODAY, addDays, parseLocalDate } from '../utils/dateUtils';
import { evaluateGoalPerformance } from '../utils/goalEvaluation';

function formatReadableDate(dateStr) {
  if (!dateStr) return '—';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Modal displayed when an active goal passes its target deadline.
 * Forces an explicit decision between continuing (extending the deadline)
 * or ending (finalizing statistics and evaluating PASSED / FAILED).
 */
export const ExpiredGoalModal = ({
  goal,
  totalExpiredCount = 1,
  onContinueGoal,
  onEndGoal,
}) => {
  const todayStr = TODAY();
  const defaultNewDeadline = addDays(todayStr, 7);

  const [step, setStep] = useState('choice'); // 'choice' | 'continue' | 'confirm_end'
  const [newDeadline, setNewDeadline] = useState(defaultNewDeadline);
  const [dateError, setDateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset modal flow whenever the active expired goal in the queue changes
  useEffect(() => {
    const freshDefault = addDays(TODAY(), 7);
    setStep('choice');
    setNewDeadline(freshDefault);
    setDateError('');
    setIsSubmitting(false);
  }, [goal?.id]);

  const evaluation = useMemo(() => {
    if (!goal) return null;
    return evaluateGoalPerformance(goal, todayStr);
  }, [goal, todayStr]);

  if (!goal || !evaluation) return null;

  const isPassed = evaluation.finalResult === 'PASSED';

  const handleConfirmContinue = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newDeadline || newDeadline < todayStr) {
      setDateError('Please select today or a future end date.');
      return;
    }
    setDateError('');
    setIsSubmitting(true);
    try {
      onContinueGoal(goal.id, newDeadline);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEnd = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onEndGoal(goal.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-goal-modal-title"
      className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-bg-card border border-border-light rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-float space-y-6 animate-in zoom-in-95 duration-200">
        {step === 'choice' && (
          <>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock size={30} />
              </div>

              {totalExpiredCount > 1 && (
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {totalExpiredCount} Expired Goals Pending
                </span>
              )}

              <h3 id="expired-goal-modal-title" className="text-xl font-black text-text-main tracking-tight">
                Goal Deadline Reached
              </h3>
              <p className="text-sm font-medium text-text-muted leading-relaxed">
                Your goal deadline has passed. What would you like to do?
              </p>
            </div>

            {/* Goal Summary Card */}
            <div className="bg-bg-input/60 border border-border-light rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Target size={16} className="text-accent-blue shrink-0" />
                  <span className="text-sm font-black text-text-main truncate">{goal.title}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 shrink-0">
                  Expired
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                <span>Target End Date</span>
                <span className="text-text-main">{formatReadableDate(goal.deadline)}</span>
              </div>
            </div>

            {/* Exactly two choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('continue')}
                className="py-3.5 px-4 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/25 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Continue Goal
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm_end')}
                className="py-3.5 px-4 rounded-2xl bg-bg-input border border-border-med text-text-main font-black text-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 active:scale-[0.98] transition-all"
              >
                End Goal
              </button>
            </div>
          </>
        )}

        {step === 'continue' && (
          <form onSubmit={handleConfirmContinue} className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('choice')}
                aria-label="Back to options"
                className="w-9 h-9 rounded-xl bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 id="expired-goal-modal-title" className="text-lg font-black text-text-main tracking-tight">
                  Continue Goal
                </h3>
                <p className="text-xs font-bold text-text-muted">Select a new end date for "{goal.title}"</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Quick Extend From Today</p>
              <div className="grid grid-cols-3 gap-2.5">
                {[7, 14, 30].map(days => {
                  const candidate = addDays(todayStr, days);
                  const active = newDeadline === candidate;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setNewDeadline(candidate);
                        setDateError('');
                      }}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all border-2 ${
                        active
                          ? 'border-accent-blue bg-accent-blue-light text-accent-blue'
                          : 'border-bg-input bg-bg-input text-text-main hover:border-border-med'
                      }`}
                    >
                      +{days} Days
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="continue-goal-deadline" className="block text-[10px] font-black text-text-muted uppercase tracking-widest">
                New End Date
              </label>
              <div className="relative">
                <input
                  id="continue-goal-deadline"
                  type="date"
                  required
                  min={todayStr}
                  value={newDeadline}
                  onChange={e => {
                    setNewDeadline(e.target.value);
                    setDateError('');
                  }}
                  className="w-full bg-bg-input border border-border-light rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-none focus:border-accent-blue transition-colors"
                />
              </div>
              {dateError && (
                <p className="text-xs font-bold text-rose-400">{dateError}</p>
              )}
            </div>

            <div className="bg-bg-input/50 border border-border-light rounded-2xl p-3.5 text-xs font-semibold text-text-muted leading-relaxed flex items-start gap-2.5">
              <Calendar size={15} className="text-accent-blue shrink-0 mt-0.5" />
              <span>All existing habits, tasks, progress, streaks, and completion history will be preserved.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('choice')}
                className="py-3.5 rounded-2xl bg-bg-input text-text-muted font-black text-sm hover:bg-bg-input/80 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3.5 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Save & Continue
              </button>
            </div>
          </form>
        )}

        {step === 'confirm_end' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('choice')}
                aria-label="Back to options"
                className="w-9 h-9 rounded-xl bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h3 id="expired-goal-modal-title" className="text-lg font-black text-text-main tracking-tight">
                  End Goal Confirmation
                </h3>
                <p className="text-xs font-bold text-text-muted">Review final performance before finalizing</p>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="bg-bg-input/60 border border-border-light rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-light/60">
                <span className="text-xs font-bold text-text-muted">Goal Name</span>
                <span className="text-sm font-black text-text-main text-right truncate max-w-[60%]">{evaluation.goalTitle}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text-muted">Completed Tasks</span>
                <span className="text-sm font-black text-text-main">{evaluation.completedTasks}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text-muted">Total Planned Tasks</span>
                <span className="text-sm font-black text-text-main">{evaluation.totalPlannedTasks}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text-muted">Final Completion Percentage</span>
                <span className={`text-base font-black ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {evaluation.completionPercentage}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-light/60">
                <span className="text-xs font-bold text-text-muted">Expected Result</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                    isPassed
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {isPassed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {isPassed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>

            {evaluation.totalPlannedTasks === 0 && (
              <p className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                No planned tasks were found for this goal period. Final completion is 0% (Failed).
              </p>
            )}

            <p className="text-xs font-semibold text-text-muted leading-relaxed">
              Confirming will move this goal to{' '}
              <strong className="text-text-main">{isPassed ? 'Completed Goals' : 'Failed Goals'}</strong>, update your Profile Statistics, and lock further normal task completion under it.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('choice')}
                className="py-3.5 rounded-2xl bg-bg-input text-text-muted font-black text-sm hover:bg-bg-input/80 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmEnd}
                className={`py-3.5 rounded-2xl font-black text-sm text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 ${
                  isPassed
                    ? 'bg-emerald-500 shadow-emerald-500/25 hover:opacity-90'
                    : 'bg-rose-500 shadow-rose-500/25 hover:opacity-90'
                }`}
              >
                Confirm End Goal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

