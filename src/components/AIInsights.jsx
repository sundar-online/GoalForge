import React, { useState } from 'react';
import { useAppContext, useGoals } from '../context/AppContext';
import {
  Sparkles, X, ArrowRight, ShieldAlert, TrendingUp, TrendingDown,
  Lightbulb, Zap, Target, Trophy, Flame, Brain, Star, Calendar,
  ChevronRight, AlertTriangle, CheckCircle2, BarChart2, RefreshCw,
  Award, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Card type → visual config ────────────────────────────────────────────────
const CARD_CONFIG = {
  streak_risk: {
    icon: (p) => p === 'critical' ? <AlertTriangle size={18} /> : <Flame size={18} />,
    colors: {
      critical: 'border-red-500/40 bg-red-500/5',
      high:     'border-amber-500/35 bg-amber-500/5',
      medium:   'border-amber-400/25 bg-amber-400/5',
      low:      'border-yellow-400/20 bg-yellow-400/5',
    },
    iconBg: {
      critical: 'bg-red-500/15 text-red-400',
      high:     'bg-amber-500/15 text-amber-400',
      medium:   'bg-amber-400/15 text-amber-300',
      low:      'bg-yellow-400/15 text-yellow-300',
    },
    pulse: { critical: true, high: false, medium: false, low: false },
  },
  milestone: {
    icon: () => <Trophy size={18} />,
    colors: {
      high:   'border-yellow-500/40 bg-gradient-to-br from-yellow-500/8 to-amber-500/8',
      medium: 'border-yellow-400/30 bg-yellow-400/5',
      low:    'border-yellow-300/20 bg-yellow-300/5',
    },
    iconBg: {
      high:   'bg-yellow-500/20 text-yellow-400',
      medium: 'bg-yellow-400/15 text-yellow-300',
      low:    'bg-yellow-300/10 text-yellow-300',
    },
  },
  recovery: {
    icon: () => <ShieldAlert size={18} />,
    colors: {
      high:   'border-amber-500/35 bg-amber-500/5',
      medium: 'border-amber-400/25 bg-amber-400/5',
      low:    'border-amber-300/15 bg-transparent',
    },
    iconBg: {
      high:   'bg-amber-500/15 text-amber-400',
      medium: 'bg-amber-400/15 text-amber-300',
      low:    'bg-amber-300/10 text-amber-200',
    },
  },
  accuracy: {
    icon: () => <BarChart2 size={18} />,
    colors: {
      high:   'border-indigo-500/35 bg-indigo-500/5',
      medium: 'border-indigo-400/25 bg-indigo-400/5',
      low:    'border-indigo-300/15 bg-transparent',
    },
    iconBg: {
      high:   'bg-indigo-500/15 text-indigo-400',
      medium: 'bg-indigo-400/15 text-indigo-300',
      low:    'bg-indigo-300/10 text-indigo-300',
    },
  },
  goal_intelligence: {
    icon: () => <Target size={18} />,
    colors: {
      high:   'border-violet-500/35 bg-violet-500/5',
      medium: 'border-violet-400/25 bg-violet-400/5',
      low:    'border-violet-300/15 bg-transparent',
    },
    iconBg: {
      high:   'bg-violet-500/15 text-violet-400',
      medium: 'bg-violet-400/15 text-violet-300',
      low:    'bg-violet-300/10 text-violet-300',
    },
  },
  habit_pattern: {
    icon: () => <Brain size={18} />,
    colors: {
      medium: 'border-teal-400/25 bg-teal-400/5',
      low:    'border-teal-300/15 bg-transparent',
    },
    iconBg: {
      medium: 'bg-teal-400/15 text-teal-300',
      low:    'bg-teal-300/10 text-teal-300',
    },
  },
  motivation: {
    icon: () => <Star size={18} />,
    colors: {
      high:   'border-emerald-500/35 bg-emerald-500/5',
      medium: 'border-emerald-400/25 bg-emerald-400/5',
      low:    'border-emerald-300/15 bg-transparent',
    },
    iconBg: {
      high:   'bg-emerald-500/15 text-emerald-400',
      medium: 'bg-emerald-400/15 text-emerald-300',
      low:    'bg-emerald-300/10 text-emerald-300',
    },
  },
  coaching: {
    icon: () => <Lightbulb size={18} />,
    colors: {
      medium: 'border-indigo-400/25 bg-indigo-400/5',
      low:    'border-indigo-300/15 bg-transparent',
    },
    iconBg: {
      medium: 'bg-indigo-400/15 text-indigo-300',
      low:    'bg-indigo-300/10 text-indigo-300',
    },
  },
};

const getCardConfig = (type, priority) => {
  const cfg = CARD_CONFIG[type] || CARD_CONFIG.coaching;
  const colorKey = cfg.colors[priority] ? priority : 'low';
  return {
    border: cfg.colors[colorKey] || 'border-border-light bg-transparent',
    iconBg: cfg.iconBg?.[colorKey] || 'bg-bg-input text-text-muted',
    icon: cfg.icon(priority),
    pulse: cfg.pulse?.[priority] || false,
  };
};

// ── Priority label ────────────────────────────────────────────────────────────
const PRIORITY_BADGE = {
  critical: { label: 'Critical', cls: 'bg-red-500/20 text-red-400' },
  high:     { label: 'High',     cls: 'bg-amber-500/20 text-amber-400' },
  medium:   { label: null,       cls: '' },
  low:      { label: null,       cls: '' },
};

// ── Insight Card ──────────────────────────────────────────────────────────────
const InsightCard = ({ insight, onDismiss, onAction }) => {
  const { border, iconBg, icon, pulse } = getCardConfig(insight.type, insight.priority);
  const badge = PRIORITY_BADGE[insight.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className={`relative p-5 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:shadow-lg group ${border} ${pulse ? 'animate-pulse-border' : ''}`}
    >
      {/* Priority pulse ring for critical */}
      {pulse && (
        <span className="absolute inset-0 rounded-3xl border-2 border-red-500/30 animate-ping pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border border-white/5 shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm text-text-main tracking-tight leading-snug">{insight.title}</h3>
              {badge.label && (
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {insight.dismissible && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="text-text-muted hover:text-text-main hover:bg-white/5 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
            aria-label="Dismiss insight"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <p className="text-xs text-text-muted leading-relaxed mb-3">{insight.message}</p>

      {insight.action && (
        <button
          onClick={() => onAction(insight)}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 text-[11px] font-black uppercase tracking-wider text-text-main flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {insight.action.label}
          <ArrowRight size={12} strokeWidth={2.5} />
        </button>
      )}
    </motion.div>
  );
};

// ── Smart Suggestion Banner ───────────────────────────────────────────────────
const SmartSuggestionBanner = ({ suggestion }) => {
  if (!suggestion) return null;
  return (
    <div className="p-4 rounded-2xl border border-indigo-500/15 bg-gradient-to-r from-indigo-500/8 via-violet-500/5 to-transparent flex items-start gap-3">
      <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
        <Zap size={14} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400 mb-0.5">{suggestion.title}</p>
        <p className="text-xs text-text-muted leading-relaxed">{suggestion.message}</p>
      </div>
    </div>
  );
};

// ── Weekly Review Tab ─────────────────────────────────────────────────────────
const WeeklyReviewTab = ({ weeklyReview }) => {
  if (!weeklyReview) {
    return (
      <div className="py-12 text-center space-y-3">
        <RefreshCw size={28} className="mx-auto text-text-muted opacity-40" />
        <p className="text-sm font-black text-text-main">Generating Weekly Review...</p>
        <p className="text-xs text-text-muted">Analyzing your last 7 days of data.</p>
      </div>
    );
  }

  const deltaColor = weeklyReview.accuracyDelta >= 0 ? 'text-emerald-400' : 'text-red-400';
  const deltaIcon = weeklyReview.accuracyDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;

  return (
    <div className="space-y-4">
      {/* Header stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Weekly Accuracy', value: `${weeklyReview.weeklyAccuracy}%`, sub: weeklyReview.accuracyDelta !== 0 ? `${weeklyReview.accuracyDelta > 0 ? '+' : ''}${weeklyReview.accuracyDelta}% vs last week` : 'Same as last week', subColor: deltaColor, icon: <BarChart2 size={14} /> },
          { label: 'Goals Hit', value: `${weeklyReview.goalsCompletedThisWeek}/${weeklyReview.totalGoals}`, sub: 'goals with activity', subColor: 'text-text-muted', icon: <Target size={14} /> },
          { label: 'Active Days', value: `${weeklyReview.activeDays}/7`, sub: 'days with completions', subColor: 'text-text-muted', icon: <Calendar size={14} /> },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-card border border-border-light rounded-2xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted">{stat.icon}<span className="text-[9px] font-black uppercase tracking-wider">{stat.label}</span></div>
            <p className="text-xl font-black text-text-main tracking-tight leading-none">{stat.value}</p>
            <p className={`text-[9px] font-bold leading-tight ${stat.subColor} flex items-center gap-0.5`}>
              {stat.label === 'Weekly Accuracy' && stat.subColor !== 'text-text-muted' && deltaIcon}{stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Best & Worst Habit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {weeklyReview.bestHabit && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Best Habit</span>
            </div>
            <p className="font-black text-sm text-text-main">{weeklyReview.bestHabit.title}</p>
            <p className="text-xs text-text-muted mt-0.5">{weeklyReview.bestHabit.completedDays}/7 days · {weeklyReview.bestHabit.streak}d streak</p>
          </div>
        )}
        {weeklyReview.worstHabit && weeklyReview.worstHabit.title !== weeklyReview.bestHabit?.title && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Needs Attention</span>
            </div>
            <p className="font-black text-sm text-text-main">{weeklyReview.worstHabit.title}</p>
            <p className="text-xs text-text-muted mt-0.5">{weeklyReview.worstHabit.completedDays}/7 days this week</p>
          </div>
        )}
      </div>

      {/* Streak summary */}
      <div className="flex gap-3">
        <div className="flex-1 bg-bg-card border border-border-light rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400"><Flame size={14} /></div>
          <div><p className="text-xs font-black text-text-main">{weeklyReview.streakGains} habits growing</p><p className="text-[9px] text-text-muted">Active streak momentum</p></div>
        </div>
        {weeklyReview.streakLosses > 0 && (
          <div className="flex-1 bg-bg-card border border-border-light rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400"><AlertTriangle size={14} /></div>
            <div><p className="text-xs font-black text-text-main">{weeklyReview.streakLosses} habits struggling</p><p className="text-[9px] text-text-muted">Need attention this week</p></div>
          </div>
        )}
      </div>

      {/* Recommendation */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5"><Brain size={14} /></div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI Recommendation</p>
          <p className="text-xs text-text-muted leading-relaxed">{weeklyReview.recommendation}</p>
        </div>
      </div>
    </div>
  );
};

// ── Monthly Review Tab ────────────────────────────────────────────────────────
const MonthlyReviewTab = ({ monthlyReview }) => {
  if (!monthlyReview) {
    return (
      <div className="py-12 text-center space-y-3">
        <Clock size={28} className="mx-auto text-text-muted opacity-40" />
        <p className="text-sm font-black text-text-main">Generating Monthly Review...</p>
        <p className="text-xs text-text-muted">Analyzing your habit patterns.</p>
      </div>
    );
  }

  if (!monthlyReview.hasEnoughData) {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <BarChart2 size={28} className="text-indigo-400" />
        </div>
        <div className="space-y-2">
          <p className="font-black text-text-main">Monthly Review Unlocking Soon</p>
          <p className="text-sm text-text-muted max-w-xs mx-auto leading-relaxed">{monthlyReview.message}</p>
        </div>
        {/* Progress bar */}
        <div className="max-w-xs mx-auto">
          <div className="flex justify-between text-[9px] font-black text-text-muted uppercase tracking-wider mb-1.5">
            <span>Progress</span>
            <span>{monthlyReview.daysWithData} / 30 days</span>
          </div>
          <div className="h-2 bg-bg-input rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((monthlyReview.daysWithData / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header accuracy */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Monthly Accuracy</p>
          <p className="text-4xl font-black text-text-main tracking-tighter leading-none">{monthlyReview.monthlyAccuracy}%</p>
          <p className="text-xs text-text-muted mt-1">{monthlyReview.activeDays} active · {monthlyReview.perfectDays} perfect days</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Days Analyzed</p>
          <p className="text-2xl font-black text-text-main">{monthlyReview.daysAnalyzed}</p>
        </div>
      </div>

      {/* Top Habits */}
      {monthlyReview.topHabits?.length > 0 && (
        <div className="bg-bg-card border border-border-light rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} className="text-amber-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Top Performing Habits</p>
          </div>
          {monthlyReview.topHabits.map(h => (
            <div key={h.habitId} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-black text-text-main">{h.title}</p>
                <div className="h-1.5 bg-bg-input rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    style={{ width: `${h.successRate}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-black text-emerald-400 shrink-0">{h.successRate}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Goals needing redesign */}
      {monthlyReview.goalsToRedesign?.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={14} className="text-amber-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Goals to Redesign</p>
          </div>
          {monthlyReview.goalsToRedesign.map(g => (
            <div key={g.goalId} className="flex items-center justify-between">
              <p className="text-xs font-black text-text-main">{g.title}</p>
              <span className="text-[9px] font-black text-amber-400">{g.completionRate}% this month</span>
            </div>
          ))}
        </div>
      )}

      {/* Focus Recommendation */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5"><Brain size={14} /></div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Strategic Focus — Next Month</p>
          <p className="text-xs text-text-muted leading-relaxed">{monthlyReview.focusRecommendation}</p>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AIInsights = () => {
  const {
    aiInsights,
    recoveryStrategies,
    dismissInsight,
    applyRecoveryPlan,
    smartSuggestions,
    weeklyReview,
    monthlyReview,
    settings,
    updateAiSettings
  } = useAppContext();

  const { updateGoal } = useGoals();

  const [activeTab, setActiveTab] = useState('live');

  // Monday featured card: show weekly review as a live insight card on Mondays
  const isMonday = new Date().getDay() === 1;
  const showMondayCard = isMonday && weeklyReview;

  const hasLiveContent = aiInsights.length > 0 || recoveryStrategies.length > 0 || smartSuggestions || showMondayCard || settings.aiSettings?.liveInsightsEnabled === false;

  if (!hasLiveContent && !weeklyReview && !monthlyReview && settings.aiSettings?.weeklyReviewEnabled !== false && settings.aiSettings?.monthlyReviewEnabled !== false) return null;

  const allLiveInsights = [...recoveryStrategies, ...aiInsights];

  const handleAction = (insight) => {
    if (!insight.action?.payload) return;
    const payload = insight.action.payload;
    if (payload.action === 'move_to_missing_dream') {
      updateGoal(payload.goalId, { isMissingDream: true });
      dismissInsight(insight.id);
    } else if (payload.itemId) {
      // Recovery plan
      applyRecoveryPlan(payload, insight.id);
    }
  };

  const TABS = [
    { id: 'live', label: 'Live Insights', count: allLiveInsights.length },
    { id: 'weekly', label: 'Weekly Review', count: null },
    { id: 'monthly', label: 'Monthly Review', count: null },
  ];

  return (
    <div className="space-y-5 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/15 w-fit shadow-sm">
        <Sparkles className="text-indigo-400 animate-pulse" size={14} />
        <h2 className="text-[10px] font-black tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
          Forge Intelligence Hub
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-bg-card border border-border-light shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-bg-dark-elem text-text-inverted shadow-md'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-bg-input text-text-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {settings.aiSettings?.liveInsightsEnabled === false ? (
              <div className="py-12 px-6 text-center bg-bg-card/50 backdrop-blur-xl border border-border-light rounded-[32px] space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <Brain size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-base text-text-main">Live Insights Paused</h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                    Live coaching and dynamic consistency feedback are currently disabled. Turn them back on to get recommendations.
                  </p>
                </div>
                <button
                  onClick={() => updateAiSettings({ liveInsightsEnabled: true })}
                  className="px-6 py-2.5 rounded-xl bg-accent-blue text-white font-black text-xs shadow-md shadow-accent-blue/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  Enable Live Insights
                </button>
              </div>
            ) : (
              <>
                {/* Smart time-of-day suggestion banner */}
                {smartSuggestions && <SmartSuggestionBanner suggestion={smartSuggestions} />}

                {/* Monday weekly review card */}
                {showMondayCard && (
                  <div
                    className="p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 flex items-center gap-4 cursor-pointer hover:bg-indigo-500/10 transition-colors"
                    onClick={() => setActiveTab('weekly')}
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
                      <BarChart2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-text-main">📊 Weekly Review Ready</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Last week: {weeklyReview.weeklyAccuracy}% accuracy · {weeklyReview.activeDays}/7 active days</p>
                    </div>
                    <ChevronRight size={14} className="text-text-muted shrink-0" />
                  </div>
                )}

                {/* Insight cards */}
                {allLiveInsights.length === 0 && !smartSuggestions && !showMondayCard ? (
                  <div className="py-10 text-center space-y-3">
                    <Sparkles size={28} className="mx-auto text-text-muted opacity-40" />
                    <p className="text-sm font-black text-text-main">All Systems Clear</p>
                    <p className="text-xs text-text-muted">No active alerts. Your habit system is running smoothly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {allLiveInsights.map(insight => (
                        <InsightCard
                          key={insight.id}
                          insight={insight}
                          onDismiss={dismissInsight}
                          onAction={handleAction}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'weekly' && (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {settings.aiSettings?.weeklyReviewEnabled === false ? (
              <div className="py-12 px-6 text-center bg-bg-card/50 backdrop-blur-xl border border-border-light rounded-[32px] space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <BarChart2 size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-base text-text-main">Weekly Review Disabled</h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                    Weekly reviews summarize your habits and progress to help you find trends. Enable this option to resume generating weekly reports.
                  </p>
                </div>
                <button
                  onClick={() => updateAiSettings({ weeklyReviewEnabled: true })}
                  className="px-6 py-2.5 rounded-xl bg-accent-blue text-white font-black text-xs shadow-md shadow-accent-blue/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  Enable Weekly Reviews
                </button>
              </div>
            ) : (
              <WeeklyReviewTab weeklyReview={weeklyReview} />
            )}
          </motion.div>
        )}

        {activeTab === 'monthly' && (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {settings.aiSettings?.monthlyReviewEnabled === false ? (
              <div className="py-12 px-6 text-center bg-bg-card/50 backdrop-blur-xl border border-border-light rounded-[32px] space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <Clock size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-base text-text-main">Monthly Review Disabled</h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                    Monthly reviews offer long-term trends and target optimization suggestions. Enable this option to resume tracking monthly statistics.
                  </p>
                </div>
                <button
                  onClick={() => updateAiSettings({ monthlyReviewEnabled: true })}
                  className="px-6 py-2.5 rounded-xl bg-accent-blue text-white font-black text-xs shadow-md shadow-accent-blue/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  Enable Monthly Reviews
                </button>
              </div>
            ) : (
              <MonthlyReviewTab monthlyReview={monthlyReview} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIInsights;
