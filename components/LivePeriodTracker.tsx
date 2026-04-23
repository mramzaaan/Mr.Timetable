import React, { useState, useEffect } from 'react';
import type { TimetableSession, SchoolConfig, Adjustment, TimetableGridData } from '../types';

interface LivePeriodTrackerProps {
    session?: TimetableSession | null;
    schoolConfig: SchoolConfig;
    language?: 'en' | 'ur';
}

const LivePeriodTracker: React.FC<LivePeriodTrackerProps> = ({ session, schoolConfig, language = 'en' }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [topActiveIndex, setTopActiveIndex] = useState(0);
    const [btmActiveIndex, setBtmActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            setTopActiveIndex(prev => prev + 1);
            setBtmActiveIndex(prev => prev + 1);
        }, 4000); // Rate of carousel rotation in MS
        return () => clearInterval(interval);
    }, []);

    if (!session) return null;

    // 1. Determine Current Day and Timings
    const daysInfo = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let localDate = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000));
    const todayStr = localDate.toISOString().split('T')[0];
    const currentDayName = daysInfo[currentTime.getDay()];
    
    const isFriday = currentDayName.toLowerCase() === 'friday';
    const timings = schoolConfig.periodTimings?.[isFriday ? 'friday' : 'default'] || [];
    const breaks = schoolConfig.breaks?.[isFriday ? 'friday' : 'default'] || [];
    const assembly = schoolConfig.assembly?.[isFriday ? 'friday' : 'default'] || null;

    const timeToMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    type TimelineBlock = { type: 'period' | 'break' | 'assembly', index?: number, name: string, start: number, end: number };
    const timeline: TimelineBlock[] = [];

    timings.forEach((t, i) => {
        timeline.push({ type: 'period', index: i, name: t.name || `P-${i + 1}`, start: timeToMins(t.start), end: timeToMins(t.end) });
    });
    breaks.forEach(b => {
        timeline.push({ type: 'break', name: b.name || 'Break', start: timeToMins(b.startTime), end: timeToMins(b.endTime) });
    });
    if (assembly && assembly.start && assembly.end) {
        timeline.push({ type: 'assembly', name: assembly.name || 'Assembly', start: timeToMins(assembly.start), end: timeToMins(assembly.end) });
    }

    timeline.sort((a, b) => a.start - b.start);

    let currentBlock: TimelineBlock | null = null;
    let nextBlock: TimelineBlock | null = null;
    let fallbackUpcomingBlock: TimelineBlock | null = null;

    for (let i = 0; i < timeline.length; i++) {
        const blk = timeline[i];
        if (currentMins >= blk.start && currentMins < blk.end) {
            currentBlock = blk;
            if (i + 1 < timeline.length) {
                nextBlock = timeline[i + 1];
            }
        }
        if (currentMins < blk.start && !fallbackUpcomingBlock) {
             fallbackUpcomingBlock = blk;
        }
    }

    let targetPeriodIndex = -1;
    let mode: 'NOW' | 'NEXT' = 'NOW';
    let specialMessage: string | null = null;

    if (currentBlock) {
        const minsLeft = currentBlock.end - currentMins;
        if (minsLeft <= 5 && nextBlock) {
            mode = 'NEXT';
            if (nextBlock.type === 'period') {
                targetPeriodIndex = nextBlock.index!;
            } else {
                specialMessage = `${nextBlock.name} NEXT`;
            }
        } else {
            mode = 'NOW';
            if (currentBlock.type === 'period') {
                targetPeriodIndex = currentBlock.index!;
            } else {
                specialMessage = `${currentBlock.name} NOW`;
            }
        }
    } else if (fallbackUpcomingBlock) {
        mode = 'NEXT';
        if (fallbackUpcomingBlock.type === 'period') {
             targetPeriodIndex = fallbackUpcomingBlock.index!;
        } else {
             specialMessage = `${fallbackUpcomingBlock.name} NEXT`;
        }
    }

    // 2. Fetch Adjustments for Today
    const todayAdjustments = session.adjustments[todayStr] || [];
    const dayKey = currentDayName as keyof TimetableGridData;

    interface ActiveClassInfo {
        id: string;
        room: string;
        className: string;
        teacherName: string;
        periodName: string;
        isSubstitute: boolean;
        isDual: boolean;
    }

    let targetClassesData: ActiveClassInfo[] = [];

    if (targetPeriodIndex !== -1 && dayKey) {
        session.classes.forEach(cls => {
            const periodSlot = cls.timetable?.[dayKey]?.[targetPeriodIndex];
            const activeAdjs = todayAdjustments.filter(a => a.classId === cls.id && a.periodIndex === targetPeriodIndex);
            
            let teachers: string[] = [];
            let isSubstitute = false;
            let isDual = false; 

            if (activeAdjs.length > 0) {
                isSubstitute = true;
                activeAdjs.forEach(adj => {
                    const subT = session.teachers.find(t => t.id === adj.substituteTeacherId);
                    if (subT) teachers.push(language === 'ur' ? subT.nameUr : subT.nameEn);
                });
                
                // check dual for the first adj just to show badge
                if (activeAdjs[0]) {
                     const dualConflicts = todayAdjustments.filter(a => a.substituteTeacherId === activeAdjs[0].substituteTeacherId && a.periodIndex === targetPeriodIndex);
                     isDual = dualConflicts.length > 1;
                }
            } else if (periodSlot && periodSlot.length > 0) {
                periodSlot.forEach(p => {
                    const t = session.teachers.find(t => t.id === p.teacherId);
                    if (t) teachers.push(language === 'ur' ? t.nameUr : t.nameEn);
                });
            }

            if (teachers.length > 0 || isSubstitute) {
                 const teacherName = teachers.length > 0 ? teachers.join(' & ') : 'UNASSIGNED';
                 targetClassesData.push({
                     id: cls.id,
                     room: cls.roomNumber || '---',
                     className: language === 'ur' ? cls.nameUr : cls.nameEn,
                     teacherName,
                     periodName: `P-${targetPeriodIndex + 1}`,
                     isSubstitute,
                     isDual
                 });
            }
        });
    }

    // Resolve details for an adjustment (For Future/Substitutions Card)
    const resolveData = (adj: Adjustment) => {
        const classObj = session.classes.find(c => c.id === adj.classId);
        const subTeacher = session.teachers.find(t => t.id === adj.substituteTeacherId);
        
        const dualConflicts = todayAdjustments.filter(a => a.substituteTeacherId === adj.substituteTeacherId && a.periodIndex === adj.periodIndex);
        const isDual = dualConflicts.length > 1;

        return {
            id: adj.id,
            room: classObj?.roomNumber || '---',
            className: classObj ? (language === 'ur' ? classObj.nameUr : classObj.nameEn) : 'Unknown',
            teacherName: subTeacher ? (language === 'ur' ? subTeacher.nameUr : subTeacher.nameEn) : 'UNASSIGNED',
            isSubstitute: true, 
            isDual,
            periodName: `PERIOD ${adj.periodIndex + 1}`
        };
    };

    const futureData = todayAdjustments.map(resolveData);

    const activeTopData = targetClassesData.length > 0 
        ? targetClassesData[topActiveIndex % targetClassesData.length] 
        : null;

    const activeBtmData = futureData.length > 0 
        ? futureData[btmActiveIndex % futureData.length] 
        : null;

    const formatClassName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return parts.slice(1).join(' '); // Often 'Class 10th A' -> '10th A'
        return name;
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4 mb-10 md:mb-16 lg:mb-20 flex flex-col items-center relative z-10 pt-2 pb-6">
            
            {/* Current/Next Period Cards (Blue Single Auto-Rotating) */}
            {(targetPeriodIndex !== -1 || specialMessage) && (
                <div className="w-full max-w-[720px] relative z-20 perspective-1000 mt-2">
                    {targetClassesData.length === 0 ? (
                         <div className="h-[110px] rounded-[24px] bg-gradient-to-r from-[#d9f1ff] via-[#e6f4ff] to-[#c6e9ff] shadow-[0_20px_40px_rgba(50,150,250,0.2)] flex flex-col items-center justify-center overflow-hidden relative border-[1.5px] border-white/90">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/5 pointer-events-none"></div>
                            {specialMessage ? (
                                <span className="text-[#4a81ab] font-black uppercase tracking-[0.2em] text-[20px] sm:text-[24px] z-10 text-center px-4" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
                                    {specialMessage}
                                </span>
                            ) : (
                                <>
                                    <span className="text-[#0c2340]/50 font-black uppercase tracking-[0.25em] text-[15px] z-10 mb-1">NORMAL TIMETABLE</span>
                                    <span className="text-[#4a7294]/60 font-bold tracking-widest text-[11px] z-10">NO CLASSES SCHEDULED</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="relative h-[110px] sm:h-[120px] rounded-[24px] bg-gradient-to-r from-[#d9f1ff] via-[#e6f4ff] to-[#c6e9ff] shadow-[0_20px_40px_rgba(50,150,250,0.2)] overflow-hidden border-[1.5px] border-white/90 transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(50,150,250,0.25)]">
                            {activeTopData && (
                                <div key={activeTopData.id + topActiveIndex} className="animate-in fade-in zoom-in duration-500 absolute inset-0 flex flex-row items-stretch p-2 sm:p-3 pr-2 sm:pr-4">
                                    {/* Glassy Overlays */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/5 pointer-events-none"></div>
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/40 blur-3xl rounded-full pointer-events-none"></div>
                                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/10 blur-3xl rounded-full pointer-events-none"></div>
                                    
                                    {/* Left Box (Class) */}
                                    <div className="w-[85px] h-[85px] sm:w-[96px] sm:h-[96px] my-auto bg-white/60 backdrop-blur-md rounded-xl shadow-[inset_0_2px_10px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] border border-white/80 flex flex-col items-center justify-center flex-shrink-0 z-10 p-1 sm:p-2">
                                        <span className="text-[13px] sm:text-[15px] font-black leading-tight tracking-tight text-center" style={{ color: '#4a81ab', textShadow: '1px 2px 4px rgba(0,0,0,0.08)' }}>{activeTopData.className}</span>
                                    </div>
                                    
                                    {/* Center */}
                                    <div className="flex flex-col flex-grow items-start justify-center pl-3 sm:pl-5 pr-2 z-10 relative overflow-hidden">
                                        <p className="text-[13px] sm:text-[15px] font-black text-[#4a81ab] uppercase tracking-[0.1em] mb-0.5" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                                            {activeTopData.periodName} <span className="opacity-80">{mode}</span>
                                        </p>
                                        <h3 className="text-[18px] sm:text-[22px] font-black text-[#0c2340] uppercase tracking-tight leading-tight mb-1 drop-shadow-sm text-left line-clamp-2 max-w-full" title={activeTopData.teacherName}>{activeTopData.teacherName}</h3>
                                        
                                        <div className="flex items-center gap-1 sm:gap-2 mt-0 h-[20px]">
                                            {activeTopData.isSubstitute && (
                                                <div className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-blue-400/50">
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Sub</span>
                                                </div>
                                            )}

                                            {activeTopData.isDual && (
                                            <div className="flex items-center gap-1 sm:gap-2 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                                                <div className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-600"></span>
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] font-black text-[#1f4061] uppercase tracking-wider">Combined</span>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right Box (Room) */}
                                    <div className="pl-2 sm:pl-4 border-l-2 border-[#a1cced]/60 flex flex-col items-center justify-center flex-shrink-0 w-[70px] sm:w-[90px] z-10 overflow-hidden">
                                        <span className="text-[10px] sm:text-[11px] font-extrabold text-[#1f4061] uppercase tracking-[0.2em] mb-0.5 opacity-80">ROM</span>
                                        <span className="text-[20px] sm:text-[26px] font-black text-[#0c2340] leading-none tracking-tighter text-center drop-shadow-sm truncate w-full">{activeTopData.room}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Future / Daily Substitutions Cards (Gold Single Auto-Rotating) */}
            <div className={`w-full max-w-[660px] relative z-10 transition-all duration-500 mt-2 sm:-mt-4`}>
                <div className="w-full flex-col flex items-center mt-2">
                    <div className="w-full flex flex-col gap-4 perspective-1000">
                        {futureData.length > 0 && activeBtmData ? (
                            <div className="relative h-[110px] sm:h-[120px] rounded-[24px] bg-gradient-to-r from-[#fdfbf3] via-[#faf3da] to-[#f4e2b0] border-[1.5px] border-white/80 shadow-[0_15px_35px_rgba(200,160,50,0.15)] overflow-hidden transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(200,160,50,0.25)]">
                                <div key={activeBtmData.id + btmActiveIndex} className="animate-in fade-in zoom-in duration-500 absolute inset-0 flex flex-row items-stretch p-2 sm:p-3 pr-2 sm:pr-4">
                                    {/* Glassy Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-amber-900/5 pointer-events-none"></div>
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/50 blur-3xl rounded-full pointer-events-none"></div>

                                    {/* Left Box (Class) */}
                                    <div className="w-[85px] h-[85px] sm:w-[96px] sm:h-[96px] my-auto bg-white/70 backdrop-blur-sm rounded-xl shadow-[inset_0_2px_8px_rgba(255,255,255,1),0_2px_10px_rgba(0,0,0,0.03)] border border-white flex flex-col items-center justify-center flex-shrink-0 z-10 p-1 sm:p-2">
                                        <span className="text-[13px] sm:text-[15px] font-black leading-tight tracking-tight text-center" style={{ color: '#b89b47', textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}>{activeBtmData.className}</span>
                                    </div>
                                    
                                    {/* Center */}
                                    <div className="flex flex-col flex-grow items-center justify-center px-1 sm:px-4 z-10 overflow-hidden">
                                        <h3 className="text-[18px] sm:text-[22px] font-black text-[#4a3a0e] uppercase tracking-tight leading-tight mb-1 drop-shadow-sm text-center line-clamp-2 max-w-full" title={activeBtmData.teacherName}>{activeBtmData.teacherName}</h3>
                                        <p className="text-[11px] sm:text-[12px] font-bold text-[#8a722e] uppercase tracking-[0.2em] bg-white/50 px-3 py-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">{activeBtmData.periodName}</p>
                                        <div className="mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-1.5 h-[20px]">
                                            <div className="flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Substitution</span>
                                            </div>
                                            {activeBtmData.isDual && (
                                                <div className="flex items-center gap-1 bg-[#fdfaf1]/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white shadow-sm">
                                                    <span className="text-[9px] sm:text-[10px] font-black text-[#8a722e] uppercase tracking-wider">Combined</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right Box (Room) */}
                                    <div className="pl-2 sm:pl-4 border-l-2 border-[#d3be87]/60 flex flex-col items-center justify-center flex-shrink-0 w-[70px] sm:w-[90px] z-10 overflow-hidden">
                                        <span className="text-[10px] sm:text-[11px] font-extrabold text-[#5e4912] uppercase tracking-[0.2em] mb-0.5 opacity-80">ROM</span>
                                        <span className="text-[20px] sm:text-[26px] font-black text-[#2c2003] leading-none tracking-tighter text-center drop-shadow-sm truncate w-full">{activeBtmData.room}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[90px] w-full rounded-[24px] bg-amber-50/50 border-2 border-dashed border-amber-200/50 flex flex-col items-center justify-center">
                                <span className="text-amber-500/70 font-bold uppercase tracking-widest text-[12px]">NO SUBSTITUTIONS TODAY</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LivePeriodTracker;
