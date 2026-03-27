import React from 'react';
import { useHeatmap } from '../hooks/useHeatmap';

export const WeeklyHeatmap = ({ taskLogs, accuracy }) => {
  const { heatmapCells } = useHeatmap(taskLogs, accuracy);

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '20px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Consistency Heatmap</span>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Real daily activity tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-input)' }} title="0% Completed" />
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#faba2c' }} title="Low (>0%)" />
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-blue)' }} title="Med (≥50%)" />
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} title="High (100%)" />
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
        {heatmapCells.map((cell, i) => (
          <div key={i} title={`${cell.key} - ${cell.completionRate}%`} 
            style={{ 
              width: '100%', 
              aspectRatio: '1/1', 
              borderRadius: 4, 
              background: cell.intensity,
              border: cell.active ? '1px solid var(--accent-blue)' : 'none',
              transition: 'all 0.3s ease',
              cursor: 'help'
            }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>30 days ago</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>Today</span>
      </div>
    </div>
  );
};
