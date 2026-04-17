import React, { useState, useEffect, useMemo } from 'react';
import type { TimetableSession, SchoolConfig, Adjustment, Teacher, SchoolClass, Subject } from '../types';

interface LivePeriodTrackerProps {
    session?: TimetableSession | null;
    schoolConfig: SchoolConfig;
    language?: 'en' | 'ur';
}

const LivePeriodTracker: React.FC<LivePeriodTrackerProps> = ({ session, schoolConfig, language = 'en' }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(interval);
    }, []);

    // Helper functions to check against actual timetable data can be added here
    // For now, implementing exactly the visual card layout requested.

    const mockData = [
        {
            isMock: true,
            leftRoom: '10A',
            rightClass: '10th A',
            teacherName: 'MRS. AIZA KHAN',
            periodName: 'PERIOD 2 NOW',
            isSubstitute: true,
            isDual: true,
            nextPeriod: {
                leftRoom: '5B',
                rightClass: '5th B',
                teacherName: 'MR. OMAR SAEED',
                periodName: 'PERIOD 4 NEXT',
                badge: 'RECESS SKIPPED'
            }
        }
    ];

    // We will cycle through active substitutions or fallback to mockData
    const current = mockData[0]; // If we have session active data, use it!

    return (
        <div className="w-full max-w-4xl mx-auto px-4 mb-20 flex flex-col items-center justify-center relative mt-2 pt-2 pb-6">
            <div className="relative w-full max-w-[700px] h-[130px] perspective-1000">
                
                {/* Background Card (Card 2: Scenario B / Next Period) */}
                <div className="absolute left-6 right-6 top-3 h-[130px] rounded-[24px] bg-gradient-to-r from-[#faf3da] to-[#f4e2b0] shadow-[0_12px_24px_rgba(200,160,50,0.15)] flex flex-row items-stretch p-3 pr-6 transition-all duration-[600ms] z-0 overflow-hidden" style={{ transform: 'translateY(18px) scale(0.96)' }}>
                    
                    {/* Glassy Overlay for realism */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>

                    {/* Left Box (Room) */}
                    <div className="w-[110px] bg-white/70 backdrop-blur-sm rounded-2xl shadow-inner flex flex-col items-center justify-center flex-shrink-0 z-10 p-1">
                        <span className="text-[13px] font-extrabold text-[#5e4912] uppercase tracking-widest mb-0.5">ROOM</span>
                        <span className="text-[34px] font-black leading-none tracking-tight" style={{ color: '#cbae66', textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}>{current.nextPeriod.leftRoom}</span>
                    </div>
                    
                    {/* Center */}
                    <div className="flex flex-col flex-grow items-center justify-center px-4 z-10 pt-1">
                        <h3 className="text-[28px] font-black text-[#5e4912] uppercase tracking-[-0.03em] leading-none mb-1">{current.nextPeriod.teacherName}</h3>
                        <p className="text-[14px] font-bold text-[#8a722e] uppercase tracking-widest">{current.nextPeriod.periodName}</p>
                        {current.nextPeriod.badge && (
                            <div className="mt-2 flex items-center gap-1.5 bg-[#fdfaf1]/80 px-2.5 py-0.5 rounded-full border border-white/60 shadow-sm shadow-amber-200/50">
                                <span className="text-[10px] font-black text-[#8a722e] uppercase tracking-wider">{current.nextPeriod.badge}</span>
                                <div className="w-3 h-3 rounded-full border-[1.5px] border-[#8a722e] flex items-center justify-center opacity-80">
                                    <div className="w-1.5 h-[1.5px] bg-[#8a722e]"></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Box (Class) */}
                    <div className="pl-6 border-l-[1.5px] border-[#d3be87]/50 flex flex-col items-center justify-center flex-shrink-0 min-w-[110px] z-10">
                        <span className="text-[13px] font-extrabold text-[#5e4912] uppercase tracking-widest mb-0.5">CLASS</span>
                        <span className="text-[30px] font-black text-[#2c2003] leading-none tracking-tight">{current.nextPeriod.rightClass}</span>
                    </div>

                    <div className="absolute -bottom-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Upcoming Period Details</p>
                    </div>
                </div>

                {/* Foreground Card (Card 1: Current Period) */}
                <div className="absolute left-0 right-0 top-0 h-[130px] rounded-[24px] bg-gradient-to-r from-[#d9f1ff] to-[#c6e9ff] shadow-[0_16px_32px_rgba(50,150,250,0.2)] flex flex-row items-stretch p-3 pr-6 z-10 overflow-hidden transform transition-all duration-[600ms] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(50,150,250,0.25)]">
                    
                    {/* Glassy Overlay for realism */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                    {/* Left Box (Room) */}
                    <div className="w-[110px] bg-[#eef7ff]/90 backdrop-blur-md rounded-2xl shadow-inner border border-white/60 flex flex-col items-center justify-center flex-shrink-0 z-10 p-1">
                        <span className="text-[13px] font-extrabold text-[#1f4061] uppercase tracking-widest mb-0.5">ROOM</span>
                        <span className="text-[36px] font-black leading-none tracking-tight" style={{ color: '#6896b9', textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}>{current.leftRoom}</span>
                    </div>
                    
                    {/* Center */}
                    <div className="flex flex-col flex-grow items-center justify-center px-4 z-10 relative">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[30px] font-black text-[#0c2340] uppercase tracking-[-0.03em] leading-none">{current.teacherName}</h3>
                        </div>
                        <p className="text-[16px] font-bold text-[#4a7294] uppercase tracking-widest">{current.periodName}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                            {current.isSubstitute && (
                                <div className="flex items-center gap-1.5 bg-blue-500 text-white px-2.5 py-0.5 rounded-full shadow-sm shadow-blue-500/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 relative -top-[0.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    <span className="text-[10px] font-black uppercase tracking-wider">Sub</span>
                                </div>
                            )}

                            {current.isDual && (
                               <div className="flex items-center gap-1.5 bg-[#ffffff]/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/80 shadow-sm shadow-blue-200/50 cursor-pointer hover:bg-white transition-colors">
                                   <div className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                   </div>
                                   <span className="text-[10px] font-black text-[#2b5982] uppercase tracking-wider">Combined Period</span>
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#2b5982]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                               </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Box (Class) */}
                    <div className="pl-6 border-l-[1.5px] border-[#a1cced]/60 flex flex-col items-center justify-center flex-shrink-0 min-w-[110px] z-10">
                        <span className="text-[13px] font-extrabold text-[#1f4061] uppercase tracking-widest mb-0.5">CLASS</span>
                        <span className="text-[30px] font-black text-[#051124] leading-none tracking-tight">{current.rightClass}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LivePeriodTracker;
