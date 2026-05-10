
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Language, Page, TimetableSession, SchoolConfig, TimetableGridData, DownloadDesignConfig, DownloadDesigns, Vacation, UserData, UserRole } from '../types';
import TimetableSessionModal from './TimetableSessionModal';
import GlobalSearch from './GlobalSearch';
import PrintPreview from './PrintPreview';
import LivePeriodTracker from './LivePeriodTracker';
import CsvManagementModal from './CsvManagementModal';
import UserProfileModal from './UserProfileModal';
import AdminPanel from './AdminPanel';
import ImportExportChoiceModal from './ImportExportChoiceModal';
import BackupRestoreModal from './BackupRestoreModal';
import { 
  generateBasicInformationHtml, 
  generateBasicInformationExcel, 
  generateByPeriodHtml, 
  generateByPeriodExcel, 
  generateWorkloadSummaryHtml, 
  generateWorkloadSummaryExcel,
  generateSchoolTimingsHtml,
  generateSchoolTimingsExcel,
  generateAdjustmentsReportHtml,
  generateAdjustmentsExcel,
  generateAttendanceReportHtml,
  generateAttendanceReportExcel,
  generateClassTimetableHtml,
  generateTeacherTimetableHtml,
  generateTeachersTimetableSummaryHtml
} from './reportUtils';

interface SelectionModalProps {
  title: string;
  items: { id: string; label: React.ReactNode }[];
  selectedIds: string[];
  onSelect: (id: string, isChecked: boolean) => void;
  onSelectAll: (isChecked: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  isOpen: boolean;
  t: any;
  children?: React.ReactNode;
}

const SelectionModal: React.FC<SelectionModalProps> = ({
  title,
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onConfirm,
  onCancel,
  confirmLabel,
  isOpen,
  t,
  children
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] transition-opacity" onClick={onCancel}>
      <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2rem]  max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{title}</h3>
        {children}
        <div className="flex-grow  bg-[var(--bg-tertiary)] rounded-[1.25rem] overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10">
            <input
              type="checkbox"
              className="form-checkbox text-[var(--accent-primary)] rounded"
              checked={items.length > 0 && selectedIds.length === items.length}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
            <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span>
          </label>
          {items.map(item => (
            <label key={item.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-[1rem] hover:bg-[var(--accent-secondary-hover)]">
              <input
                type="checkbox"
                className="form-checkbox text-[var(--accent-primary)] rounded"
                checked={selectedIds.includes(item.id)}
                onChange={(e) => onSelect(item.id, e.target.checked)}
              />
              <span className="text-[var(--text-primary)]">{item.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-primary)] mt-6">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-[1.25rem] hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.cancel}</button>
          <button onClick={onConfirm} disabled={selectedIds.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-[1.25rem] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors ">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

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
  onDeleteSessionFromBackend: (session: TimetableSession) => Promise<void>;
  onUploadTimetableSession: (session: TimetableSession, newSchoolConfig?: Partial<SchoolConfig>) => void;
  schoolConfig: SchoolConfig;
  onUpdateCurrentSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onSearchResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  onOpenSchoolInfo: () => void;
  userRole?: UserRole;
  userEmail: string | null;
  onSignOut: () => void;
  onSaveToCloud: (session: TimetableSession) => void;
  onSetDefaultSession: (id: string) => void;
  userData: UserData;
  onRestoreData: (data: UserData, fontData?: Record<string, string>) => void;
  isSaving?: boolean;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  userId?: string | null;
  canEditGlobal?: boolean;
}

// Icons
import { 
  Database,
  Calendar,
  Users,
  Shuffle,
  UserCheck,
  Settings,
  FileText,
  FileSpreadsheet,
  X,
  School,
  Shield,
  Lock
} from 'lucide-react';
import { PermissionsModal } from './PermissionsModal';

// ... (other imports)

// Icons
const DataEntryIcon = ({ className = "h-12 w-12" }) => <Database className={className} strokeWidth={1.5} />;
const ClassTimetableIcon = ({ className = "h-12 w-12" }) => <Calendar className={className} strokeWidth={1.5} />;
const TeacherTimetableIcon = ({ className = "h-12 w-12" }) => <Users className={className} strokeWidth={1.5} />;
const AdjustmentsIcon = ({ className = "h-12 w-12" }) => <Shuffle className={className} strokeWidth={1.5} />;
const AttendanceIcon = ({ className = "h-12 w-12" }) => <UserCheck className={className} strokeWidth={1.5} />;
const SettingsIcon = ({ className = "h-12 w-12" }) => <Settings className={className} strokeWidth={1.5} />;
const DesignIcon = ({ className = "h-12 w-12" }) => <FileText className={className} strokeWidth={1.5} />;
const CsvIcon = ({ className = "h-12 w-12" }) => <FileSpreadsheet className={className} strokeWidth={1.5} />;
const CloseIcon = () => <X className="h-6 w-6" />;
const SchoolIcon = ({ className = "h-12 w-12" }) => <School className={className} strokeWidth={1.5} />;

const DocumentCard: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    colorTheme: string;
    index: number;
    onClick: () => void;
}> = ({ title, subtitle, icon, colorTheme, index, onClick }) => {
    const colors: Record<string, { bg: string, text: string }> = {
        blue: { bg: 'bg-blue-500', text: 'text-blue-600' },
        cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600' },
        orange: { bg: 'bg-orange-500', text: 'text-orange-600' },
        rose: { bg: 'bg-rose-500', text: 'text-rose-600' },
        violet: { bg: 'bg-violet-500', text: 'text-violet-600' },
        emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600' },
        indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600' },
        teal: { bg: 'bg-teal-500', text: 'text-teal-600' },
    };

    const theme = colors[colorTheme] || colors.blue;
    const formattedIndex = (index + 1).toString().padStart(2, '0');

    return (
        <button 
            onClick={onClick}
            className="group relative w-full mt-6 focus:outline-none min-h-[11.25rem]"
        >
            {/* Filter Container for Drop Shadow */}
            <div className="relative w-full h-full drop- transition-transform duration-300 group-hover:scale-[1.02]">
                
                {/* Colored Accent Layer (Back) */}
                <div 
                    className={`absolute inset-0 ${theme.bg} transition-all duration-300`}
                    style={{ 
                        clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)',
                        transform: 'translateX(8px)'
                    }}
                ></div>

                {/* White Card Layer (Front) */}
                <div 
                    className="absolute inset-0 bg-[var(--bg-secondary)] flex flex-col pt-12 pb-6 pl-6 pr-12 text-left"
                    style={{ 
                        clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)'
                    }}
                >
                    {/* Content */}
                    <div className="mt-2 flex flex-col items-start gap-2 w-full">
                        <h4 className={`text-lg font-black ${theme.text} uppercase tracking-tight leading-tight line-clamp-2`}>{title}</h4>
                        <div className="w-12 h-1 rounded-full bg-[var(--bg-tertiary)] my-1"></div>
                        <p className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest leading-relaxed line-clamp-3">{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Floating Icon (Outside Clip) */}
            <div className="absolute -top-4 left-6 z-20">
                <div className="relative w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-secondary)]  flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:-translate-y-1">
                    <div className={`w-full h-full rounded-full ${theme.bg} flex items-center justify-center text-white shadow-inner`}>
                         {React.isValidElement(icon) 
                            ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-7 w-7 stroke-[2]" }) 
                            : icon
                        }
                    </div>
                </div>
            </div>
        </button>
    );
};

interface CurrentEvent {
    name: string;
    startTime: Date;
    endTime: Date;
    type: 'period' | 'break' | 'assembly';
    isUpcoming?: boolean;
}

interface SchoolDayStatus {
    state: 'pre-school' | 'active' | 'post-school' | 'closed' | 'vacation';
    currentEvent: CurrentEvent | null;
    nextEvent: CurrentEvent | null;
    schoolStartTime: Date | null;
    schoolEndTime: Date | null;
    vacationName?: string;
}

const DigitalClock: React.FC<{ language: Language, schoolConfig?: SchoolConfig, t: any, vacations?: Vacation[] }> = ({ language, schoolConfig, t, vacations }) => {
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<SchoolDayStatus>({ state: 'closed', currentEvent: null, nextEvent: null, schoolStartTime: null, schoolEndTime: null });

    useEffect(() => {
        const timer = setInterval(() => { setTime(new Date()); }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!schoolConfig) return;
        const calculateEvent = () => {
            const now = new Date();
            
            // VACATION CHECK
            if (vacations && vacations.length > 0) {
                const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const activeVacation = vacations.find(v => {
                    const start = new Date(v.startDate);
                    start.setHours(0,0,0,0);
                    const end = new Date(v.endDate);
                    end.setHours(23,59,59,999);
                    return todayTime >= start.getTime() && todayTime <= end.getTime();
                });

                if (activeVacation) {
                    setStatus({ 
                        state: 'vacation', 
                        currentEvent: null, 
                        nextEvent: null, 
                        schoolStartTime: null, 
                        schoolEndTime: null,
                        vacationName: activeVacation.name
                    });
                    return;
                }
            }

            const dayIndex = now.getDay(); 
            const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDayName = dayMap[dayIndex];
            // @ts-ignore
            const dayConfig = schoolConfig.daysConfig?.[currentDayName];
            
            if (!dayConfig?.active) {
                setStatus({ state: 'closed', currentEvent: null, nextEvent: null, schoolStartTime: null, schoolEndTime: null });
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
                if (isNaN(h) || isNaN(m)) return null;
                const d = new Date(now);
                d.setHours(h, m, 0, 0);
                return d;
            };

            if (assembly && assembly.start && assembly.end) {
                const s = parseTime(assembly.start);
                const e = parseTime(assembly.end);
                if(s && e) events.push({ name: 'Assembly', startTime: s, endTime: e, type: 'assembly' });
            }

            const maxPeriods = dayConfig.periodCount;
            periods.forEach((p, idx) => {
                if (idx < maxPeriods && p.start && p.end) {
                    const s = parseTime(p.start);
                    const e = parseTime(p.end);
                    if(s && e) events.push({ name: p.name || `Period ${idx + 1}`, startTime: s, endTime: e, type: 'period' });
                }
            });

            breaks.forEach((b) => {
                if (b.beforePeriod <= maxPeriods + 1 && b.startTime && b.endTime) {
                    const s = parseTime(b.startTime);
                    const e = parseTime(b.endTime);
                    if(s && e) events.push({ name: b.name, startTime: s, endTime: e, type: 'break' });
                }
            });

            const validEvents = events.filter(e => e.startTime && e.endTime && e.endTime > e.startTime).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

            if (validEvents.length === 0) {
                setStatus({ state: 'closed', currentEvent: null, nextEvent: null, schoolStartTime: null, schoolEndTime: null });
                return;
            }

            const schoolStartTime = validEvents[0].startTime;
            const schoolEndTime = new Date(Math.max(...validEvents.map(e => e.endTime.getTime())));

            let currentState: SchoolDayStatus['state'] = 'active';
            let active = null;
            let next = null;

            if (now < schoolStartTime) {
                currentState = 'pre-school';
                next = validEvents[0];
            } else if (now >= schoolEndTime) {
                currentState = 'post-school';
            } else {
                active = validEvents.find(event => now >= event.startTime && now < event.endTime) || null;
                next = validEvents.find(event => event.startTime > now) || null;
            }

            setStatus({ 
                state: currentState, 
                currentEvent: active, 
                nextEvent: next, 
                schoolStartTime, 
                schoolEndTime 
            });
        };
        calculateEvent();
    }, [time, schoolConfig, vacations]);

    const formattedDay = time.toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', {
        weekday: 'long',
    }).replace(/,/g, '');

    const formattedDateOnly = time.toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).replace(/,/g, '');

    const cardData = useMemo(() => {
        if (!schoolConfig) return null;
        const { state, currentEvent, nextEvent, schoolStartTime, schoolEndTime } = status;
        const now = time.getTime();

        if (state === 'vacation') {
             return {
                title: status.vacationName || t.onVacation,
                badge: t.holiday,
                left: t.enjoyDayOff,
                right: '',
                progress: 100,
            };
        }

        if (state === 'closed') {
            return { title: t.noSchoolToday, badge: t.holiday, left: t.enjoyDayOff, right: '', progress: 0 };
        }

        if (state === 'pre-school' && schoolStartTime && nextEvent) {
            const diff = schoolStartTime.getTime() - now;
            const rHrs = Math.floor(diff / (1000 * 60 * 60));
            const rMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const rSecs = Math.floor((diff % (1000 * 60)) / 1000);
            const hStr = rHrs > 0 ? `${rHrs}h ` : '';
            const mStr = `${rMins}m `;
            const sStr = `${rSecs}s`;
            const badge = `${t.starts} ${t.inTime} ${hStr}${mStr}${sStr}`;
            return {
                title: t.schoolStartsSoon,
                badge: badge,
                left: `${t.starts} ${schoolStartTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`,
                right: `${t.next}: ${nextEvent.name}`,
                progress: 0,
            };
        }

        if (state === 'active') {
             if (currentEvent) {
                const start = currentEvent.startTime.getTime();
                const end = currentEvent.endTime.getTime();
                const total = end - start;
                const elapsed = now - start;
                const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
                
                const remaining = end - now;
                const rHrs = Math.floor(remaining / (1000 * 60 * 60));
                const rMins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const rSecs = Math.floor((remaining % (1000 * 60)) / 1000);
                
                // Formatted with zero padding for cleaner look
                const hStr = `${rHrs.toString().padStart(2, '0')}h `;
                const mStr = `${rMins.toString().padStart(2, '0')}m `;
                const sStr = `${rSecs.toString().padStart(2, '0')}s`;
                
                // Detailed remaining time badge
                const badge = `Remaining: ${hStr}${mStr}${sStr}`;

                // 24h format for period range (e.g., 08:00 - 08:40)
                const startTimeStr = currentEvent.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
                const endTimeStr = currentEvent.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

                return {
                    title: currentEvent.name,
                    badge: badge,
                    left: `${startTimeStr} - ${endTimeStr}`,
                    right: nextEvent ? `${t.next}: ${nextEvent.name}` : t.nextHome,
                    progress: progress,
                };
             } else if (nextEvent) {
                 const diff = nextEvent.startTime.getTime() - now;
                 const rHrs = Math.floor(diff / (1000 * 60 * 60));
                 const rMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                 const rSecs = Math.floor((diff % (1000 * 60)) / 1000);
                 const hStr = rHrs > 0 ? `${rHrs}h ` : '';
                 const mStr = `${rMins}m `;
                 const sStr = `${rSecs}s`;
                 const badge = `${t.starts} ${t.inTime} ${hStr}${mStr}${sStr}`;

                 return {
                     title: `${t.next}: ${nextEvent.name}`,
                     badge: badge,
                     left: `Starts at ${nextEvent.startTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`,
                     right: '',
                     progress: 0 
                 };
             }
        }

        if (state === 'post-school') {
             return {
                title: t.schoolClosed,
                badge: t.done,
                left: `${t.ended} ${schoolEndTime?.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`,
                right: t.seeYouTomorrow,
                progress: 100, // Visual fix: Ensure bar is full when school is closed
            };
        }
        return null;
    }, [status, time, schoolConfig, language, t]);

    return (
        <div className="w-full max-w-[90rem] mx-auto mb-4 px-3 sm:px-4">
            <div className="relative overflow-hidden w-full bg-white/40 dark:bg-black/10 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] transition-all duration-300 hover:shadow-cyan-500/10">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur-[5rem] opacity-10 animate-pulse pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-[5rem] opacity-10 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
                <div className="relative z-10 p-5 sm:p-8 lg:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 lg:gap-12 text-center md:text-left">
                    <div className="flex flex-col items-center md:items-start md:flex-[0.8] md:min-w-0">
                        <h1 className="text-[4rem] xs:text-[5rem] sm:text-[6.5rem] md:text-[3rem] lg:text-[3.5rem] xl:text-[4.5rem] font-black tracking-tighter text-[var(--text-primary)] select-none whitespace-normal sm:whitespace-nowrap animate-alive leading-none mb-1 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {time.toLocaleTimeString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </h1>
                        <div className="flex flex-col items-center md:items-start w-full gap-0 sm:gap-1">
                            <p className="text-xs sm:text-xl lg:text-lg font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-indigo-500 select-none mt-1 truncate w-full">{formattedDay}</p>
                            <p className="text-[0.5625rem] sm:text-lg lg:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[var(--text-secondary)] select-none truncate w-full">{formattedDateOnly}</p>
                        </div>
                    </div>
                    {cardData && (
                        <div className="w-full md:max-w-none md:flex-[1.2] bg-white/20 dark:bg-black/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-white/40  backdrop-blur-md transition-transform duration-300 hover:scale-[1.01] animate-alive flex flex-col justify-center" style={{ animationDelay: '1s' }}>
                            <div className="flex justify-between items-center mb-3 sm:mb-6">
                                <h2 className="text-base sm:text-xl font-black text-[var(--text-primary)] tracking-tight truncate pr-2">{cardData.title}</h2>
                                <span className="px-3 sm:px-4 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/30 text-[0.4375rem] sm:text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300  whitespace-nowrap">{cardData.badge}</span>
                            </div>
                            <div className="flex justify-between items-end text-[0.5rem] sm:text-[0.6875rem] font-black text-[var(--text-secondary)] mb-2 sm:mb-3 uppercase tracking-widest gap-2">
                                <span className="truncate">{cardData.left}</span>
                                <span className="text-right truncate">{cardData.right}</span>
                            </div>
                            <div className="relative h-2 sm:h-3.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                                <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-[width] duration-1000 linear" style={{ width: `${cardData.progress}%` }}>
                                    <div className="absolute inset-0 w-full h-full bg-white/30 -skew-x-12 animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HomePage: React.FC<HomePageProps> = ({ 
    t, language, setCurrentPage, 
    currentTimetableSessionId, 
    timetableSessions, 
    setCurrentTimetableSessionId, 
    onCreateTimetableSession, 
    onUpdateTimetableSession, 
    onDeleteTimetableSession, 
    onDeleteSessionFromBackend, 
    onUploadTimetableSession, 
    schoolConfig, 
    onUpdateCurrentSession, 
    onSearchResultClick, 
    onUpdateSchoolConfig, 
    onOpenSchoolInfo, 
    userRole, 
    userEmail, 
    onSignOut, 
    onSaveToCloud, 
    onSetDefaultSession, 
    userData, 
    onRestoreData,
    isSaving,
    saveStatus,
    userId,
    canEditGlobal
}) => {
  const isAdmin = userRole === 'admin';
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isImportExportChoiceOpen, setIsImportExportChoiceOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [permissionSession, setPermissionSession] = useState<TimetableSession | null>(null);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [isSelectSessionModalOpen, setIsSelectSessionModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  
  const [isBasicInfoPreviewOpen, setIsBasicInfoPreviewOpen] = useState(false);
  const [isSchoolTimingsPreviewOpen, setIsSchoolTimingsPreviewOpen] = useState(false);
  const [isWorkloadPreviewOpen, setIsWorkloadPreviewOpen] = useState(false);
  const [isByPeriodPreviewOpen, setIsByPeriodPreviewOpen] = useState(false);
  const [isAlternativePreviewOpen, setIsAlternativePreviewOpen] = useState(false); 
  const [isAttendanceReportPreviewOpen, setIsAttendanceReportPreviewOpen] = useState(false);
  
  const [isTeacherSelectionForWorkloadOpen, setIsTeacherSelectionForWorkloadOpen] = useState(false);
  const [selectedTeacherIdsForWorkload, setSelectedTeacherIdsForWorkload] = useState<string[]>([]);
  const [workloadReportMode, setWorkloadReportMode] = useState<'weekly' | 'range'>('weekly');
  const [workloadStartDate, setWorkloadStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [workloadEndDate, setWorkloadEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isBasicInfoSelectionOpen, setIsBasicInfoSelectionOpen] = useState(false);
  const [selectedBasicInfoCategories, setSelectedBasicInfoCategories] = useState<string[]>(['Primary', 'Elementary', 'Secondary', 'Higher Secondary', 'Extra Rooms']);
  const [isClassSelectionForPrintOpen, setIsClassSelectionForPrintOpen] = useState(false);
  const [selectedClassIdsForPrint, setSelectedClassIdsForPrint] = useState<string[]>([]);
  const [isClassTimetablePreviewOpen, setIsClassTimetablePreviewOpen] = useState(false);

  const [isTeacherSelectionForPrintOpen, setIsTeacherSelectionForPrintOpen] = useState(false);
  const [selectedTeacherIdsForPrint, setSelectedTeacherIdsForPrint] = useState<string[]>([]);
  const [isTeacherTimetablePreviewOpen, setIsTeacherTimetablePreviewOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const [isTeachersTimetableSummarySelectionOpen, setIsTeachersTimetableSummarySelectionOpen] = useState(false);
  const [isTeachersTimetableSummaryPreviewOpen, setIsTeachersTimetableSummaryPreviewOpen] = useState(false);
  const [teachersTimetableSummaryType, setTeachersTimetableSummaryType] = useState<'allDays' | 'byDays'>('allDays');
  const [selectedDaysForSummary, setSelectedDaysForSummary] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

  const touchStartRef = useRef<number | null>(null);
  const lastWheelTime = useRef<number>(0);

  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const currentTimetableSession = timetableSessions.find(s => s.id === currentTimetableSessionId);
  const teachers = currentTimetableSession?.teachers || [];
  const classes = currentTimetableSession?.classes || [];
  const subjects = currentTimetableSession?.subjects || [];
  const adjustments = currentTimetableSession?.adjustments || {};
  const leaveDetails = currentTimetableSession?.leaveDetails || {};
  const attendance = currentTimetableSession?.attendance || {};
  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties'), [classes]);

  const teacherItems = useMemo(() => teachers.map(t => ({ id: t.id, label: <span>{t.nameEn} / <span className="font-urdu">{t.nameUr}</span></span> })), [teachers]);
  const classItems = useMemo(() => visibleClasses.map(c => ({ id: c.id, label: <span>{c.nameEn} / <span className="font-urdu">{c.nameUr}</span></span> })), [visibleClasses]);

  useEffect(() => {
      if (workloadReportMode === 'weekly') {
          const date = new Date(selectedWeekDate);
          const day = date.getDay() || 7; 
          if (day !== 1) date.setHours(-24 * (day - 1)); 
          const start = new Date(date);
          const end = new Date(date);
          end.setDate(date.getDate() + 6); 
          
          setWorkloadStartDate(start.toISOString().split('T')[0]);
          setWorkloadEndDate(end.toISOString().split('T')[0]);
      }
  }, [selectedWeekDate, workloadReportMode]);

  const handleToggleTeacherPermission = (session: TimetableSession, teacherEmail: string) => {
    const currentEmails = session.allow_edit_emails || [];
    const lowerEmail = teacherEmail.toLowerCase();
    const newEmails = currentEmails.includes(lowerEmail)
      ? currentEmails.filter(e => e !== lowerEmail)
      : [...currentEmails, lowerEmail];
    
    onSaveToCloud({ ...session, allow_edit_emails: newEmails });
  };

  const handleCreateNew = () => { setEditingSession(null); setIsSelectSessionModalOpen(false); setIsSessionModalOpen(true); };
  const handleEditSession = (session: TimetableSession) => { setEditingSession(session); setIsSelectSessionModalOpen(false); setIsSessionModalOpen(true); };
  
  const handleDownloadSession = () => {
    if (!currentTimetableSession) return;
    
    // Create a clean copy for export to reduce size
    const { changeLogs, ...sessionData } = currentTimetableSession;
    
    const exportData = {
        ...sessionData,
        schoolLogoBase64: schoolConfig.schoolLogoBase64
    };

    // Use JSON.stringify without indentation to reduce file size
    const dataStr = JSON.stringify(exportData);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Use the session name directly as requested
    link.download = `${currentTimetableSession.name}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const workloadReportClick = () => { 
      const idsToSelect = teachers.filter(t => { 
          const name = t.nameEn.toUpperCase(); 
          return !name.includes('MIAN M. YOUNAS') && !name.includes('MIAN M. YOUNIS'); 
      }).map(t => t.id); 
      setWorkloadReportMode('weekly'); 
      setSelectedWeekDate(new Date().toISOString().split('T')[0]); 
      setSelectedTeacherIdsForWorkload(idsToSelect); 
      setIsTeacherSelectionForWorkloadOpen(true); 
  };
  const handleWorkloadConfirm = () => { setIsTeacherSelectionForWorkloadOpen(false); setIsWorkloadPreviewOpen(true); };

  const handleClassTimetableClick = () => {
    setSelectedClassIdsForPrint(visibleClasses.map(c => c.id));
    setIsClassSelectionForPrintOpen(true);
  };
  const handleClassPrintConfirm = () => {
    setIsClassSelectionForPrintOpen(false);
    setIsClassTimetablePreviewOpen(true);
  };

  const handleTeacherTimetableClick = () => {
    setSelectedTeacherIdsForPrint(teachers.map(t => t.id));
    setIsTeacherSelectionForPrintOpen(true);
  };
  const handleTeacherPrintConfirm = () => {
    setIsTeacherSelectionForPrintOpen(false);
    setIsTeacherTimetablePreviewOpen(true);
  };

  const scrollToFeatures = () => featuresSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .deck-container { perspective: 1000px; }
        @keyframes float-light { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(10px, -20px) scale(1.1); } }
        @keyframes rotating-glow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes firefly-float {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            30% { opacity: 1; scale: 1.2; }
            70% { transform: translate(var(--tx1), var(--ty1)) scale(0.8); opacity: 0.8; }
            100% { transform: translate(var(--tx2), var(--ty2)) scale(0.5); opacity: 0; }
        }
        .crystal-reflection { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.2) 25%, rgba(255, 255, 255, 0.4) 30%, transparent 35%, transparent 50%, rgba(255, 255, 255, 0.1) 55%, transparent 60%); background-size: 200% 100%; animation: shimmer 4s infinite linear; pointer-events: none; z-index: 1; }
      `}</style>

      <TimetableSessionModal t={t} isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} session={editingSession} onCreate={onCreateTimetableSession} onUpdate={onUpdateTimetableSession} setFeedback={setFeedback} schoolConfig={schoolConfig} />

      {isBasicInfoSelectionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsBasicInfoSelectionOpen(false)}>
            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]  max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Select Categories</h3>
                <div className="space-y-3 mb-6">
                    {['Primary', 'Elementary', 'Secondary', 'Higher Secondary', 'Extra Rooms'].map(cat => (
                        <label key={cat} className="flex items-center space-x-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={selectedBasicInfoCategories.includes(cat)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedBasicInfoCategories(prev => [...prev, cat]);
                                    } else {
                                        setSelectedBasicInfoCategories(prev => prev.filter(c => c !== cat));
                                    }
                                }}
                                className="h-5 w-5 text-[var(--accent-primary)] rounded border-gray-300 focus:ring-[var(--accent-primary)]"
                            />
                            <span className="text-[var(--text-primary)] font-medium">{cat}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={() => setIsBasicInfoSelectionOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-[1.25rem] transition-colors">Cancel</button>
                    <button onClick={() => {
                        setIsBasicInfoSelectionOpen(false);
                        setIsBasicInfoPreviewOpen(true);
                    }} className="px-4 py-2 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-[1.25rem] transition-colors ">Generate Report</button>
                </div>
            </div>
        </div>
      )}

      {isTeachersTimetableSummarySelectionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsTeachersTimetableSummarySelectionOpen(false)}>
            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]  max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Teachers Timetable Summary</h3>
                <div className="space-y-3 mb-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="radio" 
                            name="teachersTimetableSummaryType"
                            checked={teachersTimetableSummaryType === 'allDays'}
                            onChange={() => setTeachersTimetableSummaryType('allDays')}
                            className="h-5 w-5 text-[var(--accent-primary)] border-gray-300 focus:ring-[var(--accent-primary)]"
                        />
                        <span className="text-[var(--text-primary)] font-medium">All Days</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="radio" 
                            name="teachersTimetableSummaryType"
                            checked={teachersTimetableSummaryType === 'byDays'}
                            onChange={() => setTeachersTimetableSummaryType('byDays')}
                            className="h-5 w-5 text-[var(--accent-primary)] border-gray-300 focus:ring-[var(--accent-primary)]"
                        />
                        <span className="text-[var(--text-primary)] font-medium">By Days</span>
                    </label>
                </div>

                {teachersTimetableSummaryType === 'byDays' && (
                    <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-[2rem] ">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">Select Days</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                const isActive = schoolConfig?.daysConfig?.[day as keyof TimetableGridData]?.active;
                                if (!isActive) return null;
                                return (
                                    <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedDaysForSummary.includes(day)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedDaysForSummary(prev => [...prev, day]);
                                                } else {
                                                    setSelectedDaysForSummary(prev => prev.filter(d => d !== day));
                                                }
                                            }}
                                            className="h-4 w-4 text-[var(--accent-primary)] rounded border-gray-300 focus:ring-[var(--accent-primary)]"
                                        />
                                        <span className="text-sm text-[var(--text-secondary)]">{day}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button onClick={() => setIsTeachersTimetableSummarySelectionOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-[1.25rem] transition-colors">Cancel</button>
                    <button onClick={() => {
                        setIsTeachersTimetableSummarySelectionOpen(false);
                        setIsTeachersTimetableSummaryPreviewOpen(true);
                    }} className="px-4 py-2 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-[1.25rem] transition-colors ">Generate Report</button>
                </div>
            </div>
        </div>
      )}

      {currentTimetableSession && (
        <>
            <SelectionModal isOpen={isTeacherSelectionForWorkloadOpen} title={t.selectTeachersToDownload} items={teacherItems} selectedIds={selectedTeacherIdsForWorkload} onSelect={(id, checked) => setSelectedTeacherIdsForWorkload(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id))} onSelectAll={(checked) => setSelectedTeacherIdsForWorkload(checked ? teachers.map(t => t.id) : [])} onConfirm={handleWorkloadConfirm} onCancel={() => setIsTeacherSelectionForWorkloadOpen(false)} confirmLabel={t.workloadReport} t={t}>
                <div className="mb-4 space-y-4">
                    <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-[1.25rem] ">
                        <button onClick={() => setWorkloadReportMode('weekly')} className={`flex-1 py-2 text-sm font-bold rounded-[1rem] transition-colors ${workloadReportMode === 'weekly' ? 'bg-[var(--accent-primary)] text-white ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Weekly Summary</button>
                        <button onClick={() => setWorkloadReportMode('range')} className={`flex-1 py-2 text-sm font-bold rounded-[1rem] transition-colors ${workloadReportMode === 'range' ? 'bg-[var(--accent-primary)] text-white ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Date Range</button>
                    </div>
                    {workloadReportMode === 'weekly' && (
                        <div className="bg-[var(--bg-tertiary)] p-3 rounded-[1.25rem]  animate-scale-in">
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Select Week (Any date)</label>
                            <input type="date" value={selectedWeekDate} onChange={(e) => setSelectedWeekDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem] text-sm text-[var(--text-primary)]" />
                            <p className="text-[0.625rem] text-[var(--text-secondary)] mt-1">
                                Week: {workloadStartDate} to {workloadEndDate}
                            </p>
                        </div>
                    )}
                    {workloadReportMode === 'range' && (
                        <div className="grid grid-cols-2 gap-3 bg-[var(--bg-tertiary)] p-3 rounded-[1.25rem]  animate-scale-in">
                            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">{t.startDate}</label><input type="date" value={workloadStartDate} onChange={(e) => setWorkloadStartDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem] text-sm text-[var(--text-primary)]" /></div>
                            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">{t.endDate}</label><input type="date" value={workloadEndDate} onChange={(e) => setWorkloadEndDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem] text-sm text-[var(--text-primary)]" /></div>
                        </div>
                    )}
                </div>
            </SelectionModal>
            
            <SelectionModal isOpen={isClassSelectionForPrintOpen} title={t.selectClassesToDownload} items={classItems} selectedIds={selectedClassIdsForPrint} onSelect={(id, checked) => setSelectedClassIdsForPrint(prev => checked ? [...prev, id] : prev.filter(cid => cid !== id))} onSelectAll={(checked) => setSelectedClassIdsForPrint(checked ? visibleClasses.map(c => c.id) : [])} onConfirm={handleClassPrintConfirm} onCancel={() => setIsClassSelectionForPrintOpen(false)} confirmLabel={t.printViewAction} t={t} />
            <SelectionModal isOpen={isTeacherSelectionForPrintOpen} title={t.selectTeachersToDownload} items={teacherItems} selectedIds={selectedTeacherIdsForPrint} onSelect={(id, checked) => setSelectedTeacherIdsForPrint(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id))} onSelectAll={(checked) => setSelectedTeacherIdsForPrint(checked ? teachers.map(t => t.id) : [])} onConfirm={handleTeacherPrintConfirm} onCancel={() => setIsTeacherSelectionForPrintOpen(false)} confirmLabel={t.printViewAction} t={t} />

            <PrintPreview t={t} isOpen={isBasicInfoPreviewOpen} onClose={() => setIsBasicInfoPreviewOpen(false)} title={t.basicInformation} fileNameBase="Basic_Information" generateHtml={(lang, options) => generateBasicInformationHtml(t, lang, options, currentTimetableSession.classes, teachers, schoolConfig, selectedBasicInfoCategories)} onGenerateExcel={(lang, options) => generateBasicInformationExcel(t, lang, options, schoolConfig, currentTimetableSession.classes, teachers, selectedBasicInfoCategories)} designConfig={schoolConfig.downloadDesigns.basicInfo} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, basicInfo: newDesign }})} />
            <PrintPreview t={t} isOpen={isSchoolTimingsPreviewOpen} onClose={() => setIsSchoolTimingsPreviewOpen(false)} title={t.schoolTimings} fileNameBase="School_Timings" generateHtml={(lang, options) => generateSchoolTimingsHtml(t, lang, options, schoolConfig)} onGenerateExcel={(lang, design) => generateSchoolTimingsExcel(t, lang, design, schoolConfig)} designConfig={schoolConfig.downloadDesigns.schoolTimings} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, schoolTimings: newDesign }})} />
            <PrintPreview t={t} isOpen={isByPeriodPreviewOpen} onClose={() => setIsByPeriodPreviewOpen(false)} title={t.byPeriod} fileNameBase="Available_Teachers" generateHtml={(lang, options) => generateByPeriodHtml(t, lang, options, schoolConfig, currentTimetableSession.classes, teachers)} onGenerateExcel={(lang, options) => generateByPeriodExcel(t, lang, options, schoolConfig, currentTimetableSession.classes, teachers)} designConfig={schoolConfig.downloadDesigns.alternative} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, alternative: newDesign }})} />
            <PrintPreview t={t} isOpen={isWorkloadPreviewOpen} onClose={() => setIsWorkloadPreviewOpen(false)} title={t.workloadSummaryReport} fileNameBase="Teacher_Workload_Summary" generateHtml={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForWorkload.includes(t.id)); return generateWorkloadSummaryHtml(t, lang, options, selectedTeachers, schoolConfig, currentTimetableSession.classes, currentTimetableSession.adjustments, currentTimetableSession.leaveDetails, workloadStartDate, workloadEndDate, workloadReportMode); }} onGenerateExcel={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForWorkload.includes(t.id)); generateWorkloadSummaryExcel(t, lang, options, selectedTeachers, schoolConfig, currentTimetableSession.classes, currentTimetableSession.adjustments, currentTimetableSession.leaveDetails, workloadStartDate, workloadEndDate, workloadReportMode) }} designConfig={schoolConfig.downloadDesigns.workload} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, workload: newDesign }})} />
            <PrintPreview t={t} isOpen={isAlternativePreviewOpen} onClose={() => setIsAlternativePreviewOpen(false)} title={t.dailyAdjustments} fileNameBase={`Adjustments_${new Date().toISOString().split('T')[0]}`} generateHtml={(lang, design) => { const today = new Date().toISOString().split('T')[0]; const todayAdjustments = currentTimetableSession.adjustments[today] || []; const todayLeaves = currentTimetableSession.leaveDetails?.[today] || {}; const absentTeacherIds = Object.keys(todayLeaves).filter(key => !key.startsWith('CLASS_')); return generateAdjustmentsReportHtml(t, lang, design, todayAdjustments, teachers, currentTimetableSession.classes, currentTimetableSession.subjects, schoolConfig, today, Array.from(new Set([...absentTeacherIds, ...todayAdjustments.map(adj => adj.originalTeacherId)]))); }} onGenerateExcel={(lang, design) => { const today = new Date().toISOString().split('T')[0]; const todayAdjustments = currentTimetableSession.adjustments[today] || []; generateAdjustmentsExcel(t, lang, design, schoolConfig, todayAdjustments, teachers, currentTimetableSession.classes, currentTimetableSession.subjects, today); }} designConfig={schoolConfig.downloadDesigns.adjustments} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, adjustments: newDesign }})} />
            <PrintPreview t={t} isOpen={isAttendanceReportPreviewOpen} onClose={() => setIsAttendanceReportPreviewOpen(false)} title={t.attendanceReport} fileNameBase={`Attendance_Report_${selectedWeekDate}`} generateHtml={(lang, design) => generateAttendanceReportHtml(t, lang, design, currentTimetableSession.classes, teachers, schoolConfig, selectedWeekDate, currentTimetableSession.adjustments, currentTimetableSession.leaveDetails || {}, currentTimetableSession.attendance || {})} onGenerateExcel={(lang, design) => generateAttendanceReportExcel(t, lang, design, schoolConfig, currentTimetableSession.classes, teachers, selectedWeekDate, currentTimetableSession.adjustments, currentTimetableSession.leaveDetails || {}, currentTimetableSession.attendance || {})} designConfig={schoolConfig.downloadDesigns.attendance} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, attendance: newDesign }})} />
            
            <PrintPreview t={t} isOpen={isClassTimetablePreviewOpen} onClose={() => setIsClassTimetablePreviewOpen(false)} title={t.classTimetable} fileNameBase="Class_Timetables" generateHtml={(lang, options) => { const selectedClasses = visibleClasses.filter(c => selectedClassIdsForPrint.includes(c.id)); return (selectedClasses.map(c => generateClassTimetableHtml(c, lang, options, teachers, currentTimetableSession.subjects, schoolConfig)) as any).flat(); }} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, class: newDesign }})} />
            <PrintPreview t={t} isOpen={isTeacherTimetablePreviewOpen} onClose={() => setIsTeacherTimetablePreviewOpen(false)} title={t.teacherTimetable} fileNameBase="Teacher_Timetables" generateHtml={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForPrint.includes(t.id)); return (selectedTeachers.map(t => generateTeacherTimetableHtml(t, lang, options, classes, subjects, schoolConfig, currentTimetableSession.adjustments, teachers)) as any).flat(); }} designConfig={schoolConfig.downloadDesigns.teacher} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }})} />
        </>
      )}
      
      {isSelectSessionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity" onClick={() => setIsSelectSessionModalOpen(false)}>
            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]  max-w-2xl w-full mx-4 transform transition-all flex flex-col max-h-[90vh] " onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-[var(--border-primary)]">
                    <div className="flex flex-wrap justify-between items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter flex items-center gap-4">
                                {t.manageTimetables}
                                {saveStatus && saveStatus !== 'idle' && (
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                        saveStatus === 'saving' ? 'bg-amber-100/80 text-amber-700 animate-pulse' :
                                        saveStatus === 'success' ? 'bg-green-100/80 text-green-700' :
                                        'bg-red-100/80 text-red-700'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            saveStatus === 'saving' ? 'bg-amber-500' :
                                            saveStatus === 'success' ? 'bg-green-500' :
                                            'bg-red-500'
                                        }`}></div>
                                        {saveStatus === 'saving' ? 'Saving to Cloud...' : 
                                         saveStatus === 'success' ? 'Saved Successfully' : 
                                         'Sync Error'}
                                    </div>
                                )}
                            </h2>
                            <p className="text-[var(--text-secondary)] mt-1 font-bold text-xs uppercase tracking-widest">{t.selectOrCreateDescription}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {isAdmin && (
                                <button onClick={handleCreateNew} className="px-6 py-3 text-sm font-black uppercase tracking-widest bg-[var(--accent-primary)] text-white rounded-[2rem]  hover:bg-[var(--accent-primary-hover)] transition-all transform hover:-translate-y-1">{t.newTimetableSession}</button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-8 flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-8">
                    {feedback.message && <div className={`p-4 rounded-[2rem] text-sm font-bold animate-scale-in flex items-center gap-3 ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}><div className={`w-2 h-2 rounded-full ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>{feedback.message}</div>}
                    {timetableSessions.length === 0 ? <div className="text-center py-16 opacity-40 flex flex-col items-center gap-4"><div className="w-16 h-16 rounded-full border-4 border-dashed border-current flex items-center justify-center"><CloseIcon /></div><p className="font-bold text-lg uppercase tracking-widest">{t.noTimetableSessions}</p></div> : (
                        <>
                            {/* My Creations */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888] ml-2">My Creations</h3>
                                {timetableSessions.filter(s => !s.isShared).length === 0 && <div className="text-sm font-bold text-gray-400 ml-2">No creations yet.</div>}
                                {timetableSessions.filter(s => !s.isShared).map(session => (
                                    <div key={session.id} className="flex flex-col gap-2">
                                        <div className={`group p-6 rounded-[2rem] flex items-center justify-between transition-all duration-300 cursor-pointer ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-secondary)] border-2 border-[var(--accent-primary)] ' : 'bg-[var(--bg-tertiary)] border-2 border-transparent hover:bg-[var(--bg-tertiary)]/80 hover:scale-[1.01]'}`} onClick={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-[2rem] flex items-center justify-center font-black text-xl  transition-transform group-hover:rotate-12 ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-primary)] text-white' : 'bg-white dark:bg-black/20 text-[var(--text-secondary)]'}`}>
                                                    {(session.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight leading-none mb-2 truncate">{session.name}</h4>
                                                    <div className="flex items-center gap-3 text-[0.625rem] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">
                                                        <span className="px-2 py-0.5 bg-white/40 dark:bg-black/20 rounded-[1.25rem]">{new Date(session.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                        <span className="text-[var(--accent-primary)]">➔</span>
                                                        <span className="px-2 py-0.5 bg-white/40 dark:bg-black/20 rounded-[1.25rem]">{new Date(session.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => { setPermissionSession(session); setIsPermissionsModalOpen(true); }} 
                                                    className="p-3 text-[var(--text-secondary)] hover:text-emerald-600 rounded-full hover:bg-white transition-all shadow-sm"
                                                    title="Manage Teacher Permissions"
                                                >
                                                    <Lock className="h-5 w-5" />
                                                </button>
                                                <button 
                                                    onClick={() => onSaveToCloud(session)} 
                                                    className="p-3 text-[var(--text-secondary)] hover:text-indigo-600 rounded-full hover:bg-white transition-all shadow-sm"
                                                    title="Publish/Share with Teachers"
                                                >
                                                    <Shuffle className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => handleEditSession(session)} className="p-3 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-white transition-all shadow-sm" title="Edit Session details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                                <button onClick={() => onDeleteTimetableSession(session.id)} className="p-3 text-[var(--text-secondary)] hover:text-red-600 rounded-full hover:bg-red-50 transition-all shadow-sm" title="Delete Session"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-start px-4 items-center mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-4">Sharing Enabled</span>
                                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={session.allowEdit === true}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.checked;
                                                        const updatedSession = { ...session, allowEdit: newVal };
                                                        await onSaveToCloud(updatedSession);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-primary)]"></div>
                                            </label>
                                            <span className="ml-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest shadow-sm">
                                                {session.allowEdit ? 'Teachers Can Edit' : 'View Only for Teachers'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Shared with Me */}
                            {timetableSessions.some(s => s.isShared) && (
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-2">Shared with Me</h3>
                                    {timetableSessions.filter(s => s.isShared).map(session => (
                                        <div key={session.id} className={`group p-6 rounded-[2rem] flex items-center justify-between transition-all duration-300 cursor-pointer border-2 ${session.id === currentTimetableSessionId ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'}`} onClick={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-[2rem] flex items-center justify-center font-black text-xl  transition-transform group-hover:rotate-12 ${session.id === currentTimetableSessionId ? 'bg-white text-indigo-600 shadow-inner' : 'bg-indigo-100 dark:bg-black/20 text-indigo-600 shadow-inner'}`}>
                                                    {(session.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-xl uppercase tracking-tight leading-none mb-2 truncate">{session.name}</h4>
                                                    <div className="flex items-center gap-3 text-[0.625rem] font-black uppercase tracking-widest opacity-70">
                                                        <span className="px-2 py-0.5 bg-black/5 dark:bg-black/20 rounded-[1.25rem]">{new Date(session.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                        <span>➔</span>
                                                        <span className="px-2 py-0.5 bg-black/5 dark:bg-black/20 rounded-[1.25rem]">{new Date(session.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                {session.canEdit ? (
                                                    <button onClick={() => handleEditSession(session)} className="p-3 text-indigo-600 hover:bg-white rounded-full transition-all shadow-sm" title="Edit Session details"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-1 bg-black/5 dark:bg-black/20 rounded-full">View Only</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="p-8 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={() => setIsSelectSessionModalOpen(false)} className="px-8 py-3 text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-[2rem] hover:bg-[var(--accent-secondary-hover)] transition-all">{t.close}</button>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header - Static */}
        <header className="fixed top-0 left-0 right-0 z-40 py-6">
          <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4 w-full">
                {/* Logo or School Icon */}
                <div 
                    className="flex-shrink-0 h-10 w-10 cursor-pointer hover:scale-110 transition-transform duration-300"
                    onClick={() => setIsProfileModalOpen(true)}
                >
                    {schoolConfig.schoolLogoBase64 ? (
                        <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-10 w-10 object-contain rounded-full shadow-sm" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl">M</div>
                    )}
                </div>
                
                {/* Titles */}
                <div className="flex flex-col flex-grow">
                    <span className="font-black text-gray-900 dark:text-white tracking-tight max-w-[80vw] text-2xl leading-none truncate">
                        Mr. Timetable
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 tracking-wide mt-0.5 text-[0.6rem] uppercase">
                        Timetable Management System
                    </span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <button 
                            onClick={() => setIsAdminPanelOpen(true)}
                            className="p-2.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95 bg-white/50 dark:bg-black/20 rounded-[1.25rem] border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                            title="Admin Control Center"
                        >
                            <Shield className="w-5 h-5" />
                        </button>
                    )}
                    {currentTimetableSession && (
                        <button onClick={() => setIsSearchOpen(true)} className="p-2.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95" title="Search">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
          </div>
        </header>

        {isSearchOpen && currentTimetableSession && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-start justify-center pt-20 animate-fade-in px-4" onClick={() => setIsSearchOpen(false)}>
                <div className="w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}><GlobalSearch t={t} language={language} classes={currentTimetableSession.classes} teachers={currentTimetableSession.teachers} subjects={currentTimetableSession.subjects} onResultClick={(type, id) => { onSearchResultClick(type, id); setIsSearchOpen(false); }} autoFocus={true} className="" /></div>
            </div>
        )}

        <main className="flex-grow container mx-auto px-4 flex flex-col items-center pt-28 pb-10">
            <div className="w-full animate-scale-in max-w-7xl relative flex flex-col items-center mt-4">
                <DigitalClock language={language} schoolConfig={schoolConfig} t={t} vacations={currentTimetableSession?.vacations} />
                
                <LivePeriodTracker session={currentTimetableSession} schoolConfig={schoolConfig} language={language} />

                {currentTimetableSession && (
                    <div className="w-full mt-8 sm:mt-12 px-4">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">DOCUMENTS</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                            
                            <DocumentCard index={0} title={t.basicInformation} subtitle="STATS & ROOMS" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} colorTheme="blue" onClick={() => setIsBasicInfoSelectionOpen(true)} />
                            
                            <DocumentCard index={1} title={t.byPeriod} subtitle="AVAILABLE MATRIX" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorTheme="cyan" onClick={() => setIsByPeriodPreviewOpen(true)} />
                            
                            <DocumentCard index={2} title={t.schoolTimings} subtitle="BELL SCHEDULE" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorTheme="orange" onClick={() => setIsSchoolTimingsPreviewOpen(true)} />
                            
                            <DocumentCard index={3} title={t.workloadSummaryReport} subtitle="EFFORT ANALYTICS" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} colorTheme="rose" onClick={workloadReportClick} />
                            
                            <DocumentCard index={4} title={t.classTimetable} subtitle="CLASS SCHEDULES" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>} colorTheme="violet" onClick={handleClassTimetableClick} />

                            <DocumentCard index={5} title={t.teacherTimetable} subtitle="TEACHER SCHEDULES" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} colorTheme="emerald" onClick={handleTeacherTimetableClick} />

                            <DocumentCard index={6} title={t.alternative} subtitle="SUBSTITUTION REGISTERS" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>} colorTheme="indigo" onClick={() => setIsAlternativePreviewOpen(true)} />
                            
                            <DocumentCard index={7} title={t.attendanceReport} subtitle="ENROLLMENT DATA" icon={<AttendanceIcon className="h-6 w-6" />} colorTheme="teal" onClick={() => setIsAttendanceReportPreviewOpen(true)} />
                            
                            <DocumentCard index={8} title="Teachers Timetable Summary" subtitle="SUMMARY" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} colorTheme="amber" onClick={() => setIsTeachersTimetableSummarySelectionOpen(true)} />
                        </div>
                    </div>
                )}

            </div>
        </main>

      </div>

      {isCsvModalOpen && currentTimetableSession && (
          <CsvManagementModal
              t={t}
              isOpen={isCsvModalOpen}
              onClose={() => setIsCsvModalOpen(false)}
              currentTimetableSession={currentTimetableSession}
              onUpdateTimetableSession={onUpdateCurrentSession}
          />
      )}

      {isTeachersTimetableSummaryPreviewOpen && currentTimetableSession && schoolConfig && (
        <PrintPreview
          t={t}
          isOpen={isTeachersTimetableSummaryPreviewOpen}
          onClose={() => setIsTeachersTimetableSummaryPreviewOpen(false)}
          title="Teachers Timetable Summary"
          fileNameBase="Teachers_Timetable_Summary"
          generateHtml={(lang, options) => generateTeachersTimetableSummaryHtml(currentTimetableSession, schoolConfig, lang, teachersTimetableSummaryType, selectedDaysForSummary, options)}
          designConfig={{
              ...(schoolConfig.downloadDesigns.teachersTimetableSummary || {
                  ...schoolConfig.downloadDesigns.basicInfo,
                  header: { ...schoolConfig.downloadDesigns.basicInfo.header, showDate: false },
                  table: { ...schoolConfig.downloadDesigns.basicInfo.table, fontSize: 10, headerFontSize: 12 }
              }),
              page: {
                  ...(schoolConfig.downloadDesigns.teachersTimetableSummary?.page || schoolConfig.downloadDesigns.basicInfo.page),
                  orientation: teachersTimetableSummaryType === 'allDays' ? 'landscape' : 'portrait'
              }
          }}
          onSaveDesign={(newDesign) => {
              onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, teachersTimetableSummary: newDesign } });
          }}
        />
      )}

      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userEmail={userEmail}
        userRole={userRole || 'teacher'}
        userId={userId}
        canEditGlobal={canEditGlobal}
        sessions={timetableSessions}
        currentSessionId={currentTimetableSessionId}
        onSelectSession={setCurrentTimetableSessionId}
        onUploadSession={(file) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const rawData = JSON.parse(e.target?.result as string);
                    const { schoolLogoBase64, ...session } = rawData;
                    onUploadTimetableSession(session, schoolLogoBase64 ? { schoolLogoBase64 } : undefined);
                    setFeedback({ message: t.sessionUploadedSuccessfully.replace('{name}', session.name), type: 'success' });
                } catch (error: any) {
                    setFeedback({ message: t.failedToUploadSession.replace('{reason}', error.message), type: 'error' });
                }
            };
            reader.readAsText(file);
        }}
        onOpenImportExport={() => {
            setIsProfileModalOpen(false);
            if (!currentTimetableSessionId) {
                setFeedback({ message: t.createSessionFirst || 'Please create a timetable session first before importing data.', type: 'error' });
                setIsSessionModalOpen(true);
                setEditingSession(null);
            } else {
                setIsImportExportChoiceOpen(true);
            }
        }}
        onOpenCreateModal={() => {
            setIsProfileModalOpen(false);
            setIsSessionModalOpen(true);
            setEditingSession(null);
        }}
        onSetDefaultSession={onSetDefaultSession}
        onDeleteSessionFromBackend={onDeleteSessionFromBackend}
        onSignOut={() => {
            setIsProfileModalOpen(false);
            onSignOut();
        }}
        onCreateSession={onCreateTimetableSession}
        onSaveToCloud={onSaveToCloud}
        t={t}
      />

      <ImportExportChoiceModal 
        t={t}
        isOpen={isImportExportChoiceOpen}
        onClose={() => setIsImportExportChoiceOpen(false)}
        onOpenCsv={() => {
            setIsImportExportChoiceOpen(false);
            setIsCsvModalOpen(true);
        }}
        onOpenBackup={() => {
            setIsImportExportChoiceOpen(false);
            setIsBackupRestoreOpen(true);
        }}
      />

      {isBackupRestoreOpen && (
        <BackupRestoreModal 
            t={t}
            isOpen={isBackupRestoreOpen}
            onClose={() => setIsBackupRestoreOpen(false)}
            userData={userData}
            onRestore={onRestoreData}
        />
      )}

      {isAdminPanelOpen && (
          <AdminPanel 
            t={t}
            onClose={() => setIsAdminPanelOpen(false)}
            currentSession={currentTimetableSession}
            onUpdateSession={onUpdateTimetableSession}
            userEmail={userEmail}
            userId={userId}
            userRole={userRole}
            onDeleteSession={onDeleteSessionFromBackend}
          />
      )}

      {isPermissionsModalOpen && permissionSession && (
        <PermissionsModal 
          isOpen={isPermissionsModalOpen}
          onClose={() => setIsPermissionsModalOpen(false)}
          session={permissionSession}
          onTogglePermission={(email) => handleToggleTeacherPermission(permissionSession, email)}
          t={t}
        />
      )}
    </>
  );
};

export default HomePage;
