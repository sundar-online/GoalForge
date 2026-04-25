import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { Play, Pause, RotateCcw, Target, Coffee, Zap, Volume2, VolumeX, CheckCircle, ChevronDown, Check } from 'lucide-react';
import { TODAY } from '../utils/dateUtils';

export const FocusMode = () => {
  const { tasks, goals, addFocusTime, addFocusTimeToHabit, focusTime, awardFocusXP } = useAppContext();
  
  // -- State Hooks --
  const [duration, setDuration] = useState(25);
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState('');
  
  const timerRef = useRef(null);
  const accRef = useRef(0);

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

  useEffect(() => {
    if (!selectedGoalId) {
      if (goals.length > 0) setSelectedGoalId(goals[0].id);
      else if (todayTasks.length > 0) setSelectedGoalId('DAILY_TASK');
    }
  }, [goals, todayTasks]);

  useEffect(() => {
    if (selectedGoalId && activeList.length > 0 && !selectedHabitId) {
      setSelectedHabitId(activeList[0].id);
    }
  }, [selectedGoalId, activeList]);

  const playTone = (freq, dur = 0.3) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(); 
      const g = ctx.createGain();
      osc.connect(g); 
      g.connect(ctx.destination);
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); 
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  };

  useEffect(() => {
    if (isActive && time > 0) {
      timerRef.current = setInterval(() => {
        setTime(t => t - 1);
        accRef.current += 1;
        
        // Always increment total focus time
        addFocusTime(1); 
        
        // Every 60 seconds of continuous focus, sync to habit/task progress
        if (accRef.current >= 60) {
          accRef.current = 0;
          if (selectedGoalId && selectedHabitId) {
             addFocusTimeToHabit(selectedGoalId, selectedHabitId, 60);
          }
        }
      }, 1000);

    } else {
      clearInterval(timerRef.current);
      if (time === 0 && isActive) {
        setIsActive(false);
        playTone(880, 0.7);
        awardFocusXP(); // +20 XP for completing a focus session
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, time, selectedGoalId, selectedHabitId]);

  const toggle = () => { 
    if (time === 0) return;
    playTone(isActive ? 330 : 528); 
    setIsActive(v => !v); 
  };
  
  const reset = () => { 
    setIsActive(false); 
    setTime(duration * 60); 
    accRef.current = 0; 
    clearInterval(timerRef.current); 
  };

  const changeDuration = (mins) => {
    if (isActive) return;
    setDuration(mins);
    setTime(mins * 60);
  };

  const totalSeconds = duration * 60;
  const elapsed = totalSeconds - time;
  const pct = (elapsed / totalSeconds) * 100;
  const R = 100; const SIZE = 240; const CX = 120; const CY = 120;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  const todayFocusHrs = Math.floor(focusTime / 3600);
  const todayFocusMins = Math.floor((focusTime % 3600) / 60);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
      {/* Header */}
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

      {/* Selectors */}
      <div className="w-full space-y-3">
        <div className="relative group">
          <select 
            value={selectedGoalId} 
            onChange={e => { setSelectedGoalId(e.target.value); setSelectedHabitId(''); }}
            disabled={isActive}
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
              disabled={isActive}
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

      {/* Duration Selector */}
      <div className={`flex gap-1.5 bg-bg-card p-1.5 rounded-2xl border border-border-light shadow-xs transition-all ${isActive ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        {[10, 15, 25, 45, 60].map(m => (
          <button 
            key={m} 
            onClick={() => changeDuration(m)} 
            disabled={isActive}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${duration === m ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-text-muted hover:bg-bg-input'}`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Circular Timer */}
      <div className="relative flex items-center justify-center group">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="rotate-[-90deg]">
          <circle cx={CX} cy={CY} r={R - 10} className="fill-bg-app transition-colors" />
          <circle cx={CX} cy={CY} r={R} fill="none" className="stroke-border-med" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" 
            className={`transition-all duration-[400ms] ease-out stroke-width-8 ${time === 0 ? 'stroke-emerald-500' : 'stroke-accent-blue'}`}
            strokeDasharray={`${CIRC}`} 
            strokeDashoffset={`${dashOffset}`} 
            strokeLinecap="round"
            style={{ transition: isActive ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease' }} 
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-6xl font-black text-text-main tracking-tighter tabular-nums drop-shadow-sm">
            {String(Math.floor(time / 60)).padStart(2, '0')}<span className="opacity-30">:</span>{String(time % 60).padStart(2, '0')}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-[0.25em] mt-4 transition-all duration-500 ${time === 0 ? 'text-emerald-500 animate-pulse' : (isActive ? 'text-accent-blue' : 'text-text-muted')}`}>
            {time === 0 ? 'Sequence Complete' : (isActive ? 'Neural Sync Active' : 'System Ready')}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className={`absolute inset-[-12px] border-2 border-dashed border-accent-blue/10 rounded-full animate-[spin_20s_linear_infinite] ${isActive ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-12 -mt-4">
        <button 
          onClick={reset}
          className="w-14 h-14 rounded-2xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-input transition-all active:scale-90 shadow-sm"
        >
          <RotateCcw size={22} strokeWidth={2.5} />
        </button>
        
        <button 
          onClick={toggle}
          disabled={time === 0}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl disabled:opacity-50 ${
            time === 0 
            ? 'bg-emerald-500 shadow-emerald-500/30' 
            : 'bg-accent-blue shadow-accent-blue/40'
          }`}
        >
          {time === 0 ? (
            <CheckCircle size={36} className="text-white" strokeWidth={2.5} />
          ) : isActive ? (
            <Pause size={36} fill="white" className="text-white" />
          ) : (
            <Play size={36} fill="white" className="text-white ml-2" />
          )}
        </button>
        
        <div className="w-14 h-14" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 w-full px-2">
        <div className="bg-bg-card border border-border-light rounded-2xl p-4 shadow-xs">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Session Yield</p>
          <p className="text-xl font-black text-text-main tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}<span className="text-text-muted">:</span>{String(elapsed % 60).padStart(2, '0')}
          </p>
        </div>
        <div className="bg-accent-blue rounded-2xl p-4 shadow-lg shadow-accent-blue/20">
          <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Lifetime Focus</p>
          <p className="text-xl font-black text-white tabular-nums">
            {String(todayFocusHrs).padStart(2, '0')}h {String(todayFocusMins).padStart(2, '0')}m
          </p>
        </div>
      </div>

      {selectedHabitId && isActive && (
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
