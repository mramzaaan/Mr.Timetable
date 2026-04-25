
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Language, Page, TimetableSession, SchoolConfig, TimetableGridData, DownloadDesignConfig, DownloadDesigns, Vacation } from '../types';
import TimetableSessionModal from './TimetableSessionModal';
import GlobalSearch from './GlobalSearch';
import PrintPreview from './PrintPreview';
import LivePeriodTracker from './LivePeriodTracker';
import CsvManagementModal from './CsvManagementModal';
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
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{title}</h3>
        {children}
        <div className="flex-grow border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg overflow-y-auto p-3 space-y-2 custom-scrollbar">
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
            <label key={item.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-md hover:bg-[var(--accent-secondary-hover)]">
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
          <button onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.cancel}</button>
          <button onClick={onConfirm} disabled={selectedIds.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors shadow-sm">{confirmLabel}</button>
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
  onUploadTimetableSession: (session: TimetableSession, newSchoolConfig?: Partial<SchoolConfig>) => void;
  schoolConfig: SchoolConfig;
  onUpdateCurrentSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onSearchResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  onOpenSchoolInfo: () => void;
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
  School
} from 'lucide-react';

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
            <div className="relative w-full h-full drop-shadow-xl transition-transform duration-300 group-hover:scale-[1.02]">
                
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
                    className="absolute inset-0 bg-white dark:bg-gray-800 flex flex-col pt-12 pb-6 pl-6 pr-12 text-left"
                    style={{ 
                        clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)'
                    }}
                >
                    {/* Content */}
                    <div className="mt-2 flex flex-col items-start gap-2 w-full">
                        <h4 className={`text-lg font-black ${theme.text} uppercase tracking-tight leading-tight line-clamp-2`}>{title}</h4>
                        <div className="w-12 h-1 rounded-full bg-gray-100 dark:bg-white/10 my-1"></div>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest leading-relaxed line-clamp-3">{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Floating Icon (Outside Clip) */}
            <div className="absolute -top-4 left-6 z-20">
                <div className="relative w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:-translate-y-1">
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

const Fireflies = ({ colorClass, isMixed }: { colorClass: string, isMixed?: boolean }) => {
    const mixedColors = ['text-teal-300', 'text-orange-300', 'text-emerald-300', 'text-cyan-300', 'text-amber-300', 'text-rose-300'];
    
    const fireflies = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 50 + 50}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
        tx1: `${Math.random() * 30 - 15}px`,
        ty1: `-${Math.random() * 30 + 10}px`,
        tx2: `${Math.random() * 40 - 20}px`,
        ty2: `-${Math.random() * 40 + 40}px`,
        color: isMixed ? mixedColors[Math.floor(Math.random() * mixedColors.length)] : colorClass,
    })), [isMixed, colorClass]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
            {fireflies.map((ff) => (
                <div
                    key={ff.id}
                    className={`absolute w-1 h-1 rounded-full bg-white ${ff.color} opacity-0`}
                    style={{
                        left: ff.left,
                        top: ff.top,
                        animation: `firefly-float ${ff.animationDuration} ease-in-out ${ff.animationDelay} infinite alternate`,
                        boxShadow: `0 0 8px 3px currentColor`,
                        '--tx1': ff.tx1,
                        '--ty1': ff.ty1,
                        '--tx2': ff.tx2,
                        '--ty2': ff.ty2,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

const FeatureCard: React.FC<{
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    theme: string;
    index: number;
    isActive: boolean;
    style?: React.CSSProperties;
    className?: string;
}> = ({ label, description, icon: IconComponent, onClick, theme, index, isActive, style, className }) => {
    const colors: Record<string, { text: string, bg: string, border: string, shadow: string, glow: string, firefly: string, isMixed?: boolean }> = {
        teal: { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500', border: 'border-teal-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(20,184,166,0.4)]', firefly: 'text-teal-300' },
        orange: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(249,115,22,0.4)]', firefly: 'text-orange-300' },
        emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(16,185,129,0.4)]', firefly: 'text-emerald-300' },
        blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(59,130,246,0.4)]', firefly: 'text-blue-300' },
        violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500', border: 'border-violet-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(139,92,246,0.4)]', firefly: '', isMixed: true },
        indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500', border: 'border-indigo-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(99,102,241,0.4)]', firefly: '', isMixed: true },
        slate: { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(100,116,139,0.4)]', firefly: '', isMixed: true },
        cyan: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(6,182,212,0.4)]', firefly: 'text-cyan-300' },
        amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(245,158,11,0.4)]', firefly: 'text-amber-300' },
        rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/70', shadow: 'shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]', glow: 'shadow-[inset_0_0_20px_rgba(244,63,94,0.4)]', firefly: 'text-rose-300' },
    };
    
    const color = colors[theme] || colors.blue;

    return (
        <button
            onClick={onClick}
            style={style}
            className={`${className || 'absolute w-[8.75rem] sm:w-[11.25rem] aspect-[4/5]'} flex-shrink-0 bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] ${color.shadow} ${color.glow} hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-all duration-300 group overflow-hidden border ${color.border} hover:bg-white/50 dark:hover:bg-white/15
            ${isActive ? 'cursor-pointer scale-100 opacity-100' : 'cursor-default scale-95 opacity-70'}
            `}
        >
            <Fireflies colorClass={color.firefly} isMixed={color.isMixed} />
            <div className="h-full flex flex-col items-center justify-center p-2 sm:p-4 relative z-10">
                {/* Icon */}
                <div className={`mb-2 sm:mb-4 ${color.text} transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                    <IconComponent className="h-12 w-12 sm:h-16 sm:w-16" />
                </div>

                {/* Text */}
                <div className="text-center">
                    <h3 className={`text-sm sm:text-lg font-medium text-gray-800 dark:text-white/90 tracking-wide mb-0.5 sm:mb-1`}>
                        {label}
                    </h3>
                    <p className="hidden sm:block text-[0.625rem] sm:text-xs text-gray-500 dark:text-white/50 font-light leading-relaxed line-clamp-1">
                        {description}
                    </p>
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
            <div className="relative overflow-hidden w-full bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2rem] sm:rounded-[3rem] transition-all duration-300 hover:shadow-cyan-500/10">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur-[5rem] opacity-10 animate-pulse pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-[5rem] opacity-10 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
                <div className="relative z-10 p-5 sm:p-8 lg:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 lg:gap-12 text-center md:text-left">
                    <div className="flex flex-col items-center md:items-start md:flex-[0.8] md:min-w-0">
                        <h1 className="text-[4rem] xs:text-[5rem] sm:text-[6.5rem] md:text-[3rem] lg:text-[3.5rem] xl:text-[4.5rem] font-black tracking-tighter text-gray-900 dark:text-white select-none whitespace-normal sm:whitespace-nowrap animate-alive leading-none mb-1 flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {time.toLocaleTimeString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </h1>
                        <div className="flex flex-col items-center md:items-start w-full gap-0 sm:gap-1">
                            <p className="text-xs sm:text-xl lg:text-lg font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-indigo-500 select-none mt-1 truncate w-full">{formattedDay}</p>
                            <p className="text-[0.5625rem] sm:text-lg lg:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-gray-400 select-none truncate w-full">{formattedDateOnly}</p>
                        </div>
                    </div>
                    {cardData && (
                        <div className="w-full md:max-w-none md:flex-[1.2] bg-white/20 dark:bg-black/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-white/40 shadow-xl backdrop-blur-md transition-transform duration-300 hover:scale-[1.01] animate-alive flex flex-col justify-center" style={{ animationDelay: '1s' }}>
                            <div className="flex justify-between items-center mb-3 sm:mb-6">
                                <h2 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white tracking-tight truncate pr-2">{cardData.title}</h2>
                                <span className="px-3 sm:px-4 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/30 text-[0.5rem] sm:text-[0.625rem] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300 shadow-sm whitespace-nowrap">{cardData.badge}</span>
                            </div>
                            <div className="flex justify-between items-end text-[0.5625rem] sm:text-[0.75rem] font-black text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 uppercase tracking-widest gap-2">
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

const HomePage: React.FC<HomePageProps> = ({ t, language, setCurrentPage, currentTimetableSessionId, timetableSessions, setCurrentTimetableSessionId, onCreateTimetableSession, onUpdateTimetableSession, onDeleteTimetableSession, onUploadTimetableSession, schoolConfig, onUpdateCurrentSession, onSearchResultClick, onUpdateSchoolConfig, onOpenSchoolInfo }) => {
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [isSelectSessionModalOpen, setIsSelectSessionModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  
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
  const [selectedBasicInfoCategories, setSelectedBasicInfoCategories] = useState<string[]>(['Primary', 'Middle', 'High', 'Extra Rooms']);
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

  const handleCreateNew = () => { setEditingSession(null); setIsSelectSessionModalOpen(false); setIsSessionModalOpen(true); };
  const handleEditSession = (session: TimetableSession) => { setEditingSession(session); setIsSelectSessionModalOpen(false); setIsSessionModalOpen(true); };
  
  const handleDownloadSession = () => {
    if (!currentTimetableSession) return;
    const exportData = {
        ...currentTimetableSession,
        schoolLogoBase64: schoolConfig.schoolLogoBase64
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timetable_session_${currentTimetableSession.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const navigationModules = [
      { id: 'dataEntry', label: t.dataEntry, description: 'Classes & Staff', icon: DataEntryIcon, theme: 'amber', dotColor: 'bg-amber-500', action: () => setCurrentPage('dataEntry') },
      { id: 'classTimetable', label: t.class, description: 'Class Schedules', icon: ClassTimetableIcon, theme: 'cyan', dotColor: 'bg-cyan-500', action: () => setCurrentPage('classTimetable') },
      { id: 'teacherTimetable', label: t.teacher, description: 'Teacher Schedules', icon: TeacherTimetableIcon, theme: 'indigo', dotColor: 'bg-indigo-500', action: () => setCurrentPage('teacherTimetable') },
      { id: 'adjustments', label: t.adjustments, description: 'Substitutions', icon: AdjustmentsIcon, theme: 'orange', dotColor: 'bg-orange-500', action: () => setCurrentPage('alternativeTimetable') },
      { id: 'reports', label: t.printAndReports, description: 'Reports', icon: DesignIcon, theme: 'blue', dotColor: 'bg-blue-500', action: () => setIsReportsModalOpen(true) },
      { id: 'attendance', label: t.attendance, description: 'Daily Presence', icon: AttendanceIcon, theme: 'teal', dotColor: 'bg-teal-500', action: () => setCurrentPage('attendance') },
      { id: 'csv', label: t.manageDataCsv, description: 'Import/Export', icon: CsvIcon, theme: 'rose', dotColor: 'bg-rose-500', action: () => setIsCsvModalOpen(true) },
      { id: 'settings', label: t.settings, description: 'System Config', icon: SettingsIcon, theme: 'slate', dotColor: 'bg-slate-500', action: () => setCurrentPage('settings') },
  ];

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

      <TimetableSessionModal t={t} isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} session={editingSession} onCreate={onCreateTimetableSession} onUpdate={onUpdateTimetableSession} setFeedback={setFeedback} />

      {isReportsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsReportsModalOpen(false)}>
            <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-2xl max-w-5xl w-full p-6 sm:p-8 animate-scale-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">DOCUMENTS</h3>
                    <button onClick={() => setIsReportsModalOpen(false)} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"><CloseIcon /></button>
                </div>
                <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar pb-2 no-scrollbar">
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
            </div>
        </div>
      )}

      {isBasicInfoSelectionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsBasicInfoSelectionOpen(false)}>
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Select Categories</h3>
                <div className="space-y-3 mb-6">
                    {['Primary', 'Middle', 'High', 'Extra Rooms'].map(cat => (
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
                    <button onClick={() => setIsBasicInfoSelectionOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => {
                        setIsBasicInfoSelectionOpen(false);
                        setIsBasicInfoPreviewOpen(true);
                    }} className="px-4 py-2 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-lg transition-colors shadow-md">Generate Report</button>
                </div>
            </div>
        </div>
      )}

      {isTeachersTimetableSummarySelectionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsTeachersTimetableSummarySelectionOpen(false)}>
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
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
                    <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-secondary)]">
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
                    <button onClick={() => setIsTeachersTimetableSummarySelectionOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
                    <button onClick={() => {
                        setIsTeachersTimetableSummarySelectionOpen(false);
                        setIsTeachersTimetableSummaryPreviewOpen(true);
                    }} className="px-4 py-2 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-lg transition-colors shadow-md">Generate Report</button>
                </div>
            </div>
        </div>
      )}

      {currentTimetableSession && (
        <>
            <SelectionModal isOpen={isTeacherSelectionForWorkloadOpen} title={t.selectTeachersToDownload} items={teacherItems} selectedIds={selectedTeacherIdsForWorkload} onSelect={(id, checked) => setSelectedTeacherIdsForWorkload(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id))} onSelectAll={(checked) => setSelectedTeacherIdsForWorkload(checked ? teachers.map(t => t.id) : [])} onConfirm={handleWorkloadConfirm} onCancel={() => setIsTeacherSelectionForWorkloadOpen(false)} confirmLabel={t.workloadReport} t={t}>
                <div className="mb-4 space-y-4">
                    <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-secondary)]">
                        <button onClick={() => setWorkloadReportMode('weekly')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${workloadReportMode === 'weekly' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Weekly Summary</button>
                        <button onClick={() => setWorkloadReportMode('range')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${workloadReportMode === 'range' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Date Range</button>
                    </div>
                    {workloadReportMode === 'weekly' && (
                        <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-secondary)] animate-scale-in">
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Select Week (Any date)</label>
                            <input type="date" value={selectedWeekDate} onChange={(e) => setSelectedWeekDate(e.target.value)} className="block w-full px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md text-sm text-[var(--text-primary)]" />
                            <p className="text-[0.625rem] text-[var(--text-secondary)] mt-1">
                                Week: {workloadStartDate} to {workloadEndDate}
                            </p>
                        </div>
                    )}
                    {workloadReportMode === 'range' && (
                        <div className="grid grid-cols-2 gap-3 bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-secondary)] animate-scale-in">
                            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">{t.startDate}</label><input type="date" value={workloadStartDate} onChange={(e) => setWorkloadStartDate(e.target.value)} className="block w-full px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md text-sm text-[var(--text-primary)]" /></div>
                            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">{t.endDate}</label><input type="date" value={workloadEndDate} onChange={(e) => setWorkloadEndDate(e.target.value)} className="block w-full px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md text-sm text-[var(--text-primary)]" /></div>
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
            <div className="bg-[var(--bg-secondary)] rounded-3xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all flex flex-col max-h-[90vh] border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-[var(--border-primary)]">
                    <div className="flex flex-wrap justify-between items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{t.manageTimetables}</h2>
                            <p className="text-[var(--text-secondary)] mt-1 font-bold text-xs uppercase tracking-widest">{t.selectOrCreateDescription}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={handleCreateNew} className="px-6 py-3 text-sm font-black uppercase tracking-widest bg-[var(--accent-primary)] text-white rounded-2xl shadow-lg hover:bg-[var(--accent-primary-hover)] transition-all transform hover:-translate-y-1">{t.newTimetableSession}</button>
                            <button onClick={() => uploadRef.current?.click()} className="px-6 py-3 text-sm font-black uppercase tracking-widest bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-2xl hover:bg-[var(--accent-secondary-hover)] transition-all transform hover:-translate-y-1 border border-[var(--border-primary)]">{t.uploadSession}</button>
                            <button 
                                onClick={handleDownloadSession} 
                                disabled={!currentTimetableSession}
                                className="px-6 py-3 text-sm font-black uppercase tracking-widest bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-2xl hover:bg-[var(--accent-secondary-hover)] transition-all transform hover:-translate-y-1 border border-[var(--border-primary)] disabled:opacity-50 disabled:transform-none"
                            >
                                {t.downloadSession}
                            </button>
                            <input type="file" ref={uploadRef} className="hidden" accept=".json" onChange={(e) => e.target.files && (async (file: File) => { try { const data = JSON.parse(await file.text()); onUploadTimetableSession(data, data.schoolLogoBase64 ? { schoolLogoBase64: data.schoolLogoBase64 } : undefined); setFeedback({ message: t.sessionUploadedSuccessfully.replace('{name}', data.name), type: 'success' }); setIsSelectSessionModalOpen(false); } catch (error: any) { setFeedback({ message: t.failedToUploadSession.replace('{reason}', error.message), type: 'error' }); } })(e.target.files[0])} />
                        </div>
                    </div>
                </div>
                <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
                    {feedback.message && <div className={`p-4 rounded-2xl text-sm font-bold mb-6 animate-scale-in flex items-center gap-3 ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}><div className={`w-2 h-2 rounded-full ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>{feedback.message}</div>}
                    {timetableSessions.length === 0 ? <div className="text-center py-16 opacity-40 flex flex-col items-center gap-4"><div className="w-16 h-16 rounded-full border-4 border-dashed border-current flex items-center justify-center"><CloseIcon /></div><p className="font-bold text-lg uppercase tracking-widest">{t.noTimetableSessions}</p></div> : (
                        <div className="space-y-4">
                        {timetableSessions.map(session => (
                            <div key={session.id} className={`group p-6 rounded-[2rem] flex items-center justify-between transition-all duration-300 cursor-pointer ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-secondary)] border-2 border-[var(--accent-primary)] shadow-2xl' : 'bg-[var(--bg-tertiary)] border-2 border-transparent hover:bg-[var(--bg-tertiary)]/80 hover:scale-[1.01]'}`} onClick={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-12 ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-primary)] text-white' : 'bg-white dark:bg-black/20 text-[var(--text-secondary)]'}`}>
                                        {(session.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight leading-none mb-2">{session.name}</h4>
                                        <div className="flex items-center gap-3 text-[0.625rem] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">
                                            <span className="px-2 py-0.5 bg-white/40 dark:bg-black/20 rounded-lg">{new Date(session.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            <span className="text-[var(--accent-primary)]">➔</span>
                                            <span className="px-2 py-0.5 bg-white/40 dark:bg-black/20 rounded-lg">{new Date(session.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEditSession(session)} className="p-3 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-white transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => onDeleteTimetableSession(session.id)} className="p-3 text-[var(--text-secondary)] hover:text-red-600 rounded-full hover:bg-red-50 transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                <div className="p-8 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={() => setIsSelectSessionModalOpen(false)} className="px-8 py-3 text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-2xl hover:bg-[var(--accent-secondary-hover)] transition-all">{t.close}</button>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* Header - Visible on Home since SideNavBar is hidden */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-transparent border-none shadow-none transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-50"></div>
          <div className="container mx-auto px-4 py-3 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
               {schoolConfig.schoolLogoBase64 && <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-10 w-10 object-contain rounded-full shadow-lg border-2 border-white/20" />}
               <div className="flex flex-col justify-center"><span className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">Mr. Timetable</span><span className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">Timetable Management System</span></div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
                {currentTimetableSession && (
                    <button onClick={() => setIsSearchOpen(true)} className="p-3 text-gray-400 bg-white/20 dark:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-white shadow-xl backdrop-blur-md border border-white/40 transition-all duration-300" title="Search"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                )}
            </div>
          </div>
        </header>

        {isSearchOpen && currentTimetableSession && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-20 animate-fade-in px-4" onClick={() => setIsSearchOpen(false)}>
                <div className="w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}><GlobalSearch t={t} language={language} classes={currentTimetableSession.classes} teachers={currentTimetableSession.teachers} subjects={currentTimetableSession.subjects} onResultClick={(type, id) => { onSearchResultClick(type, id); setIsSearchOpen(false); }} autoFocus={true} className="shadow-2xl" /></div>
            </div>
        )}

        <main className="flex-grow container mx-auto px-4 pt-20 pb-4 flex flex-col items-center justify-center min-h-[90vh]">
            <div className="w-full animate-scale-in max-w-7xl relative flex flex-col items-center">
                <DigitalClock language={language} schoolConfig={schoolConfig} t={t} vacations={currentTimetableSession?.vacations} />
                
                {/* Active Session Card */}
                {currentTimetableSession ? (
                    <div className="mb-8 relative group max-w-lg mx-auto w-full px-4">
                        <div 
                          onClick={() => setIsSelectSessionModalOpen(true)}
                          className="relative cursor-pointer group/card rounded-[2rem] py-2 px-4 shadow-sm border-2 border-[var(--accent-primary)] bg-white/40 dark:bg-white/5 backdrop-blur-md overflow-hidden transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex flex-row items-center justify-start gap-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                                {currentTimetableSession.name ? currentTimetableSession.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col items-start justify-center flex-grow">
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                                  {currentTimetableSession.name || 'Untitled Session'}
                                </h2>
                                <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                    {new Date(currentTimetableSession.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    {' to '}
                                    {new Date(currentTimetableSession.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 relative group max-w-lg mx-auto w-full px-4">
                        <div 
                          onClick={() => setIsSelectSessionModalOpen(true)}
                          className="relative cursor-pointer group/card rounded-[2rem] py-2 px-4 shadow-sm border-2 border-dashed border-[var(--accent-primary)] bg-white/40 dark:bg-white/5 backdrop-blur-md overflow-hidden transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex flex-row items-center justify-start gap-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-black text-2xl shadow-sm shrink-0">
                                +
                            </div>
                            <div className="flex flex-col items-start justify-center flex-grow">
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">
                                  Create/Upload Session
                                </h2>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Click here to get started
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <LivePeriodTracker session={currentTimetableSession} schoolConfig={schoolConfig} language={language} />

                <div 
                    ref={featuresSectionRef} 
                    className="w-full relative mt-4 flex flex-col items-center min-h-[25rem]"
                >
                    <button 
                        onClick={scrollToFeatures}
                        className="group relative p-2.5 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 animate-bounce hidden md:block lg:hidden mb-8"
                        aria-label="Scroll to features"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Grid View */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full max-w-4xl mx-auto mb-12 px-2 sm:px-4">
                        {navigationModules.map((module, idx) => (
                            <FeatureCard 
                                key={module.id}
                                label={module.label}
                                description={module.description}
                                icon={module.icon}
                                onClick={module.action}
                                theme={module.theme}
                                index={idx}
                                isActive={true}
                                className="relative w-full aspect-[4/4.8] hover:scale-105 hover:-translate-y-1 cursor-pointer transition-all duration-300"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>

        <footer className="w-full py-4 mt-auto border-t border-white/10 text-center">
        </footer>
      </div>

      {isCsvModalOpen && currentTimetableSession && (
          <CsvManagementModal
              t={t}
              isOpen={isCsvModalOpen}
              onClose={() => setIsCsvModalOpen(false)}
              currentSession={currentTimetableSession}
              onUpdateSession={onUpdateCurrentSession}
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
    </>
  );
};

export default HomePage;
