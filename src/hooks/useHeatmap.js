import { useMemo } from 'react';
import { generateHeatmapData, getIntensity } from '../utils/heatmapUtils';

export const useHeatmap = (taskLogs, daysCount = 30) => {
  const heatmapCells = useMemo(() => {
    const data = generateHeatmapData(daysCount);
    return data.map(d => {
      const total = taskLogs?.[d.key]?.total_tasks || 0;
      const completed = taskLogs?.[d.key]?.completed_tasks || 0;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { ...d, intensity: getIntensity(d.key, taskLogs), completionRate: rate };
    });
  }, [taskLogs, daysCount]);

  return {
    heatmapCells,
    currentIntensity: heatmapCells[heatmapCells.length - 1]?.intensity || 'var(--bg-input)'
  };
};
