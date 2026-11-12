import React from 'react';
import { getGoalProgressColor } from '../utils/dailyGoalCompletionService';

/**
 * Circular SVG progress indicator used by DisciplineLockScreen and DisciplineLockSettings.
 */
export const GoalProgressCircle = ({
  title,
  percentage = 0,
  completedTasks = 0,
  totalTasks = 0,
  isRestDay = false,
  size = 112,
  strokeWidth = 8,
  pureBlackMode = false,
}) => {
  const safePct = Math.max(0, Math.min(100, Math.round(percentage || 0)));
  const color = getGoalProgressColor(safePct);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * safePct) / 100;

  return (
    <div className="flex flex-col items-center text-center gap-2.5 min-w-0">
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${title}: ${safePct}% complete`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={pureBlackMode ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.16)'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 600ms ease-out, stroke 300ms ease' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-xl font-black tracking-tight leading-none ${
              pureBlackMode ? 'text-white' : 'text-text-main'
            }`}
          >
            {safePct}%
          </span>
          <span
            className={`text-[10px] font-bold mt-1 ${
              pureBlackMode ? 'text-white/50' : 'text-text-muted'
            }`}
          >
            {isRestDay ? 'Rest day' : `${completedTasks}/${totalTasks}`}
          </span>
        </div>
      </div>

      <p
        className={`text-xs sm:text-sm font-black tracking-tight line-clamp-2 max-w-[130px] leading-snug ${
          pureBlackMode ? 'text-white' : 'text-text-main'
        }`}
        title={title}
      >
        {title}
      </p>
    </div>
  );
};

export default GoalProgressCircle;

