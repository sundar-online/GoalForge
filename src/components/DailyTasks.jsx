import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { CalendarCheck, Plus, Clock, Trash2, Check, CalendarRange, Calendar } from 'lucide-react';
import { isTaskDone } from '../utils/calculationUtils';
import { TODAY } from '../utils/dateUtils';

const PRIORITY = {
  High:   { color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' },
  Medium: { color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' },
  Low:    { color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
};

const SCHEDULE_ICONS = {
  daily:  <Clock size={12} />,
  single: <Calendar size={12} />,
  range:  <CalendarRange size={12} />
};

const SCHEDULE_LABELS = { daily: 'Daily', single: 'Single', range: 'Range' };
const TYPE_LABELS = { time: 'Time', check: 'Check', count: 'Count' };

// ── Log Time Modal ──────────────────────────────────────────
const LogTaskTimeModal = ({ task, onClose, logTaskTime }) => {
  const [mins, setMins] = useState(25);
  const submit = () => { logTaskTime(task.id, mins); onClose(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Log Time</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>{task.title}</p>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Minutes Spent</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button type="button" onClick={() => setMins(m => Math.max(1, m - 5))}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>−</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 40, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-2px' }}>{mins}</span>
          <button type="button" onClick={() => setMins(m => m + 5)}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>+</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--bg-input)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button type="button" onClick={submit}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--accent-blue)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', boxShadow: '0 4px 14px rgba(77,124,255,0.3)' }}>
            Log {mins}m
          </button>
        </div>
      </div>
    </div>
  );
};

export const DailyTasks = () => {
  const defaultTask = { 
    title: '', 
    type: 'check', 
    schedule_type: 'daily',
    targetTime: 30, 
    targetCount: 10,
    priority: 'Medium', 
    targetDate: TODAY(), 
    startDate: TODAY(), 
    endDate: TODAY() 
  };
  const [newTask, setNewTask] = useState(defaultTask);
  const [isAdding, setIsAdding] = useState(false);
  const [showLog, setShowLog] = useState(null);

  const { tasks, addTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount } = useAppContext();

  const todayStr = TODAY();
  const todayTasks = tasks.filter(t => {
    const sType = t.schedule_type || t.type || 'daily';
    if (sType === 'daily') return true;
    if (sType === 'single') return (t.targetDate || t.date) === todayStr;
    if (sType === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
    return false;
  });

  const doneCount = todayTasks.filter(isTaskDone).length;
  const total = todayTasks.length;
  const accuracy = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  const submit = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    addTask({ 
      ...newTask, 
      targetTime: Number(newTask.targetTime),
      targetCount: Number(newTask.targetCount)
    });
    setNewTask(defaultTask);
    setIsAdding(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={22} color="var(--accent-blue)" /> Today's Tasks
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Your scheduled items for today.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)}
          style={{ background: isAdding ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-dark-elem)', color: isAdding ? '#ef4444' : 'var(--text-inverted)', border: 'none', borderRadius: 14, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} strokeWidth={3} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
          {isAdding ? 'Cancel' : '+ Task'}
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
        {[{ label: 'Total', val: total }, { label: 'Completed', val: doneCount }, { label: 'Accuracy', val: `${accuracy}%` }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '14px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-light)' : 'none' }}>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: i === 2 ? (accuracy >= 80 ? '#22c55e' : 'var(--accent-blue)') : 'var(--text-main)', letterSpacing: '-0.5px' }}>{s.val}</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={submit} style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <input autoFocus required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="What are we accomplishing?" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', border: 'none', background: 'var(--bg-input)', padding: '14px 18px', borderRadius: 16, outline: 'none' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</p>
              <select value={newTask.schedule_type} onChange={e => setNewTask({ ...newTask, schedule_type: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none' }}>
                {Object.keys(SCHEDULE_LABELS).map(k => <option key={k} value={k}>{SCHEDULE_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking Mode</p>
              <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none' }}>
                {Object.keys(TYPE_LABELS).map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {newTask.schedule_type === 'single' && (
              <div><p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</p>
              <input type="date" required value={newTask.targetDate} onChange={e => setNewTask({ ...newTask, targetDate: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
            )}
            {newTask.schedule_type === 'range' && (
              <>
                <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start</p>
                <input type="date" required value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
                <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>End</p>
                <input type="date" required value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
              </>
            )}
            {newTask.type === 'time' && (
              <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Goal (min)</p>
              <input type="number" required value={newTask.targetTime} onChange={e => setNewTask({ ...newTask, targetTime: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
            )}
            {newTask.type === 'count' && (
              <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Units</p>
              <input type="number" required value={newTask.targetCount} onChange={e => setNewTask({ ...newTask, targetCount: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 12, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
            )}
          </div>
          <button type="submit" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(77,124,255,0.3)' }}>Create Task</button>
        </form>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {todayTasks
            .slice().sort((a,b) => isTaskDone(a) - isTaskDone(b))
              .map(task => {
                const tDone = isTaskDone(task);
                const isTime = task.type === 'time';
                const isCount = task.type === 'count';
                const isCheck = task.type === 'check';

                const target = isCount ? (task.targetCount || 10) : (task.targetTime || 30);
                const current = isCount ? (task.currentCount || 0) : (task.timeSpent || 0);
                const pct = isCheck ? 0 : Math.min(100, Math.round((current / (target || 1)) * 100));
                const sType = task.schedule_type || task.type || 'daily';

                return (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '16px 18px', border: `1px solid ${tDone ? 'rgba(34,197,94,0.3)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <button onClick={() => toggleTaskComplete(task.id)} 
                        style={{ width: 32, height: 32, borderRadius: 11, background: tDone ? '#22c55e' : 'var(--bg-input)', border: `2px solid ${tDone ? '#22c55e' : 'var(--border-med)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {tDone ? <Check size={18} color="#fff" strokeWidth={3} /> : (isCheck ? null : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.2 }} />)}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {SCHEDULE_ICONS[sType]} {SCHEDULE_LABELS[sType]}
                          </span>
                          {task.currentStreak > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 4 }}>🔥 {task.currentStreak}d</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: tDone ? '#22c55e' : 'var(--text-main)', textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.7 : 1 }}>{task.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                          {isCheck ? (tDone ? 'Completed' : 'Status: Pending') : `${current} / ${target} ${isCount ? 'units' : 'mins'}`}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isCount ? (
                          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                            <button onClick={() => updateTaskCount(task.id, -1)} style={{ padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 800 }}>−</button>
                            <button onClick={() => updateTaskCount(task.id, 1)} style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 800 }}>+</button>
                          </div>
                        ) : (isTime && !tDone) && (
                          <button onClick={() => setShowLog(task)} style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#fff' }}>+ Log</button>
                        )}
                        <button onClick={() => deleteTask(task.id)} style={{ width: 34, height: 34, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={18} /></button>
                      </div>
                    </div>
                    
                    {!isCheck && (
                      <div style={{ background: tDone ? 'rgba(34,197,94,0.15)' : 'var(--border-med)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: tDone ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
        </AnimatePresence>
      </div>
      
      {showLog && <LogTaskTimeModal task={showLog} onClose={() => setShowLog(null)} logTaskTime={logTaskTime} />}
    </div>
  );
};
