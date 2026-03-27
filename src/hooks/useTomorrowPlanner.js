import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { TODAY, TOMORROW } from '../utils/dateUtils';
import { isTaskDone } from '../utils/calculationUtils';

export const useTomorrowPlanner = () => {
    const { tasks, updateTask } = useAppContext();
    const today = TODAY();
    const tomorrow = TOMORROW();

    const unfinishedToday = useMemo(() => {
        return tasks.filter(t => {
            const isToday = (t.targetDate === today || t.date === today);
            return isToday && t.type !== 'daily' && !isTaskDone(t);
        });
    }, [tasks, today]);

    const tomorrowTasks = useMemo(() => {
        return tasks.filter(t => (t.targetDate === tomorrow || t.date === tomorrow));
    }, [tasks, tomorrow]);

    const pushToTomorrow = (id) => updateTask(id, { targetDate: tomorrow });

    return {
        unfinishedToday,
        tomorrowTasks,
        pushToTomorrow
    };
};
