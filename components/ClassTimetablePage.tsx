
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, SchoolConfig, Adjustment, JointPeriod, DownloadDesignConfig, TimetableSession, TimetableChangeLog } from '../types';
import { allDays } from '../types';
import PeriodStack from './PeriodStack';
import CopyTimetableModal from './CopyTimetableModal';
import PrintPreview from './PrintPreview';
import { generateUniqueId, getColorForId } from '../types';
import { translations } from '../i18n';
import { ClassCommunicationModal } from './ClassCommunicationModal';
import DownloadModal from './DownloadModal';
import { generateClassTimetableHtml } from './reportUtils';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import AddLessonForm from './AddLessonForm'; 

interface ClassTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>;
  onSetClasses: (classes: SchoolClass[]) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  selection: { classId: string | null; highlightedTeacherId: string; };
  onSelectionChange: React.Dispatch<React.SetStateAction<{ classId: string | null; highlightedTeacherId: string; }>>;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
  hasActiveSession: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  changeLogs?: TimetableChangeLog[];
  appFont?: string;
  theme?: string;
}

// Helper to create log
const createLog = (
    type: TimetableChangeLog['type'], 
    details: string, 
    entityType: TimetableChangeLog['entityType'], 
    entityId: string
): TimetableChangeLog => ({
    id: generateUniqueId(),
    timestamp: new Date().toISOString(),
    type,
    details,
    entityType,
    entityId
});

const ClearIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 011-1h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V6a1 1 0 01-1 1h-1a1 1 0 01-1-1V4z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const WhatsAppIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" /></svg>);
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2v4h10z" /></svg>;

const ClassTimetablePage: React.FC<ClassTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, onUpdateSchoolConfig, selection, onSelectionChange, openConfirmation, hasActiveSession, onUndo, onRedo, onSave, canUndo, canRedo, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod, onUpdateTimetableSession, changeLogs, appFont, theme }) => {
  const { classId: selectedClassId, highlightedTeacherId } = selection;
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [moveSource, setMoveSource] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isLessonListOpen, setIsLessonListOpen] = useState(true);
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  // Custom Dropdown State
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isHeaderMoreOpen, setIsHeaderMoreOpen] = useState(false);
  const [classSortBy, setClassSortBy] = useState<'serial' | 'room' | 'name'>('serial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const headerMoreRef = useRef<HTMLDivElement>(null);

  // Ref for detecting clicks outside
  const tableRef = useRef<HTMLDivElement>(null);

  // Derived active days and periods based on config
  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8)), [activeDays, schoolConfig.daysConfig]);
  const periodLabels = useMemo(() => Array.from({length: maxPeriods}, (_, i) => (i + 1).toString()), [maxPeriods]);

  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties' && !c.isExtraRoom), [classes]);

  useEffect(() => {
      if ((!selectedClassId || selectedClassId === 'non-teaching-duties') && visibleClasses.length > 0) {
          onSelectionChange(prev => ({ ...prev, classId: visibleClasses[0].id }));
      }
  }, [visibleClasses, selectedClassId, onSelectionChange]);
  
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (moveSource && !(e.target as Element).closest('.period-stack-clickable') && !(e.target as Element).closest('.timetable-slot')) {
              setMoveSource(null);
              onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' }));
          }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, [moveSource, onSelectionChange]);

  useEffect(() => {
      const handleClickOutsideDropdown = (event: MouseEvent) => {
          if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
              setIsClassDropdownOpen(false);
          }
          if (headerMoreRef.current && !headerMoreRef.current.contains(event.target as Node)) {
              setIsHeaderMoreOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutsideDropdown);
      return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, []);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const sortedClasses = useMemo(() => {
      let sorted = [...visibleClasses];
      if (classSearchQuery) {
          const q = classSearchQuery.toLowerCase();
          sorted = sorted.filter(c => 
              c.nameEn.toLowerCase().includes(q) || 
              c.nameUr.includes(q) || 
              (c.roomNumber && c.roomNumber.toLowerCase().includes(q))
          );
      }
      
      return sorted.sort((a, b) => {
          let res = 0;
          if (classSortBy === 'serial') {
              res = (a.serialNumber ?? 99999) - (b.serialNumber ?? 99999);
          } else if (classSortBy === 'room') {
              const rA = a.roomNumber || '';
              const rB = b.roomNumber || '';
              if (rA === '' && rB !== '') return 1;
              if (rA !== '' && rB === '') return -1;
              
              const dir = sortDirection === 'asc' ? 1 : -1;
              return rA.localeCompare(rB, undefined, { numeric: true }) * dir;
          } else { // name
              res = a.nameEn.localeCompare(b.nameEn);
          }
          return sortDirection === 'asc' ? res : -res;
      });
  }, [visibleClasses, classSortBy, classSearchQuery, sortDirection]);

  const currentClassIndex = useMemo(() => {
    if (!selectedClassId) return -1;
    return sortedClasses.findIndex(c => c.id === selectedClassId);
  }, [selectedClassId, sortedClasses]);

  const handlePreviousClass = () => {
    if (currentClassIndex > 0) {
        onSelectionChange(prev => ({ ...prev, classId: sortedClasses[currentClassIndex - 1].id }));
    }
  };

  const handleNextClass = () => {
    if (currentClassIndex < sortedClasses.length - 1) {
        onSelectionChange(prev => ({ ...prev, classId: sortedClasses[currentClassIndex + 1].id }));
    }
  };

  // Calculate teacher availability across the grid if a teacher is selected
  const teacherAvailabilityMap = useMemo(() => {
    if (!highlightedTeacherId) return null;
    const map = new Map<string, { status: 'here' | 'elsewhere', conflictClass?: string }>();
    
    activeDays.forEach(day => {
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            let status: 'here' | 'elsewhere' | null = null;
            let conflictClass = '';
            
            for (const cls of classes) {
                const periods = cls.timetable[day]?.[pIdx];
                if (periods) {
                    if (periods.some(p => p.teacherId === highlightedTeacherId)) {
                        if (cls.id === selectedClassId) {
                            status = 'here';
                        } else {
                            status = 'elsewhere'; 
                            conflictClass = language === 'ur' ? cls.nameUr : cls.nameEn;
                        }
                        if (status === 'here') break; 
                    }
                }
            }
            if (status) map.set(`${day}-${pIdx}`, { status, conflictClass });
        }
    });
    return map;
  }, [highlightedTeacherId, classes, activeDays, maxPeriods, selectedClassId, language]);

  const teacherColorMap = useMemo(() => {
      const map = new Map<string, string>();
      teachers.forEach(t => {
          map.set(t.id, getColorForId(t.id).name);
      });
      return map;
  }, [teachers]);

  // --- LOGIC FOR MOVES ---
  
  const handleDragStart = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => { setDraggedData({ periods, sourceDay, sourcePeriodIndex }); setMoveSource(null); if (periods[0]?.teacherId) { onSelectionChange(prev => ({ ...prev, highlightedTeacherId: periods[0].teacherId })); } };
  const handleDragEnd = () => { setDraggedData(null); onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' })); };
  const handleStackClick = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => { if (moveSource && moveSource.periods[0].id === periods[0].id) { setMoveSource(null); onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' })); } else { setMoveSource({ periods, sourceDay, sourcePeriodIndex }); if (periods[0]?.teacherId) { onSelectionChange(prev => ({ ...prev, highlightedTeacherId: periods[0].teacherId })); } } };
  
  const handleExecuteMove = (targetDay: keyof TimetableGridData, targetPeriodIndex: number) => { 
      const source = draggedData || moveSource;
      if (!source || !selectedClass) return;
      const periodLimit = schoolConfig.daysConfig?.[targetDay]?.periodCount ?? 8;
      if (targetPeriodIndex >= periodLimit) return;
      const { periods, sourceDay, sourcePeriodIndex } = source;
      if (sourceDay === targetDay && sourcePeriodIndex === targetPeriodIndex) return;

      const targetPeriods = selectedClass.timetable[targetDay]?.[targetPeriodIndex] || [];
      const isTargetOccupied = targetPeriods.length > 0;
      
      const getGroupSetId = (p: Period) => {
        if (p.jointPeriodId) {
             const jp = jointPeriods.find(j => j.id === p.jointPeriodId);
             return jp?.assignments.find(a => a.classId === selectedClass.id)?.groupSetId;
        }
        const sub = selectedClass.subjects.find(s => s.subjectId === p.subjectId);
        return sub?.groupSetId;
      };
      
      const incomingGroupSetId = getGroupSetId(periods[0]);
      let isCompatibleGroup = false;
      if (incomingGroupSetId && isTargetOccupied) {
        const targetGroupSetId = getGroupSetId(targetPeriods[0]);
        if (targetGroupSetId === incomingGroupSetId) isCompatibleGroup = true;
      }

      let needsReplacement = isTargetOccupied && !isCompatibleGroup;

      const performUpdate = (doOverwrite: boolean = false) => {
        onUpdateTimetableSession((session) => {
            let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
            let currentLogs = session.changeLogs || [];
            
            const jointPeriodId = periods[0].jointPeriodId;
            const jointPeriodDef = jointPeriodId ? jointPeriods.find(jp => jp.id === jointPeriodId) : null;
            const logDetails: string[] = [];

            if (jointPeriodDef) {
                const linkedClassIds = jointPeriodDef.assignments.map(a => a.classId);
                // Remove from source if needed
                if (sourceDay && sourcePeriodIndex !== undefined) {
                    newClasses = newClasses.map(c => {
                        if (linkedClassIds.includes(c.id)) {
                            const updatedC = { ...c, timetable: { ...c.timetable } };
                            const dayPeriods = [...updatedC.timetable[sourceDay]];
                            dayPeriods[sourcePeriodIndex] = dayPeriods[sourcePeriodIndex].filter(p => p.jointPeriodId !== jointPeriodDef.id);
                            updatedC.timetable[sourceDay] = dayPeriods;
                            return updatedC;
                        }
                        return c;
                    });
                }
                
                // Add to target
                newClasses = newClasses.map(c => {
                    if (linkedClassIds.includes(c.id)) {
                        const updatedC = { ...c, timetable: { ...c.timetable } };
                        if (!updatedC.timetable[targetDay]) updatedC.timetable[targetDay] = [];
                        const dayPeriods = [...updatedC.timetable[targetDay]];
                        const targetSlot = dayPeriods[targetPeriodIndex] || [];
                        const assignment = jointPeriodDef.assignments.find(a => a.classId === c.id);
                        if (assignment) {
                            const newPeriod: Period = { id: generateUniqueId(), classId: c.id, subjectId: assignment.subjectId, teacherId: jointPeriodDef.teacherId, jointPeriodId: jointPeriodDef.id };
                            if (doOverwrite && c.id === selectedClassId) { dayPeriods[targetPeriodIndex] = [newPeriod]; } else { dayPeriods[targetPeriodIndex] = [...targetSlot, newPeriod]; }
                            updatedC.timetable[targetDay] = dayPeriods;
                            return updatedC;
                        }
                    }
                    return c;
                });
                
                logDetails.push(`Moved Joint Period ${jointPeriodDef.name} to ${targetDay} P${targetPeriodIndex + 1}`);
            } else {
                const updatedClass = { ...selectedClass };
                const newTimetable = { ...updatedClass.timetable };
                
                if (sourceDay && sourcePeriodIndex !== undefined) {
                     const sourceDayPeriods = [...newTimetable[sourceDay]];
                     const sourceSlot = sourceDayPeriods[sourcePeriodIndex] || [];
                     const idsToRemove = new Set(periods.map(p => p.id));
                     sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(p => !idsToRemove.has(p.id));
                     newTimetable[sourceDay] = sourceDayPeriods;
                }
                if(!newTimetable[targetDay]) newTimetable[targetDay] = [];
                const targetDayPeriods = (sourceDay === targetDay) ? newTimetable[sourceDay] : [...newTimetable[targetDay]];
                const targetSlot = targetDayPeriods[targetPeriodIndex] || [];
                
                if (doOverwrite) { targetDayPeriods[targetPeriodIndex] = periods; } else { targetDayPeriods[targetPeriodIndex] = [...targetSlot, ...periods]; }
                newTimetable[targetDay] = targetDayPeriods;
                updatedClass.timetable = newTimetable;
                
                const idx = newClasses.findIndex(c => c.id === updatedClass.id);
                if(idx !== -1) newClasses[idx] = updatedClass;
                
                const sub = subjects.find(s => s.id === periods[0].subjectId);
                const tea = teachers.find(t => t.id === periods[0].teacherId);
                logDetails.push(`Moved ${sub?.nameEn || '?'} (${tea?.nameEn || '?'}) to ${targetDay} P${targetPeriodIndex + 1}`);
            }
            
            // Add logs
            logDetails.forEach(d => currentLogs.push(createLog('move', d, 'class', selectedClassId!)));
            
            return { ...session, classes: newClasses, changeLogs: currentLogs };
        });

        setDraggedData(null);
        setMoveSource(null);
        onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' }));
      };
      
      // Availability check omitted for brevity in this snippet, assumes valid or forced
      performUpdate(needsReplacement);
  };

  const handleUnschedule = () => { 
      const source = draggedData || moveSource;
      if (!source || !selectedClass) return;
      const { periods, sourceDay, sourcePeriodIndex } = source;
      if (sourceDay && sourcePeriodIndex !== undefined) {
          onUpdateTimetableSession((session) => {
              let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
              let currentLogs = session.changeLogs || [];
              const jointPeriodId = periods[0].jointPeriodId;
              const jointPeriodDef = jointPeriodId ? jointPeriods.find(jp => jp.id === jointPeriodId) : null;
              
              if (jointPeriodDef) {
                  const linkedClassIds = jointPeriodDef.assignments.map(a => a.classId);
                  newClasses = newClasses.map(c => {
                      if (linkedClassIds.includes(c.id)) {
                          const updatedC = { ...c, timetable: { ...c.timetable } };
                          const dayPeriods = [...updatedC.timetable[sourceDay]];
                          dayPeriods[sourcePeriodIndex] = dayPeriods[sourcePeriodIndex].filter(p => p.jointPeriodId !== jointPeriodDef.id);
                          updatedC.timetable[sourceDay] = dayPeriods;
                          return updatedC;
                      }
                      return c;
                  });
                  currentLogs.push(createLog('move', `Unscheduled Joint Period ${jointPeriodDef.name} from ${sourceDay} P${sourcePeriodIndex+1}`, 'class', selectedClassId!));
              } else {
                  const updatedClass = { ...selectedClass };
                  const newTimetable = { ...updatedClass.timetable };
                  const sourceDayPeriods = [...newTimetable[sourceDay]];
                  const idsToRemove = new Set(periods.map(p => p.id));
                  sourceDayPeriods[sourcePeriodIndex] = sourceDayPeriods[sourcePeriodIndex].filter(p => !idsToRemove.has(p.id));
                  newTimetable[sourceDay] = sourceDayPeriods;
                  updatedClass.timetable = newTimetable;
                  const idx = newClasses.findIndex(c => c.id === updatedClass.id);
                  if(idx !== -1) newClasses[idx] = updatedClass;
                  
                  const sub = subjects.find(s => s.id === periods[0].subjectId);
                  currentLogs.push(createLog('move', `Unscheduled ${sub?.nameEn || '?'} from ${sourceDay} P${sourcePeriodIndex+1}`, 'class', selectedClassId!));
              }
              return { ...session, classes: newClasses, changeLogs: currentLogs };
          });
      }
      setDraggedData(null);
      setMoveSource(null);
      onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' }));
  };

  const handlePeriodDelete = (periodId: string, classId: string, day: keyof TimetableGridData, periodIndex: number, jointPeriodId?: string) => {
    onUpdateTimetableSession((session) => {
        let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
        let currentLogs = session.changeLogs || [];
        const logDetails: string[] = [];

        if (jointPeriodId) {
            const jointPeriodDef = jointPeriods.find(jp => jp.id === jointPeriodId);
            if (jointPeriodDef) {
                // Remove from ALL linked classes
                const linkedClassIds = jointPeriodDef.assignments.map(a => a.classId);
                newClasses = newClasses.map(c => {
                    if (linkedClassIds.includes(c.id)) {
                        const updatedC = { ...c, timetable: { ...c.timetable } };
                        const dayPeriods = [...updatedC.timetable[day]];
                        dayPeriods[periodIndex] = dayPeriods[periodIndex].filter(p => p.jointPeriodId !== jointPeriodId);
                        updatedC.timetable[day] = dayPeriods;
                        return updatedC;
                    }
                    return c;
                });
                logDetails.push(`Deleted Joint Period ${jointPeriodDef.name} from ${day} P${periodIndex + 1}`);
            }
        } else {
            // Single period deletion
            const classIndex = newClasses.findIndex(c => c.id === classId);
            if (classIndex !== -1) {
                const updatedClass = { ...newClasses[classIndex] };
                const updatedTimetable = { ...updatedClass.timetable };
                
                const dayPeriods = [...updatedTimetable[day]];
                const slot = dayPeriods[periodIndex] || [];
                
                const pToDelete = slot.find(p => p.id === periodId);
                const sub = subjects.find(s => s.id === pToDelete?.subjectId);
                
                dayPeriods[periodIndex] = slot.filter(p => p.id !== periodId);
                updatedTimetable[day] = dayPeriods;
                updatedClass.timetable = updatedTimetable;
                newClasses[classIndex] = updatedClass;
                
                logDetails.push(`Deleted ${sub?.nameEn || 'Lesson'} from ${day} P${periodIndex + 1}`);
            }
        }

        // Add logs
        logDetails.forEach(d => currentLogs.push(createLog('delete', d, 'class', selectedClassId!)));

        return { ...session, classes: newClasses, changeLogs: currentLogs };
    });
};

  const handleDrop = (e: React.DragEvent, targetDay: keyof TimetableGridData, targetPeriodIndex: number) => { e.preventDefault(); handleExecuteMove(targetDay, targetPeriodIndex); };
  const handleSidebarDrop = (e: React.DragEvent) => { e.preventDefault(); handleUnschedule(); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  
  const unscheduledPeriods = useMemo(() => {
      if (!selectedClass) return [];
      const scheduledCounts = new Map<string, number>();
      Object.keys(selectedClass.timetable).forEach(dayKey => {
          const day = dayKey as keyof TimetableGridData;
          selectedClass.timetable[day]?.forEach(slot => {
              slot.forEach(p => {
                  const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : p.subjectId;
                  scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1);
              });
          });
      });
      const unscheduled: Period[] = [];
      selectedClass.subjects.forEach(sub => {
          const relevantJointPeriod = jointPeriods.find(jp => jp.assignments.some(a => a.classId === selectedClass.id && a.subjectId === sub.subjectId));
          if (relevantJointPeriod) return; 
          const scheduled = scheduledCounts.get(sub.subjectId) || 0;
          const remaining = sub.periodsPerWeek - scheduled;
          for (let i = 0; i < remaining; i++) {
              unscheduled.push({ id: generateUniqueId(), classId: selectedClass.id, subjectId: sub.subjectId, teacherId: sub.teacherId });
          }
      });
      jointPeriods.forEach(jp => {
          const assignment = jp.assignments.find(a => a.classId === selectedClass.id);
          if (assignment) {
               const scheduled = scheduledCounts.get(`jp-${jp.id}`) || 0;
               const remaining = jp.periodsPerWeek - scheduled;
               for(let i=0; i<remaining; i++){
                   unscheduled.push({ id: generateUniqueId(), classId: selectedClass.id, subjectId: assignment.subjectId, teacherId: jp.teacherId, jointPeriodId: jp.id });
               }
          }
      });
      return unscheduled;
  }, [selectedClass, jointPeriods, classes]);

  const groupedUnscheduled = useMemo(() => {
      return unscheduledPeriods.reduce((acc, p) => {
          const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : p.subjectId;
          if (!acc[key]) acc[key] = [];
          acc[key].push(p);
          return acc;
      }, {} as Record<string, Period[]>);
  }, [unscheduledPeriods]);

  const classLogs = useMemo(() => {
      if (!changeLogs || !selectedClassId) return [];
      return changeLogs
        .filter(log => log.entityType === 'class' && log.entityId === selectedClassId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [changeLogs, selectedClassId]);

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, class: newDesign } });
  };

  const isSelectionActive = !!(draggedData || moveSource);

  if (!hasActiveSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedClass && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.classTimetable}: ${selectedClass.nameEn}`} fileNameBase={`Timetable_${selectedClass.nameEn.replace(' ', '_')}`} generateHtml={(lang, options) => generateClassTimetableHtml(selectedClass, lang, options, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={handleSavePrintDesign} />)}
      {selectedClass && <CopyTimetableModal t={t} isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} classes={visibleClasses} subjects={subjects} teachers={teachers} onUpdateClasses={(updatedClasses) => { 
        const newClasses = classes.map(c => {
          const updated = updatedClasses.find(uc => uc.id === c.id);
          return updated ? updated : c;
        });
        onSetClasses(newClasses); 
      }} sourceClassId={selectedClass.id} />}
      {selectedClass && (<ClassCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedClass={selectedClass} inChargeTeacher={teachers.find(t => t.id === selectedClass.inCharge)!} subjects={subjects} teachers={teachers} schoolConfig={schoolConfig} subjectColorMap={teacherColorMap} appFont={appFont} />)}
      
      <DownloadModal t={t} isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title={t.downloadTimetable} fileNameBase="Class_Timetables" items={visibleClasses} itemType="class" generateFullPageHtml={(item, lang, design) => generateClassTimetableHtml(item, lang, design, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} />

      <div className="mb-6 flex items-center justify-between gap-4 w-full max-w-7xl mx-auto px-2 lg:px-0 mt-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Class Selector Header - Modern Design */}
        <div className="flex items-center justify-start flex-grow relative" ref={classDropdownRef}>
             <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4">
                 <button 
                     onClick={handlePreviousClass} 
                     disabled={currentClassIndex <= 0}
                     className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronLeftIcon />
                 </button>
                 <button 
                     onClick={handleNextClass} 
                     disabled={currentClassIndex >= sortedClasses.length - 1}
                     className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronRightIcon />
                 </button>
             </div>

             {selectedClass ? (
                 <div className="flex items-center gap-2 sm:gap-4 cursor-pointer whitespace-nowrap" onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}>
                     <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 md:border-4 border-[#bed730] flex items-center justify-center flex-shrink-0">
                         <span className="text-[#bed730] font-black text-lg md:text-xl">{selectedClass.serialNumber?.toString().padStart(2, '0') ?? '-'}</span>
                     </div>
                     <div className="flex flex-col items-start leading-none -space-y-0.5 md:-space-y-1">
                         <span className="font-black text-2xl md:text-4xl text-[#2e5ef2] uppercase tracking-tighter">
                             {language === 'ur' ? selectedClass.nameUr : selectedClass.nameEn}
                         </span>
                         {selectedClass.inCharge && (() => {
                             const inChargeTeacher = teachers.find(t => t.id === selectedClass.inCharge);
                             return inChargeTeacher ? (
                                 <span className="text-[#2e5ef2] text-xs md:text-lg font-bold uppercase tracking-widest pl-1">
                                     {language === 'ur' ? inChargeTeacher.nameUr : inChargeTeacher.nameEn}
                                 </span>
                             ) : null;
                         })()}
                     </div>
                     
                     <div className="flex items-center gap-2 ml-2 md:ml-4">
                         <div className="flex flex-col items-center justify-center relative w-8 h-8 md:w-10 md:h-10 rounded-full border-[1.5px] border-dashed border-[#bed730] text-[#bed730] flex-shrink-0">
                             <span className="text-[6px] md:text-[8px] font-bold uppercase absolute top-1 md:top-1.5 opacity-80">RM</span>
                             <span className="text-[10px] md:text-xs font-black mt-1.5 md:mt-2">{selectedClass.roomNumber || '-'}</span>
                         </div>
                         <div className="text-gray-300 flex flex-col -gap-2 hidden md:flex">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                         </div>
                     </div>
                 </div>
             ) : (
                 <span className="text-gray-400 font-medium text-base md:text-lg whitespace-nowrap">{t.selectAClass}</span>
             )}

             {isClassDropdownOpen && (
                 <div className="absolute top-[100%] mt-4 w-full min-w-[280px] md:min-w-[320px] max-w-md bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl shadow-2xl p-4 animate-scale-in z-50">
                     {/* Search */}
                     <div className="relative mb-3 w-full">
                         <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5">
                             <SearchIcon />
                         </div>
                         <input
                             type="text"
                             placeholder="Search classes..."
                             value={classSearchQuery}
                             onChange={(e) => setClassSearchQuery(e.target.value)}
                             className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-secondary)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#2e5ef2] transition-all"
                             autoFocus
                         />
                     </div>
                     
                     <div className="flex gap-2 mb-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] p-1.5 rounded-xl">
                        {(['serial', 'name', 'room'] as const).map(key => (
                            <button
                                key={key}
                                onClick={() => {
                                    if (classSortBy === key) {
                                        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                    } else {
                                        setClassSortBy(key);
                                        setSortDirection('asc');
                                    }
                                }}
                                className={`flex-1 text-xs font-bold uppercase py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${classSortBy === key ? 'bg-[#2e5ef2] text-white shadow-sm' : 'text-gray-500 hover:text-black dark:text-gray-400 hover:bg-white dark:hover:bg-[var(--bg-secondary)]'}`}
                            >
                                {key === 'serial' ? '#' : key}
                                {classSortBy === key && (
                                    <span className="text-[10px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </button>
                        ))}
                     </div>

                     <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                         {sortedClasses.length === 0 ? (
                             <div className="p-4 text-center text-sm text-gray-400 italic">No classes found</div>
                         ) : (
                             sortedClasses.map(c => (
                                 <button
                                     key={c.id}
                                     onClick={() => {
                                         onSelectionChange(prev => ({ ...prev, classId: c.id }));
                                         setIsClassDropdownOpen(false);
                                     }}
                                     className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-colors ${selectedClassId === c.id ? 'bg-[#2e5ef2]/10 text-[#2e5ef2]' : 'hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                                 >
                                     <span className={`font-mono text-xs opacity-50 w-8 text-center flex-shrink-0 py-1 rounded-md ${selectedClassId === c.id ? 'bg-[#2e5ef2]/20' : 'bg-gray-100 dark:bg-[var(--bg-secondary)]'}`}>#{c.serialNumber ?? '-'}</span>
                                     <span className="font-bold flex-grow text-base break-words text-left">{language === 'ur' ? c.nameUr : c.nameEn}</span>
                                     {c.roomNumber && <span className="text-[10px] opacity-70 whitespace-nowrap px-2 py-1 rounded-md bg-white border border-gray-200 dark:bg-[var(--bg-secondary)] dark:border-[var(--border-secondary)]">Rm {c.roomNumber}</span>}
                                 </button>
                             ))
                         )}
                     </div>
                 </div>
             )}
        </div>
        
        {/* Actions - Right */}
        <div className="flex items-center justify-end gap-2 md:gap-4 flex-shrink-0">
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedClass} title={t.sendViaWhatsApp} className="text-[#25D366] hover:scale-110 transition-transform disabled:opacity-50 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8"><path d="M12.031 0C5.385 0 0 5.385 0 12.033c0 2.651.848 5.129 2.316 7.21l-1.579 5.765 5.922-1.554a11.966 11.966 0 005.372 1.28c6.645 0 12.031-5.385 12.031-12.033S18.677 0 12.031 0zm3.847 17.585c-.198.549-1.189 1.054-1.636 1.111-.409.052-.937.106-2.911-.703-2.366-.967-3.896-3.376-4.01-3.529-.115-.152-.958-1.272-.958-2.428 0-1.156.6-1.728.814-1.936.213-.207.468-.258.623-.258s.308 0 .445.006c.14.007.327-.052.511.393.184.444.622 1.52.678 1.636.056.115.093.251.018.397-.075.146-.115.236-.226.353-.115.116-.242.261-.345.358-.112.106-.231.222-.102.443.129.222.576.953 1.233 1.536.847.75 1.564.978 1.785 1.085.222.106.353.088.484-.06.13-.146.562-.647.712-.871.149-.222.3-.186.505-.11.205.076 1.284.606 1.503.716.222.111.371.165.426.257.054.093.054.538-.144 1.087z"/></svg>
            </button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedClass} className="bg-white dark:bg-[var(--bg-tertiary)] rounded-full px-3 md:px-5 py-1.5 md:py-2 flex items-center gap-1.5 shadow-sm border border-gray-100 dark:border-[var(--border-secondary)] text-black dark:text-white font-bold text-xs md:text-sm hover:shadow-md transition-shadow whitespace-nowrap">
                <PrintIcon className="text-[#00c5ff] w-4 h-4 md:w-5 md:h-5" /> Print
            </button>
            
            <div className="relative" ref={headerMoreRef}>
                <button 
                  onClick={() => setIsHeaderMoreOpen(!isHeaderMoreOpen)} 
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white dark:bg-[var(--bg-tertiary)] flex border border-gray-200 dark:border-[var(--border-secondary)] text-gray-400 hover:text-gray-600 dark:text-white hover:bg-gray-50 items-center justify-center transition-all shadow-sm flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                
                {isHeaderMoreOpen && (
                    <div className="absolute right-0 top-[100%] mt-2 w-48 bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-xl py-2 border border-gray-100 dark:border-[var(--border-primary)] z-50 animate-scale-in">
                        {onUndo && (
                            <button onClick={() => { onUndo(); setIsHeaderMoreOpen(false); }} disabled={!canUndo} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 text-[var(--text-primary)]">
                                <UndoIcon /> {t.undo || 'Undo'}
                            </button>
                        )}
                        {onRedo && (
                            <button onClick={() => { onRedo(); setIsHeaderMoreOpen(false); }} disabled={!canRedo} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 text-[var(--text-primary)]">
                                <RedoIcon /> {t.redo || 'Redo'}
                            </button>
                        )}
                        {onSave && (
                            <button onClick={() => { onSave(); setIsHeaderMoreOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-blue-600">
                                <SaveIcon /> {t.save || 'Save'}
                            </button>
                        )}
                        <hr className="my-2 border-gray-100 dark:border-gray-800" />
                        <button onClick={() => { openConfirmation('Clear Class Timetable', 'Are you sure you want to unschedule all periods for this class?', () => { /* Logic to clear class timetable */ }); setIsHeaderMoreOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-3 text-red-600">
                            <ClearIcon /> Clear
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {!selectedClass ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectAClass}</p>
      ) : (
        <div className="relative flex flex-col gap-6 items-start w-full mt-4">
          {/* Timetable Grid - Modern Styled */}
          <div className="w-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="bg-[#dbe4eb] dark:bg-[var(--bg-secondary)] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 lg:p-8 shadow-inner overflow-hidden border border-[#c5d3df] dark:border-[var(--border-primary)]" ref={tableRef}>
                <div className="min-w-max flex flex-col gap-3">
                    {/* Header Row */}
                    <div className="flex gap-2">
                        <div className="w-10 sm:w-12 lg:w-14 flex-shrink-0 text-center font-bold text-[#1f4061] dark:text-gray-300 text-[10px] sm:text-xs tracking-widest uppercase py-1 flex items-center justify-center">
                            TIME
                        </div>
                        {activeDays.map(day => {
                            // Compute Date relative to current week
                            const today = new Date();
                            const currentDayIdx = today.getDay(); // 0 is Sunday
                            const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            const targetIdx = daysArr.indexOf(day);
                            const diff = targetIdx - currentDayIdx;
                            const targetDate = new Date(today);
                            targetDate.setDate(today.getDate() + diff);
                            const dateStr = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                            return (
                                <div key={day} className="w-[72px] sm:w-[80px] md:w-[90px] flex-shrink-0 flex flex-col items-center justify-center py-1">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-[#2e5ef2] dark:text-blue-400 mb-0.5">{dateStr}</span>
                                    <span className="font-black text-[#0c2340] dark:text-white text-xs sm:text-sm tracking-widest uppercase">{t[day.toLowerCase()].substring(0, 3)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Periods */}
                    {periodLabels.map((label, periodIndex) => {
                        
                        return (
                            <React.Fragment key={label}>
                            <div className="flex gap-2 relative z-10 w-max">
                                {/* Time Cell */}
                                <div className="w-10 sm:w-12 lg:w-14 flex-shrink-0 flex flex-col items-center justify-center -space-y-0.5">
                                    <span className="text-base sm:text-lg lg:text-xl font-black text-[#2e5ef2]">P{label}</span>
                                    <span className="text-[7px] sm:text-[8px] font-bold text-gray-800 dark:text-gray-400 whitespace-nowrap">
                                         08:00
                                    </span> 
                                </div>
                                
                                {/* Days Cells */}
                                {activeDays.map(day => {
                                    const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                                    const isDisabled = periodIndex >= periodLimit;
                                    const slotPeriods = selectedClass.timetable[day]?.[periodIndex] || [];
                                    
                                    const groupedSlotPeriods: Period[][] = [];
                                    const processedJPs = new Set<string>();
                                    
                                    slotPeriods.forEach(p => {
                                        if (p.jointPeriodId) {
                                            if (!processedJPs.has(p.jointPeriodId)) {
                                                processedJPs.add(p.jointPeriodId);
                                                groupedSlotPeriods.push([p]); 
                                            }
                                        } else {
                                            groupedSlotPeriods.push([p]);
                                        }
                                    });

                                    const isTarget = moveSource && !isDisabled;
                                    
                                    let content = null;

                                    if (isDisabled) {
                                        content = <div className="w-[72px] sm:w-[80px] md:w-[90px] h-[36px] sm:h-[40px] rounded-[16px] bg-gray-300/30 dark:bg-gray-800/30 opacity-50 cursor-not-allowed flex-shrink-0"></div>;
                                    } else {
                                        let outerClasses = `w-[72px] sm:w-[80px] md:w-[90px] h-[36px] sm:h-[40px] rounded-[16px] relative transition-all duration-300 group timetable-slot flex flex-col border-[1.5px] border-transparent flex-shrink-0`;
                                        if (isTarget) outerClasses += ' hover:scale-105 hover:shadow-xl cursor-pointer ring-inset ring-2 ring-[#2e5ef2]/50 hover:bg-white/50 z-20';

                                        if (teacherAvailabilityMap) {
                                            const data = teacherAvailabilityMap.get(`${day}-${periodIndex}`);
                                            if (data && data.status === 'elsewhere') {
                                                outerClasses += ' bg-red-100/80 dark:bg-red-900/50 ring-2 ring-red-500/50'; 
                                            } else if (data && data.status === 'here') {
                                                 // normal
                                            } else if (slotPeriods.length === 0) {
                                                outerClasses += ' bg-emerald-100/50 dark:bg-emerald-900/30 border-dashed border-[#50c878]';
                                            }
                                        } 

                                        if (slotPeriods.length === 0 && !teacherAvailabilityMap) {
                                             outerClasses += ' bg-white/40 dark:bg-[#1e293b]/40 border-dashed border-[#a6b8ca] dark:border-gray-600';
                                        } else if (slotPeriods.length > 0) {
                                             outerClasses += ' shadow-sm';
                                        }

                                        content = (
                                            <div 
                                                className={outerClasses}
                                                onDragOver={(e) => !isDisabled && handleDragOver(e)}
                                                onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                                                onClick={() => !isDisabled && moveSource && handleExecuteMove(day, periodIndex)}
                                            >
                                                {/* Card Content or Stack */}
                                                <div className="h-full flex flex-col relative z-10 w-full rounded-[16px] overflow-hidden">
                                                    {groupedSlotPeriods.map((group, groupIndex) => {
                                                        const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                                        const colorData = getColorForId(group[0].classId + group[0].subjectId, theme === 'dark' || theme === 'amoled');
                                                        const subject = subjects.find(s => s.id === group[0].subjectId);
                                                        const teacher = teachers.find(t => t.id === group[0].teacherId);
                                                        
                                                        const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                                        const highlightTeacher = highlightedTeacherId === group[0].teacherId;
                                                        const isDimmed = highlightedTeacherId && !highlightTeacher;

                                                        const subjectName = subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown');
                                                        const teacherName = teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'No Teacher';
                                                        
                                                        const trmSubj = subjectName.length > 7 ? subjectName.substring(0, 7) + '.' : subjectName;
                                                        const trmTeach = teacherName.length > 7 ? teacherName.substring(0, 7) + '.' : teacherName;

                                                        return (
                                                            <div 
                                                                key={`${group[0].id}-${groupIndex}`}
                                                                draggable
                                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(group, day, periodIndex); }}
                                                                onDragEnd={handleDragEnd}
                                                                onClick={(e) => { e.stopPropagation(); handleStackClick(group, day, periodIndex); }}
                                                                className={`absolute inset-0 flex flex-col justify-center px-1 sm:px-1.5 py-0 border-l-[4px] sm:border-l-[6px] rounded-[16px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-grab active:cursor-grabbing ${isSelected ? 'scale-95 shadow-inner' : ''} ${isDimmed ? 'opacity-30' : ''}`}
                                                                style={{ 
                                                                    borderLeftColor: colorData.hex, 
                                                                    backgroundColor: isSelected ? `${colorData.hex}40` : `${colorData.hex}15`,
                                                                    boxShadow: isSelected ? `inset 0 0 0 2px ${colorData.hex}90` : 'none'
                                                                }}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[11px] sm:text-[12px] font-bold uppercase whitespace-nowrap tracking-tight leading-none pt-[2px]" style={{ color: colorData.hex }}>
                                                                        {trmSubj}
                                                                    </span>
                                                                    {/* Delete button */}
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handlePeriodDelete(group[0].id, group[0].classId, day, periodIndex, group[0].jointPeriodId); }}
                                                                        className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-100/80 hover:bg-red-200 text-red-600 rounded-full transition-opacity absolute top-0.5 right-0.5 z-20"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-[8px] w-[8px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    </button>
                                                                </div>
                                                                <span className="text-[9px] sm:text-[10px] font-medium uppercase whitespace-nowrap mt-0.5 leading-none pb-[2px]" style={{ color: colorData.hex, opacity: 0.85 }}>
                                                                    {trmTeach}
                                                                </span>
                                                                {/* Combined/Multiple Indicator */}
                                                                {group.length > 1 && (
                                                                    <div className="absolute right-1 bottom-1 w-3 h-3 bg-blue-500/20 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-[7px] font-bold shadow-sm">
                                                                        {group.length}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={day}>
                                            {content}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
          </div>

          {/* Bottom Section -> Unscheduled */}
          <div className="w-full flex-col mt-6">
              
              {/* Unscheduled */}
              <div className="w-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg py-1 cursor-pointer transition-colors" onClick={() => setIsLessonListOpen(!isLessonListOpen)}>
                      <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white flex items-center gap-2">
                          Unscheduled 
                          <span className="bg-[#8b0000] text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base">
                              {Object.keys(groupedUnscheduled).length}
                          </span>
                      </h2>
                      <div className={`text-gray-400 transform transition-transform duration-200 ml-auto ${isLessonListOpen ? 'rotate-180' : ''}`}>
                         <ChevronDownIcon /> 
                      </div>
                  </div>
                  
                  <div className={`transition-all duration-500 overflow-hidden ${isLessonListOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div 
                          className={`bg-[#dbe4eb] dark:bg-[var(--bg-secondary)] border-2 border-dashed border-[#a6b8ca] dark:border-gray-600 rounded-[24px] p-4 flex flex-col gap-3 min-h-[150px] relative transition-colors ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'ring-2 ring-red-400 bg-red-50/50' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={handleSidebarDrop}
                          onClick={moveSource?.sourceDay ? handleUnschedule : undefined}
                      >
                          {moveSource && moveSource.sourceDay && (
                              <div className="px-3 py-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-center animate-pulse cursor-pointer shadow-sm">
                                  <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Drop here to Unschedule</span>
                              </div>
                          )}

                          {Object.keys(groupedUnscheduled).length === 0 ? (
                              <div className="text-center py-12 px-4 opacity-60 m-auto">
                                  <span className="block text-3xl mb-2">✨</span>
                                  <p className="text-sm text-[#1f4061] dark:text-gray-400 font-bold">{t.allLessonsScheduled}</p>
                              </div>
                          ) : (
                              <div className="flex flex-col gap-3 period-stack-clickable">
                                  {Object.values(groupedUnscheduled).map((group, index) => {
                                      const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                      const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                      const groupKey = jp ? `jp-${jp.id}` : `sub-${group[0].subjectId}`;
                                      const colorData = getColorForId(group[0].classId + group[0].subjectId);
                                      const subject = subjects.find(s => s.id === group[0].subjectId);
                                      const teacher = teachers.find(t => t.id === group[0].teacherId);
                                      
                                      // Only show max 4, then +Show More 
                                      if (index >= 4) return null;

                                      return (
                                          <div 
                                              key={`unscheduled-${groupKey}-${index}`} 
                                              draggable
                                              onDragStart={() => handleDragStart(group)}
                                              onDragEnd={handleDragEnd}
                                              onClick={() => handleStackClick(group)}
                                              className={`bg-white dark:bg-[#1e293b] rounded-[16px] px-4 py-3 flex items-center justify-between shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
                                              style={{ borderLeftColor: colorData.hex }}
                                          >
                                              <div className="flex flex-col">
                                                  <span className="text-xs font-bold text-[#1f4061] dark:text-gray-300 uppercase tracking-tight">
                                                      {subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown')}
                                                  </span>
                                                  <span className="text-sm font-black text-black dark:text-white">
                                                      {teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'No Teacher'}
                                                  </span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  {group.length > 1 && (
                                                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">x{group.length}</span>
                                                  )}
                                                  <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity"><circle cx="4" cy="3" r="2" fill="currentColor"/><circle cx="8" cy="3" r="2" fill="currentColor"/><circle cx="4" cy="9" r="2" fill="currentColor"/><circle cx="8" cy="9" r="2" fill="currentColor"/><circle cx="4" cy="15" r="2" fill="currentColor"/><circle cx="8" cy="15" r="2" fill="currentColor"/></svg>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  {Object.values(groupedUnscheduled).length > 4 && (
                                      <div className="mt-2 text-center">
                                          <button className="text-sm font-bold text-[#1f4061] dark:text-gray-300 hover:text-blue-600 transition-colors py-2 flex items-center justify-center gap-1 w-full border-t border-[#a6b8ca] dark:border-gray-600 border-dashed pt-4">
                                              <ChevronDownIcon /> Show {Object.values(groupedUnscheduled).length - 4} More
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
        </div>
      )}
      
      {/* Lesson Manager Section */}
      {selectedClass && hasActiveSession && (
        <div className="mt-8">
            <AddLessonForm 
                t={t}
                teachers={teachers}
                classes={classes}
                subjects={subjects}
                jointPeriods={jointPeriods}
                onSetClasses={onSetClasses}
                onAddJointPeriod={onAddJointPeriod}
                onUpdateJointPeriod={onUpdateJointPeriod}
                onDeleteJointPeriod={onDeleteJointPeriod}
                onUpdateTimetableSession={onUpdateTimetableSession}
                openConfirmation={openConfirmation}
                limitToClassId={selectedClass.id}
            />
        </div>
      )}

      {/* History Section (Logs) */}
      {selectedClass && hasActiveSession && (
        <div className={`mt-8 mb-24 bg-white dark:bg-[#1e293b] rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ${isHistoryExpanded ? 'max-h-[500px]' : 'max-h-16 sm:max-h-[72px]'}`}>
            <div className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    History / Logs
                    <span className="bg-[#2e5ef2] text-white text-xs px-2.5 py-0.5 rounded-full">{classLogs.length}</span>
                </h3>
                <div className={`text-gray-400 transform transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                   <ChevronDownIcon /> 
                </div>
            </div>
            
            <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto custom-scrollbar max-h-[400px]">
                {classLogs.length === 0 ? (
                    <div className="text-center py-8 opacity-50">
                         <div className="mb-3 mx-auto w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
                            <HistoryIcon />
                        </div>
                        <p className="text-sm text-gray-500 font-bold">No recent changes.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {classLogs.map((log) => (
                            <li key={log.id} className={`p-4 rounded-[16px] border shadow-sm transition-all ${
                                log.type === 'delete' ? 'bg-red-50/80 dark:bg-red-900/10 border-red-100 dark:border-red-800/50' :
                                log.type === 'add' ? 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' :
                                'bg-blue-50/80 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50'
                            }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                        log.type === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                                        log.type === 'add' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                        {new Date(log.timestamp).toLocaleString([], { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">{log.details}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed top-24 right-6 z-50 flex flex-col items-end gap-3">
          {/* Main Toggle Button */}
          <div className="flex flex-col items-center gap-3">
              {/* WhatsApp Button - Always visible */}
              <button 
                  onClick={() => setIsCommModalOpen(true)}
                  disabled={!selectedClass}
                  className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:bg-[#128C7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.sendViaWhatsApp}
              >
                  <WhatsAppIcon />
              </button>

              {/* Toggle FAB */}
              <button 
                  onClick={() => setIsFabOpen(!isFabOpen)}
                  className={`w-12 h-12 rounded-full bg-[var(--accent-primary)] text-[var(--accent-text)] flex items-center justify-center shadow-lg hover:bg-[var(--accent-primary-hover)] transition-transform duration-300 ${isFabOpen ? 'rotate-90' : ''}`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
          </div>

          {/* Collapsible Buttons */}
          <div className={`flex flex-col gap-3 transition-all duration-300 origin-top ${isFabOpen ? 'scale-100 opacity-100 mt-2' : 'scale-0 opacity-0 h-0 pointer-events-none'}`}>
              <button onClick={() => { setIsPrintPreviewOpen(true); setIsFabOpen(false); }} disabled={!selectedClass} className="w-10 h-10 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shadow-md border border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.printViewAction}>
                  <PrintIcon />
              </button>
              {onSave && (
                  <button onClick={() => { onSave(); setIsFabOpen(false); }} className="w-10 h-10 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shadow-md border border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Save (Ctrl+S)">
                      <SaveIcon />
                  </button>
              )}
              {onRedo && (
                  <button onClick={() => { onRedo(); setIsFabOpen(false); }} disabled={!canRedo} className="w-10 h-10 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shadow-md border border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                      <RedoIcon />
                  </button>
              )}
              {onUndo && (
                  <button onClick={() => { onUndo(); setIsFabOpen(false); }} disabled={!canUndo} className="w-10 h-10 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shadow-md border border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                      <UndoIcon />
                  </button>
              )}
          </div>
      </div>
    </div>
  );
};

export default ClassTimetablePage;
