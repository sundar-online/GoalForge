import React from 'react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { Play, Pause, RotateCcw, ChevronDown, Check } from 'lucide-react';

export const FocusMode = () => {
  const {
    goals, todayTasks, duration, time, isActive,
    selectedGoalId, setSelectedGoalId,
    selectedHabitId, setSelectedHabitId,
    selectedGoal, activeList, selectedItem,
    toggle, reset, changeDuration,
    pct, elapsed, todayFocusHrs, todayFocusMins
  } = useFocusTimer();

  const R = 100; const SIZE = 240; const CX = 120; const CY = 120;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', width: '100%', marginBottom: 4 }}>
        <span style={{ display: 'inline-block', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 999, marginBottom: 10 }}>Session Focus</span>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>{selectedItem ? selectedItem.title : 'General Focus'}</h2>
        {selectedGoal && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Goal: {selectedGoal.title}</p>}
      </div>

      {/* Selectors */}
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <select value={selectedGoalId} onChange={e => { setSelectedGoalId(e.target.value); setSelectedHabitId(''); }} disabled={isActive} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', opacity: isActive ? 0.6 : 1, outline: 'none' }}>
            <option value="">— General Focus —</option>
            {goals.length > 0 && <optgroup label="Goals">{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</optgroup>}
            {todayTasks.length > 0 && <optgroup label="Independent Routines"><option value="DAILY_TASK">Daily Routines</option></optgroup>}
          </select>
          <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
        {selectedGoalId && activeList.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select value={selectedHabitId} onChange={e => setSelectedHabitId(e.target.value)} disabled={isActive} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', opacity: isActive ? 0.6 : 1, outline: 'none' }}>
              <option value="">— Select Routine/Habit —</option>
              {activeList.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
            </select>
            <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[10, 15, 25, 45, 60].map(m => (
          <button key={m} onClick={() => changeDuration(m)} disabled={isActive} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: duration === m ? 'var(--bg-dark-elem)' : 'var(--bg-card)', color: duration === m ? 'var(--text-inverted)' : 'var(--text-muted)', transition: 'all 0.2s' }}>{m}m</button>
        ))}
      </div>

      {/* Timer */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-med)" strokeWidth="8" transform={`rotate(-90 ${CX} ${CY})`} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={time === 0 ? '#22c55e' : 'var(--accent-blue)'} strokeWidth="8" strokeDasharray={CIRC} strokeDashoffset={dashOffset} strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`} style={{ transition: isActive ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-2px' }}>{String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 8 }}>{time === 0 ? 'Complete' : (isActive ? 'Focusing' : 'Ready')}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: -10 }}>
        <button onClick={reset} style={{ width: 50, height: 50, borderRadius: 16, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCcw size={20} /></button>
        <button onClick={toggle} style={{ width: 76, height: 76, borderRadius: '50%', background: time === 0 ? '#22c55e' : 'var(--accent-blue)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(77,124,255,0.45)' }}>
          {time === 0 ? <Check size={30} color="white" /> : (isActive ? <Pause size={30} fill="white" color="white" /> : <Play size={30} fill="white" color="white" style={{ marginLeft: 4 }} />)}
        </button>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 2 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '12px 14px', border: '1px solid var(--border-light)' }}>
          <p style={{ margin: '0 0 3px', fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>{Math.floor(elapsed / 60)}m {elapsed % 60}s</p>
        </div>
        <div style={{ background: 'var(--accent-blue)', borderRadius: 16, padding: '12px 14px' }}>
          <p style={{ margin: '0 0 3px', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Day Total</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white' }}>{todayFocusHrs}h {todayFocusMins}m</p>
        </div>
      </div>
    </div>
  );
};

