import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { Play, Pause, RotateCcw, Target, Coffee, Zap, Volume2, VolumeX, CheckCircle } from 'lucide-react';

export const FocusMode = () => {
  const { tasks, goals, addFocusTimeToHabit } = useAppContext();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
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
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  };

  useEffect(() => {
    if (isActive && time > 0) {
      timerRef.current = setInterval(() => {
        setTime(t => t - 1);
        accRef.current += 1;
        if (accRef.current >= 60) {
          accRef.current = 0;
          addFocusTimeToHabit(selectedGoalId || null, selectedHabitId || null, 60);
        } else {
          addFocusTime(1);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (time === 0 && isActive) {
        setIsActive(false);
        playTone(880, 0.7);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, time, selectedGoalId, selectedHabitId]);

  const toggle = () => { 
    if (time === 0) return; // Prevent playing when done
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', width: '100%', marginBottom: 4 }}>
        <span style={{ display: 'inline-block', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 999, marginBottom: 10 }}>
          Deep Work Session
        </span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
          {selectedItem ? selectedItem.title : 'General Focus'}
        </h2>
        {selectedGoal && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Goal: {selectedGoal.title}</p>}
        {isDailyTaskMode && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Daily Routine Task</p>}
      </div>

      {/* Habit Selector */}
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <select value={selectedGoalId} onChange={e => { setSelectedGoalId(e.target.value); setSelectedHabitId(''); }}
            disabled={isActive}
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '10px 36px 10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-sm)', appearance: 'none', cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', opacity: isActive ? 0.6 : 1 }}>
            <option value="">— General Focus (No Link) —</option>
            {goals.length > 0 && <optgroup label="Your Goals">
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </optgroup>}
            {todayTasks.length > 0 && <optgroup label="Independent Routines">
              <option value="DAILY_TASK">Daily Routines</option>
            </optgroup>}
          </select>
          <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
        {selectedGoalId && activeList.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select value={selectedHabitId} onChange={e => setSelectedHabitId(e.target.value)}
              disabled={isActive}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '10px 36px 10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', boxShadow: 'var(--shadow-sm)', appearance: 'none', cursor: isActive ? 'not-allowed' : 'pointer', outline: 'none', opacity: isActive ? 0.6 : 1 }}>
              <option value="">— Select Routine/Habit —</option>
              {activeList.map(h => (
                <option key={h.id} value={h.id}>{h.title} ({h.timeSpent || 0}m/{(isDailyTaskMode ? h.targetTime : 15) || 15}m)</option>
              ))}
            </select>
            <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}
      </div>

      {/* Duration Selector */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 6, borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', opacity: isActive ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        {[10, 15, 25, 45, 60].map(m => (
          <button key={m} onClick={() => changeDuration(m)} disabled={isActive}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: isActive ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: duration === m ? 'var(--bg-dark-elem)' : 'transparent', color: duration === m ? 'var(--text-inverted)' : 'var(--text-muted)', transition: 'all 0.2s' }}>
            {m}m
          </button>
        ))}
      </div>

      {/* Circular Timer */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block' }}>
          <circle cx={CX} cy={CY} r={R - 10} fill="var(--bg-app)" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-med)" strokeWidth="8" transform={`rotate(-90 ${CX} ${CY})`} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={time === 0 ? '#22c55e' : 'var(--accent-blue)'} strokeWidth="8"
            strokeDasharray={`${CIRC}`} strokeDashoffset={`${dashOffset}`} strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: isActive ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-2px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: time === 0 ? '#22c55e' : (isActive ? 'var(--accent-blue)' : 'var(--text-muted)'), letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 8, transition: 'color 0.4s' }}>
            {time === 0 ? 'Session Complete' : (isActive ? (selectedHabitId ? 'Logging...' : 'Deep Focus') : 'Ready')}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: -10 }}>
        <button onClick={reset}
          style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-med)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}>
          <RotateCcw size={20} strokeWidth={2.5} />
        </button>
        <button onClick={toggle}
          style={{ width: 76, height: 76, borderRadius: '50%', background: time === 0 ? '#22c55e' : 'var(--accent-blue)', border: 'none', cursor: time === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isActive ? '0 8px 28px rgba(77,124,255,0.45)' : '0 6px 20px rgba(77,124,255,0.3)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', opacity: time === 0 ? 0.7 : 1 }}
          onMouseEnter={e => time > 0 && (e.currentTarget.style.transform = 'translateY(-3px) scale(1.06)')}
          onMouseLeave={e => time > 0 && (e.currentTarget.style.transform = 'none')}>
          {time === 0 ? <Check size={30} color="white" strokeWidth={3} /> : (isActive ? <Pause size={30} fill="white" color="white" /> : <Play size={30} fill="white" color="white" style={{ marginLeft: 4 }} />)}
        </button>
        <div style={{ width: 50, height: 50 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 2 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '12px 14px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ margin: '0 0 3px', fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Logged</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </p>
        </div>
        <div style={{ background: 'var(--accent-blue)', borderRadius: 16, padding: '12px 14px', boxShadow: '0 8px 24px rgba(77,124,255,0.25)' }}>
          <p style={{ margin: '0 0 3px', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
            {String(todayFocusHrs).padStart(2, '0')}h {String(todayFocusMins).padStart(2, '0')}m
          </p>
        </div>
      </div>

      {selectedHabitId && isActive && (
        <div style={{ background: 'var(--accent-blue-light)', borderRadius: 12, padding: '10px 16px', width: '100%', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)' }}>
            ⏱ Focus time is being legally logged to "{selectedItem?.title}" automatically
          </p>
        </div>
      )}
    </div>
  );
};
