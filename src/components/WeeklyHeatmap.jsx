import React from 'react';
import { getIntensity, generateHeatmapData } from '../utils/heatmapUtils';

export const WeeklyHeatmap = ({ taskLogs, accuracy }) => {
  const cells = generateHeatmapData(30);

  return (
    <div className="bg-bg-card rounded-[28px] p-5 border border-border-light shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Consistency Map</h3>
          <p className="text-lg font-black text-text-main tracking-tight">30-Day Activity Heatmap</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">System Accuracy</p>
          <p className={`text-lg font-black ${accuracy >= 90 ? 'text-emerald-500' : 'text-accent-blue'}`}>{accuracy}%</p>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2 sm:grid-cols-15 md:grid-cols-30 md:gap-1.5">
        {cells.map((cell) => {
          const color = getIntensity(cell.key, taskLogs);
          return (
            <div
              key={cell.key}
              className={`aspect-square rounded-sm transition-all duration-500 hover:scale-110 cursor-help ${cell.active ? 'ring-2 ring-accent-blue/30 scale-105' : ''}`}
              style={{ backgroundColor: color }}
              title={`${cell.key}: ${color}`}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">
        <span>Inactivity</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-[1px] bg-bg-input" />
          <div className="w-2 h-2 rounded-[1px] bg-[#faba2c]" />
          <div className="w-2 h-2 rounded-[1px] bg-accent-blue" />
          <div className="w-2 h-2 rounded-[1px] bg-[#22c55e]" />
        </div>
        <span>Peak Output</span>
      </div>
    </div>
  );
};
