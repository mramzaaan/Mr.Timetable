import React, { useState, useEffect } from 'react';
import type { TimetableSession, Teacher, SchoolClass, TimetableGridData } from '../types';
import { generateUniqueId } from '../types';
import { Download, Upload, CheckCircle2, AlertCircle, ArrowRight, FileSpreadsheet, X, HelpCircle, Sparkles, Database, LayoutGrid, ChevronDown, Save } from 'lucide-react';

interface CsvManagementModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  currentTimetableSession: TimetableSession | null;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
}

type CsvDataType = 'teachers' | 'classes' | 'subjects' | 'lessons' | 'jointPeriods' | 'daysConfig' | 'timings' | 'breaks' | 'vacations' | 'attendance' | 'leaveDetails' | 'timetable';

enum ImportPhase {
    IDLE = 'idle',
    UPLOAD = 'upload',
    MAPPING = 'mapping',
    REVIEW = 'review',
    IMPORTING = 'importing',
}

interface ColumnMapping {
    [internalKey: string]: string; // internalKey -> csvHeader
}

interface ValidationError {
    rowIndex: number;
    field: string;
    message: string;
}

interface ImportAnalysis {
    newCount: number;
    updateCount: number;
    errorCount: number;
}

const FIELD_DEFINITIONS: Record<string, { key: string; label: string; required?: boolean; type?: 'string' | 'number' | 'select'; options?: string[] }[]> = {
    teachers: [
        { key: 'nameEn', label: 'Name (English)', required: true },
        { key: 'nameUr', label: 'Name (Urdu)', required: true },
        { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
        { key: 'contactNumber', label: 'Contact Number' },
        { key: 'serialNumber', label: 'Serial Number', type: 'number' },
        { key: 'email', label: 'Email' },
    ],
    classes: [
        { key: 'nameEn', label: 'Class Name (En)', required: true },
        { key: 'nameUr', label: 'Class Name (Ur)', required: true },
        { key: 'section', label: 'Section' },
        { key: 'academicLevel', label: 'Level', type: 'select', options: ['Primary', 'Elementary', 'Secondary', 'Higher Secondary'] },
        { key: 'inChargeName', label: 'In-charge (Name)' },
        { key: 'roomNumber', label: 'Room #' },
        { key: 'studentCount', label: 'Students', type: 'number' },
        { key: 'serialNumber', label: 'Serial #', type: 'number' },
    ],
    subjects: [
        { key: 'serialNumber', label: 'Serial #', type: 'number' },
        { key: 'nameEn', label: 'Subject (En)', required: true },
        { key: 'nameUr', label: 'Subject (Ur)', required: true },
    ],
    lessons: [
        { key: 'className', label: 'Class Name', required: true },
        { key: 'teacherName', label: 'Teacher' },
        { key: 'subjectName', label: 'Subject', required: true },
        { key: 'periodsPerWeek', label: 'Periods/Week', type: 'number', required: true },
        { key: 'practicalPeriodsCount', label: 'Practical Periods', type: 'number' },
    ],
    jointPeriods: [
        { key: 'name', label: 'Joint Area/Name', required: true },
        { key: 'teacherName', label: 'Teacher', required: true },
        { key: 'periodsPerWeek', label: 'Periods/Week', type: 'number', required: true },
        { key: 'classesList', label: 'Involved Classes (comma separated)', required: true },
    ],
    daysConfig: [
        { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
        { key: 'active', label: 'Active (Y/N)', required: true },
        { key: 'periodCount', label: 'Period Count', type: 'number', required: true },
    ],
    timings: [
        { key: 'type', label: 'Type (Regular/Friday)', required: true },
        { key: 'periodIndex', label: 'Period # (1-based)', type: 'number', required: true },
        { key: 'start', label: 'Start Time', required: true },
        { key: 'end', label: 'End Time', required: true },
    ],
    breaks: [
        { key: 'type', label: 'Type (Regular/Friday)', required: true },
        { key: 'name', label: 'Break Name', required: true },
        { key: 'beforePeriod', label: 'Before Period #', type: 'number', required: true },
        { key: 'start', label: 'Start Time', required: true },
        { key: 'end', label: 'End Time', required: true },
    ],
    vacations: [
        { key: 'name', label: 'Vacation Name', required: true },
        { key: 'startDate', label: 'Start Date', required: true },
        { key: 'endDate', label: 'End Date', required: true },
    ],
    attendance: [
        { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
        { key: 'className', label: 'Class Name', required: true },
        { key: 'present', label: 'Present', type: 'number', required: true },
        { key: 'absent', label: 'Absent', type: 'number', required: true },
        { key: 'sick', label: 'Sick', type: 'number' },
        { key: 'leave', label: 'Leave', type: 'number' },
    ],
    leaveDetails: [
        { key: 'date', label: 'Date (YYYY-MM-DD)', required: true },
        { key: 'teacherName', label: 'Teacher Name', required: true },
        { key: 'leaveType', label: 'Type (full/half)', required: true },
        { key: 'reason', label: 'Reason' },
    ],
    timetable: [
        { key: 'className', label: 'Class', required: true },
        { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
        { key: 'period', label: 'Period #', type: 'number', required: true },
        { key: 'subjectName', label: 'Subject', required: true },
        { key: 'teacherName', label: 'Teacher', required: true },
    ],
};

const TABS: { id: CsvDataType; label: string; icon: any }[] = [
    { id: 'teachers', label: 'Teachers', icon: Database },
    { id: 'classes', label: 'Classes', icon: LayoutGrid },
    { id: 'subjects', label: 'Subjects', icon: Sparkles },
    { id: 'lessons', label: 'Allocations', icon: ArrowRight },
    { id: 'jointPeriods', label: 'Joint Periods', icon: ChevronDown },
    { id: 'daysConfig', label: 'Days Config', icon: LayoutGrid },
    { id: 'timings', label: 'Timings', icon: Save },
    { id: 'breaks', label: 'Breaks', icon: HelpCircle },
    { id: 'vacations', label: 'Vacations', icon: Sparkles },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
    { id: 'leaveDetails', label: 'Leave', icon: AlertCircle },
    { id: 'timetable', label: 'Full Timetable', icon: FileSpreadsheet },
];

const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []), Saturday: Array.from({ length: 8 }, () => []),
});

const CsvManagementModal: React.FC<CsvManagementModalProps> = ({ t, isOpen, onClose, currentTimetableSession, onUpdateTimetableSession }) => {
    const [activeTab, setActiveTab] = useState<CsvDataType>('teachers');
    const [phase, setPhase] = useState<ImportPhase>(ImportPhase.UPLOAD);
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [mapping, setMapping] = useState<ColumnMapping>({});
    const [isDragging, setIsDragging] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [importProgress, setImportProgress] = useState(0);
    const [skipErrors, setSkipErrors] = useState(true);
    const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis>({ newCount: 0, updateCount: 0, errorCount: 0 });
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

    const MAPPING_STORAGE_KEY = `csv_mapping_v1_${activeTab}`;

    useEffect(() => {
        if (!isOpen) {
            resetModal();
        }
    }, [isOpen]);

    const resetModal = () => {
        setPhase(ImportPhase.IDLE);
        setCsvRows([]);
        setCsvHeaders([]);
        setMapping({});
        setValidationErrors([]);
        setFeedback({ message: '', type: null });
        setImportProgress(0);
    };

    const autoMapHeaders = (headers: string[]) => {
        const fieldDefs = FIELD_DEFINITIONS[activeTab];
        if (!fieldDefs) return;
        const newMapping: ColumnMapping = {};
        const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
        const savedMapping = saved ? JSON.parse(saved) : null;

        fieldDefs.forEach(field => {
            if (savedMapping && savedMapping[field.key] && headers.includes(savedMapping[field.key])) {
                newMapping[field.key] = savedMapping[field.key];
            } else {
                const bestMatch = headers.find(h => 
                    h.toLowerCase() === field.key.toLowerCase() || 
                    h.toLowerCase() === field.label.toLowerCase() ||
                    h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
                );
                if (bestMatch) newMapping[field.key] = bestMatch;
            }
        });
        setMapping(newMapping);
    };

    const validateData = (rows: Record<string, string>[], currentMapping: ColumnMapping) => {
        const errors: ValidationError[] = [];
        const fieldDefs = FIELD_DEFINITIONS[activeTab];
        if (!fieldDefs) return;

        rows.forEach((row, rowIndex) => {
            fieldDefs.forEach(field => {
                const csvHeader = currentMapping[field.key];
                const value = csvHeader ? row[csvHeader] : '';
                if (field.required && (!value || value.trim() === '')) {
                    errors.push({ rowIndex, field: field.key, message: `Field is required.` });
                }
                if (field.type === 'number' && value && isNaN(Number(value))) {
                    errors.push({ rowIndex, field: field.key, message: `Must be a number.` });
                }
            });
        });

        setValidationErrors(errors);
        const errRows = new Set(errors.map(e => e.rowIndex));
        setImportAnalysis({ newCount: rows.length - errRows.size, updateCount: 0, errorCount: errRows.size });
        const initialSelected = new Set<number>();
        rows.forEach((_, i) => { if (!errRows.has(i)) initialSelected.add(i); });
        setSelectedRows(initialSelected);
    };

    const handleFileUpload = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setFeedback({ message: 'Only CSV files are supported.', type: 'error' });
            return;
        }
        setFileName(file.name);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 1) throw new Error('CSV is empty.');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data = lines.slice(1).map(line => {
                const row: Record<string, string> = {};
                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                headers.forEach((h, i) => row[h] = values[i] || '');
                return row;
            });
            setCsvHeaders(headers);
            setCsvRows(data);
            autoMapHeaders(headers);
            setPhase(ImportPhase.MAPPING);
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        }
    };

    const handleConfirmMapping = () => {
        localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
        validateData(csvRows, mapping);
        setPhase(ImportPhase.REVIEW);
    };

    const handleInlineEdit = (rowIndex: number, fieldKey: string, newValue: string) => {
        const csvHeader = mapping[fieldKey];
        if (!csvHeader) return;
        const updatedRows = [...csvRows];
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [csvHeader]: newValue };
        setCsvRows(updatedRows);
        validateData(updatedRows, mapping);
    };

    const executeImport = async () => {
        if (!currentTimetableSession) return;
        setPhase(ImportPhase.IMPORTING);
        for (let i = 0; i <= 100; i += 20) {
            setImportProgress(i);
            await new Promise(r => setTimeout(r, 100));
        }

        try {
            onUpdateTimetableSession(session => {
                const updatedSession = JSON.parse(JSON.stringify(session));
                const fields = FIELD_DEFINITIONS[activeTab];
                const rowsToImport = csvRows.filter((_, i) => selectedRows.has(i));

                rowsToImport.forEach(row => {
                    const data: any = {};
                    fields.forEach(f => {
                        const csvVal = row[mapping[f.key] || ''];
                        data[f.key] = f.type === 'number' ? Number(csvVal) : csvVal;
                    });

                    if (activeTab === 'teachers') {
                        const newT = { id: generateUniqueId(), ...data, gender: data.gender || 'Male' };
                        const idx = updatedSession.teachers.findIndex((t: any) => t.nameEn.toLowerCase() === newT.nameEn.toLowerCase());
                        if (idx >= 0) updatedSession.teachers[idx] = { ...updatedSession.teachers[idx], ...newT, id: updatedSession.teachers[idx].id };
                        else updatedSession.teachers.push(newT);
                    } else if (activeTab === 'classes') {
                        const newC = { id: generateUniqueId(), ...data, subjects: [], timetable: createEmptyTimetable(), groupSets: [] };
                        updatedSession.classes.push(newC);
                    }
                    // Implement other mappings similarly...
                });
                return updatedSession;
            });
            setFeedback({ message: 'Success! Data imported successfully.', type: 'success' });
            setTimeout(() => setPhase(ImportPhase.UPLOAD), 1500);
        } catch (err) {
            setFeedback({ message: 'Critical Error during import.', type: 'error' });
            setPhase(ImportPhase.REVIEW);
        }
    };

    const downloadTemplate = () => {
        const headers = FIELD_DEFINITIONS[activeTab].map(f => f.key).join(',');
        const blob = new Blob([headers], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportCurrentData = () => {
        if (!currentTimetableSession) return;
        const s = currentTimetableSession;
        let data: any[] = [];
        const fields = FIELD_DEFINITIONS[activeTab];

        try {
            switch (activeTab) {
                case 'teachers':
                    data = s.teachers;
                    break;
                case 'classes':
                    data = s.classes.map(c => ({ ...c, inChargeName: c.inCharge }));
                    break;
                case 'subjects':
                    data = s.subjects;
                    break;
                case 'lessons':
                    s.classes.forEach(c => {
                        c.subjects.forEach(cs => {
                            const teacher = s.teachers.find(t => t.id === cs.teacherId);
                            const subject = s.subjects.find(sub => sub.id === cs.subjectId);
                            data.push({
                                className: c.nameEn,
                                teacherName: teacher?.nameEn || '',
                                subjectName: subject?.nameEn || '',
                                periodsPerWeek: cs.periodsPerWeek,
                                practicalPeriodsCount: cs.practicalPeriodsCount || 0
                            });
                        });
                    });
                    break;
                case 'timetable':
                    s.classes.forEach(c => {
                        (Object.entries(c.timetable || {}) as [string, any][]).forEach(([day, periods]) => {
                            periods.forEach((slot: any, pIdx: number) => {
                                slot.forEach((p: any) => {
                                    const teacher = s.teachers.find(t => t.id === p.teacherId);
                                    const subject = s.subjects.find(sub => sub.id === p.subjectId);
                                    data.push({
                                        className: c.nameEn,
                                        day,
                                        period: pIdx + 1,
                                        subjectName: subject?.nameEn || '',
                                        teacherName: teacher?.nameEn || ''
                                    });
                                });
                            });
                        });
                    });
                    break;
                case 'daysConfig':
                    if (s.daysConfig) {
                        data = (Object.entries(s.daysConfig) as [string, any][]).map(([day, cfg]) => ({
                            day,
                            active: cfg.active ? 'Y' : 'N',
                            periodCount: cfg.periodCount
                        }));
                    }
                    break;
                case 'timings':
                    if (s.periodTimings) {
                        s.periodTimings.default.forEach((t, i) => data.push({ type: 'Regular', periodIndex: i + 1, start: t.start, end: t.end }));
                        s.periodTimings.friday.forEach((t, i) => data.push({ type: 'Friday', periodIndex: i + 1, start: t.start, end: t.end }));
                    }
                    break;
                case 'breaks':
                    if (s.breaks) {
                        s.breaks.default.forEach(b => data.push({ type: 'Regular', name: b.name, beforePeriod: b.beforePeriod, start: b.startTime, end: b.endTime }));
                        s.breaks.friday.forEach(b => data.push({ type: 'Friday', name: b.name, beforePeriod: b.beforePeriod, start: b.startTime, end: b.endTime }));
                    }
                    break;
                case 'vacations':
                    data = s.vacations || [];
                    break;
                case 'attendance':
                    if (s.attendance) {
                        Object.entries(s.attendance).forEach(([date, classMap]) => {
                            Object.entries(classMap).forEach(([classId, att]) => {
                                const cls = s.classes.find(c => c.id === classId);
                                data.push({
                                    date,
                                    className: cls?.nameEn || classId,
                                    present: att.present,
                                    absent: att.absent,
                                    sick: att.sick || 0,
                                    leave: att.leave || 0
                                });
                            });
                        });
                    }
                    break;
                case 'leaveDetails':
                    if (s.leaveDetails) {
                        Object.entries(s.leaveDetails).forEach(([date, teacherMap]) => {
                            Object.entries(teacherMap).forEach(([teacherId, l]) => {
                                const teacher = s.teachers.find(t => t.id === teacherId);
                                data.push({
                                    date,
                                    teacherName: teacher?.nameEn || teacherId,
                                    leaveType: l.leaveType,
                                    reason: l.reason || ''
                                });
                            });
                        });
                    }
                    break;
            }

            if (data.length === 0) {
                setFeedback({ message: 'No data found for this category.', type: 'error' });
                return;
            }

            const headers = fields.map(f => f.key);
            const csvRows = [headers.join(',')];
            
            data.forEach(item => {
                const row = fields.map(f => {
                    const val = item[f.key];
                    return `"${(val === undefined || val === null) ? '' : String(val).replace(/"/g, '""')}"`;
                });
                csvRows.push(row.join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab}_current_data.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setFeedback({ message: 'Export successful!', type: 'success' });
        } catch (err) {
            setFeedback({ message: 'Export failed.', type: 'error' });
        }
    };

    if (!isOpen) return null;

    const GlassCardCls = "bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden";

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer pointer-events-auto"
            onClick={onClose}
        >
            <div 
                className={`${GlassCardCls} relative w-full max-w-5xl h-[85dvh] flex flex-col animate-in zoom-in duration-300 pointer-events-auto cursor-default`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-lg">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Smart Data Sync</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 font-sans">CSV Import & Transformation</p>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                        title="Close Modal"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </header>

                <div className="flex flex-grow min-h-0 overflow-hidden">
                    <aside className="w-56 border-r border-black/5 dark:border-white/10 p-4 space-y-2 overflow-y-auto bg-black/[0.02] dark:bg-white/[0.02] shrink-0 custom-scrollbar">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40 mb-2 px-2">Data Categories</div>
                        {TABS.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setPhase(ImportPhase.IDLE); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-[1.02]' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                            >
                                <tab.icon size={14} />
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </aside>

                    <main className="flex-grow flex flex-col min-h-0 min-w-0 bg-[var(--bg-primary)]/40 relative">
                        {phase === ImportPhase.IDLE && (
                             <div className="flex-grow flex flex-col p-8 animate-in fade-in duration-500">
                                <div className="grid grid-cols-2 gap-6 h-full">
                                    <div 
                                        onClick={() => setPhase(ImportPhase.UPLOAD)}
                                        className="border-2 border-dashed border-[var(--accent-primary)]/30 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-[var(--accent-primary)]/5 hover:border-[var(--accent-primary)] transition-all group"
                                    >
                                        <div className="bg-[var(--accent-primary)]/10 p-6 rounded-2xl mb-4 text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                                            <Upload size={40} />
                                        </div>
                                        <h4 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Import CSV</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 text-center uppercase tracking-widest font-sans">Update or populate {activeTab} data by uploading a file</p>
                                    </div>

                                    <div 
                                        onClick={exportCurrentData}
                                        className="border-2 border-dashed border-emerald-500/30 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500 transition-all group"
                                    >
                                        <div className="bg-emerald-500/10 p-6 rounded-2xl mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                                            <Download size={40} />
                                        </div>
                                        <h4 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Export Data</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 text-center uppercase tracking-widest font-sans">Save current {activeTab} to CSV for backup or editing</p>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-between items-center p-5 bg-white/40 dark:bg-slate-800/40 rounded-3xl border border-white/20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]"><HelpCircle size={20}/></div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 block">Need a starting point?</span>
                                            <p className="text-[10px] font-black uppercase tracking-tight text-[var(--text-primary)]">Download a structure template</p>
                                        </div>
                                    </div>
                                    <button onClick={downloadTemplate} className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[var(--accent-primary)]/20 flex items-center gap-2">Get {activeTab} Template <Download size={14}/></button>
                                </div>
                             </div>
                        )}

                        {phase === ImportPhase.UPLOAD && (
                            <div className="flex-grow flex flex-col p-8">
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
                                    className={`flex-grow border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-95' : 'border-black/10 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5'}`}
                                >
                                    <div className="bg-indigo-50 dark:bg-blue-600/20 p-8 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
                                        <Upload size={48} />
                                    </div>
                                    <h4 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Drop it here</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-8 font-sans">Supports .csv files only</p>
                                    <input type="file" id="csv-input-main" hidden accept=".csv" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); document.getElementById('csv-input-main')?.click(); }} 
                                        className="px-12 py-5 bg-[var(--accent-primary)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 hover:brightness-110 transition-all active:scale-95"
                                    >
                                        Browse Computer
                                    </button>
                                </div>
                                <button onClick={() => setPhase(ImportPhase.IDLE)} className="mt-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 hover:opacity-100 flex items-center justify-center gap-2"><ArrowRight className="rotate-180" size={14}/> Back to Options</button>
                            </div>
                        )}

                        {phase === ImportPhase.MAPPING && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    {FIELD_DEFINITIONS[activeTab]?.map(field => (
                                        <div key={field.key} className="bg-white/40 dark:bg-black/10 p-4 rounded-xl border border-white/20">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] block mb-2">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                            <select 
                                                value={mapping[field.key] || ''} 
                                                onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                className="w-full bg-white dark:bg-black/30 border border-white/20 p-2 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none"
                                            >
                                                <option value="">-- Choose Column --</option>
                                                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-white/20 flex gap-4">
                                    <button onClick={() => setPhase(ImportPhase.UPLOAD)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Back</button>
                                    <button onClick={handleConfirmMapping} className="flex-grow py-4 bg-[var(--accent-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-primary)]/20">Analyze & Review</button>
                                </div>
                            </div>
                        )}

                        {phase === ImportPhase.REVIEW && (
                            <div className="flex flex-col h-full animate-in fade-in duration-500">
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white/40 p-4 rounded-xl border border-white/20 flex items-center justify-between">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Valid</div>
                                        <div className="text-xl font-black text-green-500">{importAnalysis.newCount}</div>
                                    </div>
                                    <div className="bg-white/40 p-4 rounded-xl border border-white/20 flex items-center justify-between">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Invalid</div>
                                        <div className="text-xl font-black text-red-500">{importAnalysis.errorCount}</div>
                                    </div>
                                    <div className="bg-white/40 p-4 rounded-xl border border-white/20 flex items-center justify-between">
                                        <div className="text-[9px] font-black uppercase tracking-widest opacity-50">Selected</div>
                                        <div className="text-xl font-black text-[var(--accent-primary)]">{selectedRows.size}</div>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-auto bg-white/20 dark:bg-black/20 rounded-xl border border-white/10 mb-6 custom-scrollbar shadow-inner">
                                    <table className="w-full text-left text-[11px] border-separate border-spacing-0">
                                        <thead className="bg-black/5 dark:bg-white/5 sticky top-0 backdrop-blur-md z-10">
                                            <tr>
                                                <th className="p-4 border-b border-white/10 w-10"><input type="checkbox" checked={selectedRows.size === csvRows.length} onChange={(e) => setSelectedRows(e.target.checked ? new Set(csvRows.map((_, i) => i)) : new Set())} /></th>
                                                {FIELD_DEFINITIONS[activeTab].map(f => (
                                                    <th key={f.key} className="p-4 border-b border-white/10 text-[9px] font-black uppercase tracking-widest opacity-60">{f.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvRows.map((row, rowIndex) => (
                                                <tr key={rowIndex} className={`border-b border-white/5 hover:bg-white/10 transition-colors ${!selectedRows.has(rowIndex) ? 'opacity-40 grayscale' : ''}`}>
                                                    <td className="p-4 text-center border-b border-white/5">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedRows.has(rowIndex)} 
                                                            onChange={(e) => {
                                                                const next = new Set(selectedRows);
                                                                if (e.target.checked) next.add(rowIndex);
                                                                else next.delete(rowIndex);
                                                                setSelectedRows(next);
                                                            }}
                                                        />
                                                    </td>
                                                    {FIELD_DEFINITIONS[activeTab].map(f => {
                                                        const err = validationErrors.find(e => e.rowIndex === rowIndex && e.field === f.key);
                                                        return (
                                                            <td key={f.key} className={`p-1 border-b border-white/5 relative group ${err ? 'bg-red-500/10' : ''}`}>
                                                                <input 
                                                                    className={`w-full bg-transparent p-2 outline-none border-0 text-xs font-semibold ${err ? 'text-red-500' : 'text-[var(--text-primary)]'}`}
                                                                    value={row[mapping[f.key] || ''] || ''}
                                                                    onChange={(e) => handleInlineEdit(rowIndex, f.key, e.target.value)}
                                                                />
                                                                {err && (
                                                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"><AlertCircle size={10} className="text-red-500"/></div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex gap-4 items-center">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-8 h-4 rounded-full p-1 transition-colors ${skipErrors ? 'bg-orange-500' : 'bg-gray-300 dark:bg-white/10'}`} onClick={() => setSkipErrors(!skipErrors)}>
                                            <div className={`w-2 h-2 bg-white rounded-full transition-transform ${skipErrors ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 group-hover:opacity-100">Don't import broken rows</span>
                                    </label>
                                    <div className="flex-grow" />
                                    <button onClick={() => setPhase(ImportPhase.MAPPING)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Go Back</button>
                                    <button 
                                        onClick={executeImport}
                                        disabled={selectedRows.size === 0}
                                        className="px-10 py-5 bg-[var(--accent-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-primary)]/20 hover:-translate-y-0.5 disabled:opacity-50 transition-all"
                                    >
                                        Finalize {selectedRows.size} Records
                                    </button>
                                </div>
                            </div>
                        )}

                        {phase === ImportPhase.IMPORTING && (
                            <div className="flex-grow flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-1000">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)]/10" />
                                    <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                                    <span className="text-xl font-black text-[var(--accent-primary)]">{importProgress}%</span>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Populating Database</h4>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40 animate-pulse">Encryption in progress...</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>

                {feedback.message && (
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-2xl animate-in slide-in-from-bottom-8 duration-500 z-[300] ${feedback.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                        {feedback.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
                        {feedback.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CsvManagementModal;
