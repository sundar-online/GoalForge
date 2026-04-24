import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { CalendarCheck, Plus, Clock, Trash2, Check, CalendarRange, Calendar } from 'lucide-react';
import { isTaskDone } from '../utils/calculationUtils';
import { TODAY } from '../utils/dateUtils';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-[28px] p-8 w-full max-w-[340px] shadow-float border border-border-light animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-text-main mb-1">Log Time</h3>
        <p className="text-sm text-text-muted font-bold mb-6">{task.title}</p>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Minutes Spent</p>
        <div className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => setMins(m => Math.max(1, m - 5))}
            className="w-12 h-12 rounded-xl bg-bg-input text-text-main text-2xl font-black hover:bg-bg-input/80 transition-colors">−</button>
          <span className="flex-1 text-center text-5xl font-black text-text-main tracking-tighter">{mins}</span>
          <button type="button" onClick={() => setMins(m => m + 5)}
            className="w-12 h-12 rounded-xl bg-bg-input text-text-main text-2xl font-black hover:bg-bg-input/80 transition-colors">+</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="py-4 rounded-xl bg-bg-input text-text-muted font-black text-sm transition-colors">Cancel</button>
          <button type="button" onClick={submit} className="py-4 rounded-xl bg-accent-blue text-white font-black text-sm shadow-md shadow-accent-blue/20 transition-all active:scale-95">Log {mins}m</button>
        </div>
      </div>
    </div>
  );
};

export const DailyTasks = () => {
  const defaultTask = { 
    title: '', 
    type: 'daily', 
    completionType: 'check',
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
    const sType = t.type || 'daily';
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
    <div className="flex flex-col gap-6 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
              <CalendarCheck size={24} className="text-accent-blue" />
            </div>
            Today's Forge
          </h2>
          <p className="text-sm text-text-muted font-medium ml-1">Daily operations and scheduled tasks.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)}
          className={`
            px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all duration-300 shadow-sm border
            ${isAdding ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-bg-dark-elem border-white/5 text-white hover:opacity-90'}
          `}
        >
          <Plus size={18} strokeWidth={3} className={`transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
          {isAdding ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="bg-bg-card rounded-[28px] overflow-hidden shadow-sm border border-border-light grid grid-cols-3">
        {[
          { label: 'Total', val: total },
          { label: 'Done', val: doneCount },
          { label: 'Focus', val: `${accuracy}%`, color: accuracy >= 80 ? 'text-emerald-500' : 'text-accent-blue' }
        ].map((s, i) => (
          <div key={i} className={`p-4 text-center space-y-1 ${i < 2 ? 'border-r border-border-light' : ''}`}>
            <p className={`text-2xl font-black tracking-tighter ${s.color || 'text-text-main'}`}>{s.val}</p>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={submit} 
            className="bg-bg-card rounded-[32px] p-6 flex flex-col gap-6 border border-border-light shadow-float overflow-hidden"
          >
            <input autoFocus required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} 
              placeholder="What are we accomplishing?" 
              className="w-full text-lg font-black text-text-main border-none bg-bg-input p-5 rounded-2xl outline-none placeholder:text-text-muted/40 focus:ring-2 ring-accent-blue/10 transition-all" 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Schedule</p>
                <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none appearance-none hover:bg-bg-input/80 transition-colors">
                  {Object.keys(SCHEDULE_LABELS).map(k => <option key={k} value={k}>{SCHEDULE_LABELS[k]}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Tracking</p>
                <select value={newTask.completionType} onChange={e => setNewTask({ ...newTask, completionType: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none appearance-none hover:bg-bg-input/80 transition-colors">
                  {Object.keys(TYPE_LABELS).map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {newTask.type === 'single' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Date</p>
                  <input type="date" required value={newTask.targetDate} onChange={e => setNewTask({ ...newTask, targetDate: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none" />
                </div>
              )}
              {newTask.type === 'range' && (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Start</p>
                    <input type="date" required value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">End</p>
                    <input type="date" required value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none" />
                  </div>
                </>
              )}
              {newTask.completionType === 'time' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Goal (min)</p>
                  <input type="number" required value={newTask.targetTime} onChange={e => setNewTask({ ...newTask, targetTime: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none" />
                </div>
              )}
              {newTask.completionType === 'count' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Target Units</p>
                  <input type="number" required value={newTask.targetCount} onChange={e => setNewTask({ ...newTask, targetCount: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 text-sm font-bold text-text-main outline-none" />
                </div>
              )}
            </div>
            
            <button type="submit" className="w-full bg-accent-blue text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-accent-blue/30 hover:opacity-90 active:scale-[0.98] transition-all">
              Create Task
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {todayTasks
            .slice().sort((a,b) => isTaskDone(a) - isTaskDone(b))
              .map(task => {
                const tDone = isTaskDone(task);
                const cType = task.completionType || task.type || 'check';
                const isTime = cType === 'time';
                const isCount = cType === 'count';
                const isCheck = cType === 'check';

                const target = isCount ? (task.targetCount || 10) : (task.targetTime || 30);
                const current = isCount ? (task.currentCount || 0) : (task.timeSpent || 0);
                const pct = isCheck ? 0 : Math.min(100, Math.round((current / (target || 1)) * 100));
                const sType = task.type || 'daily';

                return (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className={`
                      bg-bg-card rounded-[28px] p-5 border transition-all duration-300 flex flex-col gap-4
                      ${tDone ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70' : 'border-border-light shadow-sm hover:border-border-med'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleTaskComplete(task.id)} 
                        className={`
                          w-10 h-10 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-200
                          ${tDone ? 'bg-emerald-500 border-emerald-500 scale-95' : 'bg-bg-input border-border-med hover:border-accent-blue'}
                        `}
                      >
                        {tDone ? <Check size={20} className="text-white" strokeWidth={3} /> : (isCheck ? null : <div className="w-2 h-2 rounded-full bg-text-muted/20" />)}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-accent-blue-light text-accent-blue px-2 py-0.5 rounded-md flex items-center gap-1.5">
                            {SCHEDULE_ICONS[sType]} {SCHEDULE_LABELS[sType]}
                          </span>
                          {task.currentStreak > 0 && <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md">🔥 {task.currentStreak}d</span>}
                        </div>
                        <p className={`text-base font-black tracking-tight truncate ${tDone ? 'text-emerald-600 line-through' : 'text-text-main'}`}>{task.title}</p>
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide mt-0.5">
                          {isCheck ? (tDone ? 'Completed' : 'Priority Task') : `${current} / ${target} ${isCount ? 'units' : 'mins'}`}
                        </p>
                      </div>

                      <div className="flex gap-2 items-center">
                        {isCount ? (
                          <div className="flex bg-bg-input rounded-xl border border-border-light overflow-hidden">
                            <button onClick={() => updateTaskCount(task.id, -1)} className="px-3 py-1.5 text-text-main font-black hover:bg-border-light">−</button>
                            <button onClick={() => updateTaskCount(task.id, 1)} className="px-3 py-1.5 text-accent-blue font-black border-l border-border-light hover:bg-border-light transition-colors">+</button>
                          </div>
                        ) : (isTime && !tDone) && (
                          <button onClick={() => setShowLog(task)} className="px-4 py-2 rounded-xl bg-accent-blue text-white text-[11px] font-black shadow-md shadow-accent-blue/20 active:scale-95 transition-all">+ Log</button>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="w-9 h-9 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    
                    {!isCheck && (
                      <div className="bg-bg-input rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${tDone ? 'bg-emerald-500' : 'bg-accent-blue'}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
        </AnimatePresence>
        
        {todayTasks.length === 0 && !isAdding && (
          <div className="py-24 flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 rounded-full bg-bg-input flex items-center justify-center mb-6">
               <CalendarCheck size={32} className="text-text-muted/30" />
             </div>
             <p className="text-lg font-black text-text-muted tracking-tight">Your forge is silent.</p>
             <p className="text-sm font-bold text-text-muted/50 mt-1">Add a task to start crushing your day.</p>
             <button onClick={() => setIsAdding(true)} className="mt-8 px-8 py-4 rounded-2xl bg-accent-blue text-white font-black shadow-lg shadow-accent-blue/20 hover:opacity-90 transition-all active:scale-95">Add First Task</button>
          </div>
        )}
      </div>
      
      {showLog && <LogTaskTimeModal task={showLog} onClose={() => setShowLog(null)} logTaskTime={logTaskTime} />}
    </div>
  );
};
