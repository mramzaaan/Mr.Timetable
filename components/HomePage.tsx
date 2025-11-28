import React, { useState, useRef, useEffect } from 'react';
import type { Language, Page, TimetableSession, SchoolConfig, TimetableGridData, SchoolClass } from '../types';
import TimetableSessionModal from './TimetableSessionModal';
import CsvManagementModal from './CsvManagementModal';
import GlobalSearch from './GlobalSearch';

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []), Saturday: Array.from({ length: 8 }, () => []),
});

interface HomePageProps {
  t: any;
  language: Language;
  setCurrentPage: (page: Page) => void;
  currentTimetableSessionId: string | null;
  timetableSessions: TimetableSession[];
  setCurrentTimetableSessionId: (id: string | null) => void;
  onCreateTimetableSession: (name: string, startDate: string, endDate: string) => void;
  onUpdateTimetableSession: (id: string, name: string, startDate: string, endDate: string) => void;
  onDeleteTimetableSession: (id: string) => void;
  onUploadTimetableSession: (session: TimetableSession) => void;
  schoolConfig: SchoolConfig;
  onUpdateCurrentSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onSearchResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
}

const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AlternativeTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// Icon Components for Tracking
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const BreakIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>; 
const AssemblyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ClassIconSmall = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>;

interface CurrentEvent {
    name: string;
    startTime: Date;
    endTime: Date;
    type: 'period' | 'break' | 'assembly';
    isUpcoming?: boolean;
}

const DigitalClock: React.FC<{ language: Language, schoolConfig?: SchoolConfig }> = ({ language, schoolConfig }) => {
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<{ current: CurrentEvent | null, next: CurrentEvent | null }>({ current: null, next: null });

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!schoolConfig) return;

        const calculateEvent = () => {
            const now = new Date();
            const dayIndex = now.getDay(); 
            
            const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDayName = dayMap[dayIndex];
            
            const dayConfig = schoolConfig.daysConfig?.[currentDayName as any];
            if (!dayConfig?.active) {
                setStatus({ current: null, next: null });
                return;
            }

            const isFriday = dayIndex === 5;
            const timingsKey = isFriday ? 'friday' : 'default';
            
            const periods = schoolConfig.periodTimings?.[timingsKey] || [];
            const breaks = schoolConfig.breaks?.[timingsKey] || [];
            const assembly = schoolConfig.assembly?.[timingsKey];

            const events: CurrentEvent[] = [];

            const parseTime = (timeStr: string) => {
                if (!timeStr) return null;
                const [h, m] = timeStr.split(':').map(Number);
                const d = new Date(now);
                d.setHours(h, m, 0, 0);
                return d;
            };

            if (assembly && assembly.start && assembly.end) {
                events.push({ name: 'Assembly', startTime: parseTime(assembly.start)!, endTime: parseTime(assembly.end)!, type: 'assembly' });
            }

            const maxPeriods = dayConfig.periodCount;
            periods.forEach((p, idx) => {
                if (idx < maxPeriods && p.start && p.end) {
                    events.push({ name: `Period ${idx + 1}`, startTime: parseTime(p.start)!, endTime: parseTime(p.end)!, type: 'period' });
                }
            });

            breaks.forEach(b => {
                if (b.beforePeriod <= maxPeriods + 1 && b.startTime && b.endTime) {
                    events.push({ name: b.name, startTime: parseTime(b.startTime)!, endTime: parseTime(b.endTime)!, type: 'break' });
                }
            });

            events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

            let active = null;
            let next = null;

            for (const event of events) {
                if (now >= event.startTime && now < event.endTime) {
                    active = event;
                    break; 
                }
                if (now < event.startTime && !next) {
                    next = { ...event, isUpcoming: true };
                }
            }
            if (active) {
                const currentIndex = events.indexOf(active);
                if (currentIndex + 1 < events.length) {
                    next = { ...events[currentIndex + 1], isUpcoming: true };
                }
            }

            setStatus({ current: active, next });
        };

        calculateEvent();
    }, [time, schoolConfig]);

    const formattedTime = time.toLocaleTimeString(language === 'ur' ? 'ur-PK' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });

    const formattedDate = time.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        numberingSystem: language === 'ur' ? 'arab' : undefined
    });

    const { current, next } = status;

    const renderEventInfo = () => {
        if (!current && !next) return <span className="text-xs text-white/80 font-medium">No active schedule</span>;

        const now = time.getTime();

        const renderCurrent = () => {
            if (!current) return null;
            const start = current.startTime.getTime();
            const end = current.endTime.getTime();
            const totalDuration = end - start;
            const elapsed = now - start;
            const remaining = end - now;
            const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            
            const rMin = Math.floor(remaining / 60000);
            const rSec = Math.floor((remaining % 60000) / 1000);

            let icon = <ClassIconSmall />;
            if (current.type === 'break') { icon = <BreakIcon />; }
            if (current.type === 'assembly') { icon = <AssemblyIcon />; }

            return (
                 <div className="animate-fade-in mb-4 w-full">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl text-[var(--accent-primary)] bg-white/90 shadow-lg backdrop-blur-sm`}>
                                {icon}
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white leading-none drop-shadow-md">{current.name}</h3>
                                <p className="text-[10px] font-bold text-white/80 mt-1 uppercase tracking-wider">Running Now</p>
                            </div>
                        </div>
                        <div className="text-right">
                                <div className="text-3xl font-black text-white tabular-nums drop-shadow-md">
                                {`${rMin}:${rSec < 10 ? '0' : ''}${rSec}`}
                                </div>
                                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">Remaining</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden border border-white/10 backdrop-blur-sm shadow-inner">
                        <div 
                            className="h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.8)] bg-white" 
                            style={{ width: `${progress}%` }}
                        >
                            <div className="w-full h-full bg-gradient-to-r from-transparent to-white/50 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            );
        };

        const renderNext = () => {
            if (!next) return <div className="pt-3 border-t border-white/10 w-full text-center"><span className="text-xs text-white/70 font-medium italic">End of Day</span></div>;
            
            const minsToStart = Math.ceil((next.startTime.getTime() - now) / 60000);
            return (
                <div className={`pt-3 border-t border-white/10 flex items-center justify-between w-full ${!status.current ? 'mt-0' : ''}`}>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{status.current ? 'Up Next' : 'Starting Soon'}</span>
                    <div className="flex items-center gap-2 text-sm text-white">
                        <span className="font-bold drop-shadow-sm">{next.name}</span>
                        <span className="text-white/50">•</span>
                        <span className="font-bold text-yellow-200 drop-shadow-sm">
                            in {minsToStart} min
                        </span>
                    </div>
                </div>
            );
        };

        return (
            <div className="flex flex-col items-center w-full">
                {renderCurrent()}
                {renderNext()}
            </div>
        );
    };

    return (
        <div 
            className="relative overflow-hidden rounded-[2.5rem] p-8 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] mb-10 w-full max-w-md mx-auto transition-all hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] hover:-translate-y-1 group transform-style-3d border border-white/20"
            style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                boxShadow: '0 20px 50px -12px var(--accent-primary)' // Glow effect
            }}
        >
            {/* Glossy Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Clock Face */}
            <div className={`relative z-10 text-6xl sm:text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] ${language === 'ur' ? 'font-urdu' : 'font-mono'}`}>
                {formattedTime}
            </div>
            <div className={`relative z-10 text-sm sm:text-base font-bold text-white/90 mt-1 mb-8 uppercase tracking-[0.25em] drop-shadow-sm ${language === 'ur' ? 'font-urdu' : ''}`}>
                {formattedDate}
            </div>
            
            {schoolConfig && (
                <div className="relative z-10 bg-white/10 rounded-2xl p-5 border border-white/20 flex flex-col items-center justify-center shadow-inner backdrop-blur-md">
                    {renderEventInfo()}
                </div>
            )}
        </div>
    );
};

const HomePage: React.FC<HomePageProps> = ({ t, language, setCurrentPage, currentTimetableSessionId, timetableSessions, setCurrentTimetableSessionId, onCreateTimetableSession, onUpdateTimetableSession, onDeleteTimetableSession, onUploadTimetableSession, schoolConfig, onUpdateCurrentSession, onSearchResultClick }) => {
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSelectSessionModalOpen, setIsSelectSessionModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const uploadRef = useRef<HTMLInputElement>(null);

  const currentTimetableSession = timetableSessions.find(s => s.id === currentTimetableSessionId);

  const handleCreateNew = () => {
    setEditingSession(null);
    setIsSessionModalOpen(true);
  };
  
  const handleEditSession = (session: TimetableSession) => {
    setEditingSession(session);
    setIsSessionModalOpen(true);
  }

  const handleDownloadSession = async () => {
    if (!currentTimetableSession) {
      alert("No active timetable session to download.");
      return;
    }
    
    const sessionToExport = {
        ...currentTimetableSession,
        daysConfig: currentTimetableSession.daysConfig || schoolConfig.daysConfig,
        periodTimings: currentTimetableSession.periodTimings || schoolConfig.periodTimings,
        breaks: currentTimetableSession.breaks || schoolConfig.breaks,
        assembly: currentTimetableSession.assembly || schoolConfig.assembly
    };

    const sessionJsonString = JSON.stringify(sessionToExport, null, 2);
    const blob = new Blob([sessionJsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentTimetableSession.name.replace(/\s/g, '_')}_session.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    uploadRef.current?.click();
  };

  const readSessionFile = async (file: File) => {
    try {
        const sessionJsonString = await file.text();
        const session: TimetableSession = JSON.parse(sessionJsonString);
        
        if (!session.id || !session.name) {
            throw new Error('Invalid session file format.');
        }
        
        onUploadTimetableSession(session);
        setFeedback({ message: t.sessionUploadedSuccessfully.replace('{name}', session.name), type: 'success' });
    } catch (error: any) {
        setFeedback({ message: t.failedToUploadSession.replace('{reason}', error.message), type: 'error' });
    }
  };

  const NavCard: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, icon, onClick }) => (
    <button
      onClick={onClick}
      title={title}
      className="group relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.25)] hover:-translate-y-2 transition-all duration-300 overflow-hidden border border-white/40 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] backdrop-blur-xl"
    >
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-50 pointer-events-none"></div>
      
      <div className="relative z-10 text-[var(--accent-primary)] mb-1 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
        {icon}
      </div>
      <h3 className="relative z-10 text-[0.65rem] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider leading-none mt-1">{title}</h3>
    </button>
  );

  return (
    <>
      <TimetableSessionModal
        t={t}
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        session={editingSession}
        onCreate={onCreateTimetableSession}
        onUpdate={onUpdateTimetableSession}
        setFeedback={setFeedback}
      />
      <CsvManagementModal
        t={t}
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentTimetableSession={currentTimetableSession}
        onUpdateTimetableSession={onUpdateCurrentSession}
      />
      
      {isSelectSessionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity" onClick={() => setIsSelectSessionModalOpen(false)} role="dialog" aria-modal="true">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all flex flex-col max-h-[90vh] border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-[var(--border-primary)]">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.manageTimetables}</h2>
                            <p className="text-[var(--text-secondary)] mt-1">{t.selectOrCreateDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={handleCreateNew} className="px-4 py-2 text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-text)] rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] transition-colors">
                                {t.newTimetableSession}
                            </button>
                            <button onClick={handleUploadClick} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">
                                {t.uploadSession}
                            </button>
                            <button onClick={handleDownloadSession} disabled={!currentTimetableSession} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {t.downloadSession}
                            </button>
                            <input type="file" ref={uploadRef} className="hidden" accept=".json" onChange={(e) => e.target.files && readSessionFile(e.target.files[0])} />
                        </div>
                    </div>
                </div>
                
                <div className="p-6 flex-grow overflow-y-auto">
                    {feedback.message && (
                        <div className={`p-3 rounded-md text-sm my-4 animate-scale-in ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`} role="alert">
                            {feedback.message}
                        </div>
                    )}

                    {timetableSessions.length === 0 ? (
                        <p className="text-center text-[var(--text-secondary)] py-8">{t.noTimetableSessions}</p>
                    ) : (
                        <div className="space-y-3">
                        {timetableSessions.map(session => (
                            <div key={session.id} className={`p-4 rounded-xl flex items-center justify-between transition-all ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-secondary)] border-2 border-[var(--accent-primary)] shadow-md' : 'bg-[var(--bg-tertiary)] border-2 border-transparent hover:bg-[var(--bg-tertiary)]/80'}`}>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}
                                    className="px-4 py-1.5 bg-[var(--accent-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-primary-hover)] shadow-sm mr-2"
                                >
                                    {t.select}
                                </button>
                                <label 
                                    className="cursor-pointer block w-full"
                                    onClick={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}
                                >
                                <span className="font-bold text-[var(--text-primary)] text-lg">{session.name}</span>
                                <span className="text-sm text-[var(--text-secondary)] block">{new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditSession(session)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-[var(--accent-secondary-hover)] transition-colors" title={t.edit}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => onDeleteTimetableSession(session.id)} className="p-2 text-[var(--text-secondary)] hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title={t.delete}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={() => setIsSelectSessionModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--border-primary)]/50 shadow-sm transition-all duration-300">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
               {schoolConfig.schoolLogoBase64 && (
                <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-9 w-9 object-contain rounded-full shadow-sm border border-[var(--border-primary)]" />
               )}
              <span className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Mr. Timetable</span>
            </div>
            {currentTimetableSession && (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSearchOpen(true)} 
                        className="p-2.5 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-[var(--accent-secondary)] transition-all duration-200 shadow-sm border border-[var(--border-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2"
                        title="Search"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setIsCsvModalOpen(true)} 
                        className="p-2.5 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-[var(--accent-secondary)] transition-all duration-200 shadow-sm border border-[var(--border-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2"
                        title={t.manageDataCsv}
                    >
                        {/* User Icon (Account Cone) */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}
          </div>
        </header>

        {/* Search Overlay */}
        {isSearchOpen && currentTimetableSession && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-20 animate-fade-in px-4" onClick={() => setIsSearchOpen(false)}>
                <div className="w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                    <GlobalSearch 
                        t={t}
                        language={language}
                        classes={currentTimetableSession.classes}
                        teachers={currentTimetableSession.teachers}
                        subjects={currentTimetableSession.subjects}
                        onResultClick={(type, id) => {
                            onSearchResultClick(type, id);
                            setIsSearchOpen(false);
                        }}
                        autoFocus={true}
                        className="shadow-2xl"
                    />
                </div>
            </div>
        )}

        <main className="flex-grow container mx-auto px-4 pt-24 pb-12 flex flex-col items-center">
            <div className="w-full animate-scale-in max-w-4xl">
                <DigitalClock language={language} schoolConfig={schoolConfig} />
                
                {currentTimetableSession ? (
                    <div 
                        className="mb-12 relative group max-w-md mx-auto"
                    >
                        <div 
                            className="relative rounded-3xl p-6 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.2)] border border-white/20 backdrop-blur-xl overflow-hidden transform transition-transform hover:scale-[1.02]"
                            style={{ 
                                background: `linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))`,
                            }}
                        >
                            {/* Glossy overlay for session card */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-60 pointer-events-none"></div>
                            
                            <div className="relative z-10 text-center">
                                <span className="inline-block px-3 py-1 mb-3 text-[9px] font-extrabold tracking-widest uppercase text-white bg-[var(--accent-primary)] rounded-full shadow-sm">{t.selectActiveTimetable}</span>
                                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1 tracking-tight drop-shadow-sm">{currentTimetableSession.name}</h2>
                                <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[var(--text-secondary)] mt-4 mb-5">
                                    <div className="bg-white/50 px-3 py-1.5 rounded-lg border border-white/30 shadow-sm">
                                        {new Date(currentTimetableSession.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                    <span className="text-[var(--accent-primary)]">to</span>
                                    <div className="bg-white/50 px-3 py-1.5 rounded-lg border border-white/30 shadow-sm">
                                        {new Date(currentTimetableSession.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSelectSessionModalOpen(true)}
                                    className="px-6 py-2 text-xs font-bold uppercase tracking-widest bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:bg-[var(--accent-primary-hover)] transition-all hover:-translate-y-0.5"
                                >
                                    {t.change}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-12 text-center bg-[var(--bg-secondary)]/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-[var(--border-primary)]/50 max-w-md mx-auto">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">{t.welcomeToMrTimetable}</h1>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">{t.selectOrCreateDescription}</p>
                        <button
                            onClick={() => setIsSelectSessionModalOpen(true)}
                            className="px-8 py-3 text-sm font-bold uppercase tracking-wide bg-[var(--accent-primary)] text-white rounded-xl shadow-lg hover:bg-[var(--accent-primary-hover)] transition-all hover:-translate-y-0.5"
                        >
                            {t.selectTimetable}
                        </button>
                    </div>
                )}
                
                <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-4xl mx-auto pb-10">
                    <NavCard title={t.dataEntry} icon={<DataEntryIcon />} onClick={() => setCurrentPage('dataEntry')} />
                    <NavCard title={t.classTimetable} icon={<ClassTimetableIcon />} onClick={() => setCurrentPage('classTimetable')} />
                    <NavCard title={t.teacherTimetable} icon={<TeacherTimetableIcon />} onClick={() => setCurrentPage('teacherTimetable')} />
                    <NavCard title={t.adjustments} icon={<AlternativeTimetableIcon />} onClick={() => setCurrentPage('alternativeTimetable')} />
                    <NavCard title={t.settings} icon={<SettingsIcon />} onClick={() => setCurrentPage('settings')} />
                </div>
            </div>
        </main>
      </div>
    </>
  );
};

export default HomePage;