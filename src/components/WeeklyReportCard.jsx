import React from 'react';
import { TrendingUp, TrendingDown, Award, Clock, Calendar } from 'lucide-react';

export const WeeklyReportCard = ({ report }) => {
  const { weeklyAccuracy, totalFocusTime, bestDay, improvement } = report;
  const focusHrs = Math.floor(totalFocusTime / 3600);
  const focusMins = Math.floor((totalFocusTime % 3600) / 60);

  return (
    <div className="bg-bg-card rounded-[32px] p-4 sm:p-6 shadow-sm border border-border-light flex flex-col gap-5 sm:gap-6">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm sm:text-base font-black text-text-main tracking-tight">Weekly Performance</h3>
        <span className="text-[9px] font-black text-accent-blue bg-accent-blue-light px-3 py-1 rounded-full uppercase tracking-widest border border-accent-blue/10">Last 7 Days</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-bg-app rounded-2xl p-3.5 sm:p-5 border border-border-light hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Award size={13} className="text-accent-blue shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Accuracy</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-text-main tracking-tighter group-hover:scale-105 transition-transform origin-left">{weeklyAccuracy}%</p>
          {improvement !== 0 && (
            <div className={`mt-2 flex flex-wrap items-center gap-1 text-[9px] sm:text-[11px] font-black ${improvement > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {improvement > 0 ? <TrendingUp size={11} className="shrink-0" /> : <TrendingDown size={11} className="shrink-0" />}
              <span>{Math.abs(improvement)}% vs last wk</span>
            </div>
          )}
        </div>

        <div className="bg-bg-app rounded-2xl p-3.5 sm:p-5 border border-border-light hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Clock size={13} className="text-orange-500 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Focus</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-text-main tracking-tighter group-hover:scale-105 transition-transform origin-left whitespace-nowrap">{focusHrs}h {focusMins}m</p>
          <p className="mt-2 text-[9px] sm:text-[10px] font-bold text-text-muted/70 tracking-wide uppercase">Deep Work</p>
        </div>
      </div>

      <div className="bg-bg-input/50 rounded-2xl p-4 flex items-center justify-between border border-border-light group">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-bg-card flex items-center justify-center shadow-sm group-hover:rotate-6 transition-transform">
            <Calendar size={14} className="text-text-muted" />
          </div>
          <span className="text-sm font-bold text-text-main">Best Day</span>
        </div>
        <span className="text-sm font-black text-accent-blue tracking-tight">{bestDay}</span>
      </div>
    </div>
  );
};
