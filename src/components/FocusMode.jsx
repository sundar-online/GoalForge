import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { 
  Play, Pause, RotateCcw, Target, Coffee, Zap, 
  Volume2, VolumeX, CheckCircle, ChevronDown, Check, 
  Flame, Trophy, Calendar, Sparkles, Award, Bell, Music, HelpCircle
} from 'lucide-react';
import { TODAY } from '../utils/dateUtils';
import { scheduleTimerCompletionNotification, cancelTimerNotification } from '../utils/notificationUtils';

// ── Audio Themes Synthesizer ──────────────────────────────────────────
const playSynthesizedSound = (theme, volume = 0.5, isMuted = false) => {
  if (isMuted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const playTone = (freq, type, start, duration, gainStart, gainEnd) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gainNode.gain.setValueAtTime(gainStart * volume, start);
      gainNode.gain.exponentialRampToValueAtTime(gainEnd * volume, start + duration);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    if (theme === 'zen') {
      // Warm, resonant gong/chime
      playTone(293.66, 'sine', now, 1.5, 0.4, 0.001); // D4 key
      playTone(440.00, 'sine', now + 0.1, 1.2, 0.25, 0.001); // A4 harmonic
      playTone(587.33, 'sine', now + 0.2, 1.0, 0.15, 0.001); // D5 harmonic
    } else if (theme === 'digital') {
      // Futuristic cyber ascending chime
      playTone(523.25, 'triangle', now, 0.15, 0.3, 0.01); // C5
      playTone(659.25, 'triangle', now + 0.12, 0.15, 0.3, 0.01); // E5
      playTone(783.99, 'triangle', now + 0.24, 0.15, 0.3, 0.01); // G5
      playTone(1046.50, 'sine', now + 0.36, 0.6, 0.4, 0.001); // C6 resolution
    } else if (theme === 'bell') {
      // Clear metallic double chime
      playTone(880, 'sine', now, 0.5, 0.35, 0.001);
      playTone(880, 'sine', now + 0.25, 0.6, 0.35, 0.001);
    } else {
      // Classic deep buzzer alarm
      playTone(440, 'sawtooth', now, 0.3, 0.3, 0.01);
      playTone(440, 'sawtooth', now + 0.4, 0.3, 0.3, 0.01);
      playTone(440, 'sawtooth', now + 0.8, 0.5, 0.3, 0.001);
    }
  } catch (e) {
    console.warn('[AudioSynth] Failed to synthesize audio:', e);
  }
};

export const FocusMode = () => {
  const { tasks, goals, addFocusTimeToHabit, focusTime, awardFocusXP } = useAppContext();
  
  // ── PERSISTENT TIMER STATE MANAGEMENT ─────────────────────────────────
  const [timerState, setTimerState] = useState(() => {
    return localStorage.getItem('gf_focus_state') || 'idle'; // 'idle' | 'running' | 'paused'
  });
  
  const [duration, setDuration] = useState(() => {
    return parseInt(localStorage.getItem('gf_focus_duration') || '25', 10);
  });
  
  const [startTime, setStartTime] = useState(() => {
    const saved = localStorage.getItem('gf_focus_startTime');
    return saved ? parseInt(saved, 10) : null;
  });

  const [elapsedBeforePause, setElapsedBeforePause] = useState(() => {
    return parseInt(localStorage.getItem('gf_focus_elapsedBeforePause') || '0', 10);
  });

  const [selectedGoalId, setSelectedGoalId] = useState(() => {
    return localStorage.getItem('gf_focus_selectedGoalId') || '';
  });

  const [selectedHabitId, setSelectedHabitId] = useState(() => {
    return localStorage.getItem('gf_focus_selectedHabitId') || '';
  });

  // ── local countdown rendering state ───────────────────────────────
  const [time, setTime] = useState(duration * 60);

  // ── Audio/Sound Preferences ──────────────────────────────────────────
  const [audioTheme, setAudioTheme] = useState(() => {
    return localStorage.getItem('gf_focus_audio_theme') || 'zen'; // 'zen' | 'digital' | 'bell' | 'buzzer'
  });
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('gf_focus_volume') || '0.5');
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('gf_focus_muted') === 'true';
  });

  // ── Show Stats & Completed Ledgers ──────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState(null);
  const [sessionLogs, setSessionLogs] = useState(() => {
    const saved = localStorage.getItem('gf_focus_completed_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const timerIntervalRef = useRef(null);

  // Get Today's tasks
  const todayStr = TODAY();
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayStr || t.date === todayStr;
    if (type === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
    return false;
  });

  const isDailyTaskMode = selectedGoalId === 'DAILY_TASK';
  const selectedGoal = isDailyTaskMode ? null : goals.find(g => g.id === selectedGoalId);
  const activeList = isDailyTaskMode ? todayTasks : (selectedGoal?.habits || []);
  const selectedItem = activeList.find(h => h.id === selectedHabitId);

  // ── Synchronize selections dynamically if empty ────────────────────
  useEffect(() => {
    if (!selectedGoalId) {
      if (goals.length > 0) {
        setSelectedGoalId(goals[0].id);
        localStorage.setItem('gf_focus_selectedGoalId', goals[0].id);
      } else if (todayTasks.length > 0) {
        setSelectedGoalId('DAILY_TASK');
        localStorage.setItem('gf_focus_selectedGoalId', 'DAILY_TASK');
      }
    }
  }, [goals, todayTasks]);

  useEffect(() => {
    if (selectedGoalId && activeList.length > 0 && !selectedHabitId) {
      setSelectedHabitId(activeList[0].id);
      localStorage.setItem('gf_focus_selectedHabitId', activeList[0].id);
    }
  }, [selectedGoalId, activeList]);

  // Save selection states to localStorage on change
  useEffect(() => {
    localStorage.setItem('gf_focus_selectedGoalId', selectedGoalId);
    localStorage.setItem('gf_focus_selectedHabitId', selectedHabitId);
  }, [selectedGoalId, selectedHabitId]);

  // Save Audio settings on change
  useEffect(() => {
    localStorage.setItem('gf_focus_audio_theme', audioTheme);
    localStorage.setItem('gf_focus_volume', String(volume));
    localStorage.setItem('gf_focus_muted', String(isMuted));
  }, [audioTheme, volume, isMuted]);

  // ── ANALYTICS: Calculate Streak and Daily Totals ─────────────────────
  const streakCount = useMemo(() => {
    if (sessionLogs.length === 0) return 0;
    const uniqueDates = Array.from(new Set(sessionLogs.map(s => s.date))).sort();
    let currentStreak = 0;
    let checkDate = new Date();
    
    // Check if there's focus today or yesterday to continue streak
    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let checkStr = formatDateStr(checkDate);
    if (!uniqueDates.includes(checkStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = formatDateStr(checkDate);
    }

    while (uniqueDates.includes(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = formatDateStr(checkDate);
    }
    return currentStreak;
  }, [sessionLogs]);

  const todayCompletedCount = useMemo(() => {
    return sessionLogs.filter(s => s.date === todayStr).length;
  }, [sessionLogs, todayStr]);

  // ── CORE LIFECYCLE: BACKGROUND RESUME & CALIBRATION ───────────────────
  const checkAndCalibrateTimer = () => {
    const currentState = localStorage.getItem('gf_focus_state') || 'idle';
    const currentDuration = parseInt(localStorage.getItem('gf_focus_duration') || '25', 10);
    const totalSeconds = currentDuration * 60;

    if (currentState === 'idle') {
      setTime(totalSeconds);
      return;
    }

    if (currentState === 'paused') {
      const pausedElapsed = parseInt(localStorage.getItem('gf_focus_elapsedBeforePause') || '0', 10);
      setTime(Math.max(0, totalSeconds - pausedElapsed));
      return;
    }

    if (currentState === 'running') {
      const savedStart = localStorage.getItem('gf_focus_startTime');
      const elapsedBefore = parseInt(localStorage.getItem('gf_focus_elapsedBeforePause') || '0', 10);
      
      if (!savedStart) {
        // Corrupted state, safety reset
        handleReset();
        return;
      }

      const startMs = parseInt(savedStart, 10);
      const elapsedSinceStart = Math.floor((Date.now() - startMs) / 1000);
      const totalElapsed = elapsedBefore + elapsedSinceStart;
      const remaining = totalSeconds - totalElapsed;

      if (remaining <= 0) {
        // Completed while backgrounded or closed!
        handleTimerCompletion(currentDuration, true);
      } else {
        // Still active! Seamlessly update countdown and keep ticking
        setTime(remaining);
        startCountdownTicker();
      }
    }
  };

  // Run calibration on mount and when app focuses/restores
  useEffect(() => {
    checkAndCalibrateTimer();

    // Listen for window visibility changes (app focus/maximize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndCalibrateTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  // ── TICKER: Precise clock countdown ─────────────────────────────────
  const startCountdownTicker = () => {
    clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = setInterval(() => {
      const savedStart = localStorage.getItem('gf_focus_startTime');
      const elapsedBefore = parseInt(localStorage.getItem('gf_focus_elapsedBeforePause') || '0', 10);
      const currentDuration = parseInt(localStorage.getItem('gf_focus_duration') || '25', 10);
      const totalSeconds = currentDuration * 60;

      if (!savedStart) return;

      const elapsed = elapsedBefore + Math.floor((Date.now() - parseInt(savedStart, 10)) / 1000);
      const remaining = totalSeconds - elapsed;

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        handleTimerCompletion(currentDuration, false);
      } else {
        setTime(remaining);
      }
    }, 1000);
  };

  // ── ACTIONS ─────────────────────────────────────────────────────────
  const handleStart = () => {
    const totalSeconds = duration * 60;
    const remainingTime = totalSeconds - elapsedBeforePause;
    
    const nowMs = Date.now();
    setStartTime(nowMs);
    setTimerState('running');

    localStorage.setItem('gf_focus_state', 'running');
    localStorage.setItem('gf_focus_startTime', String(nowMs));

    // Web vibration nudge
    triggerHapticPulse();

    // Schedule native background local notification
    const completionEpochMs = nowMs + (remainingTime * 1000);
    const routineTitle = selectedItem ? selectedItem.title : 'Deep Work Protocol';
    scheduleTimerCompletionNotification(
      'Session Complete! 🚀',
      `Focus session completed successfully: ${routineTitle}`,
      completionEpochMs
    );

    startCountdownTicker();
  };

  const handlePause = () => {
    clearInterval(timerIntervalRef.current);
    
    const elapsedSinceStart = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const totalElapsed = elapsedBeforePause + elapsedSinceStart;

    setElapsedBeforePause(totalElapsed);
    setTimerState('paused');
    setStartTime(null);

    localStorage.setItem('gf_focus_state', 'paused');
    localStorage.setItem('gf_focus_elapsedBeforePause', String(totalElapsed));
    localStorage.removeItem('gf_focus_startTime');

    // Cancel native notification
    cancelTimerNotification();
    triggerHapticPulse();
  };

  const handleReset = () => {
    clearInterval(timerIntervalRef.current);
    
    setTimerState('idle');
    setStartTime(null);
    setElapsedBeforePause(0);
    setTime(duration * 60);

    localStorage.setItem('gf_focus_state', 'idle');
    localStorage.setItem('gf_focus_elapsedBeforePause', '0');
    localStorage.removeItem('gf_focus_startTime');

    // Cancel notification
    cancelTimerNotification();
    triggerHapticPulse();
  };

  const changeDuration = (mins) => {
    if (timerState !== 'idle') return;
    setDuration(mins);
    setTime(mins * 60);
    localStorage.setItem('gf_focus_duration', String(mins));
  };

  // ── COMPLETION LOGIC ────────────────────────────────────────────────
  const handleTimerCompletion = (minsCompleted, completedInBackground = false) => {
    // 1. Reset timer state locally
    setTimerState('idle');
    setStartTime(null);
    setElapsedBeforePause(0);
    setTime(minsCompleted * 60);

    localStorage.setItem('gf_focus_state', 'idle');
    localStorage.setItem('gf_focus_elapsedBeforePause', '0');
    localStorage.removeItem('gf_focus_startTime');

    // 2. Play Completion Synthesizer audio
    playSynthesizedSound(audioTheme, volume, isMuted);

    // 3. Vibrate device with rhythmic completion pulse
    triggerCompletionHaptics();

    // 4. Award XP + gamification metrics
    awardFocusXP(); // +20 XP via GoalForge Engine
    
    // 5. Update associated Habits or Tasks
    const routineTitle = selectedItem ? selectedItem.title : 'Deep Work Protocol';
    if (selectedGoalId && selectedHabitId) {
      addFocusTimeToHabit(selectedGoalId, selectedHabitId, minsCompleted * 60);
    }

    // 6. Log Session Detail to persistent history
    const newSession = {
      id: Date.now().toString(),
      title: routineTitle,
      duration: minsCompleted,
      goalTitle: selectedGoal ? selectedGoal.title : (isDailyTaskMode ? 'Daily Routine' : 'Standalone'),
      date: todayStr,
      timestamp: Date.now()
    };

    const updatedSessions = [newSession, ...sessionLogs];
    setSessionLogs(updatedSessions);
    localStorage.setItem('gf_focus_completed_sessions', JSON.stringify(updatedSessions));

    // 7. Open beautiful completion celebration overlay
    setCelebrationDetails({
      title: routineTitle,
      duration: minsCompleted,
      xpAwarded: 20,
      backgrounded: completedInBackground
    });
    setShowCelebration(true);
  };

  // ── HAPTICS & ALERTS VIBRATION ─────────────────────────────────────
  const triggerHapticPulse = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(60);
    }
  };

  const triggerCompletionHaptics = () => {
    if ('vibrate' in navigator) {
      // Elegant futuristic heartbeat vibration pattern
      navigator.vibrate([150, 80, 150, 80, 400]);
    }
  };

  // Calculate stats
  const totalSeconds = duration * 60;
  const elapsed = timerState === 'running' && startTime
    ? elapsedBeforePause + Math.floor((Date.now() - startTime) / 1000)
    : elapsedBeforePause;
  
  const pct = Math.min(100, (elapsed / totalSeconds) * 100);
  const R = 100; const SIZE = 240; const CX = 120; const CY = 120;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  // Pulse ring conditions near completion (last 10% or <60 seconds)
  const isNearCompletion = timerState === 'running' && (time < 60 || pct >= 90);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto pb-12">
      {/* ── CELEBRATION MODAL OVERLAY ─────────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && celebrationDetails && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-app/90 backdrop-blur-md"
          >
            {/* Confetti Particle Background simulation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * window.innerWidth, opacity: 1 }}
                  animate={{ 
                    y: window.innerHeight + 50, 
                    rotate: 360,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2, 
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  className={`absolute w-3 h-3 rounded-full ${
                    i % 3 === 0 ? 'bg-accent-blue shadow-[0_0_8px_rgba(77,124,255,0.6)]' :
                    i % 3 === 1 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' :
                    'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                  }`}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card border-2 border-accent-blue/30 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue via-purple-500 to-emerald-500 animate-pulse" />
              
              <div className="w-16 h-16 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4 text-accent-blue shadow-[0_0_20px_rgba(77,124,255,0.2)]">
                <Sparkles size={32} className="animate-spin-slow" />
              </div>

              <span className="text-[10px] font-black tracking-[0.25em] text-accent-blue uppercase mb-1 block">
                Session Synced Successfully
              </span>
              <h3 className="text-2xl font-black text-text-main tracking-tight mb-2">
                Deep Focus Forged!
              </h3>
              
              <p className="text-xs text-text-muted mb-6 leading-relaxed">
                You maintained protocol on <span className="text-text-main font-bold">"{celebrationDetails.title}"</span> for <span className="text-accent-blue font-black">{celebrationDetails.duration} minutes</span>!
              </p>

              {/* Reward card */}
              <div className="bg-bg-input border border-border-med p-4 rounded-2xl flex items-center justify-around gap-4 mb-6">
                <div className="text-center">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-1">Energy Reward</p>
                  <p className="text-lg font-black text-emerald-500 flex items-center gap-1 justify-center">
                    <Award size={16} /> +{celebrationDetails.xpAwarded} XP
                  </p>
                </div>
                <div className="w-[1px] h-8 bg-border-med" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-1">Current Streak</p>
                  <p className="text-lg font-black text-amber-500 flex items-center gap-1 justify-center">
                    <Flame size={16} className="fill-current" /> {streakCount} Days
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-3.5 bg-accent-blue hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent-blue/20"
              >
                Return to Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TIMER CONTAINER ─────────────────────────────────────────── */}
      <div className="text-center w-full space-y-2">
        <span className="inline-block bg-accent-blue/10 text-accent-blue text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs">
          Neural Focus Session
        </span>
        <h2 className="text-2xl font-black text-text-main tracking-tight line-clamp-1">
          {selectedItem ? selectedItem.title : 'Deep Work Protocol'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-text-muted">
          {selectedGoal ? (
            <>
              <Target size={12} />
              <span>Project: {selectedGoal.title}</span>
            </>
          ) : isDailyTaskMode ? (
            <>
              <Zap size={12} />
              <span>Core Protocol Active</span>
            </>
          ) : (
            <span>Standalone Session</span>
          )}
        </div>
      </div>

      {/* Domain Selectors */}
      <div className="w-full space-y-3">
        <div className="relative group">
          <select 
            value={selectedGoalId} 
            onChange={e => { setSelectedGoalId(e.target.value); setSelectedHabitId(''); }}
            disabled={timerState !== 'idle'}
            className="w-full bg-bg-card border border-border-light rounded-2xl px-4 py-3 text-sm font-bold text-text-main shadow-xs appearance-none cursor-pointer outline-hidden focus:border-accent-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-10"
          >
            <option value="">— Choose Domain —</option>
            {goals.length > 0 && (
              <optgroup label="Primary Objectives" className="font-bold">
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </optgroup>
            )}
            {todayTasks.length > 0 && (
              <optgroup label="System Routines">
                <option value="DAILY_TASK">Daily Forge</option>
              </optgroup>
            )}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-accent-blue transition-colors" />
        </div>

        {selectedGoalId && activeList.length > 0 && (
          <div className="relative group animate-in slide-in-from-top-2 duration-300">
            <select 
              value={selectedHabitId} 
              onChange={e => setSelectedHabitId(e.target.value)}
              disabled={timerState !== 'idle'}
              className="w-full bg-bg-card border border-border-light rounded-2xl px-4 py-3 text-sm font-bold text-text-main shadow-xs appearance-none cursor-pointer outline-hidden focus:border-accent-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-10"
            >
              <option value="">— Select Routine/Habit —</option>
              {activeList
                .sort((a, b) => {
                  const cType = a.completionType || a.type || 'check';
                  const dType = b.completionType || b.type || 'check';
                  const aDone = cType === 'check' ? a.completed : (cType === 'count' ? (a.currentCount >= (a.targetCount || 10)) : (a.timeSpent >= (a.targetTime || 15)));
                  const bDone = dType === 'check' ? b.completed : (dType === 'count' ? (b.currentCount >= (b.targetCount || 10)) : (b.timeSpent >= (b.targetTime || 15)));
                  if (aDone !== bDone) return aDone ? 1 : -1;
                  return 0;
                })
                .map(h => {
                  const cType = h.completionType || h.type || 'check';
                  const isCount = cType === 'count';
                  const isCheck = cType === 'check';
                  const target = isCount ? (h.targetCount || 10) : (h.targetTime || 15);
                  const progress = isCount ? (h.currentCount || 0) : (h.timeSpent || 0);
                  const unit = isCount ? '' : 'm';
                  return (
                    <option key={h.id} value={h.id}>
                      {h.title} {isCheck ? (h.completed ? '✓' : '') : `[${progress}${unit}/${target}${unit}]`}
                    </option>
                  );
                })}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-accent-blue transition-colors" />
          </div>
        )}
      </div>

      {/* Preset Duration Selector */}
      <div className={`flex gap-1.5 bg-bg-card p-1.5 rounded-2xl border border-border-light shadow-xs transition-all ${timerState !== 'idle' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        {[10, 15, 25, 45, 60].map(m => (
          <button 
            key={m} 
            onClick={() => changeDuration(m)} 
            disabled={timerState !== 'idle'}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${duration === m ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-text-muted hover:bg-bg-input'}`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Circular Timer Display */}
      <div className="relative flex items-center justify-center group">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="rotate-[-90deg]">
          <defs>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4d7cff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#4d7cff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R - 10} className="fill-bg-app transition-colors" />
          
          {/* Outer active neon glow */}
          {timerState === 'running' && (
            <circle cx={CX} cy={CY} r={R + 12} fill="url(#glowGrad)" className="animate-pulse" />
          )}

          <circle cx={CX} cy={CY} r={R} fill="none" className="stroke-border-med" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" 
            className={`transition-all duration-300 stroke-width-8 ${time === 0 ? 'stroke-emerald-500' : 'stroke-accent-blue'}`}
            strokeDasharray={`${CIRC}`} 
            strokeDashoffset={`${dashOffset}`} 
            strokeLinecap="round"
            style={{ 
              transition: timerState === 'running' ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
              filter: timerState === 'running' ? 'drop-shadow(0px 0px 8px rgba(77,124,255,0.4))' : 'none'
            }} 
          />
        </svg>
        
        {/* Near Completion dynamic breathing ring */}
        {isNearCompletion && (
          <div className="absolute inset-[-4px] border-4 border-red-500/20 rounded-full animate-ping pointer-events-none duration-1000" />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-6xl font-black text-text-main tracking-tighter tabular-nums drop-shadow-sm flex items-center">
            {String(Math.floor(time / 60)).padStart(2, '0')}
            <span className={`transition-opacity duration-500 ${timerState === 'running' ? 'animate-pulse' : ''}`}>:</span>
            {String(time % 60).padStart(2, '0')}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-[0.25em] mt-4 transition-all duration-500 ${time === 0 ? 'text-emerald-500 animate-pulse' : (timerState === 'running' ? 'text-accent-blue animate-pulse' : 'text-text-muted')}`}>
            {time === 0 ? 'Sequence Complete' : (timerState === 'running' ? 'Neural Sync Active' : 'System Ready')}
          </div>
        </div>
        
        {/* Decorative dynamic outer orbital ring */}
        <div className={`absolute inset-[-12px] border-2 border-dashed border-accent-blue/10 rounded-full animate-[spin_25s_linear_infinite] ${timerState === 'running' ? 'opacity-100' : 'opacity-0 transition-opacity duration-500'}`} />
      </div>

      {/* ── ALARMS & SOUND SETUP PREFERENCES ──────────────────────────── */}
      <div className="w-full bg-bg-card border border-border-light rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
            <Bell size={12} className="text-accent-blue" /> Alert Configuration
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all active:scale-90 ${
              isMuted 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-bg-input border-border-med text-text-muted hover:text-text-main'
            }`}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'zen', name: 'Zen' },
            { id: 'digital', name: 'Cyber' },
            { id: 'bell', name: 'Bell' },
            { id: 'buzzer', name: 'Alarm' },
          ].map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                setAudioTheme(theme.id);
                playSynthesizedSound(theme.id, volume, false);
              }}
              className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                audioTheme === theme.id
                  ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                  : 'bg-bg-input border-border-med text-text-muted hover:border-border-light hover:text-text-main'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-3">
          <VolumeX size={12} className="text-text-muted" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-accent-blue h-1 bg-bg-input rounded-lg cursor-pointer appearance-none"
          />
          <Volume2 size={12} className="text-text-muted" />
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-12 mt-2">
        <button 
          onClick={handleReset}
          className="w-14 h-14 rounded-2xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-input transition-all active:scale-90 shadow-sm"
        >
          <RotateCcw size={22} strokeWidth={2.5} />
        </button>
        
        <button 
          onClick={timerState === 'running' ? handlePause : handleStart}
          disabled={time === 0}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl disabled:opacity-50 ${
            time === 0 
            ? 'bg-emerald-500 shadow-emerald-500/30' 
            : 'bg-accent-blue shadow-accent-blue/40'
          }`}
        >
          {time === 0 ? (
            <CheckCircle size={36} className="text-white" strokeWidth={2.5} />
          ) : timerState === 'running' ? (
            <Pause size={36} fill="white" className="text-white" />
          ) : (
            <Play size={36} fill="white" className="text-white ml-2" />
          )}
        </button>
        
        <div className="w-14 h-14" />
      </div>

      {/* ── STATS LEDGER & COMPLETED HISTORY ──────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="bg-bg-card border border-border-light rounded-2xl p-4 text-center shadow-xs">
          <Flame size={18} className="mx-auto mb-1 text-amber-500 fill-current" />
          <p className="text-[8px] font-black text-text-muted uppercase tracking-wider mb-0.5">Focus Streak</p>
          <p className="text-base font-black text-text-main">{streakCount} Days</p>
        </div>
        <div className="bg-bg-card border border-border-light rounded-2xl p-4 text-center shadow-xs">
          <Trophy size={18} className="mx-auto mb-1 text-yellow-500" />
          <p className="text-[8px] font-black text-text-muted uppercase tracking-wider mb-0.5">Yield Today</p>
          <p className="text-base font-black text-text-main">{todayCompletedCount} Blocks</p>
        </div>
        <div className="bg-accent-blue rounded-2xl p-4 text-center shadow-lg shadow-accent-blue/15">
          <Calendar size={18} className="mx-auto mb-1 text-white/80" />
          <p className="text-[8px] font-black text-white/60 uppercase tracking-wider mb-0.5">Lifetime Time</p>
          <p className="text-base font-black text-white">
            {Math.floor(focusTime / 3600)}h {Math.floor((focusTime % 3600) / 60)}m
          </p>
        </div>
      </div>

      {/* Completed ledger list */}
      {sessionLogs.length > 0 && (
        <div className="w-full space-y-3">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
            Focus Ledger Logs
          </span>
          <div className="bg-bg-card border border-border-light rounded-2xl p-3 shadow-xs max-h-48 overflow-y-auto space-y-2 divide-y divide-border-light">
            {sessionLogs.slice(0, 5).map((log, index) => (
              <div key={log.id || index} className={`flex items-center justify-between text-xs pt-2 ${index === 0 ? 'pt-0' : ''}`}>
                <div className="min-w-0 pr-4">
                  <p className="font-bold text-text-main truncate">{log.title}</p>
                  <p className="text-[9px] font-medium text-text-muted truncate flex items-center gap-1.5 mt-0.5">
                    <Target size={8} /> {log.goalTitle}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block bg-accent-blue/10 text-accent-blue text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                    +{log.duration} mins
                  </span>
                  <p className="text-[8px] font-medium text-text-muted mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedHabitId && timerState === 'running' && (
        <div className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl px-4 py-3 w-full animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            <p className="text-[10px] font-black text-accent-blue uppercase tracking-wider">
              Automatic Sync Active: Logging to "{selectedItem?.title}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
