
import React from 'react';
import { allDays } from '../types';
import type { WorkloadStats } from './reportUtils';

interface TeacherAvailabilitySummaryProps {
  t: any;
  workloadStats: WorkloadStats;
  maxWorkload: number;
  unscheduledCount?: number;
}

const DayCard = ({ day, count, isToday, colorClass }: any) => (
    <div className={`relative p-2 rounded-[2rem] bg-white dark:bg-[#1e293b] shadow-sm flex flex-col justify-between h-16 w-14 flex-shrink-0 border-l-4 transition-all ${isToday ? 'border-blue-500 shadow-md scale-105' : 'border-transparent'}`}>
        <span className={`text-[0.5625rem] font-bold tracking-wider ${colorClass}`}>{day}</span>
        <div className="mt-0.5">
            <span className="text-xl font-black text-gray-800 dark:text-white leading-none">{count < 10 ? `0${count}` : count}</span>
        </div>
    </div>
);

const WorkloadCard = ({ title, value, colorClass, bgClass }: any) => (
    <div className={`relative p-2 rounded-[2rem] ${bgClass} flex flex-col justify-between h-16 w-14 flex-shrink-0`}>
        <span className={`text-[0.5625rem] font-bold tracking-wider ${colorClass}`}>{title}</span>
        <div className="mt-0.5">
            <span className={`text-xl font-black leading-none ${colorClass}`}>{typeof value === 'number' && value < 10 ? `0${value}` : value}</span>
        </div>
    </div>
);

const CircularProgress = ({ value }: any) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    
    // Determine color based on value
    let colorClass = "text-emerald-500";
    if (value > 90) colorClass = "text-rose-500";
    else if (value > 75) colorClass = "text-amber-500";
    else if (value < 30) colorClass = "text-blue-500";

    return (
        <div className={`relative p-2 rounded-[2rem] bg-white dark:bg-[#1e293b] flex flex-col items-center justify-center h-16 w-16 flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-800`}>
            <div className="relative flex items-center justify-center w-full h-full">
                <svg className="transform -rotate-90 w-12 h-12 absolute">
                    <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                    <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${colorClass} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[0.625rem] font-black text-gray-800 dark:text-white">{value}%</span>
                </div>
            </div>
        </div>
    );
};

const TeacherAvailabilitySummary: React.FC<TeacherAvailabilitySummaryProps> = ({ t, workloadStats, maxWorkload, unscheduledCount = 0 }) => {
  const currentDayIndex = new Date().getDay(); 
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = daysMap[currentDayIndex];

  const targetPercentage = Math.min(100, Math.round((workloadStats.weeklyPeriods / (maxWorkload || 1)) * 100));
  
  const dayColors = [
      { color: 'text-teal-600' }, // Mon
      { color: 'text-indigo-600' }, // Tue
      { color: 'text-orange-600' }, // Wed
      { color: 'text-blue-600' }, // Thu
      { color: 'text-emerald-600' }, // Fri
      { color: 'text-rose-600' }, // Sat
      { color: 'text-gray-600' }, // Sun
  ];

  return (
    <div className="space-y-4 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-[2rem]">
      {/* 1. Daily Cards Row */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {allDays.map((day, index) => {
           const count = workloadStats.dailyCounts[day.toLowerCase()] || 0;
           const isToday = day === currentDayName;
           let shortName = t[day.toLowerCase()];
           if (shortName && shortName.length > 3) shortName = shortName.substring(0, 3);
           
           return (
              <DayCard 
                key={day}
                day={shortName}
                count={count}
                isToday={isToday}
                colorClass={dayColors[index % dayColors.length].color}
              />
           );
        })}
      </div>

      {/* 2. Workload Details Grid */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <WorkloadCard 
              title="JOINT" 
              value={workloadStats.jointPeriodsCount} 
              colorClass="text-teal-800 dark:text-teal-200"
              bgClass="bg-teal-100 dark:bg-teal-900/50"
          />
          <WorkloadCard 
              title="SUBS" 
              value={workloadStats.substitutionsTaken} 
              colorClass="text-indigo-800 dark:text-indigo-200"
              bgClass="bg-indigo-100 dark:bg-indigo-900/50"
          />
          <WorkloadCard 
              title="LEAVES" 
              value={workloadStats.leavesTaken} 
              colorClass="text-orange-800 dark:text-orange-200"
              bgClass="bg-orange-100 dark:bg-orange-900/50"
          />
          <WorkloadCard 
              title="UNSCH" 
              value={unscheduledCount} 
              colorClass="text-gray-800 dark:text-gray-200"
              bgClass="bg-gray-200 dark:bg-gray-800"
          />
          <WorkloadCard 
              title="TOTAL" 
              value={workloadStats.totalWorkload} 
              colorClass="text-purple-800 dark:text-purple-200"
              bgClass="bg-purple-100 dark:bg-purple-900/50"
          />
          <CircularProgress value={targetPercentage} />
      </div>
    </div>
  );
};

export default TeacherAvailabilitySummary;
