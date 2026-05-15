import { analyzeUserBehavior, generateRecoveryStrategies, getSmartSuggestions } from '../utils/aiAnalysisEngine';
import { TODAY } from '../utils/dateUtils';

console.log('[AI Worker] Initialized and ready.');

self.onmessage = function(e) {
  const { 
    goals = [], 
    tasks = [], 
    taskLogs = {}, 
    focusTime = 0, 
    accuracy = 0, 
    dismissedInsights = [], 
    dateStr 
  } = e.data || {};

  console.log('[AI Worker] Processing analysis request...');

  try {
    const insights = analyzeUserBehavior(goals, tasks, taskLogs, focusTime);
    const strategies = generateRecoveryStrategies(goals, tasks);
    
    // Convert accuracy (0-1) to percentage (0-100) for suggestions
    const progressPercent = (accuracy || 0) * 100;
    const suggestion = getSmartSuggestions(new Date(), tasks, progressPercent);

    const todayKey = dateStr || TODAY();
    const filteredInsights = (insights || []).filter(i => !dismissedInsights.includes(`${i.id}__${todayKey}`));
    const filteredStrategies = (strategies || []).filter(s => !dismissedInsights.includes(`${s.id}__${todayKey}`));

    self.postMessage({
      type: 'SUCCESS',
      payload: {
        insights: filteredInsights,
        strategies: filteredStrategies,
        suggestion
      }
    });
  } catch (err) {
    console.error('[AI Worker Runtime Error]', err);
    self.postMessage({ type: 'ERROR', error: err.message });
  }
};
