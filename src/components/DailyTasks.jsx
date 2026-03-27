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

const TYPE_ICONS = {
  daily:  <Clock size={12} />,
  single: <Calendar size={12} />,
  range:  <CalendarRange size={12} />
};

const TYPE_LABELS = { daily: 'Daily', single: 'Single Date', range: 'Date Range' };

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
  const { tasks, addTask, deleteTask, logTaskTime, toggleTaskComplete } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showLog, setShowLog] = useState(null);
  
  const defaultTask = { title: '', targetTime: 30, priority: 'Medium', type: 'daily', targetDate: TODAY(), startDate: TODAY(), endDate: TODAY() };
  const [newTask, setNewTask] = useState(defaultTask);

  const todayStr = TODAY();
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayStr || t.date === todayStr;
    if (type === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
    return false;
  });

  const doneCount = todayTasks.filter(isTaskDone).length;
  const total = todayTasks.length;
  const accuracy = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  const submit = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    addTask({ ...newTask, targetTime: Number(newTask.targetTime) });
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
        <form onSubmit={submit} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px 22px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input autoFocus required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title..." style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', border: 'none', borderBottom: '2px solid var(--border-med)', padding: '6px 0 10px', outline: 'none', background: 'transparent' }} />
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-input)', padding: 4, borderRadius: 12 }}>
            {['daily', 'single', 'range'].map(type => (
              <button type="button" key={type} onClick={() => setNewTask({ ...newTask, type })} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: newTask.type === type ? 'var(--bg-card)' : 'transparent', color: newTask.type === type ? 'var(--text-main)' : 'var(--text-muted)' }}>{TYPE_LABELS[type]}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {newTask.type === 'single' && (
              <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</p>
              <input type="date" required value={newTask.targetDate} onChange={e => setNewTask({ ...newTask, targetDate: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
            )}
            <div><p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target (min)</p>
            <input type="number" required value={newTask.targetTime} onChange={e => setNewTask({ ...newTask, targetTime: e.target.value })} style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} /></div>
          </div>
          <button type="submit" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Create Task</button>
        </form>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {todayTasks
            .slice().sort((a,b) => isTaskDone(a) - isTaskDone(b))
            .map(task => {
              const tDone = isTaskDone(task);
              const pct = Math.min(100, Math.round(((task.timeSpent || 0) / (task.targetTime || 15)) * 100));

              return (
                <motion.div layout key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '14px 16px', border: `1px solid ${tDone ? 'rgba(34,197,94,0.3)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => toggleTaskComplete(task.id)} 
                      style={{ width: 28, height: 28, borderRadius: 10, background: tDone ? '#22c55e' : 'var(--bg-input)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {tDone ? <Check size={16} color="#fff" strokeWidth={3} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.3 }} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {TYPE_ICONS[task.type || 'daily']} {TYPE_LABELS[task.type || 'daily']}
                        </span>
                        {task.currentStreak > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316' }}>🔥 {task.currentStreak}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tDone ? '#22c55e' : 'var(--text-main)', textDecoration: tDone ? 'line-through' : 'none', opacity: tDone ? 0.7 : 1 }}>{task.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{task.timeSpent || 0}m / {task.targetTime}m target</p>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {!tDone && <button onClick={() => setShowLog(task)} style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#fff' }}>+ Log</button>}
                      <button onClick={() => deleteTask(task.id)} style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <div style={{ background: tDone ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: tDone ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.4s' }} />
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
      
      {showLog && <LogTaskTimeModal task={showLog} onClose={() => setShowLog(null)} logTaskTime={logTaskTime} />}
    </div>
  );
};
