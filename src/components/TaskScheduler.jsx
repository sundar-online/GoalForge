import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Clock, RefreshCw, Trash2 } from 'lucide-react';

const PRIORITY_STYLES = {
  High:   { color: '#dc2626', bg: '#fef2f2' },
  Medium: { color: '#d97706', bg: '#fffbeb' },
  Low:    { color: '#2563eb', bg: '#eff6ff' },
};

export const TaskScheduler = () => {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', startTime: '', endTime: '', type: 'One-time' });

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
    addTask({ ...newTask, status: 'pending', date: new Date().toISOString().split('T')[0] });
    setNewTask({ title: '', priority: 'Medium', startTime: '', endTime: '', type: 'One-time' });
    setIsAdding(false);
  };

  const ps = (p) => PRIORITY_STYLES[p] || PRIORITY_STYLES.Low;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1c2e', letterSpacing: '-0.5px' }}>Daily Agenda</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#9ba3b8' }}>Stay on top of your schedule</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            background: isAdding ? '#1a1c2e' : '#1a1c2e',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '10px 18px', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(26,28,46,0.2)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          <Plus size={16} strokeWidth={3} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
          {isAdding ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={submitTask} className="soft-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            autoFocus required
            type="text" value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="What needs to be done?"
            style={{ fontSize: 16, fontWeight: 700, color: '#1a1c2e', border: 'none', borderBottom: '2px solid #eef0f8', padding: '6px 0 10px', outline: 'none', background: 'transparent', width: '100%' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</p>
              <select value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none', cursor: 'pointer' }}>
                <option>One-time</option>
                <option>Daily</option>
              </select>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priority</p>
              <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none', cursor: 'pointer' }}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Time</p>
              <input type="time" value={newTask.startTime} onChange={e => setNewTask({ ...newTask, startTime: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none' }} />
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End Time</p>
              <input type="time" value={newTask.endTime} onChange={e => setNewTask({ ...newTask, endTime: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none' }} />
            </div>
          </div>

          <button type="submit" style={{ background: '#4d7cff', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(77,124,255,0.3)' }}>
            Add to Agenda
          </button>
        </form>
      )}

      {/* Drag & Drop List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="agenda">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence initial={false}>
                {tasks
                  .slice()
                  .sort((a, b) => {
                    const aDone = a.status === 'done';
                    const bDone = b.status === 'done';
                    if (aDone === bDone) return 0; // Stable sort preserves manual order
                    return aDone ? 1 : -1;
                  })
                  .map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ 
                            layout: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                          }}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="soft-card"
                          style={{
                            ...provided.draggableProps.style,
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxShadow: snapshot.isDragging
                              ? '0 16px 40px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)'
                              : undefined,
                            transform: snapshot.isDragging
                              ? `${provided.draggableProps.style?.transform} scale(1.02)`
                              : provided.draggableProps.style?.transform,
                            zIndex: snapshot.isDragging ? 999 : undefined,
                            border: snapshot.isDragging ? '2px solid #4d7cff' : '2px solid transparent',
                          }}
                        >
                          {/* Drag Handle */}
                          <div {...provided.dragHandleProps} style={{ color: '#d1d5db', cursor: 'grab', flexShrink: 0 }}>
                            <GripVertical size={18} />
                          </div>

                          {/* Checkbox */}
                          <div
                            className={`checkbox-custom ${task.status === 'done' ? 'checked' : ''}`}
                            onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'pending' : 'done' })}
                          >
                            {task.status === 'done' && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          {/* Task Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: task.status === 'done' ? '#adb5c9' : '#1a1c2e', textDecoration: task.status === 'done' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.title}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              {task.startTime && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#9ba3b8' }}>
                                  <Clock size={11} /> {task.startTime}{task.endTime ? ` – ${task.endTime}` : ''}
                                </span>
                              )}
                              {task.type === 'Daily' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '2px 8px', borderRadius: 6 }}>
                                  <RefreshCw size={10} strokeWidth={3} /> Habit {task.streak > 0 && `🔥${task.streak}`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Priority + Delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ps(task.priority).color, background: ps(task.priority).bg, padding: '4px 10px', borderRadius: 8 }}>
                              {task.priority}
                            </span>
                            <button
                              onClick={() => deleteTask(task.id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#d1d5db', display: 'flex', borderRadius: 8, transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
              </AnimatePresence>
              {provided.placeholder}
              {tasks.length === 0 && !isAdding && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#c0c8dc' }}>
                  <Clock size={48} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px' }} />
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
