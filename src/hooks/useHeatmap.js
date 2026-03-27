import { useMemo } from 'react';
import { generateHeatmapData, getIntensity } from '../utils/heatmapUtils';

export const useHeatmap = (taskLogs, liveAccuracy, daysCount = 30) => {
  const heatmapCells = useMemo(() => {
    const data = generateHeatmapData(daysCount);
    const todayStr = new Date().toISOString().split('T')[0];
    
    return data.map(d => {
      // Force 'Today' to use live accurate score for instant Green feedback
      if (d.key === todayStr && liveAccuracy !== undefined) {
         const acc = liveAccuracy / 100;
         let intensity = 'var(--bg-input)';
         if (acc >= 0.99) intensity = '#22c55e';
         else if (acc >= 0.5) intensity = 'var(--accent-blue)';
         else if (acc > 0) intensity = '#faba2c';
         return { ...d, intensity, completionRate: liveAccuracy };
      }

      const total = taskLogs?.[d.key]?.total_tasks || 0;
      const completed = taskLogs?.[d.key]?.completed_tasks || 0;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { ...d, intensity: getIntensity(d.key, taskLogs), completionRate: rate };
    });
  }, [taskLogs, daysCount, liveAccuracy]);

  return {
    heatmapCells,
    currentIntensity: heatmapCells[heatmapCells.length - 1]?.intensity || 'var(--bg-input)'
  };
};
