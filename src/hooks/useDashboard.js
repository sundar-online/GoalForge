import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { TODAY } from '../utils/dateUtils';
import { isTaskDone, isGoalDoneToday } from '../utils/calculationUtils';

export const useDashboard = () => {
    const { 
      tasks, 
      goals, 
      focusTime, 
      focusHistory, 
      taskLogs, 
      accuracy, 
      alerts,
      disciplineScore, 
      userLevel, 
      insights,
      theme, 
      toggleTheme 
    } = useAppContext();

    const todayStr = TODAY();

    const focusHrs = Math.floor(focusTime / 3600);
    const focusMins = Math.floor((focusTime % 3600) / 60);

    const focusDelta = useMemo(() => {
        const yday = new Date(); yday.setDate(yday.getDate() - 1);
        const ydayKey = yday.toISOString().split('T')[0];
        const ydaySec = focusHistory[ydayKey] || 0;
        return ydaySec === 0 ? null : Math.round(((focusTime - ydaySec) / ydaySec) * 100);
    }, [focusTime, focusHistory]);

    const totalItemsCount = useMemo(() => {
        const todayTasks = tasks.filter(t => {
            const type = t.type || 'daily';
            return type === 'daily' || 
                   (type === 'single' && (t.targetDate === todayStr || t.date === todayStr)) || 
                   (type === 'range' && t.startDate <= todayStr && t.endDate >= todayStr);
        });
        const allHabits = goals.flatMap(g => g.habits || []);
        return todayTasks.length + allHabits.length;
    }, [tasks, goals, todayStr]);

    const completedItemsCount = useMemo(() => {
        const todayTasks = tasks.filter(t => {
            const type = t.type || 'daily';
            return type === 'daily' || 
                   (type === 'single' && (t.targetDate === todayStr || t.date === todayStr)) || 
                   (type === 'range' && t.startDate <= todayStr && t.endDate >= todayStr);
        });
        const allHabits = goals.flatMap(g => g.habits || []);
        
        const taskDone = todayTasks.filter(isTaskDone).length;
        const habitsDone = allHabits.filter(h => h.completed || (h.timeSpent || 0) >= (h.targetTime || 15)).length;
        
        return taskDone + habitsDone;
    }, [tasks, goals, todayStr]);

    const quote = useMemo(() => {
        const QUOTES = [
            '"Focus is the art of knowing what to ignore."', 
            '"Small daily improvements lead to stunning results."', 
            '"Discipline is choosing between what you want now and what you want most."', 
            '"The only way to predict the future is to create it."'
        ];
        return QUOTES[new Date().getDay() % QUOTES.length];
    }, []);

    return {
        goals,
        accuracy,
        alerts,
        tasks,
        focusTime,
        focusHistory,
        taskLogs,
        disciplineScore,
        userLevel,
        insights,
        theme,
        toggleTheme,
        focusHrs,
        focusMins,
        focusDelta,
        totalItemsCount,
        completedItemsCount,
        quote
    };
};
