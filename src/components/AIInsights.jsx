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
    smartSuggestions 
  } = useAppContext();

  if (aiInsights.length === 0 && recoveryStrategies.length === 0 && !smartSuggestions) {
    return null;
  }

  const getIcon = (type) => {
    switch (type) {
      case 'burnout': return <AlertTriangle className="text-red-400" size={20} />;
      case 'peak_performance': return <TrendingUp className="text-green-400" size={20} />;
      case 'recovery': return <ShieldAlert className="text-orange-400" size={20} />;
      default: return <Sparkles className="text-blue-400" size={20} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/5';
      case 'medium': return 'border-orange-500/50 bg-orange-500/5';
      default: return 'border-blue-500/50 bg-blue-500/5';
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="text-indigo-400 animate-pulse" size={20} />
        <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          AI Insights & Recovery
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real-time Advice */}
        {smartSuggestions && (
          <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={80} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{smartSuggestions.title}</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {smartSuggestions.message}
              </p>
            </div>
          </div>
        )}

        {/* Recovery Strategies */}
        {recoveryStrategies.map((strategy) => (
          <div 
            key={strategy.id}
            className={`p-4 rounded-2xl border backdrop-blur-md transition-all hover:shadow-lg ${getPriorityColor(strategy.priority)}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-black/20">
                  {getIcon(strategy.type)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{strategy.title}</h3>
                  <p className="text-xs text-gray-400">{strategy.priority === 'high' ? 'Immediate Action Required' : 'Recommended'}</p>
                </div>
              </div>
              <button 
                onClick={() => dismissInsight(strategy.id)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              {strategy.message}
            </p>

            {strategy.recoveryPlan && (
              <button 
                onClick={() => applyRecoveryPlan(strategy.recoveryPlan)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {strategy.actionLabel}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ))}

        {/* Behavior Insights */}
        {aiInsights.map((insight) => (
          <div 
            key={insight.id}
            className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md relative group hover:bg-white/10 transition-all"
          >
             <button 
                onClick={() => dismissInsight(insight.id)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-black/20">
                {getIcon(insight.type)}
              </div>
              <h3 className="font-bold text-sm text-white">{insight.title}</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {insight.message}
            </p>
            {insight.actionLabel && (
              <button className="mt-4 text-xs font-bold text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-widest">
                {insight.actionLabel} <ArrowRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsights;
