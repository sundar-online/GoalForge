import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../context/AppContext';
import { CalendarCheck, Plus, Clock, Trash2, Check, CalendarRange, Calendar, Cloud } from 'lucide-react';
import { isTaskDone } from '../utils/calculationUtils';
import { TODAY } from '../utils/dateUtils';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

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
    endDate: TODAY(),
    reminderEnabled: false,
    reminderTime: '08:00'
  };
  const [newTask, setNewTask] = useState(defaultTask);
  const [isAdding, setIsAdding] = useState(false);
  const [showLog, setShowLog] = useState(null);
  const [deletingTaskItem, setDeletingTaskItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [completedLimit, setCompletedLimit] = useState(5);

  const { tasks, addTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount } = useTasks();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  // Filter tasks based on search query
  const filteredTasks = todayTasks.filter(t => {
    if (!debouncedQuery.trim()) return true;
    return t.title.toLowerCase().includes(debouncedQuery.toLowerCase());
  });

  const activeTasks = filteredTasks.filter(t => !isTaskDone(t));
  const completedTasks = filteredTasks.filter(t => isTaskDone(t));
  const visibleCompletedTasks = completedTasks.slice(0, completedLimit);

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
          <div key={i} className={`p-2.5 sm:p-4 text-center space-y-1 ${i < 2 ? 'border-r border-border-light' : ''}`}>
            <p className={`text-lg min-[360px]:text-2xl font-black tracking-tighter ${s.color || 'text-text-main'}`}>{s.val}</p>
            <p className="text-[8px] min-[360px]:text-[9px] font-black text-text-muted uppercase tracking-widest">{s.label}</p>
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

            {/* Reminder Section */}
            <div className="flex items-center gap-4 p-5 bg-bg-input rounded-2xl border border-border-light/50 transition-all hover:border-accent-blue/20">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-accent-blue" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Reminder Alarm</p>
                <p className="text-xs font-bold text-text-main">Notify me at specific time</p>
              </div>
              <div className="flex items-center gap-4">
                {newTask.reminderEnabled && (
                  <input 
                    type="time" 
                    value={newTask.reminderTime} 
                    onChange={e => setNewTask({...newTask, reminderTime: e.target.value})} 
                    className="bg-white/5 dark:bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm font-black text-accent-blue outline-none animate-in fade-in" 
                  />
                )}
                <button 
                  type="button" 
                  onClick={() => setNewTask({...newTask, reminderEnabled: !newTask.reminderEnabled})}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${newTask.reminderEnabled ? 'bg-accent-blue' : 'bg-bg-dark-elem/20 border border-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${newTask.reminderEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
            
            <button type="submit" className="w-full bg-accent-blue text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-accent-blue/30 hover:opacity-90 active:scale-[0.98] transition-all">
              Create Task
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      {todayTasks.length > 0 && (
        <div className="relative">
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks instantly..."
            className="w-full text-sm font-black text-text-main bg-bg-card border border-border-light hover:border-border-med focus:border-accent-blue/30 p-4 pl-12 rounded-2xl outline-none transition-all placeholder:text-text-muted/40"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-rose-500 font-bold text-xs"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="flex flex-col gap-4">
        {filteredTasks.length === 0 && todayTasks.length > 0 && (
          <div className="py-12 text-center text-text-muted font-bold">
            No tasks match your search criteria.
          </div>
        )}

        <AnimatePresence initial={false}>
          {/* Active / Uncompleted Tasks */}
          {activeTasks.map(task => {
            const todayStr = TODAY();
            const isDaily = (task.schedule_type || task.type) === 'daily';
            const hasBeenActiveToday = task.lastActiveDate === todayStr;
            const tDone = false;
            const cType = task.completionType || task.type || 'check';
            const isTime = cType === 'time';
            const isCount = cType === 'count';
            const isCheck = cType === 'check';

            let target = 0;
            let current = 0;
            if (isDaily && !hasBeenActiveToday) {
              current = 0;
              if (task.isRecovering && task.originalTarget !== undefined) {
                target = task.originalTarget;
              } else {
                target = isCount ? (task.targetCount ?? 10) : (task.targetTime ?? 30);
              }
            } else {
              target = isCount ? (task.targetCount ?? 10) : (task.targetTime ?? 30);
              current = isCount ? (task.currentCount || 0) : (task.timeSpent || 0);
            }
            const pct = isCheck ? 0 : Math.min(100, Math.round((current / (target || 1)) * 100));
            const sType = task.type || 'daily';

            return (
              <motion.div layout key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-card rounded-[28px] p-3.5 sm:p-5 border border-border-light shadow-sm hover:border-border-med transition-all duration-300 flex flex-col gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <button onClick={() => toggleTaskComplete(task.id)} 
                    className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl border-2 flex items-center justify-center bg-bg-input border-border-med hover:border-accent-blue transition-all duration-200"
                  >
                    {isCheck ? null : <div className="w-1.5 h-1.5 rounded-full bg-text-muted/20" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-accent-blue-light text-accent-blue px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        {SCHEDULE_ICONS[sType]} {SCHEDULE_LABELS[sType]}
                      </span>
                      {task.currentStreak > 0 && <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">🔥 {task.currentStreak}d</span>}
                      {task.syncPending && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                          <Cloud size={10} /> Syncing
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-black tracking-tight truncate text-text-main">{task.title}</p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-text-muted uppercase tracking-wide mt-0.5">
                      {isCheck ? 'Priority Task' : `${current} / ${target} ${isCount ? 'units' : 'mins'}`}
                    </p>
                  </div>

                  <div className="flex gap-1.5 sm:gap-2 items-center shrink-0">
                    {isCount ? (
                      <div className="flex bg-bg-input rounded-xl border border-border-light overflow-hidden h-7 sm:h-9">
                        <button onClick={() => updateTaskCount(task.id, -1)} className="px-2 py-0.5 sm:px-3 sm:py-1.5 text-text-main font-black hover:bg-border-light text-xs sm:text-sm">−</button>
                        <button onClick={() => updateTaskCount(task.id, 1)} className="px-2 py-0.5 sm:px-3 sm:py-1.5 text-accent-blue font-black border-l border-border-light hover:bg-border-light transition-colors text-xs sm:text-sm">+</button>
                      </div>
                    ) : (isTime && !tDone) && (
                      <button onClick={() => setShowLog(task)} className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-accent-blue text-white text-[10px] sm:text-[11px] font-black shadow-md shadow-accent-blue/20 active:scale-95 transition-all">+ Log</button>
                    )}
                    <button onClick={() => setDeletingTaskItem(task)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center" title="Delete Task"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                {!isCheck && (
                  <div className="bg-bg-input rounded-full h-1.5 overflow-hidden">
                    <div className="h-full transition-all duration-700 bg-accent-blue" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Completed / Done Tasks (Lazy Loaded / Windowed) */}
          {visibleCompletedTasks.map(task => {
            const todayStr = TODAY();
            const isDaily = (task.schedule_type || task.type) === 'daily';
            const hasBeenActiveToday = task.lastActiveDate === todayStr;
            const tDone = true;
            const cType = task.completionType || task.type || 'check';
            const isTime = cType === 'time';
            const isCount = cType === 'count';
            const isCheck = cType === 'check';

            let target = 0;
            let current = 0;
            if (isDaily && !hasBeenActiveToday) {
              current = 0;
              if (task.isRecovering && task.originalTarget !== undefined) {
                target = task.originalTarget;
              } else {
                target = isCount ? (task.targetCount ?? 10) : (task.targetTime ?? 30);
              }
            } else {
              target = isCount ? (task.targetCount ?? 10) : (task.targetTime ?? 30);
              current = isCount ? (task.currentCount || 0) : (task.timeSpent || 0);
            }
            const pct = isCheck ? 0 : Math.min(100, Math.round((current / (target || 1)) * 100));
            const sType = task.type || 'daily';

            return (
              <motion.div layout key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-emerald-500/5 rounded-[28px] p-3.5 sm:p-5 border border-emerald-500/30 opacity-70 transition-all duration-300 flex flex-col gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <button onClick={() => toggleTaskComplete(task.id)} 
                    className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl border-2 flex items-center justify-center bg-emerald-500 border-emerald-500 scale-95 transition-all duration-200"
                  >
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-accent-blue-light text-accent-blue px-1.5 py-0.5 rounded-md flex items-center gap-1.5">
                        {SCHEDULE_ICONS[sType]} {SCHEDULE_LABELS[sType]}
                      </span>
                      {task.currentStreak > 0 && <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">🔥 {task.currentStreak}d</span>}
                      {task.syncPending && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                          <Cloud size={10} /> Syncing
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-black tracking-tight truncate text-emerald-600 line-through">{task.title}</p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-text-muted uppercase tracking-wide mt-0.5">
                      Completed
                    </p>
                  </div>

                  <div className="flex gap-1.5 sm:gap-2 items-center shrink-0">
                    <button onClick={() => setDeletingTaskItem(task)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center" title="Delete Task"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                {!isCheck && (
                  <div className="bg-bg-input rounded-full h-1.5 overflow-hidden">
                    <div className="h-full transition-all duration-700 bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Lazy Loading Load More Button */}
        {completedTasks.length > completedLimit && (
          <button 
            type="button"
            onClick={() => setCompletedLimit(prev => prev + 10)}
            className="w-full py-4 rounded-2xl bg-bg-card border border-border-light hover:border-border-med text-text-muted hover:text-text-main text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Show {completedTasks.length - completedLimit} More Completed Tasks</span>
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md text-[10px]">+{completedTasks.length - completedLimit}</span>
          </button>
        )}
        
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

      <DeleteConfirmationModal
        isOpen={!!deletingTaskItem}
        onClose={() => setDeletingTaskItem(null)}
        onConfirm={() => {
          if (deletingTaskItem) {
            deleteTask(deletingTaskItem.id);
          }
        }}
        title="Delete Task"
        itemName={deletingTaskItem?.title}
        message="Are you sure you want to delete this Task? This action cannot be undone and will permanently remove all related completion history and streak statistics."
      />
    </div>
  );
};
