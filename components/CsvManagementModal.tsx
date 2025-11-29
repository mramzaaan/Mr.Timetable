
import React, { useState, useEffect } from 'react';
import type { TimetableSession, Subject, Teacher, SchoolClass, ClassSubject, TimetableGridData, JointPeriod } from '../types';
import { generateUniqueId } from '../types';

interface CsvManagementModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  currentTimetableSession: TimetableSession | null;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
}

type CsvDataType = 'subjects' | 'teachers' | 'classes' | 'classSubjects' | 'timetable' | 'jointPeriods';

interface ImportAnalysis {
  newItems: any[];
  updatedItems: { newItem: any; oldItem: any }[];
  itemsToDelete: any[];
  errors: { rowIndex: number; row: any; message: string }[];
}

const TABS: CsvDataType[] = ['subjects', 'teachers', 'classes', 'classSubjects', 'timetable', 'jointPeriods'];
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

// Helper to find Object by Name
const findEntityByName = <T extends { nameEn?: string; nameUr?: string; name?: string }>(list: T[], name: string): T | undefined => {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    return list.find(i => 
        (i.nameEn && i.nameEn.toLowerCase() === normalized) || 
        (i.nameUr && i.nameUr.trim() === name.trim()) ||
        (i.name && i.name.toLowerCase() === normalized)
    );
};

const CsvManagementModal: React.FC<CsvManagementModalProps> = ({ t, isOpen, onClose, currentTimetableSession, onUpdateTimetableSession }) => {
  const [activeTab, setActiveTab] = useState<CsvDataType>('subjects');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const resetUploadState = () => {
    setParsedData(null);
    setFileName('');
    setFeedback({ message: '', type: null });
    setImportAnalysis(null);
    setImportMode('replace');
    setShowErrors(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetUploadState();
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (parsedData) {
        analyzeData(parsedData, activeTab);
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

    // IDs removed, using Names for user friendliness
    switch (type) {
        case 'subjects': headers = ['nameEn', 'nameUr']; break;
        case 'teachers': headers = ['nameEn', 'nameUr', 'gender', 'contactNumber', 'serialNumber']; break;
        case 'classes': headers = ['nameEn', 'nameUr', 'category', 'inChargeName', 'roomNumber', 'studentCount', 'serialNumber']; break;
        case 'classSubjects': headers = ['className', 'subjectName', 'periodsPerWeek', 'teacherName']; break;
        case 'timetable': headers = ['className', 'day', 'period', 'subjectName', 'teacherName']; break;
        case 'jointPeriods': headers = ['name', 'teacherName', 'periodsPerWeek']; break; // Simplified for template
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
        case 'classSubjects':
            headers = ['className', 'subjectName', 'periodsPerWeek', 'teacherName'];
            classes.forEach(c => {
                c.subjects.forEach(cs => {
                    const sub = subjects.find(s => s.id === cs.subjectId);
                    const tea = teachers.find(t => t.id === cs.teacherId);
                    if (sub && tea) {
                        data.push({
                            className: c.nameEn,
                            subjectName: sub.nameEn,
                            periodsPerWeek: cs.periodsPerWeek,
                            teacherName: tea.nameEn
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
                                    period: periodIndex + 1, // User facing is 1-based
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
            case 'classSubjects':
                if (!row.className || !row.subjectName || !row.teacherName || !row.periodsPerWeek) {
                    return { isValid: false, error: "Missing: className, subjectName, teacherName, or periodsPerWeek." };
                }
                if (!findIdByName(classes, row.className)) return { isValid: false, error: `Class '${row.className}' not found.` };
                if (!findIdByName(subjects, row.subjectName)) return { isValid: false, error: `Subject '${row.subjectName}' not found.` };
                if (!findIdByName(teachers, row.teacherName)) return { isValid: false, error: `Teacher '${row.teacherName}' not found.` };
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
        }
        return { isValid: true };
    };

    const analyzeData = (rows: Record<string, string>[], type: CsvDataType) => {
        if (!currentTimetableSession) {
            setImportAnalysis(null);
            return;
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
            
            // Map existing items by both En and Ur names for flexibility
            const existingDataMap = new Map<string, any>();
            existingData.forEach(item => {
                if (item.nameEn) existingDataMap.set(item.nameEn.toLowerCase(), item);
                if (item.nameUr) existingDataMap.set(item.nameUr.trim(), item);
                if (item.name) existingDataMap.set(item.name.toLowerCase(), item); // for jointPeriods
            });

            const foundIds = new Set<string>();
            const seenInCsv = new Set<string>();

            validRows.forEach((row, rowIndex) => {
                const uniqueKey = (row.nameEn || row.name || '').toLowerCase();
                
                if(uniqueKey && seenInCsv.has(uniqueKey)){
                    // Don't flag as hard error, just skip duplicate processing or handle logic?
                    // For simplicity, let's process matches naturally, but typically duplicate rows are odd.
                }
                if(uniqueKey) seenInCsv.add(uniqueKey);

                const existingItem = existingDataMap.get(uniqueKey) || (row.nameUr ? existingDataMap.get(row.nameUr.trim()) : undefined);

                if (existingItem) {
                    if (foundIds.has(existingItem.id)) {
                        // Already processed this item in this upload batch
                        return; 
                    }
                    analysis.updatedItems.push({ newItem: row, oldItem: existingItem });
                    foundIds.add(existingItem.id);
                } else {
                    analysis.newItems.push(row);
                }
            });
            analysis.itemsToDelete = existingData.filter(item => !foundIds.has(item.id));
        } else {
            // Relational data (ClassSubjects, Timetable) is always additive/replacing content of classes
            let existingCount = 0;
            switch (type) {
                case 'classSubjects':
                    existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + c.subjects.length, 0);
                    break;
                case 'timetable':
                    existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + Object.values(c.timetable).flat(2).length, 0);
                    break;
            }
            analysis.newItems = validRows;
            if (existingCount > 0) analysis.itemsToDelete = [{ count: existingCount }];
        }
        setImportAnalysis(analysis);
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
      const id = generateUniqueId(); // New ID if needed

      switch (type) {
        case 'subjects': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '' };
        case 'teachers': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', gender: row.gender === 'Female' ? 'Female' : 'Male', contactNumber: row.contactNumber || '', serialNumber: row.serialNumber ? parseInt(row.serialNumber) : undefined };
        case 'classes':
          const inChargeId = findIdByName(teachers, row.inChargeName || '');
          return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', category: row.category, inCharge: inChargeId || '', roomNumber: row.roomNumber || '', studentCount: parseInt(row.studentCount || '0', 10), subjects: [], timetable: createEmptyTimetable(), groupSets: [], serialNumber: row.serialNumber ? parseInt(row.serialNumber) : undefined };
        case 'jointPeriods':
            const teachId = findIdByName(teachers, row.teacherName || '');
            return { id, name: row.name || '', teacherId: teachId || '', periodsPerWeek: parseInt(row.periodsPerWeek || '1', 10), assignments: [] }; // Reset assignments as CSV doesn't support complex JSON well
        default: return row;
      }
    };

    const handleConfirmImport = (type: CsvDataType) => {
        if (!parsedData || !currentTimetableSession || !importAnalysis || importAnalysis.errors.length > 0) {
            setFeedback({ message: 'Cannot import due to errors or missing data.', type: 'error' });
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
            
                    // Add new items
                    importAnalysis.newItems.forEach(row => {
                        const obj = convertRowToObject(row, type, session);
                        newDataSet.set(obj.id, obj);
                    });
            
                    // Update existing items
                    importAnalysis.updatedItems.forEach(({ newItem, oldItem }) => {
                        const converted = convertRowToObject(newItem, type, session);
                        // Merge but keep original ID and structure (like subjects/timetable for classes)
                        const obj = { ...oldItem, ...converted, id: oldItem.id };
                        
                        // Preserve complex nested data for Classes
                        if (type === 'classes') {
                            obj.subjects = oldItem.subjects;
                            obj.timetable = oldItem.timetable;
                            obj.groupSets = oldItem.groupSets;
                        }
                        
                        newDataSet.set(obj.id, obj);
                    });
            
                    updatedSession[dataKey] = Array.from(newDataSet.values());
                } else { 
                    const validRows = parsedData.filter((_, rowIndex) => !importAnalysis.errors.some(e => e.rowIndex === rowIndex + 2));
                    const { classes, subjects, teachers } = updatedSession;

                    switch (type) {
                        case 'classSubjects':
                            const classSubjectsMap = new Map<string, ClassSubject[]>();
                            validRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                const subjectId = findIdByName(subjects, row.subjectName);
                                const teacherId = findIdByName(teachers, row.teacherName);
                                const periodsPerWeek = parseInt(row.periodsPerWeek, 10);

                                if (classId && subjectId && teacherId && !isNaN(periodsPerWeek)) {
                                    if (!classSubjectsMap.has(classId)) classSubjectsMap.set(classId, []);
                                    classSubjectsMap.get(classId)!.push({ subjectId, periodsPerWeek, teacherId });
                                }
                            });
                            updatedSession.classes.forEach((c: SchoolClass) => { c.subjects = classSubjectsMap.get(c.id) || []; });
                            break;
                        case 'timetable':
                            // Clear existing timetables first
                            updatedSession.classes.forEach((c: SchoolClass) => c.timetable = createEmptyTimetable());
                            const classMap = new Map<string, SchoolClass>(updatedSession.classes.map((c: SchoolClass) => [c.id, c]));
                            
                            validRows.forEach(row => {
                                const classId = findIdByName(classes, row.className);
                                const subjectId = findIdByName(subjects, row.subjectName);
                                const teacherId = findIdByName(teachers, row.teacherName);
                                const dayKey = row.day as keyof TimetableGridData;
                                const pIndex = parseInt(row.period, 10) - 1; // Convert 1-8 to 0-7

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
    // Custom descriptions for name-based CSVs
    const descs: any = {
        subjects: "Columns: nameEn, nameUr",
        teachers: "Columns: nameEn, nameUr, gender, contactNumber, serialNumber",
        classes: "Columns: nameEn, nameUr, category, inChargeName, roomNumber, studentCount, serialNumber",
        classSubjects: "Columns: className, subjectName, periodsPerWeek, teacherName",
        timetable: "Columns: className, day, period (1-8), subjectName, teacherName",
        jointPeriods: "Columns: name, teacherName, periodsPerWeek"
    };
    return <p className="text-xs text-[var(--text-secondary)]">{descs[type]}</p>;
  }

  const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101]" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] mx-4 transform flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold p-6 border-b border-[var(--border-primary)] text-[var(--text-primary)] flex-shrink-0">{t.dataImportExportCsv}</h3>

        <div className="flex-grow flex min-h-0">
          <aside className="w-1/4 border-r border-[var(--border-primary)] p-4 flex flex-col gap-2">
            {TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); resetUploadState(); }}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${ activeTab === tab ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {t[`${tab}Csv`]}
              </button>
            ))}
          </aside>

          <main className="w-3/4 flex-grow flex flex-col p-6 overflow-y-auto">
            {!parsedData ? (
                <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full transition-colors ${isDragging ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]' : 'border-[var(--border-secondary)]'}`}>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleFileSelect} />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--text-placeholder)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
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
                                <div className="pt-2">
                                    <button onClick={() => setShowErrors(!showErrors)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                        {showErrors ? t.hideErrors : t.showErrors}
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {showErrors && <ul className="mt-2 text-xs bg-red-50 p-2 rounded-md max-h-24 overflow-y-auto">{importAnalysis.errors.map(err => <li key={err.rowIndex}><strong>Row {err.rowIndex}:</strong> {err.message}</li>)}</ul>}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="overflow-auto border border-[var(--border-primary)] rounded-lg max-h-80 relative">
                      <table className="w-full text-xs">
                          <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10"><tr>{parsedData[0] && Object.keys(parsedData[0]).map(h => <th key={h} className="p-2 text-left font-semibold text-[var(--text-secondary)]">{h}</th>)}</tr></thead>
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
                                return (<tr key={index} className={`${rowClass} ${textClass}`} title={error?.message}>{visibleKeys.map((key, i) => (<td key={i} className={`p-2 whitespace-nowrap ${i === 0 ? statusClass : ''} ${key.toLowerCase().includes('ur') ? 'font-urdu' : ''}`}>{row[key]}</td>))}</tr>);
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
                <button onClick={() => handleConfirmImport(activeTab)} disabled={!!importAnalysis && importAnalysis.errors.length > 0}
                    className="px-6 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {t.confirmImport}
                </button>
            )}
             <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
              {t.cancel}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CsvManagementModal;
