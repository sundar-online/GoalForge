export const getIntensity = (dateStr, taskLogs) => {
  const summary = taskLogs?.[dateStr];
  if (!summary || !summary.total_tasks) return 'var(--bg-input)';
  
  const total = summary.total_tasks || 1;
  const completed = summary.completed_tasks || 0;
  const acc = completed / total;
  
  // Rule-Based Success Coloring (Matches Strategic Dashboard)
  if (acc >= 0.99) return '#22c55e'; // Vibrant Green (Goal Rule Satisfied)
  if (acc >= 0.5) return 'var(--accent-blue)'; // Brand Blue (50%+)
  if (acc > 0) return '#faba2c';    // Vibrant Gold (>0%)
  return 'var(--bg-input)';
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
