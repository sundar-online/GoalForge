import React from 'react';

export const WeeklyHeatmap = ({ focusHistory, taskLogs }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  const getIntensity = (dateStr) => {
    if (!focusHistory || !taskLogs) return 'var(--bg-input)';
    const focus = (focusHistory[dateStr] || 0) / 3600; // hours
    const tasks = taskLogs[dateStr] ? Object.values(taskLogs[dateStr]).length : 0;
    const score = focus * 2 + tasks;
    if (score === 0) return 'var(--bg-input)';
    if (score < 2) return 'rgba(34, 197, 94, 0.2)';
    if (score < 5) return 'rgba(34, 197, 94, 0.5)';
    return 'rgba(34, 197, 94, 0.8)';
  };

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return {
      day: days[d.getDay()],
      key,
      active: key === today.toISOString().split('T')[0]
    };
  });

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '20px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Consistency Heatmap</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-input)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(34, 197, 94, 0.8)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>Intensity</span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        {last7Days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: '100%', 
              aspectRatio: '1/1', 
              borderRadius: 8, 
              background: getIntensity(d.key),
              border: d.active ? '2px solid var(--accent-blue)' : 'none',
              transition: 'all 0.3s ease'
            }} />
            <span style={{ fontSize: 10, fontWeight: d.active ? 800 : 500, color: d.active ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              {d.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
