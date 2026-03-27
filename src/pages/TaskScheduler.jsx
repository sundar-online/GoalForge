import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../hooks/useTasks';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Clock, RefreshCw, Trash2 } from 'lucide-react';

const PRIORITY_STYLES = {
  High:   { color: '#dc2626', bg: '#fef2f2' },
  Medium: { color: '#d97706', bg: '#fffbeb' },
  Low:    { color: '#2563eb', bg: '#eff6ff' },
};

export const TaskScheduler = () => {
  const { 
    allTasks: tasks, 
    addTask, 
    deleteTask, 
    reorderTasks, 
    isTaskDone, 
    toggleTaskComplete 
  } = useTasks();

  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', priority: 'Medium', startTime: '', endTime: '', type: 'single', completionType: 'check' 
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderTasks(items);
  };

  const submitTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    addTask({ ...newTask, status: 'pending', date: new Date().toISOString().split('T')[0], completionType: 'check' });
    setNewTask({ title: '', priority: 'Medium', startTime: '', endTime: '', type: 'single', completionType: 'check' });
    setIsAdding(false);
  };

  const ps = (p) => PRIORITY_STYLES[p] || PRIORITY_STYLES.Low;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Daily Agenda</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Stay on top of your schedule</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{ background: 'var(--bg-dark-elem)', color: 'var(--text-inverted)', border: 'none', borderRadius: 14, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)' }}
        >
          <Plus size={16} strokeWidth={3} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
          {isAdding ? 'Cancel' : 'New Task'}
        </button>
      </header>

      {isAdding && (
        <form onSubmit={submitTask} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px 22px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input autoFocus required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="What needs to be done?" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', border: 'none', borderBottom: '2px solid var(--border-med)', padding: '6px 0 10px', outline: 'none', background: 'transparent' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
              <option value="single">One-time</option>
              <option value="daily">Daily Habit</option>
            </select>
            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          <button type="submit" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Add to Agenda</button>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="agenda">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence initial={false}>
                {(tasks || []).map((task, index) => {
                  const done = isTaskDone(task);
                  return (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', borderRadius: 18, border: `2px solid ${snapshot.isDragging ? 'var(--accent-blue)' : 'var(--border-light)'}`, boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)' }}>
                          <div {...provided.dragHandleProps} style={{ color: 'var(--text-muted)' }}><GripVertical size={18} /></div>
                          <div className={`checkbox-custom ${done ? 'checked' : ''}`} onClick={() => toggleTaskComplete(task.id)}>
                            {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: done ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden' }}>{task.title}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              {task.type === 'daily' && <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '2px 8px', borderRadius: 6 }}>Habit</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                        </motion.div>
                      )}
                    </Draggable>
                  );
                })}
              </AnimatePresence>
              {provided.placeholder}
              {(tasks || []).length === 0 && !isAdding && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Clock size={48} style={{ display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Your agenda is clear.</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

