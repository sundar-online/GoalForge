import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

export const useFocusTimer = () => {
    const { goals, tasks, focusTime, addFocusTimeToHabit, addFocusTime } = useAppContext();
    
    const [duration, setDuration] = useState(25); // Minutes
    const [time, setTime] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    
    const [selectedGoalId, setSelectedGoalId] = useState('');
    const [selectedHabitId, setSelectedHabitId] = useState('');
    
    const timerRef = useRef(null);
    const accRef = useRef(0);

    const todayTasks = tasks.filter(t => {
      const todayStr = new Date().toISOString().split('T')[0];
      const type = t.type || 'daily';
      return type === 'daily' || 
             (type === 'single' && t.targetDate === todayStr) || 
             (type === 'range' && t.startDate <= todayStr && t.endDate >= todayStr);
    });

    const isDailyTaskMode = selectedGoalId === 'DAILY_TASK';
    const selectedGoal = isDailyTaskMode ? null : goals.find(g => g.id === selectedGoalId);
    const activeList = isDailyTaskMode ? todayTasks : (selectedGoal?.habits || []);
    const selectedItem = activeList.find(h => h.id === selectedHabitId);

    useEffect(() => {
        if (!selectedGoalId) {
            if (goals.length > 0) setSelectedGoalId(goals[0].id);
            else if (todayTasks.length > 0) setSelectedGoalId('DAILY_TASK');
        }
    }, [goals, todayTasks]);

    useEffect(() => {
        if (selectedGoalId && activeList.length > 0 && !selectedHabitId) {
            setSelectedHabitId(activeList[0].id);
        }
    }, [selectedGoalId, activeList]);

    const playTone = (freq, dur = 0.3) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.07, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.start(); osc.stop(ctx.currentTime + dur);
        } catch (e) {}
    };

    useEffect(() => {
        if (isActive && time > 0) {
            timerRef.current = setInterval(() => {
                setTime(t => t - 1);
                accRef.current += 1;
                if (accRef.current >= 60) {
                    accRef.current = 0;
                    addFocusTimeToHabit(selectedGoalId || null, selectedHabitId || null, 60);
                } else {
                    addFocusTime(1);
                }
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            if (time === 0 && isActive) {
                setIsActive(false);
                playTone(880, 0.7);
            }
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, time, selectedGoalId, selectedHabitId]);

    const toggle = () => { 
        if (time === 0) return;
        playTone(isActive ? 330 : 528); 
        setIsActive(v => !v); 
    };
    
    const reset = () => { 
        setIsActive(false); 
        setTime(duration * 60); 
        accRef.current = 0; 
        clearInterval(timerRef.current); 
    };

    const changeDuration = (mins) => {
        if (isActive) return;
        setDuration(mins);
        setTime(mins * 60);
    };

    const totalSeconds = duration * 60;
    const elapsed = totalSeconds - time;
    const pct = (elapsed / totalSeconds) * 100;

    const todayFocusHrs = Math.floor(focusTime / 3600);
    const todayFocusMins = Math.floor((focusTime % 3600) / 60);

    return {
        goals,
        todayTasks,
        duration,
        time,
        isActive,
        selectedGoalId,
        setSelectedGoalId,
        selectedHabitId,
        setSelectedHabitId,
        selectedGoal,
        activeList,
        selectedItem,
        toggle,
        reset,
        changeDuration,
        pct,
        elapsed,
        todayFocusHrs,
        todayFocusMins
    };
};
