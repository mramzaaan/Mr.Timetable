
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
import { MessageCircle, MoreVertical, Printer, Undo2, Redo2, Trash2 } from 'lucide-react';

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

const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const ChevronDownIcon = ({ className = "h-4 w-4" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const ChevronLeftIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const ClassTimetablePage: React.FC<ClassTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, onUpdateSchoolConfig, selection, onSelectionChange, openConfirmation, hasActiveSession, onUndo, onRedo, onSave, canUndo, canRedo, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod, onUpdateTimetableSession, changeLogs, appFont, theme }) => {
  const { classId: selectedClassId, highlightedTeacherId } = selection;
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [moveSource, setMoveSource] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<{
      targetDay: keyof TimetableGridData,
      targetIndex: number,
      source: { periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number },
      conflicts: { type: 'occupancy' | 'teacher', classId: string, periodsToUnschedule: Period[], message: string }[]
  } | null>(null);
  
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isLessonListOpen, setIsLessonListOpen] = useState(true);
  
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
    const map = new Map<string, { status: 'here' | 'elsewhere', conflictClass?: string, conflictSubject?: string, conflictTeacher?: string }>();
    
    activeDays.forEach(day => {
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            let status: 'here' | 'elsewhere' | null = null;
            let conflictClass = '';
            let conflictSubject = '';
            let conflictTeacher = '';
            
            for (const cls of classes) {
                const periods = cls.timetable[day]?.[pIdx];
                if (periods) {
                    const matchingPeriod = periods.find(p => p.teacherId === highlightedTeacherId);
                    if (matchingPeriod) {
                        if (cls.id === selectedClassId) {
                            status = 'here';
                        } else {
                            status = 'elsewhere'; 
                            conflictClass = language === 'ur' ? cls.nameUr : cls.nameEn;
                            const sub = subjects.find(s => s.id === matchingPeriod.subjectId);
                            const jp = matchingPeriod.jointPeriodId ? jointPeriods.find(j => j.id === matchingPeriod.jointPeriodId) : undefined;
                            conflictSubject = sub ? (language === 'ur' ? sub.nameUr : sub.nameEn) : (jp?.name || 'Unknown');
                            const tea = teachers.find(t => t.id === matchingPeriod.teacherId);
                            conflictTeacher = tea ? (language === 'ur' ? tea.nameUr : tea.nameEn) : 'No Teacher';
                        }
                        if (status === 'here') break; 
                    }
                }
            }
            if (status) map.set(`${day}-${pIdx}`, { status, conflictClass, conflictSubject, conflictTeacher });
        }
    });
    return map;
  }, [highlightedTeacherId, classes, activeDays, maxPeriods, selectedClassId, language, subjects, jointPeriods, teachers]);

  const subjectColorMap = useMemo(() => {
      const map = new Map<string, string>();
      if (!selectedClass) return map;

      Object.values(selectedClass.timetable).forEach(daySlots => {
          (daySlots as any[]).forEach(slot => {
              slot.forEach(p => {
                  const key = p.jointPeriodId ? String(p.jointPeriodId) : `${p.classId}-${p.subjectId}`;
                  if (!map.has(key)) {
                      map.set(key, getColorForId(key).name);
                  }
              });
          });
      });
      return map;
  }, [selectedClass]);

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

      const conflicts: { type: 'occupancy' | 'teacher', classId: string, periodsToUnschedule: Period[], message: string }[] = [];

      // 1. Occupancy check
      if (isTargetOccupied && !isCompatibleGroup) {
          const occSubId = targetPeriods[0].subjectId;
          const occSub = subjects.find(s => s.id === occSubId);
          conflicts.push({
              type: 'occupancy',
              classId: selectedClass.id,
              periodsToUnschedule: targetPeriods,
              message: `This slot is already occupied by ${occSub ? (language === 'ur' ? occSub.nameUr : occSub.nameEn) : 'another class'}.`
          });
      }

      // 2. Teacher Availability check
      const teacherId = periods[0].teacherId;
      if (teacherId) {
          for (const cls of classes) {
              const slot = cls.timetable[targetDay]?.[targetPeriodIndex];
              if (slot && slot.some(p => p.teacherId === teacherId)) {
                  // Only consider it a conflict if it's NOT the class we are dropping into, OR if it's the class we are dropping into but we didn't already flag it as occupancy.
                  // Actually, if it's the class we're dropping into, we already handled it via occupancy/compatibility.
                  if (cls.id !== selectedClass.id) {
                      const teacher = teachers.find(t => t.id === teacherId);
                      const teacherName = teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'This teacher';
                      const clsName = language === 'ur' ? cls.nameUr : cls.nameEn;
                      conflicts.push({
                          type: 'teacher',
                          classId: cls.id,
                          periodsToUnschedule: slot.filter(p => p.teacherId === teacherId),
                          message: `${teacherName} is busy in class ${clsName} during this period.`
                      });
                  }
              }
          }
      }

      if (conflicts.length > 0) {
          setPendingMove({
              targetDay,
              targetIndex: targetPeriodIndex,
              source: { periods, sourceDay, sourcePeriodIndex },
              conflicts
          });
          return; // Wait for modal
      }

      // If no conflict, perform update directly.
      executePendingMove(false, [], { targetDay, targetIndex: targetPeriodIndex, source: { periods, sourceDay, sourcePeriodIndex } });
  };

  const executePendingMove = (doOverwrite: boolean, explicitConflicts: {classId: string, periodsToUnschedule: Period[]}[] = [], overrideMoveData?: any) => {
      const moveData = overrideMoveData || pendingMove;
      if (!moveData || !selectedClass) return;

      const { targetDay, targetIndex: targetPeriodIndex, source } = moveData;
      const { periods, sourceDay, sourcePeriodIndex } = source;

      onUpdateTimetableSession((session) => {
          let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
          let currentLogs = session.changeLogs || [];
          
          const jointPeriodId = periods[0].jointPeriodId;
          const jointPeriodDef = jointPeriodId ? jointPeriods.find(jp => jp.id === jointPeriodId) : null;
          const logDetails: string[] = [];

          // Remove conflicts first
          if (doOverwrite && explicitConflicts.length > 0) {
              explicitConflicts.forEach(conflict => {
                  const classIdx = newClasses.findIndex(c => c.id === conflict.classId);
                  if (classIdx !== -1) {
                      const c = newClasses[classIdx];
                      const updatedC = { ...c, timetable: { ...c.timetable } };
                      if (updatedC.timetable[targetDay]) {
                          const dayPeriods = [...updatedC.timetable[targetDay]];
                          if (dayPeriods[targetPeriodIndex]) {
                              const idsToRemove = new Set(conflict.periodsToUnschedule.map(p => p.id));
                              dayPeriods[targetPeriodIndex] = dayPeriods[targetPeriodIndex].filter(p => !idsToRemove.has(p.id));
                              updatedC.timetable[targetDay] = dayPeriods;
                              newClasses[classIdx] = updatedC;
                          }
                      }
                  }
              });
          }

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
                          // If overwrite we append anyway since we manually removed explicit conflicts just above
                          dayPeriods[targetPeriodIndex] = [...targetSlot, newPeriod];
                          updatedC.timetable[targetDay] = dayPeriods;
                          return updatedC;
                      }
                  }
                  return c;
              });
              
              logDetails.push(`Moved Joint Period ${jointPeriodDef.name} to ${targetDay} P${targetPeriodIndex + 1}`);
          } else {
              const classIdx = newClasses.findIndex(c => c.id === selectedClass.id);
              if (classIdx !== -1) {
                  const updatedClass = { ...newClasses[classIdx] };
                  const newTimetable = { ...updatedClass.timetable };
                  
                  if (sourceDay && sourcePeriodIndex !== undefined) {
                      if (newTimetable[sourceDay]) {
                          const sourceDayPeriods = [...newTimetable[sourceDay]];
                          const sourceSlot = sourceDayPeriods[sourcePeriodIndex] || [];
                          const idsToRemove = new Set(periods.map(p => p.id));
                          sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(p => !idsToRemove.has(p.id));
                          newTimetable[sourceDay] = sourceDayPeriods;
                      }
                  }
                  if(!newTimetable[targetDay]) newTimetable[targetDay] = [];
                  const targetDayPeriods = (sourceDay === targetDay) ? newTimetable[sourceDay] : [...newTimetable[targetDay]];
                  const targetSlot = targetDayPeriods[targetPeriodIndex] || [];
                  
                  const periodsToMove = (sourceDay && sourcePeriodIndex !== undefined) ? periods : [periods[0]];
                  targetDayPeriods[targetPeriodIndex] = [...targetSlot, ...periodsToMove];
                  newTimetable[targetDay] = targetDayPeriods;
                  updatedClass.timetable = newTimetable;
                  newClasses[classIdx] = updatedClass;
                  
                  const sub = subjects.find(s => s.id === periods[0].subjectId);
                  const tea = teachers.find(t => t.id === periods[0].teacherId);
                  logDetails.push(`Moved ${sub?.nameEn || '?'} (${tea?.nameEn || '?'}) to ${targetDay} P${targetPeriodIndex + 1}`);
              }
          }
          
          // Add logs
          logDetails.forEach(d => currentLogs.push(createLog('move', d, 'class', selectedClassId!)));
          
          return { ...session, classes: newClasses, changeLogs: currentLogs };
      });

      setPendingMove(null);
      setDraggedData(null);
      setMoveSource(null);
      onSelectionChange(prev => ({ ...prev, highlightedTeacherId: '' }));
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
          const daySlots = selectedClass.timetable[day];
          if (Array.isArray(daySlots)) {
              daySlots.forEach(slot => {
                  if (Array.isArray(slot)) {
                      slot.forEach(p => {
                          const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : p.subjectId;
                          scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1);
                      });
                  }
              });
          }
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

  const contentScale = schoolConfig.contentScale || 1;

  return (
    <div className="w-full px-1 sm:px-2 lg:px-4 mx-auto max-w-none 2xl:max-w-[1800px]" style={{ '--content-scale': contentScale } as React.CSSProperties}>
      {selectedClass && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.classTimetable}: ${selectedClass.nameEn}`} fileNameBase={`Timetable_${selectedClass.nameEn.replace(' ', '_')}`} generateHtml={(lang, options) => generateClassTimetableHtml(selectedClass, lang, options, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={handleSavePrintDesign} />)}
      {selectedClass && <CopyTimetableModal t={t} isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} classes={visibleClasses} subjects={subjects} teachers={teachers} onUpdateClasses={(updatedClasses) => { 
        const newClasses = classes.map(c => {
          const updated = updatedClasses.find(uc => uc.id === c.id);
          return updated ? updated : c;
        });
        onSetClasses(newClasses); 
      }} sourceClassId={selectedClass.id} />}
      {selectedClass && (<ClassCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedClass={selectedClass} inChargeTeacher={teachers.find(t => t.id === selectedClass.inCharge)!} subjects={subjects} teachers={teachers} schoolConfig={schoolConfig} subjectColorMap={subjectColorMap} appFont={appFont} />)}
      
      <DownloadModal t={t} isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title={t.downloadTimetable} fileNameBase="Class_Timetables" items={visibleClasses} itemType="class" generateFullPageHtml={(item, lang, design) => generateClassTimetableHtml(item, lang, design, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} />

      {pendingMove && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setPendingMove(null); setDraggedData(null); setMoveSource(null); }}>
              <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <h3 className="text-xl font-black text-center text-gray-900 dark:text-white uppercase tracking-tight">Schedule Conflict</h3>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-[var(--bg-tertiary)]">
                      <div className="flex flex-col gap-3 mb-6">
                          {pendingMove.conflicts.map((conflict, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-red-200 dark:border-red-800/30 shadow-sm">
                                  <div className="mt-0.5 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{conflict.message}</p>
                              </div>
                          ))}
                      </div>
                      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                          Would you like to replace the existing card(s)? The currently scheduled card(s) will be unscheduled dynamically and placed back into the queue.
                      </p>
                      <div className="flex items-center gap-3">
                          <button onClick={() => { setPendingMove(null); setDraggedData(null); setMoveSource(null); }} className="flex-1 py-3 px-4 bg-white dark:bg-[var(--bg-primary)] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">Cancel</button>
                          <button onClick={() => executePendingMove(true, pendingMove.conflicts)} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-red-600/20">Yes, Replace</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full max-w-7xl mx-auto px-1 lg:px-0 mt-2 relative z-[60]">
        
        {/* Class Selector Header - Modern Design */}
        <div className="flex items-center justify-start flex-1 min-w-0 relative" ref={classDropdownRef}>
             <div className="flex items-center gap-1 xl:gap-2 mr-1 sm:mr-2 flex-shrink-0">
                 <button 
                     onClick={handlePreviousClass} 
                     disabled={currentClassIndex <= 0}
                     className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                 </button>
                 <button 
                     onClick={handleNextClass} 
                     disabled={currentClassIndex >= sortedClasses.length - 1}
                     className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                 </button>
             </div>

              {selectedClass ? (
                 <div className="flex items-center gap-1.5 sm:gap-3 cursor-pointer min-w-0 flex-1" onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}>
                     <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-[0.1875rem] border-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                         <span className="text-[var(--accent-primary)] font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-none flex items-center justify-center">{selectedClass.serialNumber?.toString().padStart(2, '0') ?? '-'}</span>
                     </div>
                     <div className="flex flex-col items-start leading-none -space-y-0.5 md:-space-y-1 min-w-0 flex-1">
                         <span className="font-black text-xl sm:text-2xl md:text-4xl lg:text-5xl text-[var(--accent-primary)] uppercase tracking-tighter truncate w-full">
                             {language === 'ur' ? selectedClass.nameUr : selectedClass.nameEn}
                         </span>
                         {selectedClass.inCharge && (() => {
                             const inChargeTeacher = teachers.find(t => t.id === selectedClass.inCharge);
                             return inChargeTeacher ? (
                                 <span className="text-[var(--accent-primary)] text-[0.65rem] sm:text-xs md:text-base lg:text-xl font-bold uppercase tracking-widest pl-1 mt-1 md:mt-2 opacity-80 truncate w-full">
                                     {language === 'ur' ? inChargeTeacher.nameUr : inChargeTeacher.nameEn}
                                 </span>
                             ) : null;
                         })()}
                     </div>
                     
                     <div className="flex items-center gap-1 ml-1 sm:ml-3 flex-shrink-0">
                         <div className="flex flex-col items-center justify-center relative w-9 h-9 sm:w-10 sm:h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-[0.1875rem] border-dashed border-[var(--accent-primary)] text-[var(--accent-primary)] flex-shrink-0">
                             <span className="text-[0.4rem] sm:text-[0.4375rem] md:text-[0.6rem] lg:text-[0.75rem] font-bold uppercase absolute top-1 sm:top-1.5 md:top-2 opacity-80">RM</span>
                             <span className="text-[0.55rem] sm:text-[0.625rem] md:text-[1rem] lg:text-[1.25rem] font-black mt-1 sm:mt-1.5 md:mt-3 lg:mt-4">{selectedClass.roomNumber || '-'}</span>
                         </div>
                         <div className="text-gray-300 flex flex-col -gap-2 hidden lg:flex">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                         </div>
                     </div>
                 </div>
              ) : (
                 <span className="text-gray-400 font-medium text-sm md:text-base whitespace-nowrap">{t.selectAClass}</span>
             )}

             {isClassDropdownOpen && (
                 <div className="absolute top-[100%] mt-4 w-full min-w-[17.5rem] md:min-w-[20rem] max-w-md bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl shadow-2xl p-4 animate-scale-in z-50">
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
                             className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-secondary)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
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
                                className={`flex-1 text-xs font-bold uppercase py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${classSortBy === key ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-gray-500 hover:text-black dark:text-gray-400 hover:bg-white dark:hover:bg-[var(--bg-secondary)]'}`}
                            >
                                {key === 'serial' ? '#' : key}
                                {classSortBy === key && (
                                    <span className="text-[0.625rem]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
                                     className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-colors ${selectedClassId === c.id ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                                 >
                                     <span className={`font-mono text-xs opacity-50 w-8 text-center flex-shrink-0 py-1 rounded-md ${selectedClassId === c.id ? 'bg-[var(--accent-primary)]/20' : 'bg-gray-100 dark:bg-[var(--bg-secondary)]'}`}>#{c.serialNumber ?? '-'}</span>
                                     <span className="font-bold flex-grow text-base break-words text-left">{language === 'ur' ? c.nameUr : c.nameEn}</span>
                                     {c.roomNumber && <span className="text-[0.625rem] opacity-70 whitespace-nowrap px-2 py-1 rounded-md bg-white border border-gray-200 dark:bg-[var(--bg-secondary)] dark:border-[var(--border-secondary)]">Rm {c.roomNumber}</span>}
                                 </button>
                             ))
                         )}
                     </div>
                 </div>
             )}
        </div>
        
        {/* Actions - Right */}
        <div className="flex items-center justify-start gap-2 flex-shrink-0">
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedClass} title={t.sendViaWhatsApp} className="text-[#25D366] hover:scale-110 transition-transform disabled:opacity-50 w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12" strokeWidth={2} />
            </button>
            <div className="relative" ref={headerMoreRef}>
                <button 
                  onClick={() => setIsHeaderMoreOpen(!isHeaderMoreOpen)} 
                  className="w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 flex text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:dark:text-white items-center justify-center transition-all flex-shrink-0"
                >
                    <MoreVertical className="h-6 w-6 md:h-10 md:w-10 lg:w-12 lg:h-12" strokeWidth={2} />
                </button>
                
                {isHeaderMoreOpen && (
                    <div className="absolute right-0 top-[100%] mt-2 flex justify-center items-center gap-1 bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-2 border border-gray-100 dark:border-[var(--border-primary)] z-50 animate-scale-in">
                        <button onClick={() => { setIsCopyModalOpen(true); setIsHeaderMoreOpen(false); }} disabled={!selectedClass} className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center justify-center rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.copyTimetable || 'Copy'}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={() => { setIsPrintPreviewOpen(true); setIsHeaderMoreOpen(false); }} disabled={!selectedClass} className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center justify-center rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.printViewAction || 'Print'}>
                            <Printer className="w-5 h-5" />
                        </button>
                        {onUndo && (
                            <button onClick={() => { onUndo(); setIsHeaderMoreOpen(false); }} disabled={!canUndo} className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center justify-center rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.undo || 'Undo'}>
                                <Undo2 className="w-5 h-5" />
                            </button>
                        )}
                        {onRedo && (
                            <button onClick={() => { onRedo(); setIsHeaderMoreOpen(false); }} disabled={!canRedo} className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center justify-center rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.redo || 'Redo'}>
                                <Redo2 className="w-5 h-5" />
                            </button>
                        )}
                        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button onClick={() => { 
                            openConfirmation('Clear Class Timetable', 'Are you sure you want to unschedule all periods for this class?', () => { 
                                if (!selectedClassId) return;
                                onUpdateTimetableSession((session) => {
                                    let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
                                    let currentLogs = session.changeLogs || [];
                                    const classIndex = newClasses.findIndex(c => c.id === selectedClassId);
                                    if (classIndex !== -1) {
                                        newClasses[classIndex].timetable = {};
                                        currentLogs.push(createLog('delete', `Cleared timetable for class`, 'class', selectedClassId));
                                    }
                                    return { ...session, classes: newClasses, changeLogs: currentLogs };
                                });
                            }); 
                            setIsHeaderMoreOpen(false); 
                        }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center justify-center rounded-xl text-red-600 transition-colors" title="Clear">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {!selectedClass ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectAClass}</p>
      ) : (
        <div className="relative flex flex-col lg:flex-row gap-6 items-start w-full mt-4">
          
          {/* Timetable Grid - Modern Styled */}
          <div className="flex-1 min-w-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <div className="bg-[#f9f9f9] dark:bg-[var(--bg-secondary)] rounded-[1.25rem] sm:rounded-[2rem] p-1 sm:p-2 md:p-4 shadow-inner overflow-hidden border border-[#c5d3df] dark:border-[var(--border-primary)] pb-3 md:pb-6 w-full" ref={tableRef}>
                <div className="w-full flex flex-col gap-1 sm:gap-2 md:gap-3 lg:gap-2 overflow-hidden">
                    {/* Header Row */}
                    <div className="flex gap-0.5 sm:gap-1 md:gap-2 w-full pr-1">
                        <div className="w-7 sm:w-9 md:w-12 lg:w-14 flex-shrink-0 text-center font-bold text-[#1f4061] dark:text-gray-300 text-[0.45rem] sm:text-[0.5625rem] md:text-xs tracking-tight uppercase py-1 flex items-center justify-center">
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
                                <div key={day} className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 overflow-hidden" style={{ transform: `scale(${contentScale})`, transformOrigin: 'bottom center' }}>
                                    <span className="text-[0.45rem] sm:text-[0.5rem] md:text-[0.625rem] font-bold text-[var(--accent-primary)] dark:text-blue-400 mb-0.5 truncate w-full text-center">{dateStr}</span>
                                    <span className="font-black text-[#0c2340] dark:text-white text-[0.5rem] sm:text-[0.625rem] md:text-sm tracking-widest uppercase truncate w-full text-center">{t[day.toLowerCase()].substring(0, 3)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Periods */}
                    {periodLabels.map((label, periodIndex) => {
                        
                        return (
                            <React.Fragment key={label}>
                            <div className="flex gap-0.5 sm:gap-1 md:gap-2 items-center w-full">
                                {/* Time Cell */}
                                <div className="w-7 sm:w-9 md:w-12 lg:w-14 flex-shrink-0 flex flex-col items-center justify-center -space-y-0.5">
                                    <span className="text-xs sm:text-sm md:text-lg lg:text-xl font-black text-[var(--accent-primary)] leading-none">P{label}</span>
                                    <span className="text-[0.35rem] sm:text-[0.4375rem] md:text-[0.5rem] font-bold text-gray-800 dark:text-gray-400 whitespace-nowrap mt-0.5">
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
                                        content = <div className="flex-1 min-w-0 h-[2.75rem] sm:h-[3.25rem] md:h-[4.75rem] lg:h-[4.5rem] rounded-[0.5rem] sm:rounded-xl bg-gray-300/30 dark:bg-gray-800/30 opacity-50 cursor-not-allowed" style={{ transform: `scale(${contentScale})` }}></div>;
                                    } else {
                                        let outerClasses = `flex-1 min-w-0 h-[2.75rem] sm:h-[3.25rem] md:h-[4.75rem] lg:h-[4.5rem] rounded-[0.5rem] sm:rounded-xl relative transition-all duration-300 group timetable-slot flex flex-col border-[0.09375rem] border-transparent cursor-pointer z-10`;
                                        if (isTarget) outerClasses += ' hover:scale-105 hover:shadow-xl ring-inset ring-2 ring-[var(--accent-primary)]/50 hover:bg-white/50 z-30';

                                        let availData;
                                        if (teacherAvailabilityMap) {
                                            availData = teacherAvailabilityMap.get(`${day}-${periodIndex}`);
                                            if (availData && availData.status === 'elsewhere') {
                                                outerClasses += ' bg-red-100/90 dark:bg-red-900/40 border-red-500 ring-2 ring-red-500/80 z-20'; 
                                            } else if (availData && availData.status === 'here') {
                                                 outerClasses += ' ring-2 ring-blue-500 border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 z-20';
                                            } else if (slotPeriods.length === 0) {
                                                outerClasses += ' bg-[#f9f5e8] dark:bg-yellow-900/20 border-[#22c55e] border-[0.125rem] border-dashed';
                                            } else {
                                                // Grey out the slots taking place that don't belong to the highlight teacher without breaking design explicitly
                                                outerClasses += ' opacity-50 grayscale border-gray-200/50';
                                            }
                                        } 

                                        if (slotPeriods.length === 0 && !teacherAvailabilityMap) {
                                             outerClasses += ' bg-white/40 dark:bg-[#1e293b]/40 border-dashed border-[#a6b8ca] dark:border-gray-600';
                                        } else if (slotPeriods.length > 0 && !teacherAvailabilityMap) {
                                             outerClasses += ' shadow-sm';
                                        }

                                        content = (
                                            <div 
                                                className={outerClasses}
                                                onDragOver={(e) => !isDisabled && handleDragOver(e)}
                                                onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                                                onClick={() => !isDisabled && moveSource && handleExecuteMove(day, periodIndex)}
                                                style={{ transform: `scale(${contentScale})`, transformOrigin: 'top left' }}
                                            >
                                                {/* Status overlay when teacher selected */}
                                                {teacherAvailabilityMap && (
                                                    <>
                                                        {availData?.status === 'elsewhere' && (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-[40] overflow-hidden bg-red-100/95 dark:bg-red-900/95 border-2 border-red-500 shadow-xl backdrop-blur-[0.0625rem] p-0.5 pointer-events-none">
                                                                <span className="text-[0.4375rem] sm:text-[0.5rem] md:text-[0.59375rem] font-bold text-red-900 dark:text-red-100 uppercase leading-none text-center truncate w-[95%]">{availData.conflictSubject}</span>
                                                                <span className="text-[0.375rem] sm:text-[0.40625rem] md:text-[0.46875rem] font-black text-white bg-red-600 rounded px-1 py-0.5 my-0.5 leading-none text-center break-words line-clamp-2 max-w-[95%] shadow-sm w-full">{availData.conflictClass}</span>
                                                                <span className="text-[0.3125rem] sm:text-[0.375rem] md:text-[0.4375rem] font-semibold text-red-800 dark:text-red-200 uppercase leading-none text-center truncate w-[95%] opacity-90">{availData.conflictTeacher}</span>
                                                            </div>
                                                        )}
                                                        {availData?.status !== 'elsewhere' && slotPeriods.length === 0 && (
                                                            <div className="absolute inset-0 flex items-center justify-center rounded-xl z-20 overflow-hidden bg-[#f9f5e8]/90 border border-dashed border-green-500 pointer-events-none">
                                                                <span className="text-[0.46875rem] font-bold text-green-700 uppercase tracking-widest bg-white/80 px-1 py-0.5 rounded shadow-sm border border-green-200 truncate max-w-[90%]">Avail</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                
                                                {/* Card Content or Stack */}
                                                <div className="h-full flex flex-col relative z-10 w-full rounded-xl overflow-visible">
                                                    {groupedSlotPeriods.map((group, groupIndex) => {
                                                        const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                                        const groupColorKey = group[0].jointPeriodId ? String(group[0].jointPeriodId) : `${group[0].classId}-${group[0].subjectId}`;
                                                        const colorData = getColorForId(groupColorKey, theme === 'dark' || theme === 'amoled');
                                                        const subject = subjects.find(s => s.id === group[0].subjectId);
                                                        const teacher = teachers.find(t => t.id === group[0].teacherId);
                                                        
                                                        const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                                        const highlightTeacher = highlightedTeacherId === group[0].teacherId;
                                                        
                                                        // Determine rendering mode (normal vs conflict view)
                                                        let isDimmed = false;
                                                                                                                
                                                        if (teacherAvailabilityMap) {
                                                            if (!highlightTeacher) {
                                                                isDimmed = true;
                                                            }
                                                        }

                                                        const subjectName = subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown');
                                                        const teacherName = teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'No Teacher';

                                                        return (
                                                            <div 
                                                                key={`${group[0].id}-${groupIndex}`}
                                                                draggable
                                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(group, day, periodIndex); }}
                                                                onDragEnd={handleDragEnd}
                                                                onClick={(e) => { e.stopPropagation(); handleStackClick(group, day, periodIndex); }}
                                                                className={`absolute flex flex-col justify-center px-1 sm:px-1.5 py-0 border-l-[0.1875rem] sm:border-l-[0.25rem] rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-grab active:cursor-grabbing overflow-hidden shadow-sm ${isSelected ? 'scale-95 shadow-inner' : ''} ${isDimmed ? 'opacity-20 grayscale' : ''}`}
                                                                style={{ 
                                                                    borderLeftColor: colorData.hex, 
                                                                    backgroundColor: isSelected ? `${colorData.hex}40` : `${colorData.hex}15`,
                                                                    boxShadow: isSelected ? `inset 0 0 0 2px ${colorData.hex}90` : 'none',
                                                                    top: groupedSlotPeriods.length > 1 ? `${(groupIndex / groupedSlotPeriods.length) * 100}%` : '0px',
                                                                    height: groupedSlotPeriods.length > 1 ? `${100 / groupedSlotPeriods.length}%` : '100%',
                                                                    left: '0px',
                                                                    right: '0px',
                                                                    zIndex: 10 + groupIndex
                                                                }}
                                                            >
                                                                    <div className="flex flex-col justify-center h-full w-full min-w-0">
                                                                        <div className="flex justify-between items-start w-full relative min-w-0">
                                                                            <span className="font-bold uppercase overflow-hidden whitespace-nowrap text-ellipsis tracking-tight leading-none pt-[0.0625rem] pr-1 sm:pr-3 block w-full text-left" style={{ color: colorData.hex, fontSize: `calc(0.8rem * var(--content-scale))` }}>
                                                                                {subjectName}
                                                                            </span>
                                                                            {/* Delete button */}
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handlePeriodDelete(group[0].id, group[0].classId, day, periodIndex, group[0].jointPeriodId); }}
                                                                                className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-100/80 hover:bg-red-200 text-red-600 rounded-full transition-opacity absolute top-[0.0625rem] right-0 z-20 hidden md:block"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-[0.5rem] w-[0.5rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                            </button>
                                                                        </div>
                                                                        <span className="font-medium uppercase overflow-hidden whitespace-nowrap text-ellipsis mt-[0.0625rem] leading-none block w-full text-left" style={{ color: colorData.hex, opacity: 0.85, fontSize: `calc(0.65rem * var(--content-scale))` }}>
                                                                            {teacherName}
                                                                        </span>
                                                                        {/* Combined/Multiple Indicator */}
                                                                        {group.length > 1 && (
                                                                            <div className="absolute right-0.5 bottom-0.5 w-[0.625rem] h-[0.625rem] sm:w-[0.75rem] sm:h-[0.75rem] bg-blue-500/20 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-[0.375rem] sm:text-[0.4375rem] font-bold shadow-sm">
                                                                                {group.length}
                                                                            </div>
                                                                        )}
                                                                    </div>
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

          {/* Right Section / Bottom Section -> Unscheduled */}
          <div className="w-full lg:w-[22%] xl:w-[20%] flex-shrink-0 flex-col mt-2 lg:mt-0 lg:sticky lg:top-4 lg:self-start z-10 hidden lg:flex">
              {/* PC View Unscheduled */}
              <div className="w-full flex flex-col" style={{ width: '100%', minWidth: '220px', height: '530px', borderStyle: 'dotted' }}>
                  <div className="flex items-center gap-3 mb-4 px-2 tracking-tight">
                      <h2 className="text-xl font-black text-[#1f4061] dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          UNSCHEDULED 
                          <span className="bg-[#8b0000] text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                              {Object.keys(groupedUnscheduled).length}
                          </span>
                      </h2>
                  </div>
                  
                  <div className="w-full">
                      <div 
                          className={`bg-[#dbe4eb] dark:bg-[var(--bg-secondary)] border-2 border-[#c5d3df] dark:border-gray-700 rounded-[1.5rem] p-3 flex flex-col gap-2 min-h-[25rem] relative transition-colors ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'ring-2 ring-red-400 border-red-400 bg-red-50/50 dark:bg-red-900/20' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={handleSidebarDrop}
                          onClick={moveSource?.sourceDay ? handleUnschedule : undefined}
                      >
                          {moveSource && moveSource.sourceDay && (
                              <div className="px-3 py-2 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-xl text-center animate-pulse cursor-pointer shadow-sm">
                                  <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Drop here to Unschedule</span>
                              </div>
                          )}

                          {Object.keys(groupedUnscheduled).length === 0 ? (
                              <div className="text-center py-12 px-4 opacity-60 m-auto">
                                  <span className="block text-3xl mb-2">✨</span>
                                  <p className="text-sm text-[#1f4061] dark:text-gray-400 font-bold">{t.allLessonsScheduled}</p>
                              </div>
                          ) : (
                              <div className="flex flex-row flex-wrap gap-2 period-stack-clickable overflow-y-auto custom-scrollbar pr-1 max-h-[60vh]">
                                  {Object.values(groupedUnscheduled).map((group, index) => {
                                      const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                      const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                      const groupKey = jp ? `jp-${jp.id}` : `sub-${group[0].subjectId}`;
                                      const groupColorKey = group[0].jointPeriodId ? String(group[0].jointPeriodId) : `${group[0].classId}-${group[0].subjectId}`;
                                      const colorData = getColorForId(groupColorKey, theme === 'dark' || theme === 'amoled');
                                      const subject = subjects.find(s => s.id === group[0].subjectId);
                                      const teacher = teachers.find(t => t.id === group[0].teacherId);

                                      return (
                                          <div 
                                              key={`unscheduled-pc-${groupKey}-${index}`} 
                                              draggable
                                              onDragStart={() => handleDragStart(group)}
                                              onDragEnd={handleDragEnd}
                                              onClick={() => handleStackClick(group)}
                                              className={`w-[130px] sm:w-[140px] flex-shrink-0 bg-white dark:bg-[#1e293b] rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1 shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-red-400 bg-red-50 dark:bg-red-900/10' : ''}`}
                                              style={{ borderLeftColor: colorData.hex }}
                                          >
                                              <div className="flex flex-col flex-1 min-w-0">
                                                  <span className="text-sm md:text-base font-bold uppercase tracking-tight block w-full overflow-hidden whitespace-nowrap text-ellipsis" style={{ color: colorData.hex }}>
                                                      {subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown')}
                                                  </span>
                                                  <span className="text-xs md:text-sm font-medium text-black dark:text-white opacity-80 block w-full overflow-hidden whitespace-nowrap text-ellipsis" style={{ color: colorData.hex }}>
                                                      {teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'No Teacher'}
                                                  </span>
                                              </div>
                                              <div className="flex items-center ml-1 flex-shrink-0">
                                                  {group.length > 1 && (
                                                      <span className="bg-blue-500/10 text-blue-800 dark:text-blue-200 w-5 h-5 mr-1 rounded-full flex items-center justify-center text-xs font-bold">x{group.length}</span>
                                                  )}
                                                  <svg width="8" height="12" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 opacity-60"><circle cx="4" cy="3" r="2" fill="currentColor"/><circle cx="8" cy="3" r="2" fill="currentColor"/><circle cx="4" cy="9" r="2" fill="currentColor"/><circle cx="8" cy="9" r="2" fill="currentColor"/><circle cx="4" cy="15" r="2" fill="currentColor"/><circle cx="8" cy="15" r="2" fill="currentColor"/></svg>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
          
          {/* Mobile/Tablet Unscheduled (Hidden on lg screens) */}
          <div className="w-full flex-col mt-2 lg:hidden flex">
              
              {/* Unscheduled */}
              <div className="w-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg py-1 cursor-pointer transition-colors" onClick={() => setIsLessonListOpen(!isLessonListOpen)}>
                      <h2 className="text-xl sm:text-2xl font-black text-[#1f4061] dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                          UNSCHEDULED 
                          <span className="bg-[#8b0000] text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-sm sm:text-base">
                              {Object.keys(groupedUnscheduled).length}
                          </span>
                      </h2>
                      <div className={`text-gray-400 transform transition-transform duration-200 ml-auto ${isLessonListOpen ? 'rotate-180' : ''}`}>
                         <ChevronDownIcon /> 
                      </div>
                  </div>
                  
                  <div className={`transition-all duration-500 overflow-hidden ${isLessonListOpen ? 'max-h-[125rem] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div 
                          className={`bg-[#dbe4eb] dark:bg-[var(--bg-secondary)] border-2 border-dashed border-[#a6b8ca] dark:border-gray-600 rounded-[1.5rem] p-4 flex flex-col gap-3 min-h-[9.375rem] relative transition-colors ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'ring-2 ring-red-400 bg-red-50/50' : ''}`}
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
                              <div className="flex flex-row flex-wrap gap-2 sm:gap-3 period-stack-clickable">
                                  {Object.values(groupedUnscheduled).map((group, index) => {
                                      const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                      const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                      const groupKey = jp ? `jp-${jp.id}` : `sub-${group[0].subjectId}`;
                                      const groupColorKey = group[0].jointPeriodId ? String(group[0].jointPeriodId) : `${group[0].classId}-${group[0].subjectId}`;
                                      const colorData = getColorForId(groupColorKey);
                                      const subject = subjects.find(s => s.id === group[0].subjectId);
                                      const teacher = teachers.find(t => t.id === group[0].teacherId);
                                      
                                      // Only show max 8, then +Show More 
                                      if (index >= 8) return null;

                                      return (
                                          <div 
                                              key={`unscheduled-${groupKey}-${index}`} 
                                              draggable
                                              onDragStart={() => handleDragStart(group)}
                                              onDragEnd={handleDragEnd}
                                              onClick={() => handleStackClick(group)}
                                              className={`w-[130px] sm:w-[140px] flex-shrink-0 bg-white dark:bg-[#1e293b] rounded-[1rem] px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
                                              style={{ borderLeftColor: colorData.hex }}
                                          >
                                              <div className="flex flex-col flex-1 min-w-0">
                                                  <span className="text-sm md:text-base font-bold text-[#1f4061] dark:text-gray-300 uppercase tracking-tight block w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                      {subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown')}
                                                  </span>
                                                  <span className="text-xs md:text-sm font-black text-black dark:text-white block w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                                      {teacher ? (language === 'ur' ? teacher.nameUr : teacher.nameEn) : 'No Teacher'}
                                                  </span>
                                              </div>
                                              <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                                                  {group.length > 1 && (
                                                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">x{group.length}</span>
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
        <div className={`mt-8 mb-24 bg-white dark:bg-[#1e293b] rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ${isHistoryExpanded ? 'max-h-[31.25rem]' : 'max-h-16 sm:max-h-[4.5rem]'}`}>
            <div className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    History / Logs
                    <span className="bg-[var(--accent-primary)] text-white text-xs px-2.5 py-0.5 rounded-full">{classLogs.length}</span>
                </h3>
                <div className={`text-gray-400 transform transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                   <ChevronDownIcon /> 
                </div>
            </div>
            
            <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto custom-scrollbar max-h-[25rem]">
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
                            <li key={log.id} className={`p-4 rounded-[1rem] border shadow-sm transition-all ${
                                log.type === 'delete' ? 'bg-red-50/80 dark:bg-red-900/10 border-red-100 dark:border-red-800/50' :
                                log.type === 'add' ? 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' :
                                'bg-blue-50/80 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50'
                            }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[0.625rem] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                        log.type === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                                        log.type === 'add' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-[0.625rem] font-bold text-gray-400 dark:text-gray-500">
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

    </div>
  );
};

export default ClassTimetablePage;
