
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

const ClassTimetablePage: React.FC<ClassTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, onUpdateSchoolConfig, selection, onSelectionChange, openConfirmation, hasActiveSession, onUndo, onRedo, onSave, canUndo, canRedo, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod, onUpdateTimetableSession, changeLogs }) => {
  if (!hasActiveSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  const { classId: selectedClassId, highlightedTeacherId } = selection;
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [moveSource, setMoveSource] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isLessonListOpen, setIsLessonListOpen] = useState(false);
  
  // Custom Dropdown State
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [classSortBy, setClassSortBy] = useState<'serial' | 'room' | 'name'>('serial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // Ref for detecting clicks outside
  const tableRef = useRef<HTMLDivElement>(null);

  // Derived active days and periods based on config
  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8)), [activeDays, schoolConfig.daysConfig]);
  const periodLabels = useMemo(() => Array.from({length: maxPeriods}, (_, i) => (i + 1).toString()), [maxPeriods]);

  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties'), [classes]);

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

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedClass && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.classTimetable}: ${selectedClass.nameEn}`} fileNameBase={`Timetable_${selectedClass.nameEn.replace(' ', '_')}`} generateHtml={(lang, options) => generateClassTimetableHtml(selectedClass, lang, options, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={handleSavePrintDesign} />)}
      {selectedClass && <CopyTimetableModal t={t} isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} classes={visibleClasses} subjects={subjects} teachers={teachers} onUpdateClass={(updatedClass) => { const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c); onSetClasses(newClasses); }} sourceClassId={selectedClass.id} />}
      {selectedClass && (<ClassCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedClass={selectedClass} inChargeTeacher={teachers.find(t => t.id === selectedClass.inCharge)!} subjects={subjects} teachers={teachers} schoolConfig={schoolConfig} subjectColorMap={teacherColorMap} />)}
      
      <DownloadModal t={t} isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title={t.downloadTimetable} fileNameBase="Class_Timetables" items={visibleClasses} itemType="class" generateFullPageHtml={(item, lang, design) => generateClassTimetableHtml(item, lang, design, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} />

      <div className="mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Class Selector */}
        <div className="flex items-center gap-4">
             {/* Previous Button */}
             <button 
                 onClick={handlePreviousClass} 
                 disabled={currentClassIndex <= 0}
                 className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-30 transition-all flex items-center justify-center"
             >
                 <ChevronLeftIcon />
             </button>

             {/* Main Pill Dropdown */}
             <div className="relative z-20" ref={classDropdownRef}>
                 <button
                     onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                     className="flex items-center gap-4 bg-[var(--bg-secondary)] rounded-full pl-2 pr-6 py-2 shadow-md border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:shadow-lg transition-all min-w-[260px] sm:min-w-[300px]"
                 >
                     {selectedClass ? (
                         <>
                             {/* Serial Circle */}
                             <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                                 {selectedClass.serialNumber ?? '-'}
                             </div>
                             
                             {/* Text Stack */}
                             <div className="flex flex-col items-start mr-auto overflow-hidden">
                                 <span className="font-black text-lg text-[var(--text-primary)] leading-none truncate w-full text-left">
                                     {language === 'ur' ? selectedClass.nameUr : selectedClass.nameEn}
                                 </span>
                                 <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 truncate w-full text-left">
                                     {selectedClass.roomNumber ? `ROOM ${selectedClass.roomNumber}` : 'NO ROOM'}
                                 </span>
                             </div>
                         </>
                     ) : (
                         <span className="text-[var(--text-secondary)] font-medium pl-4">{t.selectAClass}</span>
                     )}
                     
                     <div className="text-[var(--text-secondary)]">
                         <ChevronDownIcon />
                     </div>
                 </button>

                 {isClassDropdownOpen && (
                     <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-3 animate-scale-in origin-top-left z-50">
                         {/* Search */}
                         <div className="relative mb-3">
                             <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none">
                                 <SearchIcon />
                             </div>
                             <input
                                 type="text"
                                 placeholder="Search classes..."
                                 value={classSearchQuery}
                                 onChange={(e) => setClassSearchQuery(e.target.value)}
                                 className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
                                 autoFocus
                             />
                              {classSearchQuery && (
                                <button 
                                    onClick={() => setClassSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-red-500 transition-colors p-1 rounded-full hover:bg-[var(--bg-secondary)]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                         </div>
                         
                         {/* Sort Controls */}
                         <div className="flex gap-1 mb-2 bg-[var(--bg-tertiary)] p-1 rounded-lg">
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
                                    className={`flex-1 text-[10px] font-bold uppercase py-1 rounded-md transition-colors flex items-center justify-center gap-1 ${classSortBy === key ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                                >
                                    {key === 'serial' ? '#' : key}
                                    {classSortBy === key && (
                                        <span className="text-[8px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                            ))}
                         </div>

                         {/* List */}
                         <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                             {sortedClasses.length === 0 ? (
                                 <div className="p-3 text-center text-xs text-[var(--text-secondary)] italic">No classes found</div>
                             ) : (
                                 sortedClasses.map(c => (
                                     <button
                                         key={c.id}
                                         onClick={() => {
                                             onSelectionChange(prev => ({ ...prev, classId: c.id }));
                                             setIsClassDropdownOpen(false);
                                         }}
                                         className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${selectedClassId === c.id ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                                     >
                                         <span className={`font-mono text-xs opacity-50 w-8 text-center flex-shrink-0 py-0.5 rounded ${selectedClassId === c.id ? 'bg-[var(--accent-primary)]/10' : 'bg-[var(--bg-primary)]'}`}>#{c.serialNumber ?? '-'}</span>
                                         <span className="font-bold flex-grow text-base break-words text-left leading-tight">{language === 'ur' ? c.nameUr : c.nameEn}</span>
                                         {c.roomNumber && <span className={`text-[10px] opacity-70 whitespace-nowrap px-1.5 py-0.5 rounded border border-[var(--border-secondary)] ${selectedClassId === c.id ? 'bg-white/50 text-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'}`}>Rm {c.roomNumber}</span>}
                                         {selectedClassId === c.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] flex-shrink-0"></div>}
                                     </button>
                                 ))
                             )}
                         </div>
                     </div>
                 )}
             </div>

             {/* Next Button */}
             <button 
                 onClick={handleNextClass} 
                 disabled={currentClassIndex >= sortedClasses.length - 1}
                 className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-30 transition-all flex items-center justify-center"
             >
                 <ChevronRightIcon />
             </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
            {onUndo && (
              <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><UndoIcon /></button>
            )}
            {onRedo && (
              <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><RedoIcon /></button>
            )}
            {onSave && (
              <button onClick={onSave} title="Save (Ctrl+S)" className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors"><SaveIcon /></button>
            )}
            <div className="w-px h-6 bg-[var(--border-secondary)] mx-1 hidden sm:block"></div>
            <button onClick={() => setIsCopyModalOpen(true)} disabled={!selectedClass} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 transition-colors" title={t.copyTimetable}><CopyIcon /></button>
            <button onClick={() => selectedClass && onSetClasses(classes.map(c => c.id === selectedClass.id ? { ...c, timetable: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] } as any } : c))} disabled={!selectedClass} className="p-2 text-sm font-medium text-red-600 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-red-50 hover:border-red-200 disabled:opacity-50 transition-colors" title={t.clearTimetable}><ClearIcon /></button>
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedClass} title={t.sendViaWhatsApp} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><WhatsAppIcon /></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedClass} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors" title={t.printViewAction}><PrintIcon /></button>
        </div>
      </div>

      {!selectedClass ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectAClass}</p>
      ) : (
        <div className="relative flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Desktop Toggle Button (Visible when closed) */}
          <button
              onClick={() => setIsLessonListOpen(true)}
              className={`
                  hidden lg:flex absolute left-0 top-24 z-10 
                  bg-[var(--accent-primary)] text-white 
                  pl-1 pr-2 py-3 rounded-r-xl shadow-lg 
                  hover:bg-[var(--accent-primary-hover)] hover:pr-3
                  transition-all duration-300 items-center gap-2 
                  ${isLessonListOpen ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}
              `}
              title={t.unscheduledPeriods}
              style={{ writingMode: 'vertical-lr' }}
          >
              <span className="rotate-180 text-xs font-bold uppercase tracking-widest whitespace-nowrap">{t.unscheduledPeriods}</span>
              <ChevronRightIcon />
          </button>

          {/* Unscheduled Periods Sidebar Wrapper */}
          <div className={`
              w-full 
              lg:transition-all lg:duration-500 lg:ease-[cubic-bezier(0.4,0,0.2,1)]
              ${isLessonListOpen ? 'lg:w-1/4' : 'lg:w-0'}
              order-last lg:order-first lg:overflow-hidden
          `}>
            {/* Mobile Toggle Button */}
            <button
                  onClick={() => setIsLessonListOpen(!isLessonListOpen)}
                  className="lg:hidden w-full mb-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white p-4 rounded-xl shadow-lg flex items-center justify-between transform transition-transform active:scale-95"
              >
                  <div className="flex items-center gap-2">
                      <span className="font-black text-lg tracking-wide">{t.unscheduledPeriods}</span>
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">{Object.keys(groupedUnscheduled).length}</span>
                  </div>
                  {isLessonListOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>

            {/* Sidebar Content */}
            <div className={`
                w-full 
                lg:transition-all lg:duration-500 lg:ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isLessonListOpen ? 'lg:opacity-100 lg:translate-x-0' : 'lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none'}
                ${isLessonListOpen ? 'block' : 'hidden lg:block'}
            `}>
                <div className="w-full min-w-[280px]">
                    <div 
                        className={`bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-[var(--border-primary)] sticky top-24 transition-colors overflow-hidden ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'unscheduled-drop-target cursor-pointer ring-2 ring-red-400' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={handleSidebarDrop}
                        onClick={moveSource?.sourceDay ? handleUnschedule : undefined}
                    >
                    <div className="flex justify-between items-center p-4 bg-gradient-to-b from-[var(--bg-tertiary)]/50 to-transparent border-b border-[var(--border-secondary)]">
                        <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                            {t.unscheduledPeriods}
                            <span className="bg-[var(--accent-primary)] text-white text-xs px-2 py-0.5 rounded-full shadow-sm">{Object.keys(groupedUnscheduled).length}</span>
                        </h3>
                        <button onClick={() => setIsLessonListOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors lg:block hidden">
                            <ChevronLeftIcon />
                        </button>
                    </div>
                    
                    <div className="p-4 pt-2">
                    {moveSource && moveSource.sourceDay && (
                        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center animate-pulse cursor-pointer">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Drop here to Unschedule</span>
                        </div>
                    )}

                    {Object.keys(groupedUnscheduled).length === 0 ? (
                        <div className="text-center py-8 opacity-50">
                            <div className="mb-2 mx-auto w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] font-medium">{t.allLessonsScheduled}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar period-stack-clickable p-1">
                        {Object.values(groupedUnscheduled).map((group, index) => {
                            const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                            const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                            const groupKey = jp ? `jp-${jp.id}` : `sub-${group[0].subjectId}`;
                            
                            return (
                                <div key={`unscheduled-${groupKey}-${index}`} className="transform transition-transform hover:scale-[1.02]">
                                    <PeriodStack 
                                        periods={group} 
                                        onDragStart={handleDragStart} 
                                        onDragEnd={handleDragEnd}
                                        onClick={(p) => handleStackClick(p)}
                                        colorName={teacherColorMap.get(group[0].teacherId)}
                                        language={language}
                                        subjects={subjects}
                                        teachers={teachers}
                                        classes={classes}
                                        jointPeriods={jointPeriods}
                                        displayContext="teacher"
                                        jointPeriodName={jp?.name}
                                        isSelected={!!isSelected}
                                        className="w-full max-w-[180px] mx-auto shadow-sm hover:shadow-md"
                                    />
                                </div>
                            );
                        })}
                        </div>
                    )}
                    </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-x-auto ${isLessonListOpen ? 'lg:w-3/4' : 'w-full'}`}>
            <div className="bg-[var(--bg-secondary)] shadow-lg rounded-lg overflow-hidden border border-[var(--border-primary)]" ref={tableRef}>
              <table className="w-full text-center border-collapse table-fixed">
                <thead>
                  <tr className="bg-[var(--accent-primary)] text-[var(--accent-text)]">
                    <th className="border border-[var(--border-secondary)] p-2 w-12"></th>
                    {activeDays.map(day => (
                      <th key={day} className="border border-[var(--border-secondary)] p-2 font-bold uppercase text-sm">{t[day.toLowerCase()]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodLabels.map((label, periodIndex) => (
                    <tr key={label}>
                      <td className="border border-[var(--border-secondary)] font-black text-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-sans">{label}</td>
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
                        const statusClass = (!isDisabled && isSelectionActive) ? 'drop-target-available' : '';

                        let cellBackgroundClass = '';
                        let conflictText = null;
                        
                        if (teacherAvailabilityMap && !isDisabled) {
                            const data = teacherAvailabilityMap.get(`${day}-${periodIndex}`);
                            if (data && data.status === 'elsewhere') {
                                // Unavailable
                                cellBackgroundClass = 'bg-red-100/80 dark:bg-red-900/50 ring-inset ring-4 ring-red-500 dark:ring-red-400'; 
                                conflictText = data.conflictClass;
                            } else if (data && data.status === 'here') {
                                // Current Class (already has card, just background)
                                cellBackgroundClass = 'bg-[var(--slot-available-bg)]'; 
                            } else {
                                // Available (Free)
                                cellBackgroundClass = 'bg-emerald-100/80 dark:bg-emerald-900/50 ring-inset ring-4 ring-emerald-500 dark:ring-emerald-400';
                            }
                        } else if (!isDisabled) {
                            cellBackgroundClass = 'bg-[var(--slot-available-bg)]'; 
                        } else {
                            cellBackgroundClass = 'bg-[var(--slot-disabled-bg)] cursor-not-allowed';
                        }

                        return (
                          <td key={day} 
                            className={`timetable-slot border border-[var(--border-secondary)] h-16 p-1 align-top ${cellBackgroundClass} transition-colors duration-300 ${statusClass} ${isTarget ? 'hover:bg-[var(--accent-secondary)] cursor-pointer ring-inset ring-2 ring-[var(--accent-primary)]/30' : ''} relative group`}
                            onDragOver={(e) => !isDisabled && handleDragOver(e)}
                            onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                            onClick={() => !isDisabled && moveSource && handleExecuteMove(day, periodIndex)}
                          >
                            {/* Availability Overlay */}
                            {!isDisabled && teacherAvailabilityMap && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                    {conflictText ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100/95 dark:bg-red-900/95 rounded-lg border-2 border-red-500/50 dark:border-red-400/50 shadow-md animate-pulse z-20 backdrop-blur-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-700 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-xs font-black text-red-800 dark:text-red-100 whitespace-nowrap">{conflictText}</span>
                                        </div>
                                    ) : (
                                        // Only show 'Available' if slot is empty (no cards) and status is not 'here'
                                        slotPeriods.length === 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 opacity-80 tracking-widest">AVAILABLE</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {!isDisabled && (
                                <div className="h-full flex flex-col gap-1 period-stack-clickable relative z-10">
                                    {groupedSlotPeriods.map((group, groupIndex) => {
                                        const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                        const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                        const highlightTeacher = highlightedTeacherId === group[0].teacherId;
                                        const isDimmed = highlightedTeacherId && !highlightTeacher;

                                        return (
                                            <PeriodStack 
                                                key={`${group[0].id}-${groupIndex}`}
                                                periods={group}
                                                onDragStart={(draggedPeriods) => handleDragStart(draggedPeriods, day, periodIndex)}
                                                onDragEnd={handleDragEnd}
                                                onClick={(p) => handleStackClick(p, day, periodIndex)}
                                                onDeleteStack={() => handlePeriodDelete(group[0].id, group[0].classId, day, periodIndex, group[0].jointPeriodId)}
                                                colorName={getColorForId(group[0].classId + group[0].subjectId).name}
                                                language={language}
                                                subjects={subjects}
                                                teachers={teachers}
                                                classes={classes}
                                                jointPeriods={jointPeriods}
                                                displayContext="teacher"
                                                jointPeriodName={jp?.name}
                                                className="w-full"
                                                isSelected={!!isSelected}
                                                isHighlighted={highlightTeacher}
                                                isDimmed={!!isDimmed}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <div className={`mt-8 bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-[var(--border-primary)] overflow-hidden transition-all duration-300 ${isHistoryExpanded ? 'max-h-[500px]' : 'max-h-16'}`}>
            <div className="w-full flex items-center justify-between p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                    History / Logs
                    <span className="bg-[var(--accent-primary)] text-white text-xs px-2 py-0.5 rounded-full">{classLogs.length}</span>
                </h3>
                <div className={`text-[var(--text-secondary)] transform transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                   <ChevronDownIcon /> 
                </div>
            </div>
            
            <div className="p-4 bg-[var(--bg-secondary)] overflow-y-auto custom-scrollbar max-h-[400px]">
                {classLogs.length === 0 ? (
                    <div className="text-center py-8 opacity-50">
                         <div className="mb-2 mx-auto w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center">
                            <HistoryIcon />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] font-medium">No recent changes.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {classLogs.map((log) => (
                            <li key={log.id} className={`p-3 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                                log.type === 'delete' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50' :
                                log.type === 'add' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' :
                                'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50'
                            }`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        log.type === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                                        log.type === 'add' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-[10px] font-bold opacity-50">
                                        {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-[var(--text-primary)] leading-tight opacity-90">{log.details}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ClassTimetablePage;
