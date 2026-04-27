import React, { useState, useEffect, useMemo } from 'react';
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

    const { timeline, todayStr, currentDayName } = useMemo(() => {
        const daysInfo = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let localDate = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000));
        const tStr = localDate.toISOString().split('T')[0];
        const cDayName = daysInfo[currentTime.getDay()];
        
        const isFriday = cDayName.toLowerCase() === 'friday';
        const timings = schoolConfig.periodTimings?.[isFriday ? 'friday' : 'default'] || [];
        const breaks = schoolConfig.breaks?.[isFriday ? 'friday' : 'default'] || [];
        const assembly = schoolConfig.assembly?.[isFriday ? 'friday' : 'default'] || null;

        const timeToMins = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        type TimelineBlock = { type: 'period' | 'break' | 'assembly', index?: number, name: string, start: number, end: number };
        const timelineArr: TimelineBlock[] = [];

        timings.forEach((t, i) => {
            timelineArr.push({ type: 'period', index: i, name: t.name || `P-${i + 1}`, start: timeToMins(t.start), end: timeToMins(t.end) });
        });
        breaks.forEach(b => {
            timelineArr.push({ type: 'break', name: b.name || 'Break', start: timeToMins(b.startTime), end: timeToMins(b.endTime) });
        });
        if (assembly && assembly.start && assembly.end) {
            timelineArr.push({ type: 'assembly', name: assembly.name || 'Assembly', start: timeToMins(assembly.start), end: timeToMins(assembly.end) });
        }
        timelineArr.sort((a, b) => a.start - b.start);
        return { timeline: timelineArr, todayStr: tStr, currentDayName: cDayName };
    }, [schoolConfig, currentTime.getDay()]);

    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const { targetPeriodIndex, mode, specialMessage } = useMemo(() => {
        let currentBlock: any = null;
        let nextBlock: any = null;
        let fallbackUpcomingBlock: any = null;

        for (let i = 0; i < timeline.length; i++) {
            const blk = timeline[i];
            if (currentMins >= blk.start && currentMins < blk.end) {
                currentBlock = blk;
                if (i + 1 < timeline.length) nextBlock = timeline[i + 1];
            }
            if (currentMins < blk.start && !fallbackUpcomingBlock) fallbackUpcomingBlock = blk;
        }

        let targetPIdx = -1;
        let m: 'NOW' | 'NEXT' = 'NOW';
        let sMsg: string | null = null;

        if (currentBlock) {
            const minsLeft = currentBlock.end - currentMins;
            if (minsLeft <= 5 && nextBlock) {
                m = 'NEXT';
                if (nextBlock.type === 'period') targetPIdx = nextBlock.index!;
                else sMsg = `${nextBlock.name} NEXT`;
            } else {
                m = 'NOW';
                if (currentBlock.type === 'period') targetPIdx = currentBlock.index!;
                else sMsg = `${currentBlock.name} NOW`;
            }
        } else if (fallbackUpcomingBlock) {
            m = 'NEXT';
            if (fallbackUpcomingBlock.type === 'period') targetPIdx = fallbackUpcomingBlock.index!;
            else sMsg = `${fallbackUpcomingBlock.name} NEXT`;
        }
        return { targetPeriodIndex: targetPIdx, mode: m, specialMessage: sMsg };
    }, [timeline, currentMins]);

    // 2. Fetch Adjustments for Today
    const todayAdjustments = session?.adjustments[todayStr] || [];
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

    const targetClassesData = useMemo(() => {
        const results: ActiveClassInfo[] = [];
        const dayKey = currentDayName as keyof TimetableGridData;
        
        if (!session) return results;
        
        const todayAdjustments = session.adjustments[todayStr] || [];

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
                    results.push({
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
        return results;
    }, [session, targetPeriodIndex, currentDayName, todayStr, language]);

    const [isCurrentModalOpen, setIsCurrentModalOpen] = useState(false);
    const [isFutureModalOpen, setIsFutureModalOpen] = useState(false);
    const [currentSort, setCurrentSort] = useState<'room' | 'class'>('class');
    const [futureSort, setFutureSort] = useState<'teacher' | 'period'>('period');

    const futureData = useMemo(() => {
        if (!session) return [];
        const resolveData = (adj: Adjustment) => {
            const classObj = session.classes.find(c => c.id === adj.classId);
            const subTeacher = session.teachers.find(t => t.id === adj.substituteTeacherId);
            const todayAdjustments = session.adjustments[todayStr] || [];
            
            const dualConflicts = todayAdjustments.filter(a => a.substituteTeacherId === adj.substituteTeacherId && a.periodIndex === adj.periodIndex);
            const isDual = dualConflicts.length > 1;

            return {
                id: adj.id,
                room: classObj?.roomNumber || '---',
                className: classObj ? (language === 'ur' ? classObj.nameUr : classObj.nameEn) : 'Unknown',
                teacherName: subTeacher ? (language === 'ur' ? subTeacher.nameUr : subTeacher.nameEn) : 'UNASSIGNED',
                isSubstitute: true, 
                isDual,
                periodName: `P-${adj.periodIndex + 1}`,
                periodIndex: adj.periodIndex
            };
        };
        const todayAdjs = session.adjustments[todayStr] || [];
        return todayAdjs.map(resolveData);
    }, [session, todayStr, language]);

    const sortedCurrentData = useMemo(() => {
        return [...targetClassesData].sort((a, b) => {
            if (currentSort === 'room') {
                return a.room.localeCompare(b.room, undefined, { numeric: true });
            }
            return a.className.localeCompare(b.className);
        });
    }, [targetClassesData, currentSort]);

    const sortedFutureData = useMemo(() => {
        return [...futureData].sort((a, b) => {
            if (futureSort === 'teacher') {
                return a.teacherName.localeCompare(b.teacherName);
            }
            return (a.periodIndex || 0) - (b.periodIndex || 0);
        });
    }, [futureData, futureSort]);

    const activeTopData = useMemo(() => {
        return targetClassesData.length > 0 
            ? targetClassesData[topActiveIndex % targetClassesData.length] 
            : null;
    }, [targetClassesData, topActiveIndex]);

    const activeBtmData = useMemo(() => {
        return futureData.length > 0 
            ? futureData[btmActiveIndex % futureData.length] 
            : null;
    }, [futureData, btmActiveIndex]);

    if (!session) return null;

    const formatClassName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return parts.slice(1).join(' '); // Often 'Class 10th A' -> '10th A'
        return name;
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4 mb-4 md:mb-8 lg:mb-10 flex flex-col items-center relative z-10 pt-2 pb-6">
            
            {/* Current/Next Period Cards (Blue Single Auto-Rotating) */}
            {(targetPeriodIndex !== -1 || specialMessage) && (
                <div 
                    className="w-full max-w-[45rem] relative z-20 perspective-1000 mt-2 cursor-pointer"
                    onClick={() => targetClassesData.length > 0 && setIsCurrentModalOpen(true)}
                >
                    {targetClassesData.length === 0 ? (
                         <div className="h-[6.875rem] rounded-[1.5rem] bg-gradient-to-r from-[#d9f1ff] via-[#e6f4ff] to-[#c6e9ff] shadow-[0_20px_40px_rgba(50,150,250,0.2)] flex flex-col items-center justify-center overflow-hidden relative border-[0.09375rem] border-white/90">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/5 pointer-events-none"></div>
                            {specialMessage ? (
                                <span className="text-[#4a81ab] font-black uppercase tracking-[0.2em] text-[1.25rem] sm:text-[1.5rem] z-10 text-center px-4" style={{ textShadow: '0 2px 4px rgba(255,255,255,0.8)' }}>
                                    {specialMessage}
                                </span>
                            ) : (
                                <>
                                    <span className="text-[#0c2340]/50 font-black uppercase tracking-[0.25em] text-[0.9375rem] z-10 mb-1">NORMAL TIMETABLE</span>
                                    <span className="text-[#4a7294]/60 font-bold tracking-widest text-[0.6875rem] z-10">NO CLASSES SCHEDULED</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="relative h-[8rem] sm:h-[9.5rem] rounded-[1.5rem] sm:rounded-[2.5rem] bg-gradient-to-r from-[#d9f1ff] via-[#e6f4ff] to-[#c6e9ff] shadow-[0_25px_50px_rgba(50,150,250,0.18)] overflow-hidden border-[1px] border-white/90 transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(50,150,250,0.25)]">
                            {activeTopData && (
                                <div key={activeTopData.id + topActiveIndex} className="animate-in fade-in zoom-in duration-500 absolute inset-0 flex flex-row items-stretch p-3 sm:p-5 pr-3 sm:pr-6">
                                    {/* Glassy Overlays */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/5 pointer-events-none"></div>
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/40 blur-3xl rounded-full pointer-events-none"></div>
                                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/10 blur-3xl rounded-full pointer-events-none"></div>
                                    
                                    {/* Left Box (Period) */}
                                    <div className="flex my-auto shrink-0 z-10 w-[6rem] sm:w-[8rem] h-[6.5rem] sm:h-[7.5rem]">
                                        <div className="w-full bg-[#4a81ab] rounded-2xl sm:rounded-[2rem] shadow-xl border border-[#4a81ab]/20 flex flex-col items-center justify-center">
                                            <span className="text-white/60 text-[0.625rem] sm:text-[0.75rem] font-black uppercase tracking-[0.2em] mb-1">PERIOD</span>
                                            <span className="text-white text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem] font-black leading-none">{activeTopData.periodName.replace('P-', '')}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Center */}
                                    <div className="flex flex-col flex-grow items-start justify-center pl-4 sm:pl-8 pr-2 z-10 relative overflow-hidden">
                                        <p className="text-[0.75rem] sm:text-[0.875rem] font-black text-[#4a81ab] uppercase tracking-[0.25em] mb-1.5 opacity-80" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                                            {mode}
                                        </p>
                                        <h3 className="text-[1.375rem] sm:text-[1.625rem] lg:text-[1.875rem] font-black text-[#0c2340] uppercase tracking-tight leading-none mb-2 drop-shadow-sm text-left line-clamp-2 max-w-full" title={activeTopData.teacherName}>{activeTopData.teacherName}</h3>
                                        
                                        <div className="flex items-center gap-1.5 sm:gap-3 mt-0 h-[1.75rem]">
                                            {activeTopData.isSubstitute && (
                                                <div className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-full shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-blue-400/50">
                                                    <span className="text-[0.625rem] sm:text-[0.8125rem] font-black uppercase tracking-wider">Sub</span>
                                                </div>
                                            )}
                                            {activeTopData.isDual && (
                                            <div className="flex items-center gap-1.5 sm:gap-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                                                <div className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-blue-600"></span>
                                                </div>
                                                <span className="text-[0.625rem] sm:text-[0.8125rem] font-black text-[#1f4061] uppercase tracking-wider">Combined</span>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right Box (Class & Room) */}
                                    <div className="pl-4 sm:pl-8 border-l-2 border-[#a1cced]/60 flex flex-col items-center justify-center flex-shrink-0 w-[6.5rem] sm:w-[9rem] z-10 overflow-hidden">
                                        <span className="text-[1.125rem] sm:text-[1.375rem] lg:text-[1.5rem] font-black text-[#4a81ab] leading-tight tracking-tighter text-center truncate w-full mb-1" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}>{activeTopData.className}</span>
                                        <span className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.75rem] font-black text-[#0c2340] leading-none tracking-tighter text-center drop-shadow-sm truncate w-full">{activeTopData.room}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Future / Daily Substitutions Cards (Gold Single Auto-Rotating) */}
            <div className={`w-full max-w-[41.25rem] relative z-10 transition-all duration-500 mt-6 sm:mt-10 md:mt-12`}>
                <div className="w-full flex-col flex items-center mt-2">
                    <div className="w-full flex flex-col gap-4 perspective-1000">
                        {futureData.length > 0 && activeBtmData ? (
                            <div 
                                className="relative h-[8rem] sm:h-[9.5rem] rounded-[1.5rem] sm:rounded-[2.5rem] bg-gradient-to-r from-[#fdfbf3] via-[#faf3da] to-[#f4e2b0] border-[1px] border-white/80 shadow-[0_20px_45px_rgba(200,160,50,0.12)] overflow-hidden transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_55px_rgba(200,160,50,0.22)] cursor-pointer"
                                onClick={() => setIsFutureModalOpen(true)}
                            >
                                <div key={activeBtmData.id + btmActiveIndex} className="animate-in fade-in zoom-in duration-500 absolute inset-0 flex flex-row items-stretch p-3 sm:p-5 pr-3 sm:pr-6">
                                    {/* Glassy Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-amber-900/5 pointer-events-none"></div>
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/50 blur-3xl rounded-full pointer-events-none"></div>

                                    {/* Left Box (Period) */}
                                    <div className="flex my-auto shrink-0 z-10 w-[6rem] sm:w-[8rem] h-[6.5rem] sm:h-[7.5rem]">
                                        <div className="w-full bg-[#b89b47] rounded-2xl sm:rounded-[2rem] shadow-xl border border-[#b89b47]/20 flex flex-col items-center justify-center">
                                            <span className="text-white/60 text-[0.625rem] sm:text-[0.75rem] font-black uppercase tracking-[0.2em] mb-1">PERIOD</span>
                                            <span className="text-white text-[2.5rem] sm:text-[3.5rem] lg:text-[4rem] font-black leading-none">{activeBtmData.periodName.replace('P-', '')}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Center */}
                                    <div className="flex flex-col flex-grow items-center justify-center px-4 sm:px-8 z-10 overflow-hidden text-center">
                                        <h3 className="text-[1.375rem] sm:text-[1.625rem] lg:text-[1.875rem] font-black text-[#4a3a0e] uppercase tracking-tight leading-none mb-2 drop-shadow-sm text-center line-clamp-2 max-w-full" title={activeBtmData.teacherName}>{activeBtmData.teacherName}</h3>
                                        <div className="mt-1 sm:mt-2 flex items-center gap-2 sm:gap-3 h-[1.75rem]">
                                            <div className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-full shadow-sm">
                                                <span className="text-[0.625rem] sm:text-[0.8125rem] font-black uppercase tracking-widest">Substitution</span>
                                            </div>
                                            {activeBtmData.isDual && (
                                                <div className="flex items-center gap-1.5 bg-[#fdfaf1]/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white shadow-sm">
                                                    <span className="text-[0.625rem] sm:text-[0.8125rem] font-black text-[#8a722e] uppercase tracking-wider">Combined</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right Box (Class & Room) */}
                                    <div className="pl-4 sm:pl-8 border-l-2 border-[#d3be87]/60 flex flex-col items-center justify-center flex-shrink-0 w-[6.5rem] sm:w-[9rem] z-10 overflow-hidden">
                                        <span className="text-[1.125rem] sm:text-[1.375rem] lg:text-[1.5rem] font-black text-[#b89b47] leading-tight tracking-tighter text-center truncate w-full mb-1" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}>{activeBtmData.className}</span>
                                        <span className="text-[1.5rem] sm:text-[2rem] lg:text-[2.25rem] font-black text-[#2c2003] leading-none tracking-tighter text-center drop-shadow-sm truncate w-full">{activeBtmData.room}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[7rem] sm:h-[8.5rem] w-full rounded-[1.5rem] sm:rounded-[2.5rem] bg-amber-50/50 border-2 border-dashed border-amber-200/50 flex flex-col items-center justify-center">
                                <span className="text-amber-500/70 font-black uppercase tracking-widest text-[1rem] sm:text-[1.125rem]">NO SUBSTITUTIONS TODAY</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Current Period Details Modal */}
            {isCurrentModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsCurrentModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0c162d] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-blue-100 dark:border-blue-900/30" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-blue-100 dark:border-blue-900/30">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-black text-[#0c2340] dark:text-blue-100 uppercase tracking-tighter leading-none">Current Periods</h2>
                                <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-[0.25em] text-xs sm:text-sm mt-2 opacity-80">Real-time status of all classes</p>
                            </div>
                            
                            <div className="flex bg-white/50 dark:bg-black/40 p-1.5 rounded-2xl sm:rounded-[1.5rem] border border-blue-200/50 dark:border-blue-800/50 shadow-inner">
                                <button 
                                    onClick={() => setCurrentSort('room')} 
                                    className={`px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all duration-300 ${currentSort === 'room' ? 'bg-blue-600 text-white shadow-xl' : 'text-blue-800 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-800/30'}`}
                                >
                                    Room
                                </button>
                                <button 
                                    onClick={() => setCurrentSort('class')} 
                                    className={`px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all duration-300 ${currentSort === 'class' ? 'bg-blue-600 text-white shadow-xl' : 'text-blue-800 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-800/30'}`}
                                >
                                    Class
                                </button>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="flex-grow overflow-y-auto p-4 sm:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 custom-scrollbar bg-[var(--bg-secondary)]">
                            {sortedCurrentData.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#16213a] rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800/50 flex items-center gap-6 transition-all hover:scale-[1.03] hover:shadow-xl hover:border-blue-200/50">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex flex-col items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/30 shadow-inner">
                                        <span className="text-[0.625rem] font-bold text-blue-500 uppercase leading-none mb-1 tracking-widest">RM</span>
                                        <span className="text-xl font-black text-[#0c2340] dark:text-blue-100 leading-none">{item.room}</span>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-black text-[#0c2340] dark:text-white uppercase tracking-tight truncate">{item.className}</h4>
                                            {item.isSubstitute && <span className="bg-blue-500 text-white text-[0.625rem] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Sub</span>}
                                        </div>
                                        <p className="text-base font-bold text-gray-500 dark:text-blue-400/70 truncate tracking-tight">{item.teacherName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 sm:p-10 border-t border-gray-100 dark:border-gray-800 flex justify-center bg-gray-50/50 dark:bg-black/30">
                            <button onClick={() => setIsCurrentModalOpen(false)} className="px-12 py-4 bg-[#0c2340] dark:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-sm shadow-2xl transform active:scale-95 transition-all hover:bg-[#1f4061] dark:hover:bg-blue-600">Close Dashboard</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Future/Substitutions Modal */}
            {isFutureModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsFutureModalOpen(false)}>
                    <div className="bg-white dark:bg-[#1a1405] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-amber-100 dark:border-amber-900/30" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-amber-100 dark:border-amber-900/30">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-black text-[#4a3a0e] dark:text-amber-100 uppercase tracking-tighter leading-none">Substitution List</h2>
                                <p className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-[0.25em] text-xs sm:text-sm mt-2 opacity-80">Daily scheduled adjustments</p>
                            </div>
                            
                            <div className="flex bg-white/50 dark:bg-black/40 p-1.5 rounded-2xl sm:rounded-[1.5rem] border border-amber-200/50 dark:border-amber-800/50 shadow-inner">
                                <button 
                                    onClick={() => setFutureSort('teacher')} 
                                    className={`px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all duration-300 ${futureSort === 'teacher' ? 'bg-amber-600 text-white shadow-xl' : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-800/30'}`}
                                >
                                    Teacher
                                </button>
                                <button 
                                    onClick={() => setFutureSort('period')} 
                                    className={`px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all duration-300 ${futureSort === 'period' ? 'bg-amber-600 text-white shadow-xl' : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-800/30'}`}
                                >
                                    Period
                                </button>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="flex-grow overflow-y-auto p-4 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-5 custom-scrollbar bg-[var(--bg-secondary)]">
                            {sortedFutureData.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#251e08] rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-6 transition-all hover:scale-[1.03] hover:shadow-xl hover:border-amber-200/50">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex flex-col items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/30 shadow-inner">
                                        <span className="text-[0.625rem] font-bold text-amber-500 uppercase leading-none mb-1 tracking-widest">PER</span>
                                        <span className="text-xl font-black text-[#4a3a0e] dark:text-amber-100 leading-none">{item.periodName.replace('P-', '')}</span>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-lg font-black text-[#4a3a0e] dark:text-white uppercase tracking-tight truncate mb-1">{item.teacherName}</h4>
                                        <div className="flex items-center gap-3">
                                            <p className="text-base font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-tighter truncate">{item.className}</p>
                                            <span className="text-[0.625rem] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-black/20 px-2 py-0.5 rounded">Rm {item.room}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 sm:p-10 border-t border-gray-100 dark:border-gray-800 flex justify-center bg-gray-50/50 dark:bg-black/30">
                            <button onClick={() => setIsFutureModalOpen(false)} className="px-12 py-4 bg-[#4a3a0e] dark:bg-amber-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-sm shadow-2xl transform active:scale-95 transition-all hover:bg-[#5e4912] dark:hover:bg-amber-600">Close Details</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LivePeriodTracker;
