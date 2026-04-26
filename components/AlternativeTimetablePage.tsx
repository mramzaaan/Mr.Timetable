
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, SchoolConfig, Period, LeaveDetails, DownloadDesignConfig, TimetableSession, JointPeriod } from '../types';
import PrintPreview from './PrintPreview';
import { translations } from '../i18n';
import { generateAdjustmentsExcel, generateAdjustmentsReportHtml } from './reportUtils';
import { generateUniqueId, allDays } from '../types';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import { toJpeg, toBlob } from 'html-to-image';
import { Share2, ArrowUpDown, Printer, Calendar, ChevronDown as ChevronDownLucide, Trash2, Edit, Plus as PlusLucide, Check, Zap, RotateCcw } from 'lucide-react';

// Icons
const ImportExportIcon = () => <ArrowUpDown className="h-5 w-5" />;
const PrintIcon = () => <Printer className="h-5 w-5" />;
const ChevronDown = () => <ChevronDownLucide className="h-5 w-5" />;
const DoubleBookedWarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1-1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);
const WhatsAppIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" />
    </svg>
);
const CheckIcon = () => <Check className="h-5 w-5" />;
const PlusIcon = () => <PlusLucide className="h-6 w-6" />;
const EditIcon = () => <Edit className="h-4 w-4" />;
const TrashIcon = () => <Trash2 className="h-4 w-4" />;
const ShareIcon = () => <Share2 className="h-4 w-4" />;
const AutoIcon = () => <Zap className="h-5 w-5" />;
const ResetIcon = () => <RotateCcw className="h-5 w-5" />;


const SignatureModal: React.FC<{
    t: any;
    isOpen: boolean;
    onClose: () => void;
    onFinalSave: (signature: string) => Promise<void>; 
}> = ({ t, isOpen, onClose, onFinalSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isSubmitting) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (canvas && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await onFinalSave(canvas.toDataURL());
                onClose();
            } catch (err: unknown) {
                console.error("Submission failed", err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[var(--bg-secondary)] rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl animate-scale-in border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t.signNow.toUpperCase()}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">Headmaster/Principal's signature for the substitution sheet.</p>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="p-3 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="border-4 border-dashed border-gray-200 rounded-3xl bg-white overflow-hidden touch-none shadow-inner mb-8">
                    <canvas 
                        ref={canvasRef}
                        width={1200}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className={`w-full h-auto bg-white block ${isSubmitting ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                    />
                </div>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full h-16 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-4 text-lg disabled:opacity-70 disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-3">
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>SIGN & SHARE IMAGE</span>
                            </div>
                        ) : (
                            <span>SIGN & SHARE IMAGE</span>
                        )}
                    </button>
                    {!isSubmitting && (
                        <button onClick={handleClear} className="text-sm font-bold uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors">
                            {t.clearSignature}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface AlternativeTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails: Record<string, Record<string, LeaveDetails>> | undefined;
  onSetAdjustments: (date: string, adjustmentsForDate: Adjustment[]) => void;
  onSetLeaveDetails: (date: string, details: Record<string, LeaveDetails>) => void;
  onUpdateSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  selection: { date: string; teacherIds: string[]; };
  onSelectionChange: React.Dispatch<React.SetStateAction<{ date: string; teacherIds: string[]; }>>;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
  hasActiveSession: boolean;
  // jointPeriods added to props
  jointPeriods?: JointPeriod[];
}

type SubstituteStatus =
  | { type: 'IN_CHARGE' }
  | { type: 'TEACHES_CLASS' }
  | { type: 'AVAILABLE' }
  | { type: 'UNAVAILABLE'; reason: 'SUBSTITUTION' }
  | { type: 'UNAVAILABLE'; reason: 'DOUBLE_BOOK'; conflictClass: { classNameEn: string, classNameUr: string } };

type TeacherWithStatus = {
  teacher: Teacher;
  status: SubstituteStatus;
};

interface SubstitutionGroup {
    id: string; // Add ID for key
    absentEntity: { id: string, nameEn: string, nameUr: string, type: 'teacher' | 'class' }; // Changed from absentTeacher
    period: Period; 
    periodIndex: number;
    combinedClassIds: string[];
    combinedClassNames: { en: string; ur: string };
    subjectInfo: { en: string; ur: string };
    isLegacy?: boolean; // New Flag
    isClassAbsent?: boolean; // New Flag
}

interface SubstitutionCardProps {
    group: SubstitutionGroup;
    assignedAdj: Adjustment | undefined;
    availableTeachersList: TeacherWithStatus[];
    historyStats: { stats: Record<string, number[]>; labels: string[] };
    language: Language;
    t: any;
    onSubstituteChange: (group: SubstitutionGroup, substituteTeacherId: string) => void;
    onWhatsAppNotify: (adjustment: Adjustment) => Promise<void>;
    onToggleDropdown: (isOpen: boolean) => void;
}

const LEAVE_REASONS = ['Illness', 'Urgent Work', 'On Duty', 'Rest', 'Other'];

interface SubstitutePickerProps {
    teachersWithStatus: TeacherWithStatus[];
    selectedId: string;
    onChange: (id: string) => void;
    language: Language;
    historyStats: { stats: Record<string, number[]>; labels: string[] }; 
    onToggle?: (isOpen: boolean) => void;
}

const SubstitutePicker: React.FC<SubstitutePickerProps> = ({ teachersWithStatus, selectedId, onChange, language, historyStats, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedTeacherObj = teachersWithStatus.find(t => t.teacher.id === selectedId);

    let selectedStatusText = "";
    if (selectedTeacherObj) {
        if (selectedTeacherObj.status.type === 'AVAILABLE') selectedStatusText = "(Free)";
        else if (selectedTeacherObj.status.type === 'IN_CHARGE') selectedStatusText = "(In Charge)";
        else if (selectedTeacherObj.status.type === 'TEACHES_CLASS') selectedStatusText = "(Teaches)";
        else if (selectedTeacherObj.status.type === 'UNAVAILABLE') selectedStatusText = "(Busy)";
    }

    useEffect(() => {
        if (onToggle) onToggle(isOpen);
    }, [isOpen]); 

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { stats: allStats, labels: dayLabels } = historyStats;
    const isToday = (idx: number) => idx === dayLabels.length - 1;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left rounded-xl px-3 py-2 text-xs font-bold flex justify-between items-center transition-all outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    selectedId 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-white dark:bg-gray-800 border border-[var(--border-secondary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] shadow-sm'
                }`}
            >
                <span className="truncate flex-grow">
                    {selectedTeacherObj 
                        ? `${language === 'ur' ? selectedTeacherObj.teacher.nameUr : selectedTeacherObj.teacher.nameEn} ${selectedStatusText}`
                        : "Select Substitute..."}
                </span>
                <div className="flex items-center gap-2 ml-2">
                    <ChevronDown />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-[var(--border-secondary)] rounded-lg shadow-xl max-h-80 overflow-y-auto custom-scrollbar animate-scale-in">
                    {teachersWithStatus.map(({ teacher, status }) => {
                        const name = language === 'ur' ? teacher.nameUr : teacher.nameEn;
                        const teacherStats = allStats[teacher.id] || Array(7).fill(0);
                        
                        let nameColor = "text-blue-600 dark:text-blue-400"; 
                        let bgColor = "";
                        let statusText = "";
                        
                        if (status.type === 'IN_CHARGE') {
                            nameColor = "text-green-600 dark:text-green-400";
                            bgColor = "bg-green-50 dark:bg-green-900/10";
                            statusText = "In Charge";
                        } else if (status.type === 'TEACHES_CLASS') {
                            nameColor = "text-yellow-600 dark:text-yellow-400";
                            bgColor = "bg-yellow-50 dark:bg-yellow-900/10";
                            statusText = "Teaches Class";
                        } else if (status.type === 'AVAILABLE') {
                            nameColor = "text-blue-600 dark:text-blue-400";
                            bgColor = "bg-blue-50 dark:bg-blue-900/10";
                            statusText = "Available";
                        } else if (status.type === 'UNAVAILABLE') {
                            nameColor = "text-red-600 dark:text-red-400";
                            bgColor = "bg-red-50 dark:bg-red-900/10";
                            if (status.reason === 'DOUBLE_BOOK') {
                                const conflictName = language === 'ur' ? status.conflictClass.classNameUr : status.conflictClass.classNameEn;
                                statusText = `Busy in ${conflictName}`;
                            } else {
                                statusText = "Substitution";
                            }
                        }

                        return (
                            <div 
                                key={teacher.id} 
                                onClick={() => { onChange(teacher.id); setIsOpen(false); }}
                                className={`p-2 border-b border-[var(--border-secondary)] last:border-0 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors ${bgColor}`}
                            >
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-lg ${nameColor}`}>{name}</span>
                                        {statusText && <span className={`text-[0.625rem] font-bold ${nameColor}`}>{statusText}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1 justify-end">
                                    {dayLabels.map((dayLabel, idx) => {
                                        const parts = dayLabel.split(' ');
                                        const dName = parts[0];
                                        const dNum = parts[1] || '';
                                        return (
                                            <div key={idx} className={`flex flex-col items-center min-w-[1.75rem] p-0.5 rounded ${isToday(idx) ? 'bg-[var(--accent-secondary)] ring-1 ring-[var(--accent-primary)]' : ''}`}>
                                                <span className={`text-[0.5625rem] leading-none font-bold ${isToday(idx) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{dName}</span>
                                                <span className={`text-[0.5rem] leading-none font-bold mb-0.5 ${isToday(idx) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{dNum}</span>
                                                <span className={`text-sm font-mono font-black leading-none ${teacherStats[idx] > 0 ? (isToday(idx) ? 'text-[var(--accent-primary)]' : 'text-orange-500') : 'text-[var(--text-placeholder)]'}`}>
                                                    {teacherStats[idx]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ 
    group, assignedAdj, availableTeachersList, historyStats, language, t, onSubstituteChange, onWhatsAppNotify, onToggleDropdown 
}) => {
    const [isSent, setIsSent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        setIsSent(false);
    }, [assignedAdj?.substituteTeacherId]);

    const handleNotifyClick = async () => {
        if (!assignedAdj) return;
        setIsSending(true);
        try {
            await onWhatsAppNotify(assignedAdj);
            setIsSent(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const currentSubstituteId = assignedAdj?.substituteTeacherId || '';
    const isLegacy = group.isLegacy;

    return (
        <div className={`relative p-3 rounded-2xl border transition-all flex flex-col gap-3 group 
            ${group.isClassAbsent
                ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 opacity-80'
                : currentSubstituteId 
                    ? 'bg-[var(--bg-secondary)] border-emerald-500/30 shadow-md' 
                    : 'bg-[var(--bg-tertiary)]/30 border-[var(--border-secondary)]'
            }
            ${isLegacy ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}
            `}
        >
            {group.isClassAbsent && (
                <div className="absolute -top-2 -left-2 bg-red-500 text-white border border-red-600 px-2 py-0.5 rounded-full text-[0.5625rem] font-bold uppercase tracking-wider shadow-sm z-20 flex items-center gap-1">
                    {language === 'ur' ? <span className="font-urdu">کلاس بند ہے</span> : 'Class Closed'}
                </div>
            )}
            {isLegacy && (
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white border border-orange-600 px-2 py-0.5 rounded-full text-[0.5625rem] font-bold uppercase tracking-wider shadow-sm z-20 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1-1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Schedule Changed
                </div>
            )}

            <div className="flex items-center gap-3 mb-1">
               <div className={`flex flex-col items-center justify-center border rounded-xl w-11 h-11 flex-shrink-0 ${group.isClassAbsent ? 'bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-[var(--bg-tertiary)] border-[var(--border-secondary)]'}`}>
                    <span className={`text-[0.5rem] font-bold uppercase tracking-wider leading-none mb-0.5 ${group.isClassAbsent ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>PD</span>
                    <span className={`text-xl font-black leading-none ${group.isClassAbsent ? 'text-red-600 dark:text-red-400' : currentSubstituteId ? 'text-emerald-600' : 'text-[var(--accent-primary)]'}`}>
                        {group.periodIndex + 1}
                    </span>
               </div>

               <div className="flex flex-col flex-grow overflow-hidden text-center items-center">
                    <h4 className={`text-lg font-black leading-tight truncate w-full ${group.isClassAbsent ? 'text-red-900 dark:text-red-100' : 'text-[var(--text-primary)]'}`} title={language === 'ur' ? group.combinedClassNames.ur : group.combinedClassNames.en}>
                       {language === 'ur' ? <span className="font-urdu">{group.combinedClassNames.ur}</span> : group.combinedClassNames.en}
                    </h4>
                    <p className={`text-[0.625rem] font-bold uppercase tracking-wider opacity-80 truncate w-full ${group.isClassAbsent ? 'text-red-700 dark:text-red-300' : 'text-[var(--text-secondary)]'}`} title={language === 'ur' ? group.subjectInfo.ur : group.subjectInfo.en}>
                       {language === 'ur' ? <span className="font-urdu">{group.subjectInfo.ur}</span> : group.subjectInfo.en}
                    </p>
               </div>

               <div className="w-8 flex-shrink-0 flex justify-end">
                   {currentSubstituteId && !group.isClassAbsent && (
                       <button 
                           onClick={() => onSubstituteChange(group, '')}
                           className="w-8 h-8 flex items-center justify-center text-[var(--text-placeholder)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                           title="Clear Assignment"
                       >
                           <TrashIcon />
                       </button>
                   )}
               </div>
            </div>

            <div className="relative z-10 w-full">
                {group.isClassAbsent ? (
                    <div className="flex items-center justify-center h-10 bg-red-100/50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50 text-xs font-bold uppercase tracking-wider">
                        {language === 'ur' ? <span className="font-urdu">کلاس غیر حاضر ہے</span> : 'Class is Absent'}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 h-10">
                        <div className="flex-grow h-full text-xs">
                            <SubstitutePicker 
                                teachersWithStatus={availableTeachersList}
                                selectedId={currentSubstituteId}
                                onChange={(id) => onSubstituteChange(group, id)}
                                language={language}
                                historyStats={historyStats}
                                onToggle={onToggleDropdown}
                            />
                        </div>
                        
                        {currentSubstituteId && (
                            <button 
                                onClick={handleNotifyClick} 
                                disabled={isSending}
                                className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all shadow-sm ${
                                    isSent 
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-[var(--bg-tertiary)] text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                                }`}
                                title={t.notifySubstitute}
                            >
                                {isSending ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : isSent ? (
                                    <CheckIcon />
                                ) : (
                                    <WhatsAppIcon />
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {assignedAdj?.conflictDetails && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/40 text-[0.5625rem] text-red-600 font-bold animate-pulse">
                    <DoubleBookedWarningIcon />
                    <span className="truncate">{t.doubleBook}: {language === 'ur' ? assignedAdj.conflictDetails.classNameUr : assignedAdj.conflictDetails.classNameEn}</span>
                </div>
            )}
        </div>
    );
};

export const AlternativeTimetablePage: React.FC<AlternativeTimetablePageProps & { jointPeriods?: JointPeriod[] }> = ({ 
    t, language, classes, subjects, teachers, adjustments, leaveDetails, onSetAdjustments, 
    onSetLeaveDetails, onUpdateSession, schoolConfig, onUpdateSchoolConfig, selection, 
    onSelectionChange, openConfirmation, hasActiveSession, jointPeriods = [] 
}) => {
  const { date: selectedDate, teacherIds: absentTeacherIds } = selection;
  const [dailyAdjustments, setDailyAdjustments] = useState<Adjustment[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [absenteeDetails, setAbsenteeDetails] = useState<Record<string, LeaveDetails>>({});
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set());
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [absentClassIds, setAbsentClassIds] = useState<string[]>([]);
  const [exportStartDate, setExportStartDate] = useState(selectedDate);
  const [exportEndDate, setExportEndDate] = useState(selectedDate);
  const [activeDropdownCardId, setActiveDropdownCardId] = useState<string | null>(null);
  const [slipData, setSlipData] = useState<Adjustment | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [teacherShareData, setTeacherShareData] = useState<{
      teacherId: string;
      teacherName: string;
      date: string;
      substitutions: SubstitutionGroup[];
  } | null>(null);
  const teacherShareRef = useRef<HTMLDivElement>(null);

  // Multi-teacher slip state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [generatedShareBlob, setGeneratedShareBlob] = useState<Blob | null>(null);
  const [selectedTeachersForSlip, setSelectedTeachersForSlip] = useState<string[]>([]);
  const multiTeacherSlipRef = useRef<HTMLDivElement>(null);

  const handleGenerateMultiSlip = async () => {
      if (!multiTeacherSlipRef.current) return;

      setIsGeneratingShare(true);

      try {
          const dataUrl = await toJpeg(multiTeacherSlipRef.current, { 
              quality: 1.0,
              pixelRatio: 2, 
              backgroundColor: '#ffffff'
          });
          const blob = await (await fetch(dataUrl)).blob();
          
          if (!blob) throw new Error("Could not generate image blob");
          setGeneratedShareBlob(blob);
      } catch (err) {
          console.error("Image generation failed", err);
          alert("Failed to generate image.");
      } finally {
          setIsGeneratingShare(false);
      }
  };

  const handleShareClick = async () => {
      if (!generatedShareBlob) return;
      
      let shared = false;
      const file = new File([generatedShareBlob], `Substitution_Report_${selectedDate}.jpg`, { type: generatedShareBlob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
              await navigator.share({
                  title: 'Substitution Report',
                  files: [file]
              });
              shared = true;
          } catch (shareErr: any) {
              if (shareErr.name === 'AbortError') {
                  shared = true; // User intentionally cancelled, no further fallback needed
              } else {
                  console.error("Web share failed", shareErr);
              }
          }
      }

      if (!shared) {
          try {
              const item = new ClipboardItem({ [generatedShareBlob.type]: generatedShareBlob });
              await navigator.clipboard.write([item]);
              alert("Substitution slip copied to clipboard!");
              shared = true;
          } catch (clipErr) {
              console.error("Clipboard copy failed", clipErr);
          }
      }

      if (!shared) {
          const url = URL.createObjectURL(generatedShareBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Substitution_Report_${selectedDate}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
      }
      
      setIsShareModalOpen(false);
      setTimeout(() => setGeneratedShareBlob(null), 1000);
  };

  const [modalState, setModalState] = useState<{
      isOpen: boolean;
      mode: 'teacher' | 'class';
      data: { id: string; isMultiDay: boolean; startDate: string; endDate: string; reason: string; customReason: string; leaveType: 'full' | 'half'; startPeriod: number; periods: number[]; }
  }>({
      isOpen: false, mode: 'teacher',
      data: { id: '', isMultiDay: false, startDate: selectedDate, endDate: selectedDate, reason: 'Illness', customReason: '', leaveType: 'full', startPeriod: 1, periods: [] }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedDate = useRef<string | null>(null);

  const toggleTeacherCollapse = (teacherId: string) => {
    setExpandedTeacherIds(prev => { const newSet = new Set(prev); if (newSet.has(teacherId)) newSet.delete(teacherId); else newSet.add(teacherId); return newSet; });
  };
  
  const getName = (entity: { nameEn: string, nameUr: string }) => language === 'ur' ? <span className="font-urdu">{entity.nameUr}</span> : entity.nameEn;

  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => { const counts = activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8); return counts.length > 0 ? Math.max(...counts) : 8; }, [activeDays, schoolConfig.daysConfig]);
  const periodsForDropdown = useMemo(() => { if (modalState.data.isMultiDay) return maxPeriods; if (!modalState.data.startDate) return maxPeriods; const date = new Date(modalState.data.startDate); const dayIndex = date.getUTCDay(); const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const dayName = dayMap[dayIndex]; if (allDays.includes(dayName as any)) { const config = schoolConfig.daysConfig?.[dayName as keyof TimetableGridData]; return config ? config.periodCount : 8; } return 0; }, [modalState.data.isMultiDay, modalState.data.startDate, maxPeriods, schoolConfig.daysConfig]);
  const dayOfWeek = useMemo(() => { if (!selectedDate) return null; const date = new Date(selectedDate); const dayIndex = date.getUTCDay(); return dayIndex > 0 && dayIndex <= 6 ? allDays[dayIndex - 1] : null; }, [selectedDate]);

  useEffect(() => {
    const savedAdjustments = adjustments[selectedDate] || [];
    setDailyAdjustments(savedAdjustments);
    const savedLeaveDetails: Record<string, LeaveDetails> = leaveDetails?.[selectedDate] || {};
    const _absentClassIds: string[] = [];
    const _absentTeacherIds: string[] = [];
    const _details: Record<string, LeaveDetails> = {};
    Object.entries(savedLeaveDetails).forEach(([key, detail]) => { if (key.startsWith('CLASS_')) { const classId = key.replace('CLASS_', ''); if (classes.some(c => c.id === classId)) { _absentClassIds.push(classId); _details[key] = detail; } } else { const teach = teachers.find(t => t.id === key); if (teach) { _absentTeacherIds.push(key); _details[key] = detail; } } });
    savedAdjustments.forEach(adj => { if (!_absentTeacherIds.includes(adj.originalTeacherId)) { const teach = teachers.find(t => t.id === adj.originalTeacherId); if (teach) { _absentTeacherIds.push(adj.originalTeacherId); _details[adj.originalTeacherId] = { leaveType: 'full', startPeriod: 1 }; } } });
    
    const currentSelectedIds = selection.teacherIds; 
    const newSelectedIds = _absentTeacherIds; 
    const areSetsEqual = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === new Set(b).size && a.every(x => b.includes(x));
    
    if (!areSetsEqual(currentSelectedIds, newSelectedIds)) { 
        onSelectionChange(prev => ({ ...prev, teacherIds: newSelectedIds })); 
    }
    
    setAbsentClassIds(_absentClassIds); setAbsenteeDetails(_details);
    
    if (selectedDate !== lastSyncedDate.current) { 
        lastSyncedDate.current = selectedDate; 
    }
  }, [selectedDate, adjustments, leaveDetails, classes, teachers, selection.teacherIds, onSelectionChange]);

  useEffect(() => { setExportStartDate(selectedDate); setExportEndDate(selectedDate); setModalState(prev => ({ ...prev, data: { ...prev.data, startDate: selectedDate, endDate: selectedDate } })); }, [selectedDate]);
  const absentTeachers = useMemo(() => { return teachers.filter(teacher => absentTeacherIds.includes(teacher.id)); }, [teachers, absentTeacherIds]);
  const absentClasses = useMemo(() => { return classes.filter(cls => absentClassIds.includes(cls.id)); }, [classes, absentClassIds]);

  const historyStats = useMemo(() => {
      const stats: Record<string, number[]> = {};
      const labels: string[] = [];
      const dateKeys: string[] = [];
      
      const current = new Date(selectedDate);
      if (isNaN(current.getTime())) return { stats: {}, labels: [] };

      // Calculate rolling 7 days ending on selectedDate
      for (let i = 6; i >= 0; i--) {
          const d = new Date(current);
          d.setDate(current.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          dateKeys.push(dateStr);
          
          const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
          const dayNum = d.getDate();
          labels.push(`${dayName} ${dayNum}`);
      }

      teachers.forEach(t => stats[t.id] = new Array(7).fill(0));
      
      dateKeys.forEach((dateKey, index) => {
          const adjs = adjustments[dateKey] || [];
          adjs.forEach(adj => {
              if (adj.substituteTeacherId && stats[adj.substituteTeacherId]) {
                  stats[adj.substituteTeacherId][index]++;
              }
          });
      });

      return { stats, labels };
  }, [teachers, adjustments, selectedDate]);

  const substitutionGroups = useMemo(() => {
      if (!dayOfWeek) return [];
      const groups: SubstitutionGroup[] = [];

      const checkIfClassAbsent = (classId: string, pIndex: number) => {
          const leave = absenteeDetails[`CLASS_${classId}`];
          if (!leave) return false;
          if (leave.leaveType === 'full') return true;
          if (leave.leaveType === 'half') {
              const pNum = pIndex + 1;
              if (leave.periods && leave.periods.length > 0) {
                  return leave.periods.includes(pNum);
              } else if (leave.startPeriod && pNum >= leave.startPeriod) {
                  return true;
              }
          }
          return false;
      };

      absentTeachers.forEach(absentTeacher => {
          const leave = absenteeDetails[absentTeacher.id];
          const teacherPeriods: { classId: string; period: Period; periodIndex: number }[] = [];
          
          classes.forEach(c => {
              const daySlots = c.timetable[dayOfWeek];
              if (daySlots) {
                  daySlots.forEach((slot, pIndex) => {
                      let isMissed = true;
                      if (leave && leave.leaveType === 'half') {
                          const pNum = pIndex + 1;
                          if (leave.periods && leave.periods.length > 0) {
                              if (!leave.periods.includes(pNum)) isMissed = false;
                          } else if (leave.startPeriod && pNum < leave.startPeriod) {
                              isMissed = false;
                          }
                      }

                      if (isMissed && Array.isArray(slot)) {
                          slot.forEach(p => {
                              if (p.teacherId === absentTeacher.id) {
                                  teacherPeriods.push({ classId: c.id, period: p, periodIndex: pIndex });
                              }
                          });
                      }
                  });
              }
          });

          const byPeriod = new Map<number, typeof teacherPeriods>();
          teacherPeriods.forEach(tp => {
              if (!byPeriod.has(tp.periodIndex)) byPeriod.set(tp.periodIndex, []);
              byPeriod.get(tp.periodIndex)!.push(tp);
          });

          byPeriod.forEach((slots, pIndex) => {
              const jointGroups = new Map<string, typeof slots>();
              const singles: typeof slots = [];

              slots.forEach(s => {
                  if (s.period.jointPeriodId) {
                      const k = s.period.jointPeriodId;
                      if (!jointGroups.has(k)) jointGroups.set(k, []);
                      jointGroups.get(k)!.push(s);
                  } else {
                      singles.push(s);
                  }
              });

              jointGroups.forEach((jSlots, jpId) => {
                  const jp = jointPeriods.find(j => j.id === jpId);
                  const clsIds = jSlots.map(s => s.classId);
                  const clsNamesEn = clsIds.map(id => classes.find(c => c.id === id)?.nameEn).filter(Boolean).join(', ');
                  const clsNamesUr = clsIds.map(id => classes.find(c => c.id === id)?.nameUr).filter(Boolean).join('، ');
                  
                  const subInfoEn = jp?.name || 'Joint Period';
                  const subInfoUr = jp?.name || 'مشترکہ پیریڈ';

                  groups.push({
                      id: `${absentTeacher.id}-${pIndex}-joint`,
                      absentEntity: { id: absentTeacher.id, nameEn: absentTeacher.nameEn, nameUr: absentTeacher.nameUr, type: 'teacher' },
                      period: jSlots[0].period,
                      periodIndex: pIndex,
                      combinedClassIds: clsIds,
                      combinedClassNames: { en: clsNamesEn, ur: clsNamesUr },
                      subjectInfo: { en: subInfoEn, ur: subInfoUr },
                      isClassAbsent: clsIds.some(cId => checkIfClassAbsent(cId, pIndex))
                  });
              });

              singles.forEach(s => {
                  const c = classes.find(cls => cls.id === s.classId);
                  const sub = subjects.find(sb => sb.id === s.period.subjectId);
                  
                  groups.push({
                      id: `${absentTeacher.id}-${pIndex}-${s.classId}`,
                      absentEntity: { id: absentTeacher.id, nameEn: absentTeacher.nameEn, nameUr: absentTeacher.nameUr, type: 'teacher' },
                      period: s.period,
                      periodIndex: pIndex,
                      combinedClassIds: [s.classId],
                      combinedClassNames: { en: c?.nameEn || '', ur: c?.nameUr || '' },
                      subjectInfo: { en: sub?.nameEn || '', ur: sub?.nameUr || '' },
                      isClassAbsent: checkIfClassAbsent(s.classId, pIndex)
                  });
              });
          });
      });

      absentClasses.forEach(absentClass => {
          const slots = absentClass.timetable[dayOfWeek];
          const leave = absenteeDetails[`CLASS_${absentClass.id}`];
          
          if (Array.isArray(slots)) {
              slots.forEach((slot, pIndex) => {
                  let isCancelled = false;
                  if (leave) {
                      if (leave.leaveType === 'full') {
                          isCancelled = true;
                      } else if (leave.leaveType === 'half') {
                          const pNum = pIndex + 1;
                          if (leave.periods && leave.periods.length > 0) {
                              if (leave.periods.includes(pNum)) isCancelled = true;
                          } else if (leave.startPeriod && pNum >= leave.startPeriod) {
                              isCancelled = true;
                          }
                      }
                  }

                  if (Array.isArray(slot) && slot.length > 0 && isCancelled) {
                      const detailsList = slot.map(p => {
                          const sub = subjects.find(s => s.id === p.subjectId);
                          const tea = teachers.find(t => t.id === p.teacherId);
                          return {
                              subEn: sub?.nameEn || 'Unknown',
                              subUr: sub?.nameUr || 'Unknown',
                              teaEn: tea?.nameEn || 'No Teacher',
                              teaUr: tea?.nameUr || 'کوئی استاد نہیں'
                          };
                      });

                      const infoEn = detailsList.map(d => `${d.subEn} (${d.teaEn})`).join(', ');
                      const infoUr = detailsList.map(d => `${d.subUr} (${d.teaUr})`).join('، ');
                      
                      groups.push({
                          id: `${absentClass.id}-${pIndex}-class`,
                          absentEntity: { id: absentClass.id, nameEn: absentClass.nameEn, nameUr: absentClass.nameUr, type: 'class' },
                          period: slot[0],
                          periodIndex: pIndex,
                          combinedClassIds: [absentClass.id],
                          combinedClassNames: { en: absentClass.nameEn, ur: absentClass.nameUr },
                          subjectInfo: { en: infoEn, ur: infoUr },
                          isClassAbsent: true
                      });
                  }
              });
          }
      });

      const relevantAdjustments = dailyAdjustments.filter(adj => absentTeacherIds.includes(adj.originalTeacherId));
      relevantAdjustments.forEach(adj => {
          const matchingGroup = groups.find(g => 
              g.absentEntity.id === adj.originalTeacherId && 
              g.periodIndex === adj.periodIndex && 
              g.combinedClassIds.includes(adj.classId)
          );

          if (!matchingGroup) {
               const cls = classes.find(c => c.id === adj.classId);
               const sub = subjects.find(s => s.id === adj.subjectId);
               const teacher = teachers.find(t => t.id === adj.originalTeacherId);
               
               if (teacher) {
                   groups.push({
                      id: `${teacher.id}-${adj.periodIndex}-legacy`,
                      absentEntity: { id: teacher.id, nameEn: teacher.nameEn, nameUr: teacher.nameUr, type: 'teacher' },
                      period: { id: 'legacy', classId: adj.classId, subjectId: adj.subjectId, teacherId: teacher.id },
                      periodIndex: adj.periodIndex,
                      combinedClassIds: [adj.classId],
                      combinedClassNames: { en: cls?.nameEn || 'Unknown', ur: cls?.nameUr || '' },
                      subjectInfo: { en: sub?.nameEn || 'Unknown', ur: sub?.nameUr || '' },
                      isLegacy: true,
                      isClassAbsent: checkIfClassAbsent(adj.classId, adj.periodIndex)
                   });
               }
          }
      });

      return groups.sort((a, b) => a.periodIndex - b.periodIndex);
  }, [dayOfWeek, absentTeachers, absentClasses, classes, jointPeriods, subjects, dailyAdjustments, absentTeacherIds, absenteeDetails]);

  const computedMultiTeacherSlipData = useMemo(() => {
      if (selectedTeachersForSlip.length === 0) return null;
      const selected = teachers.filter(t => selectedTeachersForSlip.includes(t.id));
      return {
          date: selectedDate,
          teachers: selected.map(t => ({
              id: t.id,
              nameEn: t.nameEn,
              nameUr: t.nameUr,
              substitutions: substitutionGroups.filter(g => g.absentEntity.id === t.id)
          }))
      };
  }, [selectedTeachersForSlip, teachers, substitutionGroups, selectedDate]);

  const allAbsentEntities = useMemo(() => {
      const entities = new Map<string, { id: string, nameEn: string, nameUr: string, type: 'teacher' | 'class' }>();
      substitutionGroups.forEach(g => {
          entities.set(g.absentEntity.id, g.absentEntity);
      });
      absentTeachers.forEach(t => {
          if (!entities.has(t.id)) entities.set(t.id, { id: t.id, nameEn: t.nameEn, nameUr: t.nameUr, type: 'teacher' });
      });
      absentClasses.forEach(c => {
          if (!entities.has(c.id)) entities.set(c.id, { id: c.id, nameEn: c.nameEn, nameUr: c.nameUr, type: 'class' });
      });
      return Array.from(entities.values());
  }, [substitutionGroups, absentTeachers, absentClasses]);

  const getTeacherConflict = (teacherId: string, periodIndex: number, currentAdjId?: string) => {
      const subAdjs = dailyAdjustments.filter(adj => adj.substituteTeacherId === teacherId && adj.periodIndex === periodIndex && adj.id !== currentAdjId);
      if (subAdjs.length > 0) {
          const cls = classes.find(c => c.id === subAdjs[0].classId);
          return {
              classNameEn: cls ? `${cls.nameEn} (Alt)` : 'Substitution',
              classNameUr: cls ? `${cls.nameUr} (متبادل)` : 'Substitution'
          };
      }
      if (dayOfWeek) {
          for (const c of classes) {
              let isClassOnLeave = false;
              const classLeave = absenteeDetails[`CLASS_${c.id}`];
              if (classLeave) {
                  if (classLeave.leaveType === 'full') {
                      isClassOnLeave = true;
                  } else if (classLeave.leaveType === 'half') {
                      const pNum = periodIndex + 1;
                      if (classLeave.periods && classLeave.periods.length > 0) {
                          if (classLeave.periods.includes(pNum)) isClassOnLeave = true;
                      } else if (classLeave.startPeriod && pNum >= classLeave.startPeriod) {
                          isClassOnLeave = true;
                      }
                  }
              }
              if (isClassOnLeave) continue;
              const daySlots = c.timetable[dayOfWeek];
              if (daySlots && daySlots[periodIndex]) {
                  const p = daySlots[periodIndex].find(p => p.teacherId === teacherId);
                  if (p) {
                      return { classNameEn: c.nameEn, classNameUr: c.nameUr };
                  }
              }
          }
      }
      return undefined;
  };

  const findAvailableTeachers = (periodIndex: number, period: Period, classIds: string[]): TeacherWithStatus[] => {
      if (!dayOfWeek) return [];
      const relevantClasses = classes.filter(c => classIds.includes(c.id));

      const result = teachers.map(t => {
          if (absentTeacherIds.includes(t.id)) return null;

          let status: SubstituteStatus = { type: 'AVAILABLE' };
          const conflict = getTeacherConflict(t.id, periodIndex);
          
          if (conflict) {
              status = { type: 'UNAVAILABLE', reason: 'DOUBLE_BOOK', conflictClass: conflict };
          }

          if (status.type === 'AVAILABLE') {
              if (relevantClasses.some(c => c.inCharge === t.id)) {
                  status = { type: 'IN_CHARGE' };
              } 
              else if (relevantClasses.some(c => c.subjects.some(s => s.teacherId === t.id))) {
                  status = { type: 'TEACHES_CLASS' };
              }
          }

          return { teacher: t, status };
      }).filter(Boolean) as TeacherWithStatus[];

      return result.sort((a, b) => {
          const getPriority = (s: SubstituteStatus) => {
              if (s.type === 'IN_CHARGE') return 0;
              if (s.type === 'TEACHES_CLASS') return 1;
              if (s.type === 'AVAILABLE') return 2;
              return 3;
          };
          
          const pA = getPriority(a.status);
          const pB = getPriority(b.status);
          
          if (pA !== pB) return pA - pB;
          return a.teacher.nameEn.localeCompare(b.teacher.nameEn);
      });
  };

  const handleSubstituteChange = (group: SubstitutionGroup, substituteTeacherId: string) => {
      const newAdjustments = [...dailyAdjustments];
      const filtered = newAdjustments.filter(adj => 
          !(adj.originalTeacherId === group.absentEntity.id && 
            adj.periodIndex === group.periodIndex &&
            group.combinedClassIds.includes(adj.classId))
      );

      if (substituteTeacherId) {
          let conflictDetails = undefined;
          const teacherStatus = findAvailableTeachers(group.periodIndex, group.period, group.combinedClassIds).find(t => t.teacher.id === substituteTeacherId);
          if (teacherStatus?.status.type === 'UNAVAILABLE' && teacherStatus.status.reason === 'DOUBLE_BOOK') {
              conflictDetails = teacherStatus.status.conflictClass;
          }

          group.combinedClassIds.forEach(classId => {
              let subjectId = group.period.subjectId;
              if (group.period.jointPeriodId) {
                  const cls = classes.find(c => c.id === classId);
                  const p = cls?.timetable[dayOfWeek!]?.[group.periodIndex]?.find(p => p.teacherId === group.absentEntity.id);
                  if (p) subjectId = p.subjectId;
              }

              filtered.push({
                  id: generateUniqueId(),
                  classId,
                  subjectId,
                  originalTeacherId: group.absentEntity.id,
                  substituteTeacherId,
                  day: dayOfWeek!,
                  periodIndex: group.periodIndex,
                  conflictDetails
              });
          });
      }
      onSetAdjustments(selectedDate, filtered);
  };

  const handleWhatsAppNotify = async (adjustment: Adjustment) => {
      setSlipData(adjustment);
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay for rendering
      
      if (slipRef.current) {
          try {
              const blob = await toBlob(slipRef.current, { 
                  pixelRatio: 2, 
                  backgroundColor: '#ffffff'
              });
              if (blob) {
                  try {
                      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                      alert("Slip copied to clipboard!");
                  } catch (err) {
                      console.error("Clipboard write failed", err);
                      alert("Could not auto-copy image. Please use screenshot.");
                  }
              }
          } catch (err) {
              console.error("Image generation failed", err);
          }
      }
      
      setTimeout(() => setSlipData(null), 1000); 

      const teacher = teachers.find(t => t.id === adjustment.substituteTeacherId);
      if (!teacher) return;
      
      const cls = classes.find(c => c.id === adjustment.classId);
      const sub = subjects.find(s => s.id === adjustment.subjectId);
      const orig = teachers.find(t => t.id === adjustment.originalTeacherId);
      
      const className = language === 'ur' ? cls?.nameUr : cls?.nameEn;
      const subjectName = language === 'ur' ? sub?.nameUr : sub?.nameEn;
      const origName = language === 'ur' ? orig?.nameUr : orig?.nameEn;
      
      const timings = adjustment.day === 'Friday' ? schoolConfig.periodTimings.friday : schoolConfig.periodTimings.default;
      
      let message = t.notificationTemplateDefault
          .replace('{teacherName}', language === 'ur' ? teacher.nameUr : teacher.nameEn)
          .replace('{date}', selectedDate)
          .replace('{dayOfWeek}', dayOfWeek)
          .replace('{period}', (adjustment.periodIndex + 1).toString())
          .replace('{time}', timings[adjustment.periodIndex]?.start || '')
          .replace('{className}', className)
          .replace('{subjectName}', subjectName)
          .replace('{roomNumber}', cls?.roomNumber || '-')
          .replace('{originalTeacherName}', origName);

      const activeConflict = getTeacherConflict(teacher.id, adjustment.periodIndex, adjustment.id);
      const conflictData = activeConflict || adjustment.conflictDetails;

      if (conflictData) {
          message = t.substituteNotificationMessageDoubleBook
            .replace('{teacherName}', language === 'ur' ? teacher.nameUr : teacher.nameEn)
            .replace('{date}', selectedDate)
            .replace('{dayOfWeek}', dayOfWeek)
            .replace('{period}', (adjustment.periodIndex + 1).toString())
            .replace('{time}', timings[adjustment.periodIndex]?.start || '')
            .replace('{className}', className)
            .replace('{subjectName}', subjectName)
            .replace('{roomNumber}', cls?.roomNumber || '-')
            .replace('{originalTeacherName}', origName)
            .replace('{conflictClassName}', language === 'ur' ? conflictData.classNameUr : conflictData.classNameEn);
      }

      const url = `https://wa.me/${teacher.contactNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleSaveModal = () => {
      if (!modalState.data.id) return;
      
      const isMulti = modalState.data.isMultiDay && !!modalState.data.startDate && !!modalState.data.endDate;
      const finalStartDate = String(modalState.data.startDate || selectedDate);
      const finalEndDate = isMulti ? String(modalState.data.endDate) : finalStartDate;

      const details: LeaveDetails = {
          leaveType: modalState.data.leaveType,
          startPeriod: Number(modalState.data.startPeriod),
          periods: modalState.data.periods,
          reason: String(modalState.data.reason === 'Other' ? modalState.data.customReason : modalState.data.reason),
          startDate: finalStartDate,
          endDate: finalEndDate
      };

      if (isMulti) {
          onUpdateSession(session => {
              const newLeaveDetails = { ...(session.leaveDetails || {}) };
              const s = new Date(finalStartDate);
              const e = new Date(finalEndDate);
              for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                  const dStr = d.toISOString().split('T')[0];
                  if (!newLeaveDetails[dStr]) newLeaveDetails[dStr] = {};
                  const key = modalState.mode === 'class' ? `CLASS_${modalState.data.id}` : modalState.data.id;
                  newLeaveDetails[dStr][key] = details;
              }
              return { ...session, leaveDetails: newLeaveDetails };
          });
      } else {
          const key = modalState.mode === 'class' ? `CLASS_${modalState.data.id}` : modalState.data.id;
          const newDetails = { ...leaveDetails?.[selectedDate], [key]: details };
          onSetLeaveDetails(selectedDate, newDetails);
      }
      setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleExport = () => {
      const dataToExport = {
          adjustments: {} as Record<string, Adjustment[]>,
          leaveDetails: {} as Record<string, Record<string, LeaveDetails>>
      };
      
      const s = new Date(exportStartDate);
      const e = new Date(exportEndDate);
      
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          const dStr = d.toISOString().split('T')[0];
          if (adjustments[dStr]) dataToExport.adjustments[dStr] = adjustments[dStr];
          if (leaveDetails?.[dStr]) dataToExport.leaveDetails[dStr] = leaveDetails[dStr];
      }
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adjustments_${exportStartDate}_to_${exportEndDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const target = event.target as FileReader;
              const result = target?.result;
              
              if (typeof result !== 'string') {
                   window.alert('Invalid file content.');
                   return;
              }
              const imported = JSON.parse(result);
              if (imported.adjustments || imported.leaveDetails) {
                  onUpdateSession(session => ({
                      ...session,
                      adjustments: { ...session.adjustments, ...(imported.adjustments || {}) },
                      leaveDetails: { ...session.leaveDetails, ...(imported.leaveDetails || {}) }
                  }));
                  window.alert('Import successful!');
                  setIsImportExportOpen(false);
              } else {
                  window.alert('Invalid file format.');
              }
          } catch (err: unknown) {
              console.error(err);
              const msg = err instanceof Error ? err.message : String(err);
              window.alert(`Error parsing file: ${msg}`);
          }
      };
      reader.readAsText(file);
      if (e.target) e.target.value = '';
  };

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => { onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, adjustments: newDesign } }); };
  
  const clearAllAdjustments = () => {
    openConfirmation(t.delete, "Are you sure you want to clear ALL adjustments for this date?", () => {
        onSetAdjustments(selectedDate, []);
    });
  };

  const autoAssignSubstitutes = () => {
    if (!dayOfWeek) return;

    // 1. Get teacher section eligibility
    const teacherSectionsMap = new Map<string, Set<string>>();
    teachers.forEach(t => {
        const sections = new Set<string>();
        classes.forEach(c => {
          if (c.category && (
            c.subjects.some(s => s.teacherId === t.id) || 
            c.inCharge === t.id ||
            jointPeriods.some(jp => jp.teacherId === t.id && jp.assignments.some(a => a.classId === c.id))
          )) {
            sections.add(c.category);
          }
        });
        teacherSectionsMap.set(t.id, sections);
    });

    // 2. Calculate initial substitution workload for each teacher today/this week
    const workloadMap = new Map<string, number>();
    teachers.forEach(t => {
        const stats = historyStats.stats[t.id] || [];
        const currentSubstitutionCount = stats.reduce((acc, val) => acc + val, 0);
        workloadMap.set(t.id, currentSubstitutionCount);
    });

    // 3. Define "free periods" count for each teacher today
    const teacherFreeCountMap = new Map<string, number>();
    teachers.forEach(teacher => {
        if (absentTeacherIds.includes(teacher.id)) {
            teacherFreeCountMap.set(teacher.id, 0);
            return;
        }
        
        let freeCount = 0;
        const config = schoolConfig.daysConfig?.[dayOfWeek];
        const periodCount = config ? config.periodCount : 8;

        for (let pIdx = 0; pIdx < periodCount; pIdx++) {
            const leave = absenteeDetails[teacher.id];
            let isAbsentThisPeriod = false;
            if (leave) {
                if (leave.leaveType === 'full') isAbsentThisPeriod = true;
                else {
                    const pNum = pIdx + 1;
                    if (leave.periods?.length) isAbsentThisPeriod = leave.periods.includes(pNum);
                    else if (leave.startPeriod && pNum >= leave.startPeriod) isAbsentThisPeriod = true;
                }
            }
            if (isAbsentThisPeriod) continue;

            const isTeachingRegularly = classes.some(c => {
                const classLeave = absenteeDetails[`CLASS_${c.id}`];
                if (classLeave) {
                     if (classLeave.leaveType === 'full') return false;
                     const pNum = pIdx + 1;
                     if (classLeave.periods?.includes(pNum)) return false;
                     if (classLeave.startPeriod && pNum >= classLeave.startPeriod) return false;
                }
                const slot = c.timetable[dayOfWeek]?.[pIdx];
                return Array.isArray(slot) && slot.some(p => p.teacherId === teacher.id);
            });

            if (!isTeachingRegularly) freeCount++;
        }
        teacherFreeCountMap.set(teacher.id, freeCount);
    });

    // 4. Identify groups needing substitution
    const unassignedGroups = substitutionGroups.filter(g => 
        !g.isClassAbsent && 
        !dailyAdjustments.some(adj => 
            adj.originalTeacherId === g.absentEntity.id && 
            adj.periodIndex === g.periodIndex &&
            g.combinedClassIds.includes(adj.classId)
        )
    );

    if (unassignedGroups.length === 0) {
        alert("All periods are already assigned!");
        return;
    }

    const newAdjustments = [...dailyAdjustments];
    const skippedGroups: SubstitutionGroup[] = [];
    const assignedResults: { group: SubstitutionGroup, substitute: Teacher }[] = [];

    // Sort groups by importance (optional, but let's go by period sequence)
    const sortedGroups = [...unassignedGroups].sort((a,b) => a.periodIndex - b.periodIndex);

    sortedGroups.forEach(group => {
        // Find qualified candidates using existing findAvailableTeachers logic
        const rawCandidates = findAvailableTeachers(group.periodIndex, group.period, group.combinedClassIds);
        
        // Filter out unavailable or absent or already assigned as substitute in THIS new set
        const eligibleCandidates = rawCandidates.filter(cand => {
            if (cand.status.type === 'UNAVAILABLE') return false;
            // Also check if already assigned in newAdjustments for this slot
            const isAlreadySubbing = newAdjustments.some(adj => 
                adj.substituteTeacherId === cand.teacher.id && 
                adj.periodIndex === group.periodIndex
            );
            return !isAlreadySubbing;
        });

        // Apply section restriction
        const classCategory = group.combinedClassIds.map(cid => classes.find(c => c.id === cid)?.category).filter(Boolean)[0];
        const filteredBySection = eligibleCandidates.filter(cand => {
            if (!classCategory) return true;
            const tSections = teacherSectionsMap.get(cand.teacher.id);
            if (!tSections) return false;
            
            if (classCategory === 'Primary') {
                return tSections.has('Primary');
            } else if (classCategory === 'Middle' || classCategory === 'High') {
                return tSections.has('Middle') || tSections.has('High');
            }
            return true;
        });

        if (filteredBySection.length === 0) {
            skippedGroups.push(group);
            return;
        }

        // Rank candidates
        const ranked = filteredBySection.sort((a, b) => {
            // Priority 1: Status (In-Charge > Teaches > Available)
            const getPriority = (s: SubstituteStatus) => {
                if (s.type === 'IN_CHARGE') return 0;
                if (s.type === 'TEACHES_CLASS') return 1;
                return 2;
            };
            const pA = getPriority(a.status);
            const pB = getPriority(b.status);
            if (pA !== pB) return pA - pB;

            // Priority 2: Free periods on that day (Descending)
            const freeA = teacherFreeCountMap.get(a.teacher.id) || 0;
            const freeB = teacherFreeCountMap.get(b.teacher.id) || 0;
            if (freeA !== freeB) return freeB - freeA;

            // Priority 3: Workload (Ascending)
            const workA = workloadMap.get(a.teacher.id) || 0;
            const workB = workloadMap.get(b.teacher.id) || 0;
            return workA - workB;
        });

        const best = ranked[0];
        
        // Assign
        group.combinedClassIds.forEach(classId => {
            let subjectId = group.period.subjectId;
            if (group.period.jointPeriodId) {
                const cls = classes.find(c => c.id === classId);
                const p = cls?.timetable[dayOfWeek!]?.[group.periodIndex]?.find(p => p.teacherId === group.absentEntity.id);
                if (p) subjectId = p.subjectId;
            }

            newAdjustments.push({
                id: generateUniqueId(),
                classId,
                subjectId,
                originalTeacherId: group.absentEntity.id,
                substituteTeacherId: best.teacher.id,
                day: dayOfWeek,
                periodIndex: group.periodIndex,
            });
        });

        // Update workload map for next iterations in this loop
        workloadMap.set(best.teacher.id, (workloadMap.get(best.teacher.id) || 0) + 1);
        assignedResults.push({ group, substitute: best.teacher });
    });

    onSetAdjustments(selectedDate, newAdjustments);

    // Show summary notification
    if (skippedGroups.length > 0) {
        const skippedDetails = skippedGroups.map(g => {
            const absentName = language === 'ur' ? g.absentEntity.nameUr : g.absentEntity.nameEn;
            const className = language === 'ur' ? g.combinedClassNames.ur : g.combinedClassNames.en;
            return `• ${className} (${t.period} ${g.periodIndex + 1}) - ${absentName} ${t.isAbsent || 'is absent'}`;
        }).join('\n');
        
        alert(`Auto-Assignment Summary:\n------------------------\n✅ Successfully assigned: ${assignedResults.length}\n❌ Could not assign: ${skippedGroups.length}\n\nThe following periods require manual adjustment:\n${skippedDetails}`);
    } else {
        alert(`Success! Auto-assigned all ${assignedResults.length} uncovered periods.`);
    }
  };

  const handleShareTeacher = async (teacherId: string) => {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return;
      
      const groups = substitutionGroups.filter(g => g.absentEntity.id === teacherId);
      
      setTeacherShareData({
          teacherId,
          teacherName: language === 'ur' ? teacher.nameUr : teacher.nameEn,
          date: selectedDate,
          substitutions: groups
      });
      
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (teacherShareRef.current) {
          try {
              const blob = await toBlob(teacherShareRef.current, { 
                  pixelRatio: 2, 
                  backgroundColor: '#ffffff'
              });
              if (blob) {
                  try {
                      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                      alert("Teacher report copied to clipboard!");
                  } catch (err) {
                      console.error("Clipboard write failed", err);
                      alert("Could not auto-copy image. Please use screenshot.");
                  }
              }
          } catch (err) {
              console.error("Image generation failed", err);
          }
      }
      
      setTimeout(() => setTeacherShareData(null), 1000);
  };

  const handleSignAndShare = async (signature: string) => { };
  const formattedDateForTitle = new Date(selectedDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Add missing functions here
  const openModal = (mode: 'teacher' | 'class', id?: string) => {
      const key = mode === 'class' ? `CLASS_${id}` : (id || '');
      const details = (id && absenteeDetails) ? absenteeDetails[key] : undefined;
      
      setModalState({
          isOpen: true,
          mode,
          data: {
              id: id || '',
              isMultiDay: details ? (details.startDate !== details.endDate) : false,
              startDate: details?.startDate || selectedDate,
              endDate: details?.endDate || selectedDate,
              reason: details ? (LEAVE_REASONS.includes(details.reason || '') ? (details.reason || 'Illness') : 'Other') : 'Illness',
              customReason: details && !LEAVE_REASONS.includes(details.reason || '') ? (details.reason || '') : '',
              leaveType: details?.leaveType || 'full',
              startPeriod: details?.startPeriod || 1,
              periods: details?.periods || []
          }
      });
  };

  const handleModeChange = (mode: 'teacher' | 'class') => {
      setModalState(prev => ({
          ...prev,
          mode,
          data: { ...prev.data, id: '' }
      }));
  };

  const handleDeleteItem = (id: string, type: 'teacher' | 'class') => {
      openConfirmation(t.delete, t.cancelAlternativeTimetableConfirm, () => {
          onUpdateSession(session => {
              const currentLeaveDetails = { ...(session.leaveDetails || {}) };
              if (currentLeaveDetails[selectedDate]) {
                  const key = type === 'class' ? `CLASS_${id}` : id;
                  const { [key]: removed, ...rest } = currentLeaveDetails[selectedDate];
                  currentLeaveDetails[selectedDate] = rest;
              }

              let currentAdjustments = { ...(session.adjustments || {}) };
              if (type === 'teacher' && currentAdjustments[selectedDate]) {
                  currentAdjustments[selectedDate] = currentAdjustments[selectedDate].filter(
                      adj => adj.originalTeacherId !== id
                  );
              }

              return {
                  ...session,
                  leaveDetails: currentLeaveDetails,
                  adjustments: currentAdjustments
              };
          });
      });
  };

  if (!hasActiveSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* Hidden Slip Component for generating image */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -50, pointerEvents: 'none', opacity: 0 }}>
        {slipData && (
            <div ref={slipRef} className="w-[75rem] bg-white font-sans text-slate-800 relative overflow-hidden flex flex-col">
                {/* Top Gradient */}
                <div className="h-6 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="flex-grow p-16 flex flex-col items-center">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-medium text-slate-500 mb-4">Assalam o Alaikum</h2>
                        <h1 className="text-7xl font-black text-slate-900 uppercase tracking-tight mb-4 leading-tight">
                            {teachers.find(t => t.id === slipData.substituteTeacherId)?.nameEn}
                        </h1>
                        <p className="text-2xl text-slate-500 font-medium">
                            {schoolConfig.schoolNameEn}
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-12 shadow-sm">
                        
                        {/* Date Header */}
                        <div className="text-center mb-10">
                            <p className="text-xl font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Date</p>
                            <h3 className="text-5xl font-black text-slate-800">
                                {new Date(selectedDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                        </div>

                        {/* Divider */}
                        <div className="w-full border-t-4 border-dashed border-slate-200 mb-10"></div>

                        {/* 3 Col Grid */}
                        <div className="grid grid-cols-3 gap-8 mb-8">
                            {/* Period */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-2">Period</p>
                                <p className="text-6xl font-black text-indigo-600">{slipData.periodIndex + 1}</p>
                            </div>
                            {/* Time */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-2">Time</p>
                                <p className="text-5xl font-black text-emerald-500 mt-2">
                                    {(slipData.day === 'Friday' ? schoolConfig.periodTimings.friday : schoolConfig.periodTimings.default)[slipData.periodIndex]?.start || '--:--'}
                                </p>
                            </div>
                            {/* Room */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-2">Room</p>
                                <p className="text-6xl font-black text-orange-500">
                                    {classes.find(c => c.id === slipData.classId)?.roomNumber || '-'}
                                </p>
                            </div>
                        </div>

                        {/* Class / Subject Row */}
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 flex justify-between items-center mb-12">
                            <div>
                                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-1">Class</p>
                                <p className="text-5xl font-black text-slate-900">{classes.find(c => c.id === slipData.classId)?.nameEn}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                                <p className="text-5xl font-black text-blue-600 uppercase">{subjects.find(s => s.id === slipData.subjectId)?.nameEn}</p>
                            </div>
                        </div>

                        {/* On Behalf Of */}
                        <div className="text-center">
                            <p className="text-xl font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">On Behalf Of</p>
                            <h3 className="text-4xl font-black text-slate-700 uppercase">
                                {teachers.find(t => t.id === slipData.originalTeacherId)?.nameEn}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-900 text-white text-center py-6">
                    <p className="text-xl font-bold uppercase tracking-[0.3em]">MR. TMS GENERATED SLIP</p>
                </div>
            </div>
        )}
        {teacherShareData && (
            <div ref={teacherShareRef} className="w-[50rem] bg-white font-sans text-slate-800 relative overflow-hidden flex flex-col p-8 border border-slate-200">
                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-slate-100 pb-6">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                        {teacherShareData.teacherName}
                    </h2>
                    <p className="text-xl text-slate-500 font-medium">
                        {new Date(teacherShareData.date).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">Substitution Report</p>
                </div>

                {/* List */}
                <div className="flex flex-col gap-4">
                    {teacherShareData.substitutions.length > 0 ? (
                        teacherShareData.substitutions.map((group, idx) => {
                             const assignedAdj = dailyAdjustments.find(a => a.periodIndex === group.periodIndex && a.originalTeacherId === group.absentEntity.id);
                             const subTeacher = teachers.find(t => t.id === assignedAdj?.substituteTeacherId);
                             const subName = subTeacher ? (language === 'ur' ? subTeacher.nameUr : subTeacher.nameEn) : 'Unassigned';
                             
                             const activeConflict = subTeacher ? getTeacherConflict(subTeacher.id, group.periodIndex, assignedAdj?.id) : undefined;
                             const conflictData = activeConflict || assignedAdj?.conflictDetails;

                            return (
                                <div key={idx} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                                    <div className="flex flex-col items-center justify-center bg-white rounded-xl w-12 h-12 border border-slate-200 mr-4 shadow-sm flex-shrink-0">
                                        <span className="text-[0.625rem] font-bold text-slate-400 uppercase">PD</span>
                                        <span className="text-xl font-black text-slate-700">{group.periodIndex + 1}</span>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-lg font-bold text-slate-800 truncate">{group.combinedClassNames.en}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{group.subjectInfo.en}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end ml-4 flex-shrink-0">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Substitute</p>
                                        <p className={`text-lg font-black ${subTeacher ? 'text-emerald-600' : 'text-red-400'}`}>
                                            {subName}
                                        </p>
                                        {conflictData && (
                                            <div className="flex items-center text-[0.625rem] font-bold uppercase tracking-wider bg-[#d93025] text-white px-2 py-0.5 rounded-full mt-1 flex-shrink-0">
                                                <span className="truncate">Conflict: {language === 'ur' ? conflictData.classNameUr : conflictData.classNameEn}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-slate-400 italic">No periods scheduled for today.</div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{schoolConfig.schoolNameEn}</span>
                    <span className="text-slate-300 text-[0.625rem] font-bold uppercase tracking-widest">Generated by MR. TMS</span>
                </div>
            </div>
        )}
      </div>

      <PrintPreview 
        t={t} 
        isOpen={isPrintPreviewOpen} 
        onClose={() => setIsPrintPreviewOpen(false)} 
        title={`${t.dailyAdjustments} - ${formattedDateForTitle}`} 
        fileNameBase={`Adjustments_${selectedDate}`} 
        generateHtml={(lang, design) => generateAdjustmentsReportHtml(t, lang, design, dailyAdjustments, teachers, classes, subjects, schoolConfig, selectedDate, absentTeacherIds)}
        onGenerateExcel={(lang, design) => generateAdjustmentsExcel(t, lang, design, schoolConfig, dailyAdjustments, teachers, classes, subjects, selectedDate)}
        designConfig={schoolConfig.downloadDesigns.adjustments} 
        onSaveDesign={handleSavePrintDesign} 
      />

      {isSignModalOpen && (<SignatureModal t={t} isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} onFinalSave={handleSignAndShare} />)}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}>
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border-primary)] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)] flex justify-between items-center">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Generate Substitution Slip</h3>
                    <button onClick={() => { setIsShareModalOpen(false); setGeneratedShareBlob(null); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Select Teachers</span>
                        <button 
                            onClick={() => {
                                setGeneratedShareBlob(null);
                                if (selectedTeachersForSlip.length === absentTeachers.length) setSelectedTeachersForSlip([]);
                                else setSelectedTeachersForSlip(absentTeachers.map(t => t.id));
                            }}
                            className="text-xs text-[var(--accent-primary)] font-bold hover:underline"
                        >
                            {selectedTeachersForSlip.length === absentTeachers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {absentTeachers.map(teacher => (
                            <label key={teacher.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedTeachersForSlip.includes(teacher.id)}
                                    onChange={(e) => {
                                        setGeneratedShareBlob(null);
                                        if (e.target.checked) setSelectedTeachersForSlip(prev => [...prev, teacher.id]);
                                        else setSelectedTeachersForSlip(prev => prev.filter(id => id !== teacher.id));
                                    }}
                                    className="w-5 h-5 rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] bg-[var(--bg-tertiary)] border-[var(--border-secondary)]"
                                />
                                <span className="font-bold text-[var(--text-primary)]">{language === 'ur' ? teacher.nameUr : teacher.nameEn}</span>
                            </label>
                        ))}
                        {absentTeachers.length === 0 && <p className="text-center text-[var(--text-secondary)] italic py-4">No absent teachers today.</p>}
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--border-secondary)] bg-[var(--bg-tertiary)]">
                    {!generatedShareBlob ? (
                        <button 
                            onClick={handleGenerateMultiSlip}
                            disabled={selectedTeachersForSlip.length === 0 || isGeneratingShare}
                            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 text-lg relative"
                        >
                            {isGeneratingShare ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>Preparing Image...</span>
                                </>
                            ) : (
                                <>
                                    <ShareIcon /> Generate Slip
                                </>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={handleShareClick}
                            className="w-full py-3 relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/40 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></span>
                            <ShareIcon /> Share Image Now!
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Hidden Multi-Teacher Slip */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -50, pointerEvents: 'none', opacity: 0 }}>
        {computedMultiTeacherSlipData && (
            <div ref={multiTeacherSlipRef} className="w-[56.25rem] bg-white font-sans text-slate-800 p-6 pt-8 rounded-2xl">
                <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap');
                    .oswald-font { font-family: 'Oswald', sans-serif; }
                `}} />
                
                <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
                    <h2 className="text-[2.5rem] leading-tight font-black uppercase tracking-tight text-slate-900 oswald-font mb-1">{schoolConfig.schoolNameEn}</h2>
                    <p className="text-[1.5rem] text-slate-600 oswald-font font-bold uppercase tracking-widest mb-1">DAILY SUBSTITUTION REPORT</p>
                    <p className="text-[1.25rem] text-slate-500 font-medium oswald-font bg-slate-100 inline-block px-6 py-1 rounded-full uppercase tracking-tighter">
                        {new Date(computedMultiTeacherSlipData.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                
                <div className="flex flex-col gap-6">
                    {computedMultiTeacherSlipData.teachers.map((teacher, idx) => (
                        <div key={idx} className="break-inside-avoid">
                            <div className="flex items-center mb-2">
                                <h3 className="text-[1.5rem] font-bold text-slate-800 oswald-font">
                                    Teacher on Leave: <span className="text-slate-900 font-black underline decoration-2 decoration-slate-400">{teacher.nameEn.toUpperCase()}</span> <span className="text-slate-500 ml-2">({teacher.substitutions.length} {teacher.substitutions.length === 1 ? 'Period' : 'Periods'})</span>
                                </h3>
                            </div>
                            
                            <div className="flex flex-col gap-0 w-full border-2 border-slate-900 rounded-xl overflow-hidden shadow-md">
                                {/* Table Header */}
                                <div className="flex w-full bg-slate-900">
                                    <div className="w-[20%] text-white py-2 px-3 text-center font-bold text-sm oswald-font tracking-widest border-r border-slate-700">PERIOD</div>
                                    <div className="w-[30%] text-white py-2 px-3 text-center font-bold text-sm oswald-font tracking-widest border-r border-slate-700">CLASS & ROOM</div>
                                    <div className="w-[25%] text-white py-2 px-3 text-center font-bold text-sm oswald-font tracking-widest border-r border-slate-700">SUBJECT</div>
                                    <div className="w-[25%] text-white py-2 px-3 text-center font-bold text-sm oswald-font tracking-widest">SUBSTITUTE</div>
                                </div>

                                {teacher.substitutions.length > 0 ? teacher.substitutions.map((sub, sIdx) => {
                                    const assignedAdj = dailyAdjustments.find(a => a.periodIndex === sub.periodIndex && a.originalTeacherId === sub.absentEntity.id);
                                    const subTeacher = teachers.find(t => t.id === assignedAdj?.substituteTeacherId);
                                    const activeConflict = subTeacher ? getTeacherConflict(subTeacher.id, sub.periodIndex, assignedAdj?.id) : undefined;
                                    const conflictData = activeConflict || assignedAdj?.conflictDetails;
                                    
                                    // Timing
                                    const isFriday = new Date(selectedDate).getUTCDay() === 5;
                                    const timings = schoolConfig.periodTimings[isFriday ? 'friday' : 'default'];
                                    const timeStr = timings && timings[sub.periodIndex] ? timings[sub.periodIndex].start : '--:--';
                                    
                                    // Condense classes
                                    const classObjs = sub.combinedClassIds.map(id => classes.find(c => c.id === id)).filter(Boolean);
                                    const grouped: Record<string, { sections: string[], rooms: string[] }> = {};
                                    classObjs.forEach(c => {
                                        const parts = c.nameEn.split(' ');
                                        const section = parts.length > 1 ? parts[parts.length - 1] : '';
                                        const base = parts.length > 1 ? parts.slice(0, -1).join(' ') : c.nameEn;
                                        if (!grouped[base]) grouped[base] = { sections: [], rooms: [] };
                                        if (section) grouped[base].sections.push(section);
                                        if (c.roomNumber) grouped[base].rooms.push(c.roomNumber);
                                    });
                                    const classRoomStr = Object.entries(grouped).map(([base, data]) => {
                                        const sectionsStr = data.sections.length > 0 ? ` ${data.sections.join(', ')}` : '';
                                        const uniqRooms = Array.from(new Set(data.rooms));
                                        const roomStr = uniqRooms.length > 0 ? ` - (${uniqRooms.join(', ')})` : '';
                                        return `${base}${sectionsStr}${roomStr}`;
                                    }).join(' | ');

                                    return (
                                        <div key={sIdx} className={`flex w-full border-t border-slate-300 ${sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <div className="w-[20%] px-3 py-3 flex flex-col items-center justify-center border-r border-slate-300">
                                                <span className="text-[1.75rem] font-black text-slate-900 leading-none">{sub.periodIndex + 1}</span>
                                                <span className="text-[0.875rem] font-bold text-slate-500 mt-1">{timeStr}</span>
                                            </div>
                                            <div className="w-[30%] px-3 py-3 flex flex-col justify-center border-r border-slate-300 bg-white">
                                                <span className="text-[1.125rem] font-bold leading-tight text-slate-800 text-center">{classRoomStr || '-'}</span>
                                            </div>
                                            <div className="w-[25%] px-3 py-3 flex flex-col justify-center border-r border-slate-300 bg-white">
                                                <span className="text-[1.125rem] font-bold uppercase leading-tight text-slate-800 text-center">{sub.subjectInfo.en}</span>
                                            </div>
                                            <div className="w-[25%] px-3 py-3 flex flex-col justify-center items-center relative bg-white">
                                                {subTeacher ? (
                                                    <>
                                                        <span className="text-[1.375rem] font-black uppercase leading-tight text-center text-indigo-700">{subTeacher.nameEn}</span>
                                                        {conflictData && (
                                                            <div className="mt-1 w-full flex justify-center">
                                                                <div className="flex items-center text-[0.7rem] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded shadow-sm leading-none animate-pulse">
                                                                    Conflict: {language === 'ur' ? conflictData.classNameUr : conflictData.classNameEn}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[1.25rem] font-bold text-red-500 italic">Unassigned</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : <div className="p-8 text-center text-slate-400 italic bg-white">No periods found.</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-400 text-[0.6rem] font-bold uppercase tracking-[0.2em] oswald-font">
                    <span>Generated by Mr. TMS</span>
                    <span>Confidential Substitution Report</span>
                </div>
            </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.dailyAdjustments}</h2>
            <div className="relative group cursor-pointer">
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => onSelectionChange(prev => ({ ...prev, date: e.target.value }))} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <div className="flex items-center gap-4 bg-[var(--bg-secondary)] px-5 py-2.5 rounded-2xl border-2 border-[var(--border-secondary)] shadow-sm group-hover:border-[var(--accent-primary)] transition-all min-w-[150px]">
                    <div className="flex flex-col items-center border-r border-[var(--border-secondary)] pr-4">
                        <span className="text-[0.65rem] font-black text-[#6366f1] uppercase leading-none tracking-wider">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-2xl font-bold text-[#0f172a] dark:text-white mt-1 leading-none">
                            {new Date(selectedDate).getDate()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[0.75rem] font-bold text-[#475569] dark:text-[#94a3b8] uppercase leading-none tracking-tight">
                            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long' })}
                        </span>
                        <span className="text-[0.75rem] font-bold text-[#94a3b8] dark:text-[#64748b] leading-none mt-1">
                            {new Date(selectedDate).getFullYear()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
            <button 
                onClick={autoAssignSubstitutes} 
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95" 
                title={t.autoAssign}
            >
                <AutoIcon />
                <span className="hidden sm:inline">{t.autoAssign}</span>
            </button>
            <button 
                onClick={clearAllAdjustments} 
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-200 transition-all active:scale-95" 
                title={t.clearAll}
            >
                <ResetIcon />
                <span className="hidden sm:inline">{t.clearAll}</span>
            </button>
            <div className="w-px h-8 bg-[var(--border-secondary)] mx-1 hidden sm:block"></div>
            <button onClick={() => { setSelectedTeachersForSlip(absentTeachers.map(t => t.id)); setIsShareModalOpen(true); }} className="p-3 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors border border-transparent hover:border-[var(--border-secondary)]" title="Share Slips"><ShareIcon /></button>
            <button onClick={() => setIsImportExportOpen(true)} className="p-3 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors border border-transparent hover:border-[var(--border-secondary)]" title="Import/Export Adjustments"><ImportExportIcon /></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} className="p-3 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors border border-[var(--border-secondary)] shadow-sm" title={t.printViewAction}><PrintIcon /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         <div className="mb-2">
             <button onClick={() => openModal('teacher')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                 <PlusIcon /> 
                 <span>{t.add || 'Add'} Absence</span>
             </button>
         </div>

         {dayOfWeek ? (
            allAbsentEntities.length > 0 ? (
            <div className="space-y-4">
                {allAbsentEntities.map(entity => {
                    const entityGroups = substitutionGroups.filter(g => g.absentEntity.id === entity.id);
                    const isExpanded = expandedTeacherIds.has(entity.id);
                    const isClass = entity.type === 'class';

                    return (
                        <div key={entity.id} className="animate-fade-in group">
                            <div 
                                className={`w-full flex items-center justify-between p-3 bg-[var(--bg-secondary)] border-l-4 ${isClass ? 'border-l-blue-500' : 'border-l-red-500'} border border-gray-200 dark:border-gray-700 rounded-r-lg shadow-sm transition-all cursor-pointer hover:shadow-md mb-0.5`}
                                onClick={() => toggleTeacherCollapse(entity.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <h3 className={`text-sm font-black ${isClass ? 'text-blue-900 dark:text-blue-100' : 'text-red-900 dark:text-red-500'} uppercase tracking-tight ml-2`}>
                                        {getName(entity)}
                                        {isClass && <span className="ml-2 text-xs opacity-60 font-medium normal-case">(Class Leave)</span>}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openModal(entity.type, entity.id); }} 
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Leave"
                                        >
                                            <EditIcon />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(entity.id, entity.type); }} 
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Leave / Clear Substitutions"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    <div className={`text-gray-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown />
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-4 bg-[var(--bg-tertiary)]/50 border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-scale-in mb-4">
                                    {entityGroups.length === 0 ? (
                                        <div className="col-span-full text-center text-sm text-[var(--text-secondary)] italic py-2">
                                            No periods scheduled for this day.
                                        </div>
                                    ) : (
                                        entityGroups.map((group, gIdx) => {
                                            const assignedAdj = dailyAdjustments.find(a => a.periodIndex === group.periodIndex && a.originalTeacherId === group.absentEntity.id);
                                            const availableTeachersList = isClass ? [] : findAvailableTeachers(group.periodIndex, group.period, group.combinedClassIds);
                                            const cardId = `${entity.id}-${group.periodIndex}-${gIdx}`;
                                            
                                            return (
                                                <div key={cardId} className={activeDropdownCardId === cardId ? 'z-30' : 'z-0'}>
                                                    {isClass ? (
                                                        <div className="p-3 rounded-2xl border bg-blue-50/50 border-blue-200 dark:border-blue-800 flex flex-col gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex flex-col items-center justify-center bg-white dark:bg-black/20 rounded-xl w-10 h-10 border border-blue-100">
                                                                    <span className="text-[0.5rem] font-bold text-blue-400 uppercase">PD</span>
                                                                    <span className="text-lg font-black text-blue-600">{group.periodIndex + 1}</span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">{group.subjectInfo.en}</h4>
                                                                    <p className="text-xs text-blue-700/70">Cancelled</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <SubstitutionCard
                                                            group={group}
                                                            assignedAdj={assignedAdj}
                                                            availableTeachersList={availableTeachersList}
                                                            historyStats={historyStats}
                                                            language={language}
                                                            t={t}
                                                            onSubstituteChange={handleSubstituteChange}
                                                            onWhatsAppNotify={handleWhatsAppNotify}
                                                            onToggleDropdown={(isOpen) => setActiveDropdownCardId(isOpen ? cardId : null)}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            ) : <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-secondary)]"><p className="text-[var(--text-secondary)]">{t.noClassesScheduled}</p></div>
         ) : <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-secondary)]"><p className="text-[var(--text-secondary)]">Please select a date to begin.</p></div>}
      </div>
      
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110]" onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col border border-[var(--border-primary)] animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-5 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-tertiary)]/50">
               <h3 className="font-bold text-lg text-[var(--text-primary)]">
                 {modalState.data.id ? t.edit : t.add} {modalState.mode === 'teacher' ? t.teacherOnLeave : 'Class Leave'}
               </h3>
               <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="text-[var(--text-secondary)] hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             
             <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {!modalState.data.id && (
                    <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
                        <button 
                            type="button"
                            onClick={() => handleModeChange('teacher')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${modalState.mode === 'teacher' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            Teacher
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleModeChange('class')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${modalState.mode === 'class' ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            Class
                        </button>
                    </div>
                )}
                
                <div>
                   <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">
                       {modalState.mode === 'teacher' ? t.teacher : t.class}
                   </label>
                   <select 
                       value={modalState.data.id} 
                       onChange={(e) => setModalState(prev => ({ ...prev, data: { ...prev.data, id: e.target.value } }))}
                       className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                       disabled={!!modalState.data.id && !!absenteeDetails[modalState.mode === 'class' ? `CLASS_${modalState.data.id}` : modalState.data.id]} 
                   >
                       <option value="">Select...</option>
                       {modalState.mode === 'teacher' 
                           ? teachers.map(t => <option key={t.id} value={t.id}>{t.nameEn}</option>)
                           : classes.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)
                       }
                   </select>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={modalState.data.isMultiDay} onChange={(e) => setModalState(prev => ({ ...prev, data: { ...prev.data, isMultiDay: e.target.checked } }))} className="form-checkbox text-[var(--accent-primary)] rounded" />
                    <label className="text-sm font-medium text-[var(--text-primary)]">Multi-day Leave</label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Start Date</label>
                        <input type="date" value={modalState.data.startDate} onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, startDate: e.target.value}}))} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-sm" />
                    </div>
                    {modalState.data.isMultiDay && (
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">End Date</label>
                            <input type="date" value={modalState.data.endDate} onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, endDate: e.target.value}}))} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-sm" />
                        </div>
                    )}
                </div>

                <div className="bg-[var(--bg-tertiary)]/30 p-3 rounded-xl border border-[var(--border-secondary)]">
                    <div className="flex gap-4 mb-3">
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="leaveType" checked={modalState.data.leaveType === 'full'} onChange={() => setModalState(prev => ({...prev, data: {...prev.data, leaveType: 'full'}}))} className="form-radio text-[var(--accent-primary)]" />
                             <span className="text-sm font-medium text-[var(--text-primary)]">{t.fullDay}</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="leaveType" checked={modalState.data.leaveType === 'half'} onChange={() => setModalState(prev => ({...prev, data: {...prev.data, leaveType: 'half'}}))} className="form-radio text-[var(--accent-primary)]" />
                             <span className="text-sm font-medium text-[var(--text-primary)]">{t.halfDay}</span>
                         </label>
                    </div>
                    
                    {modalState.data.leaveType === 'half' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">Select Periods to Miss:</label>
                            <div className="flex flex-wrap gap-2">
                                {Array.from({length: periodsForDropdown}, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            const currentPeriods = modalState.data.periods || [];
                                            const newPeriods = currentPeriods.includes(p) 
                                                ? currentPeriods.filter(x => x !== p)
                                                : [...currentPeriods, p].sort((a,b) => a-b);
                                            setModalState(prev => ({...prev, data: {...prev.data, periods: newPeriods}}));
                                        }}
                                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border transition-all ${
                                            (modalState.data.periods || []).includes(p)
                                            ? 'bg-red-500 text-white border-red-600 shadow-md transform scale-110'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-secondary)] hover:border-[var(--accent-primary)]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div>
                   <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Reason</label>
                   <select 
                        value={modalState.data.reason} 
                        onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, reason: e.target.value}}))}
                        className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-sm mb-2"
                   >
                       {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                   {modalState.data.reason === 'Other' && (
                       <input 
                           type="text" 
                           placeholder="Specify reason..."
                           value={modalState.data.customReason}
                           onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, customReason: e.target.value}}))}
                           className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-sm"
                       />
                   )}
                </div>
             </div>

             <div className="p-5 border-t border-[var(--border-primary)] flex justify-end gap-3 bg-[var(--bg-tertiary)]/30 rounded-b-2xl">
                 <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">{t.cancel}</button>
                 <button onClick={handleSaveModal} className="px-6 py-2.5 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-xl shadow-lg transition-transform active:scale-95">{t.save}</button>
             </div>
          </div>
        </div>
      )}
      
      {isImportExportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]" onClick={() => setIsImportExportOpen(false)}>
            <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Import / Export Adjustments</h3>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-2">Export Data</h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="p-2 border rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm" />
                            <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="p-2 border rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm" />
                        </div>
                        <button onClick={handleExport} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">Download JSON</button>
                    </div>
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-2">Import Data</h4>
                        <p className="text-xs text-[var(--text-secondary)] mb-2">Upload a previously exported JSON file to restore adjustments and leave records.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700">Select File</button>
                        <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
                    </div>
                </div>
                
                <div className="flex justify-end mt-6">
                    <button onClick={() => setIsImportExportOpen(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AlternativeTimetablePage;
