import React from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Award, 
  Zap, 
  TrendingUp, 
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

const AIInsights = () => {
  const { 
    aiInsights, 
    recoveryStrategies, 
    dismissInsight, 
    applyRecoveryPlan,
    smartSuggestions,
    theme
  } = useAppContext();

  if (aiInsights.length === 0 && recoveryStrategies.length === 0 && !smartSuggestions) {
    return null;
  }

  const getIcon = (type) => {
    switch (type) {
      case 'burnout': 
        return <AlertTriangle className="text-rose-500 dark:text-rose-400" size={18} />;
      case 'peak_performance': 
        return <TrendingUp className="text-teal-600 dark:text-teal-400" size={18} />;
      case 'recovery': 
        return <ShieldAlert className="text-amber-600 dark:text-amber-400" size={18} />;
      default: 
        return <Sparkles className="text-purple-600 dark:text-purple-400" size={18} />;
    }
  };

  const getPriorityColor = (priority) => {
    const isLight = theme === 'light';
    switch (priority) {
      case 'high':
        return isLight
          ? 'border-rose-200/80 bg-rose-50/90 text-rose-950 hover:border-rose-300 hover:bg-rose-100/50'
          : 'border-rose-500/15 bg-rose-500/5 text-rose-100 hover:border-rose-500/25';
      case 'medium':
        return isLight
          ? 'border-amber-200/80 bg-amber-50/90 text-amber-950 hover:border-amber-300 hover:bg-amber-100/50'
          : 'border-amber-500/15 bg-amber-500/5 text-amber-100 hover:border-amber-500/25';
      default:
        return isLight
          ? 'border-indigo-200/80 bg-indigo-50/90 text-indigo-950 hover:border-indigo-300 hover:bg-indigo-100/50'
          : 'border-indigo-500/15 bg-indigo-500/5 text-indigo-100 hover:border-indigo-500/25';
    }
  };

  const getInsightCardStyle = (type) => {
    const isLight = theme === 'light';
    switch (type) {
      case 'burnout':
        return isLight
          ? 'border-rose-200/80 bg-rose-50/90 text-rose-950 hover:border-rose-300 hover:bg-rose-100/50 border'
          : 'border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-100 hover:border-rose-500/20 border';
      case 'peak_performance':
        return isLight
          ? 'border-teal-200/80 bg-teal-50/90 text-teal-950 hover:border-teal-300 hover:bg-teal-100/50 border'
          : 'border-teal-500/15 bg-teal-500/5 hover:bg-teal-500/10 text-teal-100 hover:border-teal-500/25 border';
      case 'recovery':
        return isLight
          ? 'border-amber-200/80 bg-amber-50/90 text-amber-950 hover:border-amber-300 hover:bg-amber-100/50 border'
          : 'border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10 text-amber-100 hover:border-amber-500/25 border';
      default:
        return isLight
          ? 'border-purple-200/80 bg-purple-50/90 text-purple-950 hover:border-purple-300 hover:bg-purple-100/50 border'
          : 'border-purple-500/15 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 hover:from-purple-500/8 hover:to-indigo-500/8 text-purple-100 hover:border-purple-500/25 border';
    }
  };

  const getMessageColor = (type, priority = null) => {
    const isLight = theme === 'light';
    if (priority === 'high' || type === 'burnout') {
      return isLight ? 'text-rose-900/90 font-black' : 'text-rose-100/75';
    }
    if (priority === 'medium' || type === 'recovery') {
      return isLight ? 'text-amber-900/90 font-black' : 'text-amber-100/75';
    }
    if (type === 'peak_performance') {
      return isLight ? 'text-teal-900/90 font-black' : 'text-teal-100/75';
    }
    return isLight ? 'text-purple-900/90 font-black' : 'text-purple-100/75';
  };

  return (
    <div className="space-y-5 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Premium Header Pill */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/15 w-fit shadow-sm">
        <Sparkles className="text-indigo-500 dark:text-indigo-400 animate-pulse" size={14} />
        <h2 className="text-[10px] font-black tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-500 via-violet-400 to-purple-400 bg-clip-text text-transparent">
          Forge Intelligence Hub
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Real-time Advice (Smart Suggestions) */}
        {smartSuggestions && (
          <div className={`p-5 rounded-3xl border backdrop-blur-md relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${
            theme === 'light'
              ? 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 via-violet-50/60 to-purple-50/60 hover:border-indigo-300'
              : 'border-indigo-500/15 bg-gradient-to-br from-indigo-500/5 via-violet-50/5 to-purple-50/5 hover:border-indigo-200/25'
          }`}>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-indigo-400">
              <Zap size={100} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-300">
                <Zap size={14} className="fill-indigo-500/10 dark:fill-indigo-400/20" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{smartSuggestions.title}</span>
              </div>
              <p className={`text-xs font-black leading-relaxed ${
                theme === 'light' ? 'text-indigo-950/90' : 'text-indigo-100/80'
              }`}>
                {smartSuggestions.message}
              </p>
            </div>
          </div>
        )}

        {/* Recovery Strategies */}
        {recoveryStrategies.map((strategy) => {
          const priorityColor = getPriorityColor(strategy.priority);
          const messageColor = getMessageColor(strategy.type, strategy.priority);
          return (
            <div 
              key={strategy.id}
              className={`p-5 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:shadow-lg ${priorityColor}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-black/25 border border-black/5 dark:border-white/5">
                    {getIcon(strategy.type)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-text-main tracking-tight">{strategy.title}</h3>
                    <p className="text-[9px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                      {strategy.priority === 'high' ? '⚠️ Emergency Action' : '⚡ Recommended Action'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => dismissInsight(strategy.id)}
                  className="text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-lg transition-all"
                  title="Dismiss Strategy"
                >
                  <X size={14} />
                </button>
              </div>
              
              <p className={`text-xs leading-relaxed mb-4 ${messageColor}`}>
                {strategy.message}
              </p>

              {strategy.recoveryPlan && (
                <button 
                  onClick={() => applyRecoveryPlan(strategy.recoveryPlan)}
                  className="w-full py-3 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/25 text-[11px] font-black uppercase tracking-wider text-text-main flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                >
                  {strategy.actionLabel}
                  <ArrowRight size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })}

        {/* Behavior Insights */}
        {aiInsights.map((insight) => {
          const cardStyle = getInsightCardStyle(insight.type);
          const messageColor = getMessageColor(insight.type);
          return (
            <div 
              key={insight.id}
              className={`p-5 rounded-3xl border backdrop-blur-md relative group hover:shadow-lg transition-all duration-300 ${cardStyle}`}
            >
              <button 
                onClick={() => dismissInsight(insight.id)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                title="Dismiss Insight"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-black/5 dark:bg-black/25 border border-black/5 dark:border-white/5">
                  {getIcon(insight.type)}
                </div>
                <h3 className="font-black text-sm text-text-main tracking-tight">{insight.title}</h3>
              </div>
              <p className={`text-xs leading-relaxed ${messageColor}`}>
                {insight.message}
              </p>
              {insight.actionLabel && (
                <button className="mt-4 text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:gap-2.5 transition-all uppercase tracking-widest active:scale-95">
                  {insight.actionLabel} <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsights;
