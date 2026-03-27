export const getIntensity = (dateStr, taskLogs) => {
  const summary = taskLogs?.[dateStr];
  if (!summary || !summary.total_tasks) return 'var(--bg-input)';
  
  const acc = (summary.completed_tasks || 0) / summary.total_tasks;
  
  // Accuracy-based Color Logic (Premium)
  if (acc >= 1.0) return '#22c55e'; // Vibrant Green (100%)
  if (acc >= 0.5) return 'var(--accent-blue)'; // Brand Blue (50%+)
  if (acc > 0) return '#faba2c';    // Vibrant Gold (>0%)
  return 'var(--bg-input)';         // Neutral (0%)
};

export const generateHeatmapData = (daysCount = 30) => {
  const today = new Date();
  return [...Array(daysCount)].map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (daysCount - 1 - i));
    const key = d.toISOString().split('T')[0];
    return { 
      key, 
      active: key === today.toISOString().split('T')[0] 
    };
  });
};
