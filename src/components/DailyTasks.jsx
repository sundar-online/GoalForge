import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { CalendarCheck, Plus, Clock, Trash2, Check, CalendarRange, Calendar } from 'lucide-react';

const PRIORITY = {
  High:   { color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' },
  Medium: { color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' },
  Low:    { color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
};

const TODAY = () => new Date().toISOString().split('T')[0];

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[15, 25, 30, 45, 60].map(m => (
            <button type="button" key={m} onClick={() => setMins(m)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mins === m ? 'var(--accent-blue)' : 'var(--bg-input)', color: mins === m ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {m}m
            </button>
          ))}
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
  const { todayTasks, addTask, deleteTask, logTaskTime } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [showLog, setShowLog] = useState(null);
  
  const defaultTask = { title: '', targetTime: 30, priority: 'Medium', type: 'daily', targetDate: TODAY(), startDate: TODAY(), endDate: TODAY() };
  const [newTask, setNewTask] = useState(defaultTask);

  const isTaskDone = (t) => (t.timeSpent || 0) >= (t.targetTime || 15);
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

  const ps = (p) => PRIORITY[p] || PRIORITY.Medium;

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
          style={{ background: isAdding ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-dark-elem)', color: isAdding ? '#ef4444' : 'var(--text-inverted)', border: 'none', borderRadius: 14, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
          <Plus size={16} strokeWidth={3} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
          {isAdding ? 'Cancel' : '+ Task'}
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
        {[
          { label: 'Total', val: total },
          { label: 'Completed', val: doneCount },
          { label: 'Accuracy', val: `${accuracy}%` },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '14px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-light)' : 'none' }}>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: i === 2 ? (accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? 'var(--accent-blue)' : '#f97316') : 'var(--text-main)', letterSpacing: '-0.5px' }}>{s.val}</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={submit} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px 22px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border-light)' }}>
          <input autoFocus required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', border: 'none', borderBottom: '2px solid var(--border-med)', padding: '6px 0 10px', outline: 'none', background: 'transparent' }} />
          
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schedule Type</p>
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-input)', padding: 4, borderRadius: 12 }}>
              {['daily', 'single', 'range'].map(type => (
                <button type="button" key={type} onClick={() => setNewTask({ ...newTask, type })}
                  style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: newTask.type === type ? 'var(--bg-card)' : 'transparent', color: newTask.type === type ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: newTask.type === type ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {newTask.type === 'single' && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</p>
                <input type="date" required value={newTask.targetDate} onChange={e => setNewTask({ ...newTask, targetDate: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', colorScheme: 'var(--bg-app) === "#0b0c10" ? "dark" : "light"' }} />
              </div>
            )}
            {newTask.type === 'range' && (
              <>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Date</p>
                  <input type="date" required value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', colorScheme: 'var(--bg-app) === "#0b0c10" ? "dark" : "light"' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End Date</p>
                  <input type="date" required value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', colorScheme: 'var(--bg-app) === "#0b0c10" ? "dark" : "light"' }} />
                </div>
              </>
            )}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{newTask.type === 'daily' ? 'Target (mins/day)' : 'Target Duration (mins)'}</p>
              <input type="number" min="1" required value={newTask.targetTime} onChange={e => setNewTask({ ...newTask, targetTime: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none' }} />
            </div>
            {newTask.type !== 'range' && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priority</p>
                <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}>
                  {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>
          
          <button type="submit" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(77,124,255,0.3)', marginTop: 4 }}>
            Create Task
          </button>
        </form>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {todayTasks
            .slice() // Create a copy before sorting
            .sort((a, b) => {
              const aDone = isTaskDone(a);
              const bDone = isTaskDone(b);
              if (aDone === bDone) return 0; // Preserve original relative order
              return aDone ? 1 : -1; // Move done tasks to the bottom
            })
            .map(task => {
              const typeStr = task.type || 'daily';
              const tDone = isTaskDone(task);
              const pct = Math.min(100, Math.round(((task.timeSpent || 0) / (task.targetTime || 15)) * 100));

              return (
                <motion.div 
                  layout
                  key={task.id} 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    layout: { type: "spring", stiffness: 350, damping: 25 },
                    opacity: { duration: 0.2 }
                  }}
                  style={{
                    background: 'var(--bg-card)', borderRadius: 18, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    boxShadow: 'var(--shadow-sm)',
                    border: `1px solid ${tDone ? 'rgba(34,197,94,0.3)' : 'var(--border-light)'}`,
                    transition: 'border-color 0.3s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: tDone ? '#22c55e' : 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      {tDone ? <Check size={14} color="#fff" strokeWidth={3} /> : <Clock size={14} color="var(--text-muted)" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--bg-input)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {TYPE_ICONS[typeStr]} {TYPE_LABELS[typeStr]}
                        </span>
                        {typeStr === 'single' && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{task.targetDate}</span>}
                        {typeStr === 'range' && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{task.startDate} to {task.endDate}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tDone ? '#22c55e' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                        {task.title}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {task.timeSpent || 0}m / {task.targetTime}m target
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {!tDone && (
                        <button onClick={() => setShowLog(task)}
                          style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                          + Log
                        </button>
                      )}
                      <button onClick={() => deleteTask(task.id)}
                        style={{ width: 30, height: 30, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Task Progress Bar */}
                  <div style={{ background: tDone ? 'rgba(34,197,94,0.2)' : 'var(--border-med)', borderRadius: 999, height: 5, overflow: 'hidden', marginTop: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: tDone ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.5s ease' }} />
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
        {todayTasks.length === 0 && !isAdding && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <CalendarCheck size={44} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No tasks for today. Create one!</p>
          </div>
        )}
      </div>
      
      {showLog && <LogTaskTimeModal task={showLog} onClose={() => setShowLog(null)} logTaskTime={logTaskTime} />}
    </div>
  );
};
