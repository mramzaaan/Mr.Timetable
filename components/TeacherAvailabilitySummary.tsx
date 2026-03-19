
import React from 'react';
import { allDays } from '../types';
import type { WorkloadStats } from './reportUtils';

interface TeacherAvailabilitySummaryProps {
  t: any;
  workloadStats: WorkloadStats;
  maxWorkload: number;
}

const TeacherAvailabilitySummary: React.FC<TeacherAvailabilitySummaryProps> = ({ t, workloadStats, maxWorkload }) => {
  const currentDayIndex = new Date().getDay(); 
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = daysMap[currentDayIndex];

  // Animation state
  const [animatedPercentage, setAnimatedPercentage] = React.useState(0);

  // Calculate percentage based on maxWorkload (highest teacher workload)
  const targetPercentage = Math.min(100, Math.round((workloadStats.weeklyPeriods / (maxWorkload || 1)) * 100));
  
  React.useEffect(() => {
    // Small delay to ensure transition triggers after mount
    const timer = setTimeout(() => {
        setAnimatedPercentage(targetPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetPercentage]);

  const remaining = Math.max(0, maxWorkload - workloadStats.weeklyPeriods);
  
  // SVG Circle properties
  const radius = 45; // Increased radius for better fit
  const strokeWidth = 8;
  const size = 120;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* 1. Daily Cards Row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {allDays.map((day) => {
           const count = workloadStats.dailyCounts[day.toLowerCase()] || 0;
           const isToday = day === currentDayName;
           // Get short name (first 3 chars)
           let shortName = t[day.toLowerCase()];
           if (shortName && shortName.length > 3) shortName = shortName.substring(0, 3);
           
           return (
              <div 
                key={day} 
                className={`flex flex-col items-center justify-center py-2 sm:py-3 rounded-xl border transition-all duration-300 ${
                    isToday 
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105 ring-2 ring-blue-200' 
                    : 'bg-white dark:bg-[#1e293b] text-[var(--text-primary)] border-[var(--border-secondary)] hover:border-blue-300'
                }`}
              >
                <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 sm:mb-1 ${isToday ? 'text-blue-100' : 'text-[var(--text-secondary)]'}`}>
                    {shortName}
                </span>
                <span className="text-xl sm:text-2xl font-black leading-none">{count}</span>
              </div>
           );
        })}
      </div>

      {/* 2. Weekly Summary Card (Blue) */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>

        <div className="flex justify-between items-center relative z-10">
            <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">Weekly Summary</h3>
                <div className="text-5xl font-black mb-1">{workloadStats.weeklyPeriods}</div>
                <div className="text-sm font-medium text-blue-100 mb-4">Total Periods</div>
                
                <p className="text-xs text-blue-200 max-w-[150px] leading-relaxed opacity-80">
                    {workloadStats.weeklyPeriods >= maxWorkload 
                        ? "Highest workload among teachers." 
                        : `${remaining} less than the busiest teacher.`}
                </p>
            </div>

            {/* Circular Progress */}
            <div className="relative flex items-center justify-center w-32 h-32">
                <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-blue-800/50"
                    />
                    {/* Progress */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="text-white transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{Math.round(animatedPercentage)}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-blue-200">Load</span>
                </div>
            </div>
        </div>
      </div>

      {/* 3. Workload Details Grid */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Workload Details</h3>
        <div className="grid grid-cols-4 gap-2">
            
            {/* Joint Periods */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{workloadStats.jointPeriodsCount}</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Joint</div>
            </div>

            {/* Substitutions */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{workloadStats.substitutionsTaken}</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Subs</div>
            </div>

            {/* Leaves */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{workloadStats.leavesTaken}</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Leaves</div>
            </div>

            {/* Total Load */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{workloadStats.totalWorkload}</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Total</div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default TeacherAvailabilitySummary;
