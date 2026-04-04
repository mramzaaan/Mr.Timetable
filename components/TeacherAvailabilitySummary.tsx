
import React, { useState, useEffect } from 'react';
import { allDays } from '../types';
import type { WorkloadStats } from './reportUtils';

interface TeacherAvailabilitySummaryProps {
  t: any;
  workloadStats: WorkloadStats;
  maxWorkload: number;
  unscheduledCount?: number;
}

const TeacherAvailabilitySummary: React.FC<TeacherAvailabilitySummaryProps> = ({ t, workloadStats, maxWorkload, unscheduledCount = 0 }) => {
  const currentDayIndex = new Date().getDay(); 
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = daysMap[currentDayIndex];

  // Calculate percentage based on maxWorkload (highest teacher workload)
  const targetPercentage = Math.min(100, Math.round((workloadStats.weeklyPeriods / (maxWorkload || 1)) * 100));
  
  return (
    <div className="space-y-6">
      {/* 1. Daily Cards Row */}
      <div className="grid grid-cols-6 gap-3">
        {allDays.map((day) => {
           const count = workloadStats.dailyCounts[day.toLowerCase()] || 0;
           const isToday = day === currentDayName;
           // Get short name (first 3 chars)
           let shortName = t[day.toLowerCase()];
           if (shortName && shortName.length > 3) shortName = shortName.substring(0, 3);
           
           return (
              <div 
                key={day} 
                className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-300 ${
                    isToday 
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-105 ring-2 ring-blue-200' 
                    : 'bg-white dark:bg-[#1e293b] text-[var(--text-primary)] border-[var(--border-secondary)] hover:border-blue-300'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isToday ? 'text-blue-100' : 'text-[var(--text-secondary)]'}`}>
                    {shortName}
                </span>
                <span className="text-2xl font-black leading-none">{count}</span>
              </div>
           );
        })}
      </div>

      {/* 2. Workload Details Grid */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Workload Details</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            
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

            {/* Unscheduled */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{unscheduledCount}</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Unsch</div>
            </div>

            {/* Percentage */}
            <div className="bg-white dark:bg-[#1e293b] p-2 rounded-lg border border-[var(--border-secondary)] shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                </div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-none">{targetPercentage}%</div>
                <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mt-0.5">Load</div>
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
