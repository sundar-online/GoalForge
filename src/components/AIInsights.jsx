import React from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Sparkles, 
  CheckCircle2, 
  Target, 
  Award, 
  Zap, 
  TrendingUp, 
  X,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Lightbulb
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
      case 'recovery': 
        return <ShieldAlert className="text-amber-500 dark:text-amber-400" size={18} />;
      case 'improvement': 
        return <TrendingUp className="text-emerald-500 dark:text-emerald-400" size={18} />;
      case 'coaching': 
        return <Sparkles className="text-indigo-500 dark:text-purple-400" size={18} />;
      default: 
        return <Lightbulb className="text-indigo-500 dark:text-purple-400" size={18} />;
    }
  };

  const getInsightCardStyle = (type) => {
    const isLight = theme === 'light';
    switch (type) {
      case 'recovery':
        return isLight
          ? 'border-amber-200 bg-amber-50/70 text-amber-950 hover:border-amber-300 hover:bg-amber-100/50'
          : 'border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-orange-500/5 text-amber-100 hover:border-amber-500/25';
      case 'improvement':
        return isLight
          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100/50'
          : 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 text-emerald-100 hover:border-emerald-500/25';
      case 'coaching':
      default:
        return isLight
          ? 'border-indigo-200 bg-indigo-50/70 text-indigo-950 hover:border-indigo-300 hover:bg-indigo-100/50'
          : 'border-indigo-500/15 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 text-indigo-100 hover:border-indigo-500/25';
    }
  };

  const getMessageColor = (type) => {
    const isLight = theme === 'light';
    switch (type) {
      case 'recovery':
        return isLight ? 'text-amber-900/90 font-medium' : 'text-amber-100/80';
      case 'improvement':
        return isLight ? 'text-emerald-900/90 font-medium' : 'text-emerald-100/80';
      case 'coaching':
      default:
        return isLight ? 'text-indigo-900/90 font-medium' : 'text-indigo-100/80';
    }
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
              <p className={`text-xs leading-relaxed ${
                theme === 'light' ? 'text-indigo-950/80 font-medium' : 'text-indigo-100/80'
              }`}>
                {smartSuggestions.message}
              </p>
            </div>
          </div>
        )}

        {/* Recovery Strategies */}
        {recoveryStrategies.map((strategy) => {
          const cardStyle = getInsightCardStyle(strategy.type);
          const messageColor = getMessageColor(strategy.type);
          return (
            <div 
              key={strategy.id}
              className={`p-5 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:shadow-lg ${cardStyle}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-black/25 border border-black/5 dark:border-white/5">
                    {getIcon(strategy.type)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-text-main tracking-tight">{strategy.title}</h3>
                    <p className="text-[9px] font-black uppercase tracking-wider text-text-muted mt-0.5">
                      {strategy.priority === 'high' ? '🌱 Healing Focus' : '⚡ Guided Restoration'}
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
                <button 
                  onClick={() => dismissInsight(insight.id)}
                  className="mt-4 text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:gap-2.5 transition-all uppercase tracking-widest active:scale-95"
                >
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
