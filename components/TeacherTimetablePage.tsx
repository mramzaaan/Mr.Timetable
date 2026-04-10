
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, SchoolConfig, Adjustment, JointPeriod, DownloadDesignConfig, JointPeriodAssignment, LeaveDetails, TimetableSession, TimetableChangeLog } from '../types';
import { allDays, generateUniqueId, getColorForId } from '../types';
import PeriodStack from './PeriodStack';
import TeacherAvailabilitySummary from './TeacherAvailabilitySummary';
import PrintPreview from './PrintPreview';
import { TeacherCommunicationModal } from './TeacherCommunicationModal';
import DownloadModal from './DownloadModal';
import { generateTeacherTimetableHtml, calculateWorkloadStats } from './reportUtils';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import AddLessonForm from './AddLessonForm';

import { OnlineTeachersShareModal } from './OnlineTeachersShareModal';

// Helper to create a log entry
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

// ... (Icons remain same)
const WhatsAppIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" /></svg>);
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2v4h10z" /></svg>;
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 011-1h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V6a1 1 0 01-1 1h-1a1 1 0 01-1-1V4z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SortIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

const NON_TEACHING_CLASS_ID = 'non-teaching-duties';

interface TeacherTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails?: Record<string, Record<string, LeaveDetails>>;
  onSetClasses: (classes: SchoolClass[]) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  selectedTeacherId: string | null;
  onSelectedTeacherChange: (id: string | null) => void;
  hasActiveSession: boolean;
  // History Props
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  changeLogs?: TimetableChangeLog[];
}

type SortField = 'date' | 'period' | 'type' | 'class' | 'subject' | 'teacher';

export const TeacherTimetablePage: React.FC<TeacherTimetablePageProps> = ({
  t, language, classes, subjects, teachers, jointPeriods, adjustments, leaveDetails, onSetClasses, schoolConfig, onUpdateSchoolConfig, selectedTeacherId, onSelectedTeacherChange, hasActiveSession, onUndo, onRedo, onSave, canUndo, canRedo, openConfirmation, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod, onUpdateTimetableSession, changeLogs
}) => {
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const draggedDataRef = useRef<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [moveSource, setMoveSource] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historyTab, setHistoryTab] = useState<'timeline' | 'attendance'>('timeline');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [historySortField, setHistorySortField] = useState<SortField>('date');

  // Custom Dropdown State
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [isOnlineShareModalOpen, setIsOnlineShareModalOpen] = useState(false);
  const [teacherSortBy, setTeacherSortBy] = useState<'serial' | 'name' | 'periods'>('serial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);

  useEffect(() => {
      if (!selectedTeacherId && teachers.length > 0) {
          onSelectedTeacherChange(teachers[0].id);
      }
  }, [teachers, selectedTeacherId, onSelectedTeacherChange]);

  // Click outside to cancel selection and dropdown
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (moveSource && !(e.target as Element).closest('.period-stack-clickable') && !(e.target as Element).closest('.timetable-slot')) {
              setMoveSource(null);
          }
          if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(e.target as Node)) {
              setIsTeacherDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moveSource]);

  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8)), [activeDays, schoolConfig.daysConfig]);
  const periodLabels = useMemo(() => Array.from({length: maxPeriods}, (_, i) => (i + 1).toString()), [maxPeriods]);

  // Memoize Teacher Period Counts for Sorting
  const teacherPeriodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach(t => {
        const stats = calculateWorkloadStats(t.id, classes, adjustments, leaveDetails, undefined, undefined, schoolConfig);
        counts.set(t.id, stats.weeklyPeriods);
    });
    return counts;
  }, [teachers, classes, adjustments, leaveDetails, schoolConfig]);

  const teacherUnscheduledCounts = useMemo(() => {
      const counts = new Map<string, number>();
      teachers.forEach(t => counts.set(t.id, 0));
      
      teachers.forEach(t => {
          let totalAssigned = 0;
          let scheduled = 0;
          const jointPeriodScheduledSlots = new Map<string, Set<string>>();
          
          classes.forEach(c => {
              if (c.id === NON_TEACHING_CLASS_ID) return;
              c.subjects.forEach(sub => {
                  if (sub.teacherId === t.id) {
                      const isJoint = jointPeriods.some(jp => 
                          jp.teacherId === t.id && 
                          jp.assignments.some(a => a.classId === c.id && a.subjectId === sub.subjectId)
                      );
                      if (!isJoint) {
                          totalAssigned += (sub.periodsPerWeek || 0);
                      }
                  }
              });
              
              allDays.forEach(day => {
                  const slots = c.timetable[day];
                  if (Array.isArray(slots)) {
                      slots.forEach((slot, periodIndex) => {
                          if (Array.isArray(slot)) {
                              slot.forEach(p => {
                                  if (p.teacherId === t.id) {
                                      if (p.jointPeriodId) {
                                          if (!jointPeriodScheduledSlots.has(p.jointPeriodId)) {
                                              jointPeriodScheduledSlots.set(p.jointPeriodId, new Set());
                                          }
                                          jointPeriodScheduledSlots.get(p.jointPeriodId)!.add(`${day}-${periodIndex}`);
                                      } else {
                                          scheduled++;
                                      }
                                  }
                              });
                          }
                      });
                  }
              });
          });
          
          jointPeriods.forEach(jp => {
              if (jp.teacherId === t.id) {
                  totalAssigned += (jp.periodsPerWeek || 0);
              }
          });
          
          let jointScheduled = 0;
          jointPeriodScheduledSlots.forEach(slots => {
              jointScheduled += slots.size;
          });
          
          counts.set(t.id, Math.max(0, totalAssigned - (scheduled + jointScheduled)));
      });
      return counts;
  }, [classes, teachers, jointPeriods]);

  const sortedTeachers = useMemo(() => {
      let sorted = [...teachers];
      if (teacherSearchQuery) {
          const q = teacherSearchQuery.toLowerCase();
          sorted = sorted.filter(t => 
              t.nameEn.toLowerCase().includes(q) || 
              t.nameUr.includes(q)
          );
      }
      
      return sorted.sort((a, b) => {
          let res = 0;
          if (teacherSortBy === 'serial') {
              res = (a.serialNumber ?? 99999) - (b.serialNumber ?? 99999);
          } else if (teacherSortBy === 'periods') {
              const pa = teacherPeriodCounts.get(a.id) || 0;
              const pb = teacherPeriodCounts.get(b.id) || 0;
              res = pa - pb;
          } else if (teacherSortBy === 'unscheduled') {
              const ua = teacherUnscheduledCounts.get(a.id) || 0;
              const ub = teacherUnscheduledCounts.get(b.id) || 0;
              res = ua - ub;
          } else { // name
              res = a.nameEn.localeCompare(b.nameEn);
          }
          return sortDirection === 'asc' ? res : -res;
      });
  }, [teachers, teacherSearchQuery, teacherSortBy, sortDirection, teacherPeriodCounts, teacherUnscheduledCounts]);

  const currentTeacherIndex = useMemo(() => {
    if (!selectedTeacherId) return -1;
    return sortedTeachers.findIndex(t => t.id === selectedTeacherId);
  }, [selectedTeacherId, sortedTeachers]);

  const handlePreviousTeacher = () => {
    if (currentTeacherIndex > 0) {
        onSelectedTeacherChange(sortedTeachers[currentTeacherIndex - 1].id);
    }
  };

  const handleNextTeacher = () => {
    if (currentTeacherIndex < sortedTeachers.length - 1) {
        onSelectedTeacherChange(sortedTeachers[currentTeacherIndex + 1].id);
    }
  };

  const getCombinationColor = useCallback((periods: Period[]) => {
      if (!periods.length) return 'subject-default';
      const p = periods[0];
      return getColorForId(p.classId + p.subjectId).name;
  }, []);

  // Construct Teacher's Timetable View from Class Data
  const teacherTimetableData = useMemo(() => {
      if (!selectedTeacherId) return null;
      const grid: TimetableGridData = {
          Monday: Array.from({ length: 8 }, () => []),
          Tuesday: Array.from({ length: 8 }, () => []),
          Wednesday: Array.from({ length: 8 }, () => []),
          Thursday: Array.from({ length: 8 }, () => []),
          Friday: Array.from({ length: 8 }, () => []),
          Saturday: Array.from({ length: 8 }, () => []),
      };

      activeDays.forEach(day => {
          for (let i = 0; i < 8; i++) {
              classes.forEach(c => {
                  const slot = c.timetable[day]?.[i];
                  if (Array.isArray(slot)) {
                      slot.forEach(p => {
                          if (p.teacherId === selectedTeacherId) {
                              grid[day][i].push(p);
                          }
                      });
                  }
              });
          }
      });
      return grid;
  }, [selectedTeacherId, classes, activeDays]);

  // Calculate the current week range (Monday to Sunday) for accurate workload stats
  const currentWeekRange = useMemo(() => {
      const curr = new Date();
      const day = curr.getDay();
      // Adjust to Monday of the current week (if Sunday, go back 6 days; otherwise go back to Monday)
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
      
      const monday = new Date(curr);
      monday.setDate(diff);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const toDateStr = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      return {
          start: toDateStr(monday),
          end: toDateStr(sunday)
      };
  }, []);

  const workloadStats = useMemo(() => calculateWorkloadStats(
      selectedTeacherId!, 
      classes, 
      adjustments, 
      leaveDetails,
      currentWeekRange.start,
      currentWeekRange.end,
      schoolConfig // Passed to respect holiday/inactive day config
  ), [selectedTeacherId, classes, adjustments, leaveDetails, currentWeekRange, schoolConfig]);

  const teacherLogs = useMemo(() => {
      if (!changeLogs || !selectedTeacherId) return [];
      return changeLogs
        .filter(log => log.entityType === 'teacher' && log.entityId === selectedTeacherId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [changeLogs, selectedTeacherId]);

  const rawHistoryData = useMemo(() => {
      if (!selectedTeacherId) return { leaves: [], substitutions: [] };
      
      const allDates = new Set<string>();
      if (adjustments) Object.keys(adjustments).forEach(d => allDates.add(d));
      if (leaveDetails) Object.keys(leaveDetails).forEach(d => allDates.add(d));
      
      const leaves: any[] = [];
      const substitutions: any[] = [];
      
      const locale = language === 'ur' ? 'ur-PK' : 'en-GB';

      allDates.forEach(date => {
          const d = new Date(date);
          const dayName = d.toLocaleDateString(locale, { weekday: 'short' });

          // Leaves
          const leave = leaveDetails?.[date]?.[selectedTeacherId];
          if (leave) {
              leaves.push({
                  date,
                  dayName,
                  leaveType: leave.leaveType,
                  startPeriod: leave.startPeriod,
                  reason: leave.reason || 'Leave'
              });
          }
          
          // Adjustments
          const dayAdjs = adjustments[date] || [];
          dayAdjs.forEach(adj => {
              const cls = classes.find(c => c.id === adj.classId);
              const subj = subjects.find(s => s.id === adj.subjectId);
              const clsName = cls ? (language === 'ur' ? cls.nameUr : cls.nameEn) : '';
              const subjName = subj ? (language === 'ur' ? subj.nameUr : subj.nameEn) : '';

              if (adj.originalTeacherId === selectedTeacherId) {
                  // Substitution Given (My class covered by someone else)
                  const subTeacher = teachers.find(tea => tea.id === adj.substituteTeacherId);
                  const subName = subTeacher ? (language === 'ur' ? subTeacher.nameUr : subTeacher.nameEn) : (language === 'ur' ? 'نامعلوم' : 'Unknown');
                  
                  substitutions.push({
                      date,
                      dayName,
                      type: 'sub_given',
                      period: adj.periodIndex + 1,
                      className: clsName,
                      subjectName: subjName,
                      teacherName: subName
                  });
              } else if (adj.substituteTeacherId === selectedTeacherId) {
                  // Substitution Taken (I covered someone else's class)
                  const origTeacher = teachers.find(tea => tea.id === adj.originalTeacherId);
                  const origName = origTeacher ? (language === 'ur' ? origTeacher.nameUr : origTeacher.nameEn) : (language === 'ur' ? 'نامعلوم' : 'Unknown');

                  substitutions.push({
                      date,
                      dayName,
                      type: 'sub_taken',
                      period: adj.periodIndex + 1,
                      className: clsName,
                      subjectName: subjName,
                      teacherName: origName
                  });
              }
          });
      });
      
      return { leaves, substitutions };
  }, [selectedTeacherId, adjustments, leaveDetails, teachers, classes, subjects, language]);

  const handleSort = (field: SortField) => {
      if (historySortField === field) {
          setHistorySortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
      } else {
          setHistorySortField(field);
          // Default order based on type
          if (['date', 'period'].includes(field)) {
              setHistorySortOrder('desc');
          } else {
              setHistorySortOrder('asc');
          }
      }
  };

  const sortedHistory = useMemo(() => {
      const modifier = historySortOrder === 'desc' ? -1 : 1;
      
      const compareValues = (a: any, b: any, field: SortField) => {
          let valA, valB;
          switch (field) {
              case 'date':
                  valA = new Date(a.date).getTime();
                  valB = new Date(b.date).getTime();
                  break;
              case 'period':
                  valA = a.period || a.startPeriod || 0;
                  valB = b.period || b.startPeriod || 0;
                  break;
              case 'type':
                  valA = a.type || a.leaveType || '';
                  valB = b.type || b.leaveType || '';
                  break;
              case 'class':
                  valA = a.className || '';
                  valB = b.className || '';
                  break;
              case 'subject':
                  valA = a.subjectName || '';
                  valB = b.subjectName || '';
                  break;
              case 'teacher':
                  valA = a.teacherName || '';
                  valB = b.teacherName || '';
                  break;
              default:
                  return 0;
          }
          
          if (typeof valA === 'string' && typeof valB === 'string') {
              return valA.localeCompare(valB) * modifier;
          }
          if (valA < valB) return -1 * modifier;
          if (valA > valB) return 1 * modifier;
          return 0;
      };

      const sortFn = (a: any, b: any) => {
          const primary = compareValues(a, b, historySortField);
          if (primary !== 0) return primary;
          // Secondary sort by date then period
          const dateDiff = (new Date(a.date).getTime() - new Date(b.date).getTime()) * -1; // Default desc for tie-breaker
          if (dateDiff !== 0) return dateDiff;
          return ((a.period || 0) - (b.period || 0));
      };
      
      return {
          leaves: [...rawHistoryData.leaves].sort((a,b) => {
              // Leaves only support date/type properly
              if (['date', 'type'].includes(historySortField)) {
                  return sortFn(a, b);
              }
              // Fallback to date sort for irrelevant fields
              return (new Date(a.date).getTime() - new Date(b.date).getTime()) * modifier;
          }),
          substitutions: [...rawHistoryData.substitutions].sort(sortFn)
      };
  }, [rawHistoryData, historySortOrder, historySortField]);

  const resetHistorySort = () => {
      setHistorySortField('date');
      setHistorySortOrder('desc');
  };

  const getClassAvailability = (classId: string, day: keyof TimetableGridData, periodIndex: number) => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return false;
      const periods = cls.timetable[day]?.[periodIndex] || [];
      return periods.length > 0;
  };

  // --- Interaction Handlers ---

  const handleDragStart = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => {
      const data = { periods, sourceDay, sourcePeriodIndex };
      setDraggedData(data);
      draggedDataRef.current = data;
      setMoveSource(null); // Clear selection if dragging starts
  };

  const handleDragEnd = () => {
      setDraggedData(null);
      draggedDataRef.current = null;
  };

  const handleStackClick = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => {
      // Toggle selection
      if (moveSource && moveSource.periods[0].id === periods[0].id) {
          setMoveSource(null);
      } else {
          setMoveSource({ periods, sourceDay, sourcePeriodIndex });
      }
  };

  const [dragOverTarget, setDragOverTarget] = useState<{ day: keyof TimetableGridData, periodIndex: number } | null>(null);

  const getConflicts = (
      periods: Period[],
      targetDay: keyof TimetableGridData,
      targetPeriodIndex: number,
      isSwap: boolean,
      sourceDay?: keyof TimetableGridData,
      sourcePeriodIndex?: number
  ) => {
      const conflicts: string[] = [];
      const teacherConflicts: string[] = [];

      periods.forEach(p => {
          if (p.classId === NON_TEACHING_CLASS_ID) return;
          
          if (getClassAvailability(p.classId, targetDay, targetPeriodIndex)) {
               const c = classes.find(cls => cls.id === p.classId);
               const clsPeriods = c?.timetable[targetDay]?.[targetPeriodIndex] || [];
               const targetPeriods = teacherTimetableData?.[targetDay]?.[targetPeriodIndex] || [];
               const isBlockedByOthers = clsPeriods.some(cp => !targetPeriods.some(tp => tp.id === cp.id));
               
               if (isBlockedByOthers && c) {
                   const existingTeacherId = clsPeriods[0]?.teacherId;
                   const existingTeacher = teachers.find(t => t.id === existingTeacherId);
                   const teacherName = existingTeacher ? (language === 'ur' ? existingTeacher.nameUr : existingTeacher.nameEn) : 'Unknown';
                   conflicts.push(`${c.nameEn} is already having a class with ${teacherName}.`);
               }
          }

          const teacherIdToCheck = p.teacherId; 
          let isTeacherBusy = false;
          let busyClass = '';
          
          classes.forEach(c => {
              const slot = c.timetable[targetDay]?.[targetPeriodIndex];
              if (Array.isArray(slot)) {
                  slot.forEach(sp => {
                      if (sp.teacherId === teacherIdToCheck && sp.id !== p.id) {
                          isTeacherBusy = true;
                          busyClass = language === 'ur' ? c.nameUr : c.nameEn;
                      }
                  });
              }
          });

          if (isTeacherBusy) {
              const tName = teachers.find(t => t.id === teacherIdToCheck)?.nameEn || 'Teacher';
              teacherConflicts.push(`${tName} is already teaching ${busyClass} at this time.`);
          }
      });

      if (isSwap && sourceDay && sourcePeriodIndex !== undefined) {
          const targetPeriods = teacherTimetableData?.[targetDay]?.[targetPeriodIndex] || [];
          targetPeriods.forEach(p => {
              if (p.classId === NON_TEACHING_CLASS_ID) return;
              
              if (getClassAvailability(p.classId, sourceDay, sourcePeriodIndex)) {
                  const c = classes.find(cls => cls.id === p.classId);
                  const clsPeriods = c?.timetable[sourceDay]?.[sourcePeriodIndex] || [];
                  const isBlockedByOthers = clsPeriods.some(cp => !periods.some(dp => dp.id === cp.id));
                  
                  if (isBlockedByOthers && c) {
                       const existingTeacherId = clsPeriods[0]?.teacherId;
                       const existingTeacher = teachers.find(t => t.id === existingTeacherId);
                       const teacherName = existingTeacher ? (language === 'ur' ? existingTeacher.nameUr : existingTeacher.nameEn) : 'Unknown';
                       conflicts.push(`${c.nameEn} is busy at source with ${teacherName}.`);
                  }
              }

              const teacherIdToCheck = p.teacherId;
              let isTeacherBusy = false;
              let busyClass = '';
              classes.forEach(c => {
                  const slot = c.timetable[sourceDay]?.[sourcePeriodIndex];
                  if (Array.isArray(slot)) {
                      slot.forEach(sp => {
                          if (sp.teacherId === teacherIdToCheck && sp.id !== p.id) {
                              isTeacherBusy = true;
                              busyClass = language === 'ur' ? c.nameUr : c.nameEn;
                          }
                      });
                  }
              });

              if (isTeacherBusy) {
                  const tName = teachers.find(t => t.id === teacherIdToCheck)?.nameEn || 'Teacher';
                  teacherConflicts.push(`${tName} is busy at source teaching ${busyClass}.`);
              }
          });
      }

      return { conflicts, teacherConflicts };
  };

  const handleDragEnter = (day: keyof TimetableGridData, periodIndex: number) => {
      setDragOverTarget({ day, periodIndex });
  };

  const handleDragLeave = () => {
      setDragOverTarget(null);
  };

  const handleExecuteMove = (targetDay: keyof TimetableGridData, targetPeriodIndex: number) => {
      const source = draggedDataRef.current || moveSource;
      if (!source || !selectedTeacherId || !teacherTimetableData) return;

      const periodLimit = schoolConfig.daysConfig?.[targetDay]?.periodCount ?? 8;
      if (targetPeriodIndex >= periodLimit) return;

      const { periods, sourceDay, sourcePeriodIndex } = source;
      if (sourceDay === targetDay && sourcePeriodIndex === targetPeriodIndex) return;

      const targetPeriods = teacherTimetableData[targetDay]?.[targetPeriodIndex] || [];
      const isSwap = sourceDay && sourcePeriodIndex !== undefined && targetPeriods.length > 0;

      // Validation
      const { conflicts, teacherConflicts } = getConflicts(periods, targetDay, targetPeriodIndex, isSwap, sourceDay, sourcePeriodIndex);

      if (conflicts.length > 0 || teacherConflicts.length > 0) {
          const message = [
              conflicts.length > 0 ? "Class Conflicts:\n" + conflicts.join('\n') : "",
              teacherConflicts.length > 0 ? "Teacher Conflicts:\n" + teacherConflicts.join('\n') : ""
          ].filter(Boolean).join('\n\n');

          const confirm = window.confirm(`Conflicts Detected:\n\n${message}\n\nDo you want to proceed anyway?`);
          if (!confirm) return;
      }

      // Perform Update
      onUpdateTimetableSession((session) => {
          let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
          let currentLogs = session.changeLogs || [];
          const logDetails: string[] = [];
          
          const movePeriod = (periodId: string, classId: string, fromDay: keyof TimetableGridData, fromIdx: number, toDay: keyof TimetableGridData, toIdx: number) => {
              const classIndex = newClasses.findIndex(c => c.id === classId);
              if (classIndex !== -1) {
                  const updatedClass = { ...newClasses[classIndex] };
                  const updatedTimetable = { ...updatedClass.timetable };
                  
                  // Ensure day array exists and copy it for immutability
                  const sourceDayList = [...(updatedTimetable[fromDay] || [])];
                  const sourceSlot = sourceDayList[fromIdx] || [];
                  const pToMove = sourceSlot.find(p => p.id === periodId);
                  
                  if (pToMove) {
                      sourceDayList[fromIdx] = sourceSlot.filter(p => p.id !== periodId);
                      updatedTimetable[fromDay] = sourceDayList;
                      
                      if(!updatedTimetable[toDay]) updatedTimetable[toDay] = [];
                      // If moving within same day, reuse the modified list
                      const targetDayList = (fromDay === toDay) ? sourceDayList : [...updatedTimetable[toDay]];
                      const targetSlot = targetDayList[toIdx] || [];
                      targetDayList[toIdx] = [...targetSlot, pToMove];
                      updatedTimetable[toDay] = targetDayList;
                      
                      updatedClass.timetable = updatedTimetable;
                      newClasses[classIndex] = updatedClass;
                  }
              }
          };

          const processMove = (p: Period, fromDay: keyof TimetableGridData | undefined, fromIdx: number | undefined, toDay: keyof TimetableGridData, toIdx: number) => {
              const sub = subjects.find(s => s.id === p.subjectId);
              const cls = classes.find(c => c.id === p.classId);
              
              if (fromDay && fromIdx !== undefined) {
                  // Moving existing
                  movePeriod(p.id, p.classId, fromDay, fromIdx, toDay, toIdx);
                  logDetails.push(`Moved ${sub?.nameEn || '?'} (${cls?.nameEn || '?'}) from ${fromDay} P${fromIdx+1} to ${toDay} P${toIdx+1}`);
              } else {
                  // Creating new from sidebar
                  const classIndex = newClasses.findIndex(c => c.id === p.classId);
                  if (classIndex !== -1) {
                      const updatedClass = { ...newClasses[classIndex] };
                      const updatedTimetable = { ...updatedClass.timetable };
                      if (!updatedTimetable[toDay]) updatedTimetable[toDay] = [];
                      
                      const targetDayList = [...updatedTimetable[toDay]];
                      const targetSlot = targetDayList[toIdx] || [];
                      
                      const newPeriod: Period = {
                          id: generateUniqueId(),
                          classId: p.classId,
                          subjectId: p.subjectId,
                          teacherId: p.teacherId,
                          jointPeriodId: p.jointPeriodId
                      };
                      
                      targetDayList[toIdx] = [...targetSlot, newPeriod];
                      updatedTimetable[toDay] = targetDayList;
                      updatedClass.timetable = updatedTimetable;
                      newClasses[classIndex] = updatedClass;
                      logDetails.push(`Scheduled ${sub?.nameEn || '?'} (${cls?.nameEn || '?'}) to ${toDay} P${toIdx+1}`);
                  }
              }
          };

          // 1. Move Dragged/Selected Periods
          const processedJointIds = new Set<string>();
          
          periods.forEach(p => {
              if (p.jointPeriodId) {
                  if (processedJointIds.has(p.jointPeriodId)) return;
                  processedJointIds.add(p.jointPeriodId);
                  
                  if (sourceDay && sourcePeriodIndex !== undefined) {
                      // Moving existing: Find all instances in the source slot across ALL classes
                      const jointPeriodParts: Period[] = [];
                      newClasses.forEach(c => {
                          const slot = c.timetable[sourceDay]?.[sourcePeriodIndex];
                          if (Array.isArray(slot)) {
                              slot.forEach(existingP => {
                                  if (existingP.jointPeriodId === p.jointPeriodId) {
                                      jointPeriodParts.push(existingP);
                                  }
                              });
                          }
                      });
                      
                      jointPeriodParts.forEach(part => {
                          movePeriod(part.id, part.classId, sourceDay, sourcePeriodIndex, targetDay, targetPeriodIndex);
                      });
                      
                      const jp = jointPeriods.find(j => j.id === p.jointPeriodId);
                      logDetails.push(`Moved Joint Period ${jp?.name || ''} to ${targetDay} P${targetPeriodIndex+1}`);
                  } else {
                      // Moving from sidebar
                      const jpDef = jointPeriods.find(j => j.id === p.jointPeriodId);
                      if (jpDef) {
                          jpDef.assignments.forEach(assign => {
                              const tempP: Period = {
                                  id: '', 
                                  classId: assign.classId,
                                  subjectId: assign.subjectId,
                                  teacherId: jpDef.teacherId,
                                  jointPeriodId: jpDef.id
                              };
                              processMove(tempP, undefined, undefined, targetDay, targetPeriodIndex);
                          });
                          logDetails.push(`Scheduled Joint Period ${jpDef.name} to ${targetDay} P${targetPeriodIndex+1}`);
                      }
                  }
              } else {
                  processMove(p, sourceDay, sourcePeriodIndex, targetDay, targetPeriodIndex);
              }
          });

          if (isSwap && sourceDay && sourcePeriodIndex !== undefined) {
              const processedTargetJointIds = new Set<string>();
              targetPeriods.forEach(p => {
                  if (p.jointPeriodId) {
                      if (processedTargetJointIds.has(p.jointPeriodId)) return;
                      processedTargetJointIds.add(p.jointPeriodId);
                      
                      const jointPeriodParts: Period[] = [];
                      newClasses.forEach(c => {
                          const slot = c.timetable[targetDay]?.[targetPeriodIndex];
                          if (Array.isArray(slot)) {
                              slot.forEach(existingP => {
                                  if (existingP.jointPeriodId === p.jointPeriodId) {
                                      jointPeriodParts.push(existingP);
                                  }
                              });
                          }
                      });
                      jointPeriodParts.forEach(part => {
                          movePeriod(part.id, part.classId, targetDay, targetPeriodIndex, sourceDay, sourcePeriodIndex);
                      });
                      
                      const jp = jointPeriods.find(j => j.id === p.jointPeriodId);
                      logDetails.push(`Swapped Joint Period ${jp?.name || ''} back to ${sourceDay} P${sourcePeriodIndex+1}`);
                  } else {
                      movePeriod(p.id, p.classId, targetDay, targetPeriodIndex, sourceDay, sourcePeriodIndex);
                      const sub = subjects.find(s => s.id === p.subjectId);
                      logDetails.push(`Swapped ${sub?.nameEn || '?'} back to ${sourceDay} P${sourcePeriodIndex+1}`);
                  }
              });
          }

          logDetails.forEach(d => currentLogs.push(createLog('move', d, 'teacher', selectedTeacherId!)));
          return { ...session, classes: newClasses, changeLogs: currentLogs };
      });

      setDraggedData(null);
      setMoveSource(null);
  };

  const handleUnschedule = () => {
      const source = draggedDataRef.current || moveSource;
      if (!source || !selectedTeacherId) return;
      
      const { periods, sourceDay, sourcePeriodIndex } = source;
      
      if (sourceDay && sourcePeriodIndex !== undefined) {
          onUpdateTimetableSession(session => {
              let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
              let currentLogs = session.changeLogs || [];
              const processedJointIds = new Set<string>();

              periods.forEach(p => {
                  if (p.jointPeriodId) {
                      if (processedJointIds.has(p.jointPeriodId)) return;
                      processedJointIds.add(p.jointPeriodId);
                      
                      // Update ALL linked classes for this Joint Period
                      const jp = jointPeriods.find(j => j.id === p.jointPeriodId);
                      newClasses = newClasses.map(c => {
                          // Check if class has data for this day/slot
                          if (c.timetable[sourceDay] && c.timetable[sourceDay][sourcePeriodIndex]) {
                              // Check if it contains the joint period
                              const slot = c.timetable[sourceDay][sourcePeriodIndex];
                              if (slot.some(sp => sp.jointPeriodId === p.jointPeriodId)) {
                                  const updatedC = { ...c, timetable: { ...c.timetable } };
                                  const dayPeriods = [...updatedC.timetable[sourceDay]]; // Copy day array
                                  dayPeriods[sourcePeriodIndex] = slot.filter(sp => sp.jointPeriodId !== p.jointPeriodId);
                                  updatedC.timetable[sourceDay] = dayPeriods;
                                  return updatedC;
                              }
                          }
                          return c;
                      });
                      
                      currentLogs.push(createLog('move', `Unscheduled Joint Period ${jp?.name || ''} from ${sourceDay} P${sourcePeriodIndex+1}`, 'teacher', selectedTeacherId!));

                  } else {
                      const classIndex = newClasses.findIndex(c => c.id === p.classId);
                      if (classIndex !== -1) {
                          const updatedClass = { ...newClasses[classIndex] };
                          const updatedTimetable = { ...updatedClass.timetable };
                          
                          const dayPeriods = [...(updatedTimetable[sourceDay] || [])];
                          const slot = dayPeriods[sourcePeriodIndex] || [];
                          
                          if (slot.some(sp => sp.id === p.id)) {
                              dayPeriods[sourcePeriodIndex] = slot.filter(sp => sp.id !== p.id);
                              updatedTimetable[sourceDay] = dayPeriods;
                              updatedClass.timetable = updatedTimetable;
                              newClasses[classIndex] = updatedClass;
                              
                              const sub = subjects.find(s => s.id === p.subjectId);
                              currentLogs.push(createLog('move', `Unscheduled ${sub?.nameEn || ''} from ${sourceDay} P${sourcePeriodIndex+1}`, 'teacher', selectedTeacherId!));
                          }
                      }
                  }
              });
              return { ...session, classes: newClasses, changeLogs: currentLogs };
          });
      }
      setDraggedData(null);
      setMoveSource(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: keyof TimetableGridData, targetPeriodIndex: number) => {
      e.preventDefault();
      handleExecuteMove(targetDay, targetPeriodIndex);
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
      e.preventDefault();
      handleUnschedule();
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
  };

  const handlePeriodDelete = (periodId: string, classId: string, day: keyof TimetableGridData, periodIndex: number, jointPeriodId?: string) => {
      onUpdateTimetableSession(session => {
          let newClasses = session.classes.map(c => ({...c, timetable: {...c.timetable}}));
          let currentLogs = session.changeLogs || [];
          
          if (jointPeriodId) {
              const jp = jointPeriods.find(j => j.id === jointPeriodId);
              // Remove from ALL linked classes
              newClasses = newClasses.map(c => {
                  const daySlots = c.timetable[day];
                  // Safety checks added to prevent crash on 'some' of undefined
                  if (daySlots && Array.isArray(daySlots[periodIndex]) && daySlots[periodIndex].some(p => p.jointPeriodId === jointPeriodId)) {
                      const updatedC = { ...c, timetable: { ...c.timetable } };
                      const dayPeriods = [...daySlots]; // Copy day array
                      dayPeriods[periodIndex] = daySlots[periodIndex].filter(p => p.jointPeriodId !== jointPeriodId);
                      updatedC.timetable[day] = dayPeriods;
                      return updatedC;
                  }
                  return c;
              });
              currentLogs.push(createLog('delete', `Deleted Joint Period ${jp?.name || ''} from ${day} P${periodIndex+1}`, 'teacher', selectedTeacherId!));

          } else {
              // Single period
              const classIndex = newClasses.findIndex(c => c.id === classId);
              if (classIndex !== -1) {
                  const updatedClass = { ...newClasses[classIndex] };
                  const updatedTimetable = { ...updatedClass.timetable };
                  const dayPeriods = [...(updatedTimetable[day] || [])];
                  const slot = dayPeriods[periodIndex] || [];
                  
                  const pToDelete = slot.find(p => p.id === periodId);
                  const sub = subjects.find(s => s.id === pToDelete?.subjectId);
                  
                  dayPeriods[periodIndex] = slot.filter(sp => sp.id !== periodId);
                  updatedTimetable[day] = dayPeriods;
                  updatedClass.timetable = updatedTimetable;
                  newClasses[classIndex] = updatedClass;
                  
                  currentLogs.push(createLog('delete', `Deleted ${sub?.nameEn || ''} from ${day} P${periodIndex+1}`, 'teacher', selectedTeacherId!));
              }
          }
          
          return { ...session, classes: newClasses, changeLogs: currentLogs };
      });
  };
  
  const unscheduledPeriods = useMemo((): Period[] => {
      if (!selectedTeacherId) return [];
      
      const unscheduled: Period[] = [];
      const jointPeriodScheduledSlots = new Map<string, Set<string>>(); // jointPeriodId -> Set("Day-PeriodIndex")
      const singleSubjectCounts = new Map<string, number>(); // "classId-subjectId" -> count

      // 1. Count Scheduled
      // Iterate safely through all days to avoid object.entries issues if structure is partial
      classes.forEach(c => {
          allDays.forEach(day => {
              const slots = c.timetable[day];
              if (Array.isArray(slots)) {
                  slots.forEach((slot, periodIndex) => {
                      if (Array.isArray(slot)) {
                          slot.forEach(p => {
                              if (p.teacherId === selectedTeacherId) {
                                  if (p.jointPeriodId) {
                                      if (!jointPeriodScheduledSlots.has(p.jointPeriodId)) {
                                          jointPeriodScheduledSlots.set(p.jointPeriodId, new Set());
                                      }
                                      // Track unique time slots to correctly count scheduled instances
                                      jointPeriodScheduledSlots.get(p.jointPeriodId)!.add(`${day}-${periodIndex}`);
                                  } else {
                                      const key = `${c.id}-${p.subjectId}`;
                                      singleSubjectCounts.set(key, (singleSubjectCounts.get(key) || 0) + 1);
                                  }
                              }
                          });
                      }
                  });
              }
          });
      });

      // 2. Determine Remaining
      classes.forEach(c => {
          if (c.id === NON_TEACHING_CLASS_ID) return;

          c.subjects.forEach(sub => {
              if (sub.teacherId === selectedTeacherId) {
                  const isJoint = jointPeriods.some(jp => 
                      jp.teacherId === selectedTeacherId && 
                      jp.assignments.some(a => a.classId === c.id && a.subjectId === sub.subjectId)
                  );
                  
                  if (isJoint) return;

                  const key = `${c.id}-${sub.subjectId}`;
                  const scheduled = singleSubjectCounts.get(key) || 0;
                  const remaining = sub.periodsPerWeek - scheduled;
                  
                  for (let i = 0; i < remaining; i++) {
                      unscheduled.push({
                          id: generateUniqueId(),
                          classId: c.id,
                          subjectId: sub.subjectId,
                          teacherId: selectedTeacherId
                      });
                  }
              }
          });
      });
      
      // Add joint periods
      jointPeriods.forEach((jp: JointPeriod) => {
          if (jp.teacherId === selectedTeacherId) {
              const scheduledSlots = jointPeriodScheduledSlots.get(jp.id);
              // Count unique time slots, ensuring we don't overcount if multiple classes share same slot
              const scheduledCount = scheduledSlots ? scheduledSlots.size : 0;
              const remaining = jp.periodsPerWeek - scheduledCount;
              
              for (let i = 0; i < remaining; i++) {
                  // Push period objects for ALL assigned classes so PeriodStack can group them
                  jp.assignments.forEach((assign: JointPeriodAssignment) => {
                      unscheduled.push({
                          id: generateUniqueId(),
                          classId: assign.classId,
                          subjectId: assign.subjectId,
                          teacherId: selectedTeacherId,
                          jointPeriodId: jp.id
                      });
                  });
              }
          }
      });

      return unscheduled;
  }, [selectedTeacherId, classes, jointPeriods]);

  const groupedUnscheduled = useMemo((): Record<string, Period[]> => {
      return unscheduledPeriods.reduce((acc, p) => {
          const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : `${p.classId}-${p.subjectId}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(p);
          return acc;
      }, {} as Record<string, Period[]>);
  }, [unscheduledPeriods]);
  
  const sidebarItems = useMemo((): Period[][] => {
      // Group all instances of a lesson into a single stack so count can be shown
      return Object.values(groupedUnscheduled);
  }, [groupedUnscheduled]);

  const teacherSpecificColorMap = useMemo(() => {
      const map = new Map<string, string>();
      if (!teacherTimetableData) return map;

      Object.values(teacherTimetableData).forEach(daySlots => {
          (daySlots as any[]).forEach(slot => {
              slot.forEach(p => {
                  const key = `${p.classId}-${p.subjectId}`;
                  if (!map.has(key)) {
                      map.set(key, getColorForId(key).name);
                  }
              });
          });
      });
      return map;
  }, [teacherTimetableData]);

  const maxTeacherWorkload = useMemo(() => {
      let max = 0;
      teacherPeriodCounts.forEach(count => {
          if (count > max) max = count;
      });
      return max > 0 ? max : 30;
  }, [teacherPeriodCounts]);

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({
      downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }
    });
  };

  const isSelectionActive = !!(draggedData || moveSource);

  if (!hasActiveSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* ... (Existing modals/components) */}
      {selectedTeacher && (
        <>
            <PrintPreview 
                t={t} 
                isOpen={isPrintPreviewOpen} 
                onClose={() => setIsPrintPreviewOpen(false)} 
                title={`${t.teacherTimetable}: ${selectedTeacher.nameEn}`} 
                fileNameBase={`Timetable_${selectedTeacher.nameEn.replace(' ', '_')}`}
                generateHtml={(lang, options) => generateTeacherTimetableHtml(selectedTeacher, lang, options, classes, subjects, schoolConfig, adjustments, teachers)} 
                designConfig={schoolConfig.downloadDesigns.teacher}
                onSaveDesign={handleSavePrintDesign}
            />
            <TeacherCommunicationModal
                t={t}
                isOpen={isCommModalOpen}
                onClose={() => setIsCommModalOpen(false)}
                selectedTeacher={selectedTeacher}
                teacherTimetableData={teacherTimetableData!}
                subjects={subjects}
                classes={classes}
                schoolConfig={schoolConfig}
                subjectColorMap={teacherSpecificColorMap}
            />
        </>
      )}
      
      <DownloadModal
        t={t}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title={t.downloadTimetable}
        fileNameBase="Teacher_Timetables"
        items={teachers}
        itemType="teacher"
        generateFullPageHtml={(item, lang, design) => generateTeacherTimetableHtml(item, lang, design, classes, subjects, schoolConfig, adjustments, teachers)}
        designConfig={schoolConfig.downloadDesigns.teacher}
      />

      <OnlineTeachersShareModal
        isOpen={isOnlineShareModalOpen}
        onClose={() => setIsOnlineShareModalOpen(false)}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        schoolConfig={schoolConfig}
        t={t}
        language={language === 'ur' ? 'ur' : 'en'}
      />
      {/* Header Section: Centered Dropdown and Action Buttons */}
      <div className="mb-8 flex flex-col items-center gap-6">
        
        {/* Navigation Row */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full max-w-2xl relative z-20">
            {/* Previous Button */}
            <button 
                onClick={handlePreviousTeacher} 
                disabled={currentTeacherIndex <= 0}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
            >
                <ChevronLeftIcon />
            </button>

             {/* Main Pill Dropdown Container */}
             <div className="flex-1 min-w-0" ref={teacherDropdownRef}>
                 <div className="relative w-full max-w-md mx-auto">
                    <button
                        onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                        className="flex items-center gap-3 sm:gap-4 bg-[var(--bg-secondary)] rounded-full pl-1.5 pr-4 sm:pl-2 sm:pr-6 py-1.5 sm:py-2 shadow-md border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:shadow-lg transition-all w-full"
                    >
                        {selectedTeacher ? (
                            <>
                                {/* Serial Circle */}
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-sm sm:text-lg shadow-sm flex-shrink-0">
                                    {selectedTeacher.serialNumber ?? '-'}
                                </div>
                                
                                {/* Text Stack */}
                                <div className="flex flex-col items-start mr-auto overflow-hidden min-w-0 flex-1">
                                    <span className="font-black text-sm sm:text-lg text-[var(--text-primary)] leading-none truncate w-full text-left">
                                        {language === 'ur' ? selectedTeacher.nameUr : selectedTeacher.nameEn}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 truncate w-full text-left">
                                        {teacherPeriodCounts.get(selectedTeacher.id) || 0} Periods
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className="text-[var(--text-secondary)] font-medium pl-4">{t.selectATeacher}</span>
                        )}
                        
                        <div className="text-[var(--text-secondary)] flex-shrink-0">
                            <ChevronDownIcon />
                        </div>
                    </button>

                    {isTeacherDropdownOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-3 animate-scale-in origin-top z-50">
                            {/* Search */}
                            <div className="relative mb-3">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search teachers..."
                                    value={teacherSearchQuery}
                                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
                                    autoFocus
                                />
                                {teacherSearchQuery && (
                                    <button 
                                        onClick={() => setTeacherSearchQuery('')}
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
                                {(['serial', 'name', 'periods', 'unscheduled'] as const).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            if (teacherSortBy === key) {
                                                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                            } else {
                                                setTeacherSortBy(key);
                                                setSortDirection('asc');
                                            }
                                        }}
                                        className={`flex-1 text-[10px] font-bold uppercase py-1 rounded-md transition-colors flex items-center justify-center gap-1 ${teacherSortBy === key ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                                    >
                                        {key === 'serial' ? '#' : key === 'unscheduled' ? 'Unsch' : key.toUpperCase()}
                                        {teacherSortBy === key && (
                                            <span className="text-[8px]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                {sortedTeachers.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-[var(--text-secondary)] italic">No teachers found</div>
                                ) : (
                                    sortedTeachers.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                onSelectedTeacherChange(t.id);
                                                setIsTeacherDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${selectedTeacherId === t.id ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                                        >
                                            <span className={`font-mono text-xs opacity-50 w-8 text-center flex-shrink-0 py-0.5 rounded ${selectedTeacherId === t.id ? 'bg-[var(--accent-primary)]/10' : 'bg-[var(--bg-primary)]'}`}>#{t.serialNumber ?? '-'}</span>
                                            <span className="font-bold flex-grow text-base break-words text-left leading-tight">{language === 'ur' ? t.nameUr : t.nameEn}</span>
                                            <span className={`text-xs opacity-70 whitespace-nowrap min-w-[60px] text-center px-2 py-0.5 rounded ${selectedTeacherId === t.id ? 'bg-[var(--accent-primary)]/10' : 'bg-[var(--bg-primary)]'}`}>{teacherPeriodCounts.get(t.id) || 0} Sch | {teacherUnscheduledCounts.get(t.id) || 0} Unsch</span>
                                            {selectedTeacherId === t.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] flex-shrink-0"></div>}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             {/* Next Button */}
             <button 
                 onClick={handleNextTeacher} 
                 disabled={currentTeacherIndex >= sortedTeachers.length - 1}
                 className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
             >
                 <ChevronRightIcon />
             </button>
        </div>
      </div>

      {!selectedTeacher || !teacherTimetableData ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectATeacher}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Workload Summary */}
          <TeacherAvailabilitySummary t={t} workloadStats={workloadStats} maxWorkload={maxTeacherWorkload} unscheduledCount={teacherUnscheduledCounts.get(selectedTeacherId) || 0} />

          {/* Timetable Grid */}
          <div className="w-full overflow-x-auto">
            <div className="bg-[var(--bg-secondary)] shadow-lg rounded-lg overflow-hidden border border-[var(--border-primary)]">
              <table className="w-full text-center border-collapse table-fixed">
                <thead>
                  <tr className="bg-[var(--accent-primary)] text-[var(--accent-text)]">
                    <th className="border border-[var(--border-secondary)] p-1 w-10"></th>
                    {activeDays.map(day => (
                      <th key={day} className="border border-[var(--border-secondary)] p-1 font-bold uppercase text-xs">{t[day.toLowerCase()]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodLabels.map((label, periodIndex) => (
                    <tr key={label}>
                      <td className="border border-[var(--border-secondary)] font-black text-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-sans">{label}</td>
                      {activeDays.map(day => {
                        const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                        const isDisabled = periodIndex >= periodLimit;
                        const slotPeriods = teacherTimetableData[day]?.[periodIndex] || [];

                        // Deduplicate logic for Joint Periods in Grid View
                        const groupedSlotPeriods: Period[][] = [];
                        const processedJPs = new Set<string>();
                        
                        slotPeriods.forEach(p => {
                            if (p.jointPeriodId) {
                                if (!processedJPs.has(p.jointPeriodId)) {
                                    processedJPs.add(p.jointPeriodId);
                                    const allJpPeriods = slotPeriods.filter(sp => sp.jointPeriodId === p.jointPeriodId);
                                    groupedSlotPeriods.push(allJpPeriods);
                                }
                            } else {
                                groupedSlotPeriods.push([p]);
                            }
                        });

                        const isTarget = moveSource && !isDisabled;
                        const statusClass = (!isDisabled && isSelectionActive) ? 'drop-target-available' : '';
                        
                        // Drag Over Visuals
                        let dragVisualClass = '';
                        if (dragOverTarget?.day === day && dragOverTarget?.periodIndex === periodIndex) {
                            const source = draggedDataRef.current || moveSource;
                            if (source) {
                                const { periods, sourceDay, sourcePeriodIndex } = source;
                                const isSwap = sourceDay && sourcePeriodIndex !== undefined && slotPeriods.length > 0;
                                const { conflicts, teacherConflicts } = getConflicts(periods, day, periodIndex, isSwap, sourceDay, sourcePeriodIndex);
                                
                                if (conflicts.length > 0 || teacherConflicts.length > 0) {
                                    dragVisualClass = 'bg-red-100 dark:bg-red-900/30 ring-inset ring-2 ring-red-500';
                                } else {
                                    dragVisualClass = 'bg-green-100 dark:bg-green-900/30 ring-inset ring-2 ring-green-500';
                                }
                            }
                        }

                        return (
                          <td key={day} 
                            className={`timetable-slot border border-[var(--border-secondary)] h-16 p-1 align-top ${isDisabled ? 'bg-[var(--slot-disabled-bg)] cursor-not-allowed' : (slotPeriods.length === 0 ? 'bg-[var(--slot-available-bg)] opacity-70 border-dashed' : 'bg-[var(--slot-available-bg)]')} transition-colors duration-300 ${statusClass} ${isTarget ? 'hover:bg-[var(--accent-secondary)] cursor-pointer ring-inset ring-2 ring-[var(--accent-primary)]/30' : ''} ${dragVisualClass} relative group`}
                            onDragOver={(e) => !isDisabled && handleDragOver(e)}
                            onDragEnter={() => !isDisabled && handleDragEnter(day, periodIndex)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                            onClick={() => !isDisabled && moveSource && handleExecuteMove(day, periodIndex)}
                          >
                            {!isDisabled && (
                                <div className="h-full flex flex-col gap-1 period-stack-clickable">
                                    {groupedSlotPeriods.map((group, groupIndex) => {
                                        const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                        const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                        return (
                                            <PeriodStack 
                                                key={`${group[0].id}-${groupIndex}`}
                                                periods={group}
                                                onDragStart={(draggedPeriods) => handleDragStart(draggedPeriods, day, periodIndex)}
                                                onDragEnd={handleDragEnd}
                                                onClick={(p) => handleStackClick(p, day, periodIndex)}
                                                onDeleteStack={() => handlePeriodDelete(group[0].id, group[0].classId, day, periodIndex, group[0].jointPeriodId)}
                                                colorName={getCombinationColor(group)}
                                                language={language}
                                                subjects={subjects}
                                                teachers={teachers}
                                                classes={classes}
                                                jointPeriods={jointPeriods}
                                                displayContext="class"
                                                jointPeriodName={jp?.name}
                                                className="w-full"
                                                isSelected={!!isSelected}
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
            
            {/* History Section REMOVED FROM HERE */}
          </div>

          {/* Unscheduled Periods Sidebar */}
          <div className="w-full space-y-6">
            <div 
                className={`bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-primary)] transition-colors ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'unscheduled-drop-target cursor-pointer' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleSidebarDrop}
                onClick={moveSource?.sourceDay ? handleUnschedule : undefined}
            >
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2 flex justify-between items-center">
                  {t.unscheduledPeriods}
                  {moveSource && moveSource.sourceDay && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">Click here to Unschedule</span>
                  )}
              </h3>
              {sidebarItems.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] italic">{t.dragAndDropInstruction}</p>
              ) : (
                <div className="flex flex-row flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 period-stack-clickable">
                  {sidebarItems.map((group, index) => {
                      const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                      const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                      
                      return (
                        <PeriodStack 
                            key={`unscheduled-${index}`}
                            periods={group} 
                            onDragStart={handleDragStart} 
                            onDragEnd={handleDragEnd}
                            onClick={(p) => handleStackClick(p)}
                            colorName={getCombinationColor(group)}
                            language={language}
                            subjects={subjects}
                            teachers={teachers}
                            classes={classes}
                            jointPeriods={jointPeriods}
                            displayContext="class"
                            jointPeriodName={jp?.name}
                            isSelected={!!isSelected}
                            className="w-48"
                        />
                      );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Lesson Manager Section */}
      {selectedTeacher && hasActiveSession && (
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
                limitToTeacherId={selectedTeacher.id}
            />
        </div>
      )}

      {/* History Section (Moved Here) */}
      {selectedTeacher && hasActiveSession && (
        <div className="mt-8 bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-primary)]">
                <button 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="flex items-center gap-2 focus:outline-none flex-grow text-left"
                >
                    <HistoryIcon />
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">History / Logs</h3>
                    <div className={`text-[var(--text-secondary)] transform transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                       <ChevronDownIcon /> 
                    </div>
                </button>
                {isHistoryExpanded && (
                    <button 
                        onClick={resetHistorySort}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider border border-transparent hover:border-[var(--border-secondary)]"
                        title="Reset Sort to Date"
                    >
                        <SortIcon />
                        Reset Sort
                    </button>
                )}
            </div>
            
            {isHistoryExpanded && (
                <div className="p-4 bg-[var(--bg-secondary)]">
                    <div className="flex space-x-1 bg-[var(--bg-tertiary)] p-1 rounded-lg mb-4 border border-[var(--border-secondary)] w-fit">
                        <button
                            onClick={() => setHistoryTab('timeline')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${historyTab === 'timeline' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setHistoryTab('attendance')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${historyTab === 'attendance' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            Leaves & Subs
                        </button>
                    </div>

                    {historyTab === 'timeline' && (
                        <div className="max-h-96 overflow-y-auto custom-scrollbar p-2">
                            {teacherLogs.length === 0 ? (
                                <div className="text-center py-8 opacity-50">
                                     <div className="mb-2 mx-auto w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center">
                                        <HistoryIcon />
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] font-medium">No recent changes.</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {teacherLogs.map((log) => (
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
                                                <span className="text-[10px] font-bold opacity-50 text-[var(--text-secondary)]">
                                                    {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight opacity-90">{log.details}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {historyTab === 'attendance' && (
                        <div className="space-y-8">
                            {(sortedHistory.leaves.length === 0 && sortedHistory.substitutions.length === 0) ? (
                                <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">No attendance records found.</p>
                            ) : (
                                <>
                                {sortedHistory.leaves.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 border-b-2 border-red-200 pb-1 flex items-center gap-2 text-red-600">
                                            {t.leavesTaken || 'Leaves'} ({sortedHistory.leaves.length})
                                        </h4>
                                        <div className="overflow-x-auto rounded-lg border border-[var(--border-secondary)]">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-tertiary)] border-b border-[var(--border-secondary)]">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold w-32 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('date')}>Date {historySortField === 'date' && (historySortOrder === 'asc' ? '↑' : '↓')}</th>
                                                        <th className="px-4 py-3 font-bold w-24">Day</th>
                                                        <th className="px-4 py-3 font-bold w-24 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('type')}>Type {historySortField === 'type' && (historySortOrder === 'asc' ? '↑' : '↓')}</th>
                                                        <th className="px-4 py-3 font-bold">Details / Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border-secondary)]">
                                                    {sortedHistory.leaves.map((item, idx) => (
                                                        <tr key={`l-${idx}`} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                                            <td className="px-4 py-3 font-mono font-medium text-[var(--text-primary)]">
                                                                {new Date(item.date).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-secondary)]">{item.dayName}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${item.leaveType === 'full' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                                    {item.leaveType === 'full' ? 'Full Day' : 'Half Day'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-primary)]">
                                                                {item.leaveType === 'half' && <span className="font-bold text-[var(--text-secondary)] mr-2">From P{item.startPeriod}:</span>}
                                                                {item.reason}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {sortedHistory.substitutions.length > 0 && (
                                    <div className="border-2 border-red-200 rounded-xl overflow-hidden shadow-sm">
                                        <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                                            {t.substitution || 'Substitutions'} ({sortedHistory.substitutions.length})
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-tertiary)] border-b border-[var(--border-secondary)]">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold w-32 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors select-none" onClick={() => handleSort('date')}>
                                                            Date {historySortField === 'date' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className="px-4 py-3 font-bold w-16 text-center cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors select-none" onClick={() => handleSort('period')}>
                                                            Pd {historySortField === 'period' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className="px-4 py-3 font-bold w-24 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors select-none" onClick={() => handleSort('type')}>
                                                            Type {historySortField === 'type' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className="px-4 py-3 font-bold cursor-default">
                                                            <div className="flex items-center gap-2">
                                                                <span className="cursor-pointer hover:text-[var(--accent-primary)] flex items-center gap-1 select-none" onClick={() => handleSort('class')}>
                                                                    Class {historySortField === 'class' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                                </span>
                                                                <span className="text-[var(--text-secondary)]">/</span>
                                                                <span className="cursor-pointer hover:text-[var(--accent-primary)] flex items-center gap-1 select-none" onClick={() => handleSort('subject')}>
                                                                    Subject {historySortField === 'subject' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                                </span>
                                                            </div>
                                                        </th>
                                                        <th className="px-4 py-3 font-bold cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors select-none" onClick={() => handleSort('teacher')}>
                                                            Teacher {historySortField === 'teacher' && (historySortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border-secondary)]">
                                                    {sortedHistory.substitutions.map((item, idx) => (
                                                        <tr key={`s-${idx}`} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                                            <td className="px-4 py-3 font-mono font-medium text-[var(--text-primary)]">
                                                                {new Date(item.date).toLocaleDateString()}
                                                                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">{item.dayName}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)] bg-[var(--bg-tertiary)]/30">{item.period}</td>
                                                            <td className="px-4 py-3">
                                                                {item.type === 'sub_given' ? (
                                                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">Given ➔</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">Taken ⬅️</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-[var(--text-primary)]">{item.className}</div>
                                                                <div className="text-xs text-[var(--text-secondary)]">{item.subjectName}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                                                                {item.teacherName}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed top-24 right-6 z-50 flex flex-col items-end gap-3">
          {/* Main Toggle Button */}
          <div className="flex flex-col items-center gap-3">
              {/* WhatsApp Button - Always visible */}
              <button 
                  onClick={() => setIsCommModalOpen(true)}
                  disabled={!selectedTeacher}
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
              <button onClick={() => { setIsPrintPreviewOpen(true); setIsFabOpen(false); }} disabled={!selectedTeacher} className="w-10 h-10 rounded-full bg-white text-[var(--text-primary)] flex items-center justify-center shadow-md border border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={t.printViewAction}>
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

export default TeacherTimetablePage;
