import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trophy, Plus, TrendingUp, Trash2, ChevronRight } from 'lucide-react';

const TAG_COLORS = {
  'Cognitive Engine': { bg: '#eef2ff', color: '#4d7cff' },
  'Deep Research': { bg: '#fff7ed', color: '#ea580c' },
  'Fitness': { bg: '#f0fdf4', color: '#16a34a' },
  'General': { bg: '#f8fafc', color: '#64748b' },
};

export const Goals = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', progress: 0, tag: 'General', deadline: '' });

  const activeCount = goals.filter(g => g.progress < 100).length;
  const completedCount = goals.filter(g => g.progress === 100).length;

  // Dynamic efficiency = average progress of all goals
  const efficiency = goals.length === 0
    ? 0
    : Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length);

  // Next milestone = goal with earliest deadline that isn't done
  const activeGoals = goals.filter(g => g.progress < 100 && g.deadline);
  const nextMilestone = activeGoals.length > 0 ? activeGoals[0].title : null;

  const tagColor = (tag) => TAG_COLORS[tag] || TAG_COLORS['General'];

  const submitGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    addGoal({ ...newGoal, progress: parseInt(newGoal.progress, 10) || 0 });
    setNewGoal({ title: '', progress: 0, tag: 'General', deadline: '' });
    setIsAdding(false);
  };

  const R = 38;
  const CIRC = 2 * Math.PI * R;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Trophy size={24} color="#facc15" />
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1c2e', letterSpacing: '-0.5px' }}>My Strategic Goals</h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#9ba3b8' }}>Keep your long-term vision sharp.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{ width: 40, height: 40, borderRadius: 12, background: isAdding ? '#fee2e2' : '#f0f2f7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
        >
          <Plus size={20} color={isAdding ? '#ef4444' : '#1a1c2e'} strokeWidth={2.5} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
        </button>
      </div>

      {/* Dark Analytics Card */}
      <div className="dark-card" style={{ padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>TOTAL EFFICIENCY</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>{efficiency}%</span>
            {efficiency >= 50
              ? <TrendingUp size={18} color="#4ade80" strokeWidth={2.5} />
              : <TrendingUp size={18} color="#f87171" strokeWidth={2.5} style={{ transform: 'scaleY(-1)' }} />}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {nextMilestone ? `Next: ${nextMilestone}` : goals.length === 0 ? 'No goals yet' : '🎉 All goals complete!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[{ label: 'Active', val: activeCount }, { label: 'Won', val: completedCount }].map((item, i) => (
            <div key={i} style={{ paddingLeft: 24, marginLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
              <span style={{ fontSize: 30, fontWeight: 900, color: 'white' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Goal Form */}
      {isAdding && (
        <form onSubmit={submitGoal} className="soft-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            autoFocus required
            type="text" value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            placeholder="Goal Title (e.g. Launch MVP)"
            style={{ fontSize: 16, fontWeight: 700, color: '#1a1c2e', border: 'none', borderBottom: '2px solid #eef0f8', padding: '8px 0', outline: 'none', background: 'transparent', width: '100%' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
              <select
                value={newGoal.tag}
                onChange={(e) => setNewGoal({ ...newGoal, tag: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none', cursor: 'pointer' }}
              >
                {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9ba3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deadline</p>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                style={{ width: '100%', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1a1c2e', outline: 'none' }}
              />
            </div>
          </div>
          <button type="submit" style={{ background: '#1a1c2e', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.2s' }}>
            Save Goal
          </button>
        </form>
      )}

      {/* Goal Cards */}
      {goals.map(goal => {
        const tc = tagColor(goal.tag || 'General');
        const goalOffset = CIRC - (CIRC * goal.progress) / 100;
        return (
          <div key={goal.id} className="soft-card soft-card-hover" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {/* Tag + streak row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg, padding: '4px 10px', borderRadius: 999 }}>
                    {goal.tag || 'General'}
                  </span>
                  {goal.streak > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '4px 10px', borderRadius: 999 }}>
                      🔥 {goal.streak} days
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1a1c2e', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  {goal.title}
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#9ba3b8' }}>
                  {goal.deadline || 'Ongoing'}
                </p>

                {/* Progress Slider */}
                <div style={{ marginBottom: 14 }}>
                  <input
                    type="range" min="0" max="100" value={goal.progress}
                    onChange={(e) => updateGoal(goal.id, { progress: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: '#4d7cff' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button style={{ fontSize: 13, fontWeight: 700, color: '#1a1c2e', background: '#f0f2f7', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Review Progress <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    style={{ padding: '8px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Circular progress ring */}
              <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r={R} fill="none" stroke="#eef0f8" strokeWidth="8" />
                  <circle
                    cx="45" cy="45" r={R} fill="none"
                    stroke="#1a1c2e" strokeWidth="8"
                    strokeDasharray={CIRC}
                    strokeDashoffset={goalOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1c2e' }}>{goal.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {goals.length === 0 && !isAdding && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#c0c8dc' }}>
          <Trophy size={48} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No goals yet. Create one!</p>
        </div>
      )}
    </div>
  );
};
