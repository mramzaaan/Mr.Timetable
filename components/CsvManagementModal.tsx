import React, { useState, useEffect } from 'react';
import type { TimetableSession, Subject, Teacher, SchoolClass, ClassSubject, TimetableGridData, JointPeriod, Break, PeriodTime } from '../types';
import { generateUniqueId } from '../types';

interface CsvManagementModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  currentTimetableSession: TimetableSession | null;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
}

type CsvDataType = 'teachers' | 'classes' | 'subjects' | 'lessons' | 'groups' | 'jointPeriods' | 'timings' | 'timetable' | 'adjustments' | 'attendance' | 'leaveDetails';

interface ImportAnalysis {
  newItems: any[];
  updatedItems: { newItem: any; oldItem: any }[];
  itemsToDelete: any[];
  errors: { rowIndex: number; row: any; message: string }[];
}

const TABS: { id: CsvDataType; label: string }[] = [
    { id: 'teachers', label: 'Teachers' },
    { id: 'classes', label: 'Classes' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'lessons', label: 'Lessons (Allocation)' },
    { id: 'groups', label: 'Group Periods' },
    { id: 'jointPeriods', label: 'Joint Periods' },
    { id: 'timings', label: 'School Timings' },
    { id: 'timetable', label: 'Timetable (Grid)' },
    { id: 'adjustments', label: 'Adjustments' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'leaveDetails', label: 'Leave Details' },
];

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []), Saturday: Array.from({ length: 8 }, () => []),
});

// Helper to find ID by Name (En or Ur)
const findIdByName = (list: { id: string; nameEn?: string; nameUr?: string; name?: string }[], name: string): string | undefined => {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    const item = list.find(i => 
        (i.nameEn && i.nameEn.toLowerCase() === normalized) || 
        (i.nameUr && i.nameUr.trim() === name.trim()) ||
        (i.name && i.name.toLowerCase() === normalized)
    );
    return item?.id;
};

const CsvManagementModal: React.FC<CsvManagementModalProps> = ({ t, isOpen, onClose, currentTimetableSession, onUpdateTimetableSession }) => {
  const [activeTab, setActiveTab] = useState<CsvDataType>('teachers');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [skipErrors, setSkipErrors] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const resetUploadState = () => {
    setParsedData(null);
    setFileName('');
    setFeedback({ message: '', type: null });
    setImportAnalysis(null);
    setImportMode('append');
    setShowErrors(false);
    setSkipErrors(false);
    setSelectedRows(new Set());
  };

  useEffect(() => {
    if (!isOpen) {
      resetUploadState();
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (parsedData) {
        const analysis = analyzeData(parsedData, activeTab);
        const initialSelected = new Set<number>();
        if (analysis) {
            parsedData.forEach((_, index) => {
                const hasError = analysis.errors.some(e => e.rowIndex === index + 2);
                if (!hasError) {
                    initialSelected.add(index);
                }
            });
        } else {
            parsedData.forEach((_, index) => {
                initialSelected.add(index);
            });
        }
        setSelectedRows(initialSelected);
    }
  }, [importMode, activeTab, parsedData]);

  const convertToCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row =>
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) {
            value = '';
        } else if (typeof value === 'object') {
            value = JSON.stringify(value);
        } else {
            value = String(value);
        }
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  };

  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadTemplate = (type: CsvDataType) => {
    let headers: string[] = [];
    let filename = `${type}_template.csv`;

    switch (type) {
        case 'subjects': headers = ['nameEn', 'nameUr']; break;
        case 'teachers': headers = ['nameEn', 'nameUr', 'gender', 'contactNumber', 'serialNumber']; break;
        case 'classes': headers = ['nameEn', 'nameUr', 'category', 'inChargeName', 'roomNumber', 'studentCount', 'serialNumber']; break;
        case 'lessons': headers = ['className', 'subjectName', 'periodsPerWeek', 'teacherName', 'groupSetName', 'groupName']; break;
        case 'timetable': headers = ['className', 'day', 'period', 'subjectName', 'teacherName']; break;
        case 'jointPeriods': headers = ['name', 'teacherName', 'periodsPerWeek']; break;
        case 'groups': headers = ['className', 'groupSetName', 'groupName']; break;
        case 'timings': headers = ['dayType', 'type', 'name', 'startTime', 'endTime', 'beforePeriod']; break;
    }
    
    triggerDownload(headers.join(','), filename);
  };

  const handleDownloadData = (type: CsvDataType) => {
    if (!currentTimetableSession) {
      setFeedback({ message: 'No active timetable session selected.', type: 'error' });
      return;
    }

    const { subjects, teachers, classes, jointPeriods } = currentTimetableSession;
    let data: any[] = [];
    let headers: string[] = [];
    let filename = `${type}.csv`;

    switch (type) {
        case 'subjects':
            data = subjects.map(s => ({ nameEn: s.nameEn, nameUr: s.nameUr }));
            headers = ['nameEn', 'nameUr'];
            break;
        case 'teachers':
            data = teachers.map(t => ({ 
                nameEn: t.nameEn, 
                nameUr: t.nameUr, 
                gender: t.gender, 
                contactNumber: t.contactNumber,
                serialNumber: t.serialNumber 
            }));
            headers = ['nameEn', 'nameUr', 'gender', 'contactNumber', 'serialNumber'];
            break;
        case 'classes':
            data = classes.map(c => {
                const inCharge = teachers.find(t => t.id === c.inCharge);
                return {
                    nameEn: c.nameEn,
                    nameUr: c.nameUr,
                    category: c.category || '',
                    inChargeName: inCharge ? inCharge.nameEn : '',
                    roomNumber: c.roomNumber,
                    studentCount: c.studentCount,
                    serialNumber: c.serialNumber
                };
            });
            headers = ['nameEn', 'nameUr', 'category', 'inChargeName', 'roomNumber', 'studentCount', 'serialNumber'];
            break;
        case 'lessons':
            headers = ['className', 'subjectName', 'periodsPerWeek', 'teacherName', 'groupSetName', 'groupName'];
            classes.forEach(c => {
                c.subjects.forEach(cs => {
                    const sub = subjects.find(s => s.id === cs.subjectId);
                    const tea = teachers.find(t => t.id === cs.teacherId);
                    
                    let groupSetName = '';
                    let groupName = '';
                    if (cs.groupSetId && cs.groupId) {
                        const set = c.groupSets?.find(gs => gs.id === cs.groupSetId);
                        const group = set?.groups.find(g => g.id === cs.groupId);
                        if (set && group) {
                            groupSetName = set.name;
                            groupName = group.name;
                        }
                    }

                    if (sub) {
                        data.push({
                            className: c.nameEn,
                            subjectName: sub.nameEn,
                            periodsPerWeek: cs.periodsPerWeek,
                            teacherName: tea ? tea.nameEn : '',
                            groupSetName,
                            groupName
                        });
                    }
                });
            });
            break;
        case 'timetable':
            headers = ['className', 'day', 'period', 'subjectName', 'teacherName'];
            classes.forEach(c => {
                daysOfWeek.forEach(day => {
                    c.timetable[day].forEach((slot, periodIndex) => {
                        slot.forEach(period => {
                            const sub = subjects.find(s => s.id === period.subjectId);
                            const tea = teachers.find(t => t.id === period.teacherId);
                            if (sub && tea) {
                                data.push({
                                    className: c.nameEn,
                                    day,
                                    period: periodIndex + 1,
                                    subjectName: sub.nameEn,
                                    teacherName: tea.nameEn
                                });
                            }
                        });
                    });
                });
            });
            break;
        case 'jointPeriods':
            headers = ['name', 'teacherName', 'periodsPerWeek'];
            data = jointPeriods.map(jp => {
                const tea = teachers.find(t => t.id === jp.teacherId);
                return {
                    name: jp.name,
                    teacherName: tea ? tea.nameEn : '',
                    periodsPerWeek: jp.periodsPerWeek
                };
            });
            break;
        case 'groups':
            headers = ['className', 'groupSetName', 'groupName'];
            classes.forEach(c => {
                if (c.groupSets) {
                    c.groupSets.forEach(gs => {
                        gs.groups.forEach(g => {
                            data.push({
                                className: c.nameEn,
                                groupSetName: gs.name,
                                groupName: g.name
                            });
                        });
                    });
                }
            });
            break;
        case 'timings':
            headers = ['dayType', 'type', 'name', 'startTime', 'endTime', 'beforePeriod'];
            const types: ('default' | 'friday')[] = ['default', 'friday'];
            types.forEach(t => {
                // Assembly
                const assembly = currentTimetableSession.assembly?.[t];
                if (assembly) {
                    data.push({ dayType: t, type: 'assembly', name: 'Assembly', startTime: assembly.start, endTime: assembly.end, beforePeriod: '' });
                }
                // Periods
                const periods = currentTimetableSession.periodTimings?.[t] || [];
                periods.forEach((p, i) => {
                    data.push({ dayType: t, type: 'period', name: p.name || `Period ${i+1}`, startTime: p.start, endTime: p.end, beforePeriod: '' });
                });
                // Breaks
                const breaks = currentTimetableSession.breaks?.[t] || [];
                breaks.forEach(b => {
                    data.push({ dayType: t, type: 'break', name: b.name, startTime: b.startTime, endTime: b.endTime, beforePeriod: b.beforePeriod });
                });
            });
            break;
    }

    if (data.length === 0) {
      setFeedback({ message: t.csvDownloadError.replace('{type}', type), type: 'error' });
      return;
    }

    const csvContent = convertToCSV(data, headers);
    triggerDownload(csvContent, filename);
    setFeedback({ message: t.csvDownloadSuccess.replace('{type}', type), type: 'success' });
  };
  
  const parseCSV = (csvText: string): Record<string, string>[] => {
    let text = csvText;
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

    const lines = text.trim().split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
        const values: string[] = [];
        let currentVal = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
                    currentVal += '"'; i++;
                } else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal); currentVal = '';
            } else { currentVal += char; }
        }
        values.push(currentVal);
        return values;
    };
    
    const headers = parseLine(lines.shift()!).map(h => h.trim());
    return lines.map(line => {
      const values = parseLine(line);
      const rowObject: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) rowObject[header] = (values[index] || '').trim();
      });
      return rowObject;
    });
  };

    const validateRow = (row: Record<string, string>, type: CsvDataType, session: TimetableSession): { isValid: boolean; error?: string } => {
        const { subjects, teachers, classes } = session;

        switch (type) {
            case 'subjects':
                if (!row.nameEn || !row.nameUr) return { isValid: false, error: "Missing 'nameEn' or 'nameUr'." };
                break;
            case 'teachers':
                if (!row.nameEn || !row.nameUr) return { isValid: false, error: "Missing 'nameEn' or 'nameUr'." };
                if (row.gender && !['Male', 'Female'].includes(row.gender)) return { isValid: false, error: "Gender must be 'Male' or 'Female'." };
                break;
            case 'classes':
                if (!row.nameEn || !row.nameUr) return { isValid: false, error: "Missing 'nameEn' or 'nameUr'." };
                if (row.inChargeName && !findIdByName(teachers, row.inChargeName)) {
                    return { isValid: false, error: `Teacher '${row.inChargeName}' not found.` };
                }
                break;
            case 'lessons':
                if (!row.className || !row.subjectName || !row.periodsPerWeek) {
                    return { isValid: false, error: "Missing: className, subjectName, or periodsPerWeek." };
                }
                if (!findIdByName(classes, row.className)) return { isValid: false, error: `Class '${row.className}' not found.` };
                if (!findIdByName(subjects, row.subjectName)) return { isValid: false, error: `Subject '${row.subjectName}' not found.` };
                // Teacher is optional for allocations
                if (row.teacherName && !findIdByName(teachers, row.teacherName)) return { isValid: false, error: `Teacher '${row.teacherName}' not found.` };
                if (isNaN(parseInt(row.periodsPerWeek, 10))) return { isValid: false, error: "'periodsPerWeek' must be a number." };
                break;
            case 'timetable':
                if (!row.className || !row.day || !row.period || !row.subjectName || !row.teacherName) {
                    return { isValid: false, error: "Missing: className, day, period, subjectName, or teacherName." };
                }
                if (!findIdByName(classes, row.className)) return { isValid: false, error: `Class '${row.className}' not found.` };
                if (!findIdByName(subjects, row.subjectName)) return { isValid: false, error: `Subject '${row.subjectName}' not found.` };
                if (!findIdByName(teachers, row.teacherName)) return { isValid: false, error: `Teacher '${row.teacherName}' not found.` };
                if (!daysOfWeek.includes(row.day as any)) return { isValid: false, error: `Invalid day '${row.day}'.` };
                const pNum = parseInt(row.period, 10);
                if (isNaN(pNum) || pNum < 1 || pNum > 8) return { isValid: false, error: "'period' must be a number between 1 and 8." };
                break;
            case 'jointPeriods':
                if (!row.name || !row.teacherName || !row.periodsPerWeek) {
                    return { isValid: false, error: "Missing: name, teacherName, or periodsPerWeek."};
                }
                if (!findIdByName(teachers, row.teacherName)) return { isValid: false, error: `Teacher '${row.teacherName}' not found.` };
                break;
            case 'groups':
                if (!row.className || !row.groupSetName || !row.groupName) return { isValid: false, error: "Missing: className, groupSetName, or groupName." };
                if (!findIdByName(classes, row.className)) return { isValid: false, error: `Class '${row.className}' not found.` };
                break;
            case 'timings':
                if (!row.dayType || !row.type) return { isValid: false, error: "Missing: dayType or type." };
                if (!['default', 'friday'].includes(row.dayType.toLowerCase())) return { isValid: false, error: "dayType must be 'default' or 'friday'." };
                if (!['assembly', 'period', 'break'].includes(row.type.toLowerCase())) return { isValid: false, error: "type must be 'assembly', 'period', or 'break'." };
                if (row.type.toLowerCase() === 'break' && !row.beforePeriod) return { isValid: false, error: "Missing: beforePeriod for break." };
                if (row.type.toLowerCase() === 'break' && isNaN(parseInt(row.beforePeriod, 10))) return { isValid: false, error: "'beforePeriod' must be a number." };
                break;
        }
        return { isValid: true };
    };

    const analyzeData = (rows: Record<string, string>[], type: CsvDataType): ImportAnalysis | null => {
        if (!currentTimetableSession) {
            setImportAnalysis(null);
            return null;
        }

        const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(type);
        const analysis: ImportAnalysis = { newItems: [], updatedItems: [], itemsToDelete: [], errors: [] };

        rows.forEach((row, rowIndex) => {
            const validation = validateRow(row, type, currentTimetableSession);
            if (!validation.isValid) {
                analysis.errors.push({ rowIndex: rowIndex + 2, row, message: validation.error! });
            }
        });

        const validRows = rows.filter((_, rowIndex) => !analysis.errors.some(e => e.rowIndex === rowIndex + 2));

        if (isEntity) {
            const dataKey = type as 'subjects' | 'teachers' | 'classes' | 'jointPeriods';
            const existingData: any[] = currentTimetableSession[dataKey];
            
            const existingDataMap = new Map<string, any>();
            existingData.forEach(item => {
                if (item.nameEn) existingDataMap.set(item.nameEn.toLowerCase(), item);
                if (item.nameUr) existingDataMap.set(item.nameUr.trim(), item);
                if (item.name) existingDataMap.set(item.name.toLowerCase(), item); 
            });

            const foundIds = new Set<string>();
            const seenInCsv = new Set<string>();

            validRows.forEach((row, rowIndex) => {
                const uniqueKey = (row.nameEn || row.name || '').toLowerCase();
                
                if(uniqueKey && seenInCsv.has(uniqueKey)){
                    // Duplicate in CSV
                }
                if(uniqueKey) seenInCsv.add(uniqueKey);

                const existingItem = existingDataMap.get(uniqueKey) || (row.nameUr ? existingDataMap.get(row.nameUr.trim()) : undefined);

                if (existingItem) {
                    if (foundIds.has(existingItem.id)) return; 
                    analysis.updatedItems.push({ newItem: row, oldItem: existingItem });
                    foundIds.add(existingItem.id);
                } else {
                    analysis.newItems.push(row);
                }
            });
            analysis.itemsToDelete = existingData.filter(item => !foundIds.has(item.id));
        } else {
            // Relational/Structural data imports are additive or replacing
            let existingCount = 0;
            if (type === 'lessons') {
                existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + c.subjects.length, 0);
            } else if (type === 'timetable') {
                existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + Object.values(c.timetable).flat(2).length, 0);
            } else if (type === 'groups') {
                existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + (c.groupSets?.reduce((gSum, gs) => gSum + gs.groups.length, 0) || 0), 0);
            } else if (type === 'timings') {
                existingCount = 1; // Arbitrary non-zero to show replacement
            }
            analysis.newItems = validRows;
            if (existingCount > 0) analysis.itemsToDelete = [{ count: existingCount }];
        }
        setImportAnalysis(analysis);
        return analysis;
    };

    const processFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('excel')) {
            setFeedback({ message: 'Unsupported file type. Please upload a .csv file.', type: 'error' });
            return;
        }

        setFileName(file.name);
        setFeedback({ message: '', type: null });
        try {
            const csvText = await file.text();
            const rows = parseCSV(csvText);
            setParsedData(rows);
        } catch (error: any) {
            setFeedback({ message: `Parsing error: ${error.message}`, type: 'error' });
            resetUploadState();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
        if(e.target) e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };
    
    // Converts CSV Row (Names) to Internal Object (IDs)
    const convertRowToObject = (row: Record<string, string>, type: CsvDataType, session: TimetableSession): any => {
      const { teachers } = session;
      const id = generateUniqueId();

      switch (type) {
        case 'subjects': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '' };
        case 'teachers': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', gender: row.gender === 'Female' ? 'Female' : 'Male', contactNumber: row.contactNumber || '', serialNumber: row.serialNumber ? parseInt(row.serialNumber) : undefined };
        case 'classes':
          const inChargeId = findIdByName(teachers, row.inChargeName || '');
          return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', category: row.category, inCharge: inChargeId || '', roomNumber: row.roomNumber || '', studentCount: parseInt(row.studentCount || '0', 10), subjects: [], timetable: createEmptyTimetable(), groupSets: [], serialNumber: row.serialNumber ? parseInt(row.serialNumber) : undefined };
        case 'jointPeriods':
            const teachId = findIdByName(teachers, row.teacherName || '');
            return { id, name: row.name || '', teacherId: teachId || '', periodsPerWeek: parseInt(row.periodsPerWeek || '1', 10), assignments: [] };
        default: return row;
      }
    };

    const handleConfirmImport = (type: CsvDataType) => {
        if (!parsedData || !currentTimetableSession || !importAnalysis) {
            setFeedback({ message: 'Cannot import due to missing data.', type: 'error' });
            return;
        }
        
        const selectedValidRows = parsedData.filter((_, index) => selectedRows.has(index) && !importAnalysis.errors.some(e => e.rowIndex === index + 2));
        const selectedErrorRows = parsedData.filter((_, index) => selectedRows.has(index) && importAnalysis.errors.some(e => e.rowIndex === index + 2));

        if (!skipErrors && selectedErrorRows.length > 0) {
            setFeedback({ message: 'Cannot import due to selected rows having errors. Unselect them or check "Skip rows with errors" to proceed anyway.', type: 'error' });
            return;
        }

        if (selectedValidRows.length === 0) {
            setFeedback({ message: 'No valid rows selected for import.', type: 'error' });
            return;
        }

        const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(type);

        try {
            onUpdateTimetableSession(session => {
                let updatedSession = JSON.parse(JSON.stringify(session));
                
                if (isEntity) {
                    const dataKey = type as 'subjects' | 'teachers' | 'classes' | 'jointPeriods';
                    const newDataSet = new Map<string, any>();
            
                    // If appending, keep existing data
                    if (importMode === 'append') {
                        session[dataKey].forEach((item: any) => newDataSet.set(item.id, item));
                    }
            
                    // Add/Update selected items
                    const existingDataMap = new Map<string, any>();
                    session[dataKey].forEach((item: any) => {
                        if (item.nameEn) existingDataMap.set(item.nameEn.toLowerCase(), item);
                        if (item.nameUr) existingDataMap.set(item.nameUr.trim(), item);
                        if (item.name) existingDataMap.set(item.name.toLowerCase(), item); 
                    });

                    selectedValidRows.forEach(row => {
                        const uniqueKey = (row.nameEn || row.name || '').toLowerCase();
                        const existingItem = existingDataMap.get(uniqueKey) || (row.nameUr ? existingDataMap.get(row.nameUr.trim()) : undefined);
                        
                        if (existingItem) {
                            const converted = convertRowToObject(row, type, session);
                            const obj = { ...existingItem, ...converted, id: existingItem.id };
                            if (type === 'classes') {
                                obj.subjects = existingItem.subjects;
                                obj.timetable = existingItem.timetable;
                                obj.groupSets = existingItem.groupSets;
                            }
                            newDataSet.set(obj.id, obj);
                        } else {
                            const obj = convertRowToObject(row, type, session);
                            newDataSet.set(obj.id, obj);
                        }
                    });
            
                    updatedSession[dataKey] = Array.from(newDataSet.values());
                } else { 
                    const { classes, subjects, teachers } = updatedSession;

                    switch (type) {
                        case 'lessons':
                            const classSubjectsMap = new Map<string, ClassSubject[]>();
                            const classesToUpdateLessons = new Set<string>();
                            
                            selectedValidRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                const subjectId = findIdByName(subjects, row.subjectName);
                                const teacherId = findIdByName(teachers, row.teacherName); // optional allocation
                                const periodsPerWeek = parseInt(row.periodsPerWeek, 10);

                                if (classId && subjectId && !isNaN(periodsPerWeek)) {
                                    classesToUpdateLessons.add(classId);
                                    if (!classSubjectsMap.has(classId)) classSubjectsMap.set(classId, []);
                                    
                                    let groupSetId: string | undefined;
                                    let groupId: string | undefined;
                                    
                                    if (row.groupSetName && row.groupName) {
                                        const cls = classes.find((c: any) => c.id === classId);
                                        const gs = cls?.groupSets?.find((g: any) => g.name === row.groupSetName);
                                        const g = gs?.groups.find((g: any) => g.name === row.groupName);
                                        if (gs) groupSetId = gs.id;
                                        if (g) groupId = g.id;
                                    }

                                    classSubjectsMap.get(classId)!.push({ subjectId, periodsPerWeek, teacherId: teacherId || '', groupSetId, groupId });
                                }
                            });
                            updatedSession.classes.forEach((c: SchoolClass) => { 
                                if (classesToUpdateLessons.has(c.id)) {
                                    c.subjects = classSubjectsMap.get(c.id) || [];
                                }
                            });
                            break;
                        case 'groups':
                            selectedValidRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                if (classId) {
                                    const cls = updatedSession.classes.find((c: any) => c.id === classId);
                                    if (cls) {
                                        if (!cls.groupSets) cls.groupSets = [];
                                        let gs = cls.groupSets.find((s: any) => s.name === row.groupSetName);
                                        if (!gs) {
                                            gs = { id: generateUniqueId(), name: row.groupSetName, groups: [] };
                                            cls.groupSets.push(gs);
                                        }
                                        if (!gs.groups.some((g: any) => g.name === row.groupName)) {
                                            gs.groups.push({ id: generateUniqueId(), name: row.groupName });
                                        }
                                    }
                                }
                            });
                            break;
                        case 'timetable':
                            const classMap = new Map<string, SchoolClass>(updatedSession.classes.map((c: SchoolClass) => [c.id, c]));
                            const classesToUpdateTimetable = new Set<string>();
                            
                            selectedValidRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                if (classId) classesToUpdateTimetable.add(classId);
                            });
                            
                            classesToUpdateTimetable.forEach(classId => {
                                const c = classMap.get(classId);
                                if (c) c.timetable = createEmptyTimetable();
                            });
                            
                            selectedValidRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                const subjectId = findIdByName(subjects, row.subjectName);
                                const teacherId = findIdByName(teachers, row.teacherName);
                                const dayKey = row.day as keyof TimetableGridData;
                                const pIndex = parseInt(row.period, 10) - 1;

                                const targetClass = classId ? classMap.get(classId) : undefined;

                                if (targetClass && subjectId && teacherId && dayKey && pIndex >= 0) {
                                    targetClass.timetable[dayKey][pIndex].push({ 
                                        id: generateUniqueId(), 
                                        classId: targetClass.id, 
                                        subjectId, 
                                        teacherId 
                                    });
                                }
                            });
                            break;
                        case 'timings':
                            const newTimings: { default: PeriodTime[], friday: PeriodTime[] } = { default: [], friday: [] };
                            const newBreaks: { default: Break[], friday: Break[] } = { default: [], friday: [] };
                            const newAssembly: { default: PeriodTime | null, friday: PeriodTime | null } = { default: null, friday: null };
                            
                            selectedValidRows.forEach(row => {
                                const dt = row.dayType.toLowerCase() as 'default' | 'friday';
                                if (dt === 'default' || dt === 'friday') {
                                    const t = row.type.toLowerCase();
                                    if (t === 'assembly') {
                                        newAssembly[dt] = { start: row.startTime || '', end: row.endTime || '' };
                                    } else if (t === 'period') {
                                        newTimings[dt].push({ start: row.startTime || '', end: row.endTime || '', name: row.name || '' });
                                    } else if (t === 'break') {
                                        newBreaks[dt].push({ 
                                            id: generateUniqueId(), 
                                            name: row.name || '', 
                                            startTime: row.startTime || '', 
                                            endTime: row.endTime || '', 
                                            beforePeriod: parseInt(row.beforePeriod, 10) || 1
                                        });
                                    }
                                }
                            });
                            updatedSession.periodTimings = newTimings;
                            updatedSession.breaks = newBreaks;
                            updatedSession.assembly = newAssembly;
                            break;
                    }
                }
                return updatedSession;
            });

            setFeedback({ message: t.csvUploadSuccess.replace('{type}', type), type: 'success' });
            resetUploadState();
        } catch (error: any) {
            setFeedback({ message: `Import error: ${error.message}`, type: 'error' });
        }
    };
    
  if (!isOpen) return null;

  const renderDescription = (type: CsvDataType) => {
    const descs: any = {
        teachers: "Columns: nameEn, nameUr, gender, contactNumber, serialNumber",
        classes: "Columns: nameEn, nameUr, category, inChargeName, roomNumber, studentCount, serialNumber",
        subjects: "Columns: nameEn, nameUr",
        lessons: "Columns: className, subjectName, periodsPerWeek, teacherName, groupSetName, groupName",
        groups: "Columns: className, groupSetName, groupName",
        jointPeriods: "Columns: name, teacherName, periodsPerWeek",
        timings: "Columns: dayType (default/friday), type (period/break/assembly), name, startTime, endTime, beforePeriod",
        timetable: "Columns: className, day, period (1-8), subjectName, teacherName",
    };
    return <p className="text-xs text-[var(--text-secondary)]">{descs[type]}</p>;
  }

  const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101]" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] mx-4 transform flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold p-6 border-b border-[var(--border-primary)] text-[var(--text-primary)] flex-shrink-0">{t.dataImportExportCsv}</h3>

        <div className="flex-grow flex min-h-0">
          <aside className="w-1/4 border-r border-[var(--border-primary)] p-4 flex flex-col gap-2 overflow-y-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); resetUploadState(); }}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${ activeTab === tab.id ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {tab.label}
              </button>
            ))}
          </aside>

          <main className="w-3/4 flex-grow flex flex-col p-6 overflow-y-auto">
            {!parsedData ? (
                <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full transition-colors ${isDragging ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]' : 'border-[var(--border-secondary)]'}`}>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleFileSelect} />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--text-placeholder)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <label htmlFor="csv-upload" className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                        <span className="text-[var(--accent-primary)] font-bold">{t.clickToUpload}</span> {t.or} {t.dragAndDrop}
                    </label>
                    <p className="text-sm text-[var(--text-secondary)] mt-4 mb-2">{t.csvUploadDescription}</p>
                    {renderDescription(activeTab)}
                    <div className="mt-6 w-full flex justify-around">
                        <button onClick={() => handleDownloadData(activeTab)} className="text-sm text-[var(--accent-primary)] hover:underline">{t.downloadCsv}</button>
                        <button onClick={() => handleDownloadTemplate(activeTab)} className="text-sm text-[var(--accent-primary)] hover:underline">{t.downloadTemplate}</button>
                    </div>
                    {feedback.message && feedback.type === 'error' && <div className="mt-4 p-2 w-full bg-red-100 text-red-700 text-xs rounded-md">{feedback.message}</div>}
                </div>
            ) : (
                <div className="animate-scale-in">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-lg text-[var(--text-primary)]">{t.importPreview}: <span className="font-normal text-base">{fileName}</span></h4>
                        <button onClick={resetUploadState} className="text-sm text-red-500 hover:underline">{t.cancel}</button>
                    </div>

                    {isEntity && (
                        <div className="mb-4">
                            <label className="text-sm font-medium text-[var(--text-secondary)] mr-4">{t.importMode}:</label>
                            <div className="inline-flex rounded-md shadow-sm">
                                <button onClick={() => setImportMode('replace')} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${importMode === 'replace' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>{t.replaceAll}</button>
                                <button onClick={() => setImportMode('append')} className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${importMode === 'append' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>{t.addAndUpdate}</button>
                            </div>
                        </div>
                    )}

                    {importAnalysis && (
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 text-sm space-y-1">
                            <h5 className="font-bold text-base mb-2">{t.analysis}</h5>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="text-green-600"><span className="font-bold">{importAnalysis.newItems.length}</span> {t.new}</div>
                                <div className="text-blue-600"><span className="font-bold">{importAnalysis.updatedItems.length}</span> {t.updates}</div>
                                <div className="text-orange-600"><span className="font-bold">{importMode === 'replace' ? importAnalysis.itemsToDelete.length : 0}</span> {t.deletions}</div>
                                <div className={importAnalysis.errors.length > 0 ? "text-red-600" : "text-gray-500"}><span className="font-bold">{importAnalysis.errors.length}</span> {t.errors}</div>
                            </div>
                            {importAnalysis.errors.length > 0 && (
                                <div className="pt-2 flex items-center justify-between">
                                    <button onClick={() => setShowErrors(!showErrors)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                        {showErrors ? t.hideErrors : t.showErrors}
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                                        <input type="checkbox" checked={skipErrors} onChange={e => setSkipErrors(e.target.checked)} className="rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
                                        Skip rows with errors
                                    </label>
                                </div>
                            )}
                            {showErrors && importAnalysis.errors.length > 0 && <ul className="mt-2 text-xs bg-red-50 p-2 rounded-md max-h-24 overflow-y-auto">{importAnalysis.errors.map(err => <li key={err.rowIndex}><strong>Row {err.rowIndex}:</strong> {err.message}</li>)}</ul>}
                        </div>
                    )}
                    
                    <div className="overflow-auto border border-[var(--border-primary)] rounded-lg max-h-80 relative">
                      <table className="w-full text-xs">
                          <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10">
                            <tr>
                              <th className="p-2 text-left w-8">
                                <input type="checkbox" 
                                  checked={selectedRows.size === parsedData.length && parsedData.length > 0} 
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedRows(new Set(parsedData.map((_, i) => i)));
                                    } else {
                                      setSelectedRows(new Set());
                                    }
                                  }} 
                                />
                              </th>
                              {parsedData[0] && Object.keys(parsedData[0]).map(h => <th key={h} className="p-2 text-left font-semibold text-[var(--text-secondary)]">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-primary)]">
                            {parsedData.map((row, index) => {
                                const error = importAnalysis?.errors.find(e => e.rowIndex === index + 2);
                                const isNew = importAnalysis?.newItems.includes(row);
                                const isUpdate = importAnalysis?.updatedItems.some(u => u.newItem === row);
                                let rowClass = 'bg-[var(--bg-secondary)]'; let statusClass = ''; let textClass = 'text-[var(--text-primary)]';
                                if (error) { rowClass = 'bg-red-100'; textClass = 'text-red-900'; } 
                                else if (isNew) { statusClass = 'border-l-4 border-green-500'; } 
                                else if (isUpdate) { statusClass = 'border-l-4 border-blue-500'; }
                                const visibleKeys = parsedData[0] ? Object.keys(parsedData[0]) : [];
                                return (
                                  <tr key={index} className={`${rowClass} ${textClass}`} title={error?.message}>
                                    <td className={`p-2 ${statusClass}`}>
                                      <input type="checkbox"
                                        checked={selectedRows.has(index)}
                                        onChange={e => {
                                          const newSelected = new Set(selectedRows);
                                          if (e.target.checked) newSelected.add(index);
                                          else newSelected.delete(index);
                                          setSelectedRows(newSelected);
                                        }}
                                      />
                                    </td>
                                    {visibleKeys.map((key, i) => (<td key={i} className={`p-2 whitespace-nowrap ${key.toLowerCase().includes('ur') ? 'font-urdu' : ''}`}>{row[key]}</td>))}
                                  </tr>
                                );
                            })}
                          </tbody>
                      </table>
                    </div>
                </div>
            )}
          </main>
        </div>
        
        <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] flex justify-end items-center gap-4">
            {feedback.message && feedback.type === 'success' && <p className={`text-sm text-green-600`}>{feedback.message}</p>}
            {parsedData && (
                <button onClick={() => handleConfirmImport(activeTab)} disabled={!importAnalysis || selectedRows.size === 0 || (!skipErrors && parsedData.some((_, index) => selectedRows.has(index) && importAnalysis.errors.some(e => e.rowIndex === index + 2)))}
                    className="px-6 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {t.confirmImport}
                </button>
            )}
             <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
              {t.close}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CsvManagementModal;