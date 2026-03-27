import React from 'react';
import { TrendingUp, TrendingDown, Award, Clock, Calendar } from 'lucide-react';

export const WeeklyReportCard = ({ report }) => {
  const { weeklyAccuracy, totalFocusTime, bestDay, improvement } = report;
  const focusHrs = Math.floor(totalFocusTime / 3600);
  const focusMins = Math.floor((totalFocusTime % 3600) / 60);

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 28, padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Weekly Performance</h3>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-blue)', background: 'var(--accent-blue-light)', padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last 7 Days</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-app)', borderRadius: 20, padding: '16px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Award size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</span>
          </div>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 950, color: 'var(--text-main)' }}>{weeklyAccuracy}%</p>
          {improvement !== 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 800, color: improvement > 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
              {improvement > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(improvement)}% vs last week
            </p>
          )}
        </div>

        <div style={{ background: 'var(--bg-app)', borderRadius: 20, padding: '16px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Clock size={14} color="#f97316" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Focus Time</span>
          </div>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 950, color: 'var(--text-main)' }}>{focusHrs}h {focusMins}m</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Deep work total</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-input)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Best Day</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent-blue)' }}>{bestDay}</span>
      </div>
    </div>
  );
};
