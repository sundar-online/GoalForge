import React from 'react';
import { useTomorrowPlanner } from '../hooks/useTomorrowPlanner';
import { CalendarDays, ArrowRight, Circle, CheckCircle2 } from 'lucide-react';

const PRIORITY_STYLES = {
  High: { color: '#dc2626', bg: '#fef2f2' },
  Medium: { color: '#d97706', bg: '#fffbeb' },
  Low: { color: '#2563eb', bg: '#eff6ff' },
};

const TaskItem = ({ task, onPush, isTomorrow = false }) => {
  const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Low;
  
  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: isTomorrow ? '#fafbff' : 'transparent', transition: 'background 0.15s' }}
      onMouseEnter={e => !isTomorrow && (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => !isTomorrow && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isTomorrow ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4d7cff', opacity: 0.6 }} /> : <Circle size={18} color="#d1d5db" />}
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1c2e' }}>{task.title}</span>
      </div>
      
      {isTomorrow ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: ps.color, background: ps.bg, padding: '4px 10px', borderRadius: 8 }}>{task.priority}</span>
      ) : (
        <button 
          onClick={() => onPush(task.id)} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4d7cff', background: '#eef2ff', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}
        >
          Push <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export const TomorrowPlanner = () => {
  const { unfinishedToday, tomorrowTasks, pushToTomorrow } = useTomorrowPlanner();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CalendarDays size={24} color="#4d7cff" />
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1c2e', letterSpacing: '-0.5px' }}>Tomorrow's Strategy</h2>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#9ba3b8' }}>Set your intentions before the day begins.</p>
      </div>

      {/* Unfinished Today */}
      <div className="soft-card" style={{ padding: '20px 22px', borderLeft: '4px solid #f97316' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unfinished Today</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '4px 10px', borderRadius: 999 }}>{unfinishedToday.length} Pending</span>
        </div>
        {unfinishedToday.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#c0c8dc' }}>
            <CheckCircle2 size={36} color="#86efac" style={{ display: 'block', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>All caught up! 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unfinishedToday.map(task => <TaskItem key={task.id} task={task} onPush={pushToTomorrow} />)}
          </div>
        )}
      </div>

      {/* Tomorrow Planned */}
      <div className="soft-card" style={{ padding: '20px 22px', borderLeft: '4px solid #4d7cff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tomorrow</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4d7cff', background: '#eef2ff', padding: '4px 10px', borderRadius: 999 }}>{tomorrowTasks.length} Planned</span>
        </div>
        {tomorrowTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#c0c8dc' }}>
            <CalendarDays size={36} style={{ display: 'block', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Nothing planned yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tomorrowTasks.map(task => <TaskItem key={task.id} task={task} isTomorrow />)}
          </div>
        )}
      </div>
    </div>
  );
};

