import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { TODAY } from '../utils/dateUtils';
import { isTaskDone, sortTasks } from '../utils/calculationUtils';

export const useTasks = () => {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks, toggleTaskComplete } = useAppContext();
  const todayDate = TODAY();

  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      const type = t.type || 'daily';
      if (type === 'daily') return true;
      if (type === 'single') return t.targetDate === todayDate || t.date === todayDate;
      if (type === 'range') return t.startDate <= todayDate && t.endDate >= todayDate;
      return false;
    });
  }, [tasks, todayDate]);

  const sortedTodayTasks = useMemo(() => sortTasks(todayTasks), [todayTasks]);

  const completedTasksCount = useMemo(() => {
    return todayTasks.filter(isTaskDone).length;
  }, [todayTasks]);

  const totalTasksCount = todayTasks.length;

  return {
    todayTasks: sortedTodayTasks,
    completedTasksCount,
    totalTasksCount,
    allTasks: tasks,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    toggleTaskComplete,
    isTaskDone: (t) => isTaskDone(t)
  };
};

