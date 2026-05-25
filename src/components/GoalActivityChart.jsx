import React, { useMemo, useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { Activity, Zap, TrendingUp, Award } from 'lucide-react';

// ── Palette ──────────────────────────────────────────────────────────────────
// Rich, harmonious hues that look premium against the dark card background.
const PALETTE = [
  '#5a85ff', // accent-blue
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f472b6', // pink
  '#38bdf8', // sky
  '#fb923c', // orange
  '#4ade80', // green
  '#c084fc', // purple
  '#f87171', // rose
];

// ── Activity scorer ───────────────────────────────────────────────────────────
/**
 * Produces a numeric "activity score" for a goal based on:
 *   - habit streaks (weight 3)
 *   - habits completed today (weight 2)
 *   - completedDates count (weight 1)
 *   - at least 1 habit with activity
 */
function scoreGoal(goal) {
  const habits = goal.habits || [];
  if (habits.length === 0) return 0;

  const streakScore = habits.reduce((s, h) => s + (h.streak || 0), 0) * 3;
  const completedToday = habits.filter(h => {
    const today = new Date().toISOString().split('T')[0];
    if (h.lastCompletedDate !== today) return false;
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount ?? 0) >= (h.targetCount ?? 10);
    return (h.timeSpent ?? 0) >= (h.targetTime ?? 15);
  }).length;
  const todayScore = completedToday * 2;
  const historyScore = (goal.completedDates || []).length;

  return streakScore + todayScore + historyScore;
}

// ── Active Sector Renderer ────────────────────────────────────────────────────
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill, payload, percent,
  } = props;

  return (
    <g>
      {/* Glow ring */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.25}
      />
      {/* Main slice */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 8px ${fill}88)` }}
      />
      {/* Centre text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={fill} className="font-black">
        <tspan fontSize={22} fontWeight={900}>{`${(percent * 100).toFixed(0)}%`}</tspan>
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)">
        <tspan fontSize={10} fontWeight={700}>{payload.name}</tspan>
      </text>
    </g>
  );
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, fill, habits, streak, completedCount } = payload[0].payload;
  return (
    <div
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-med)' }}
      className="rounded-2xl px-4 py-3 shadow-2xl min-w-[160px]"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: fill }} />
        <p className="text-sm font-black text-text-main truncate">{name}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span>Activity Share</span>
          <span style={{ color: fill }} className="font-black">{value}%</span>
        </div>
        <div className="flex justify-between gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span>Best Streak</span>
          <span className="text-orange-400 font-black">🔥 {streak}d</span>
        </div>
        <div className="flex justify-between gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span>Habits</span>
          <span className="text-text-main font-black">{habits}</span>
        </div>
        <div className="flex justify-between gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
          <span>Days Done</span>
          <span className="text-emerald-400 font-black">{completedCount}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const GoalActivityChart = ({ goals = [] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Build scored, filtered slice data
  const chartData = useMemo(() => {
    const active = goals.filter(g => !g.isMissingDream && (g.habits || []).length > 0);
    const scored = active
      .map(g => ({
        id: g.id,
        name: g.title,
        tag: g.tag || 'General',
        rawScore: scoreGoal(g),
        habits: (g.habits || []).length,
        streak: Math.max(0, ...(g.habits || []).map(h => h.streak || 0)),
        completedCount: (g.completedDates || []).length,
      }))
      .filter(g => g.rawScore > 0)
      .sort((a, b) => b.rawScore - a.rawScore);

    if (scored.length === 0) return [];

    const totalScore = scored.reduce((s, g) => s + g.rawScore, 0);
    return scored.map((g, i) => ({
      ...g,
      value: Math.round((g.rawScore / totalScore) * 100),
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [goals]);

  const mostActive = chartData[0] || null;
  const hasData = chartData.length > 0;

  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);

  if (!hasData) {
    return (
      <section
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        className="rounded-[32px] p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Activity size={16} className="text-accent-blue" />
          </div>
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">
            Goal Activity
          </h3>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-text-muted font-bold">No activity data yet.</p>
          <p className="text-[10px] text-text-muted mt-1">Start completing habits to see your distribution.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
      className="rounded-[32px] p-5 sm:p-6 shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
            <Activity size={17} className="text-accent-blue" />
          </div>
          <div>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.15em]">Analytics</p>
            <h3 className="text-sm font-black text-text-main tracking-tight leading-none mt-0.5">
              Goal Activity
            </h3>
          </div>
        </div>

        {/* Most Active Badge */}
        {mostActive && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider"
            style={{
              background: `${mostActive.fill}15`,
              borderColor: `${mostActive.fill}40`,
              color: mostActive.fill,
            }}
          >
            <Award size={11} />
            Most Active
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              paddingAngle={3}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.id}
                  fill={entry.fill}
                  stroke="transparent"
                  opacity={activeIndex === index ? 1 : 0.65}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 flex flex-col gap-2">
        {chartData.map((entry, i) => {
          const isTopGoal = i === 0;
          const isHovered = activeIndex === i;
          return (
            <button
              key={entry.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(i)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200
                ${isHovered ? 'bg-bg-input' : 'hover:bg-bg-input/60'}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Color dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-transform"
                  style={{
                    background: entry.fill,
                    boxShadow: isHovered ? `0 0 8px ${entry.fill}` : 'none',
                    transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
                {/* Name */}
                <p
                  className={`text-xs font-black truncate ${isHovered ? 'text-text-main' : 'text-text-muted'} transition-colors`}
                >
                  {entry.name}
                </p>
                {/* Most Active label */}
                {isTopGoal && (
                  <span
                    className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{ background: `${entry.fill}25`, color: entry.fill }}
                  >
                    #1
                  </span>
                )}
              </div>

              {/* Right: value + mini bar */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(16, entry.value * 0.7)}px`,
                    background: entry.fill,
                    opacity: isHovered ? 1 : 0.5,
                  }}
                />
                <span
                  className="text-xs font-black w-8 text-right"
                  style={{ color: isHovered ? entry.fill : 'var(--text-muted)' }}
                >
                  {entry.value}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer Summary ── */}
      {mostActive && (
        <div
          className="mt-4 p-3 rounded-2xl flex items-center gap-3"
          style={{ background: `${mostActive.fill}12`, border: `1px solid ${mostActive.fill}25` }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${mostActive.fill}25` }}
          >
            <TrendingUp size={13} style={{ color: mostActive.fill }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: mostActive.fill }}>
              Most Active Goal
            </p>
            <p className="text-xs font-black text-text-main truncate">{mostActive.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black" style={{ color: mostActive.fill }}>
              {mostActive.value}%
            </p>
            <p className="text-[8px] font-bold text-text-muted uppercase tracking-wider">activity</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default GoalActivityChart;
