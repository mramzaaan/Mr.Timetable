
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
import { MessageCircle, MoreVertical, Printer, Undo2, Redo2, Plus } from 'lucide-react';

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
  appFont?: string;
}

type SortField = 'date' | 'period' | 'type' | 'class' | 'subject' | 'teacher';

export const TeacherTimetablePage: React.FC<TeacherTimetablePageProps> = ({
  t, language, classes, subjects, teachers, jointPeriods, adjustments, leaveDetails, onSetClasses, schoolConfig, onUpdateSchoolConfig, selectedTeacherId, onSelectedTeacherChange, hasActiveSession, onUndo, onRedo, onSave, canUndo, canRedo, openConfirmation, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod, onUpdateTimetableSession, changeLogs, appFont
}) => {
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const draggedDataRef = useRef<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [moveSource, setMoveSource] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historyTab, setHistoryTab] = useState<'timeline' | 'attendance'>('timeline');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [historySortField, setHistorySortField] = useState<SortField>('date');

  // Custom Dropdown State
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [isHeaderMoreOpen, setIsHeaderMoreOpen] = useState(false);
  const [isOnlineShareModalOpen, setIsOnlineShareModalOpen] = useState(false);
  const [teacherSortBy, setTeacherSortBy] = useState<'serial' | 'name' | 'periods'>('serial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const teacherDropdownRef = useRef<HTMLDivElement>(null);
  const teacherMoreRef = useRef<HTMLDivElement>(null);

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
          if (teacherMoreRef.current && !teacherMoreRef.current.contains(e.target as Node)) {
              setIsHeaderMoreOpen(false);
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
      return getColorForId(p.jointPeriodId ? String(p.jointPeriodId) : `${p.classId}-${p.subjectId}`).name;
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
          const periodsToMove = (sourceDay && sourcePeriodIndex !== undefined) ? periods : [periods[0]];
          
          periodsToMove.forEach(p => {
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
          (daySlots as any[])?.forEach(slot => {
              slot?.forEach((p: Period) => {
                  const key = p.jointPeriodId ? String(p.jointPeriodId) : `${p.classId}-${p.subjectId}`;
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

  const contentScale = schoolConfig.contentScale || 1;

  return (
    <div className="w-full px-1 sm:px-2 lg:px-4 mx-auto max-w-none 2xl:max-w-[1800px]" style={{ '--content-scale': contentScale } as React.CSSProperties}>
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
                appFont={appFont}
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full max-w-7xl mx-auto px-1 lg:px-0 mt-2 relative z-[60]">
        
        {/* Teacher Selector Header - Modern Design */}
        <div className="flex items-center justify-start flex-1 min-w-0 relative" ref={teacherDropdownRef}>
             <div className="flex items-center gap-1 xl:gap-2 mr-1 sm:mr-2 flex-shrink-0">
                 <button 
                     onClick={handlePreviousTeacher} 
                     disabled={currentTeacherIndex <= 0}
                     className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                 </button>
                 <button 
                     onClick={handleNextTeacher} 
                     disabled={currentTeacherIndex >= sortedTeachers.length - 1}
                     className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-transparent border-2 border-[#1f4061] text-[#1f4061] dark:border-white dark:text-white hover:bg-[#1f4061]/10 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                 >
                     <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                 </button>
             </div>

              {selectedTeacher ? (
                 <div className="flex items-center gap-1.5 sm:gap-3 cursor-pointer min-w-0 flex-1" onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}>
                     <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-[0.1875rem] border-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                         <span className="text-[var(--accent-primary)] font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-none flex items-center justify-center">{selectedTeacher.serialNumber?.toString().padStart(2, '0') ?? '-'}</span>
                     </div>
                     <div className="flex flex-col items-start leading-none -space-y-0.5 md:-space-y-1 min-w-0 flex-1">
                         <span className="font-black text-xl sm:text-2xl md:text-4xl lg:text-5xl text-[var(--accent-primary)] uppercase tracking-tighter hover:opacity-90 transition-opacity truncate w-full">
                             {language === 'ur' ? selectedTeacher.nameUr : selectedTeacher.nameEn}
                         </span>
                     </div>
                     
                     <div className="flex items-center gap-1 ml-1 sm:ml-3 flex-shrink-0">
                         <div className="flex flex-col items-center justify-center relative w-9 h-9 sm:w-10 sm:h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-[0.1875rem] border-dashed border-orange-500 text-orange-500 flex-shrink-0">
                             <span className="text-[0.4rem] sm:text-[0.4375rem] md:text-[0.6rem] lg:text-[0.75rem] font-bold uppercase absolute top-1 sm:top-1.5 md:top-2 opacity-80">PD</span>
                             <span className="text-[0.55rem] sm:text-[0.625rem] md:text-[1rem] lg:text-[1.25rem] font-black mt-1 sm:mt-1.5 md:mt-3 lg:mt-4">{teacherPeriodCounts.get(selectedTeacher.id) || 0}</span>
                         </div>
                         <div className="text-gray-300 flex flex-col -gap-2 hidden lg:flex">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                         </div>
                     </div>
                 </div>
             ) : (
                 <span className="text-gray-400 font-medium text-sm md:text-base whitespace-nowrap">{t.selectATeacher}</span>
             )}

             {isTeacherDropdownOpen && (
                 <div className="absolute top-[100%] mt-4 w-full min-w-[17.5rem] md:min-w-[20rem] max-w-md bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl shadow-2xl p-4 animate-scale-in z-50">
                     {/* Search */}
                     <div className="relative mb-3 w-full">
                         <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5">
                             <SearchIcon />
                         </div>
                         <input
                             type="text"
                             placeholder="Search teachers..."
                             value={teacherSearchQuery}
                             onChange={(e) => setTeacherSearchQuery(e.target.value)}
                             className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-secondary)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
                             autoFocus
                         />
                     </div>
                     
                     {/* Sort Controls */}
                     <div className="flex gap-2 mb-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] p-1.5 rounded-xl">
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
                                 className={`flex-1 text-[0.625rem] font-bold uppercase py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${teacherSortBy === key ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-gray-500 hover:text-black dark:text-gray-400 hover:bg-white dark:hover:bg-[var(--bg-secondary)]'}`}
                             >
                                 {key === 'serial' ? '#' : key === 'unscheduled' ? 'Unsch' : key.toUpperCase()}
                                 {teacherSortBy === key && (
                                     <span className="text-[0.625rem]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                 )}
                             </button>
                         ))}
                     </div>

                     {/* List */}
                     <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                         {sortedTeachers.length === 0 ? (
                             <div className="p-4 text-center text-sm text-gray-400 italic">No teachers found</div>
                         ) : (
                             sortedTeachers.map(t => (
                                 <button
                                     key={t.id}
                                     onClick={() => {
                                         onSelectedTeacherChange(t.id);
                                         setIsTeacherDropdownOpen(false);
                                     }}
                                     className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-colors ${selectedTeacherId === t.id ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                                 >
                                     <span className={`font-mono text-xs opacity-50 w-8 text-center flex-shrink-0 py-1 rounded-md ${selectedTeacherId === t.id ? 'bg-[var(--accent-primary)]/20' : 'bg-gray-100 dark:bg-[var(--bg-secondary)]'}`}>#{t.serialNumber ?? '-'}</span>
                                     <span className="font-bold flex-grow text-base break-words text-left">{language === 'ur' ? t.nameUr : t.nameEn}</span>
                                     <span className={`text-[0.625rem] opacity-70 whitespace-nowrap min-w-[3.75rem] text-center px-2 py-1 rounded-md border ${selectedTeacherId === t.id ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' : 'bg-white border-gray-200 dark:bg-[var(--bg-secondary)] dark:border-[var(--border-secondary)]'}`}>{teacherPeriodCounts.get(t.id) || 0} Sch | {teacherUnscheduledCounts.get(t.id) || 0} Unsch</span>
                                 </button>
                             ))
                         )}
                     </div>
                 </div>
             )}
        </div>
        
        {/* Actions - Right */}
        <div className="flex items-center justify-start gap-2 flex-shrink-0">
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedTeacher} title={t.sendViaWhatsApp} className="text-[#25D366] hover:scale-110 transition-transform disabled:opacity-50 w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12" strokeWidth={2} />
            </button>
            <div className="relative" ref={teacherMoreRef}>
                <button 
                  onClick={() => setIsHeaderMoreOpen(!isHeaderMoreOpen)} 
                  className="w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 flex text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:dark:text-white items-center justify-center transition-all flex-shrink-0"
                >
                    <MoreVertical className="h-6 w-6 md:h-10 md:w-10 lg:w-12 lg:h-12" strokeWidth={2} />
                </button>
                
                {isHeaderMoreOpen && (
                    <div className="absolute right-0 top-[100%] mt-2 flex flex-col justify-center items-center gap-1 bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-2 border border-gray-100 dark:border-[var(--border-primary)] z-50 animate-scale-in">
                        <button onClick={() => { setIsPrintPreviewOpen(true); setIsHeaderMoreOpen(false); }} disabled={!selectedTeacher} className="p-2.5 w-full hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center gap-3 rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.printViewAction || 'Print'}>
                            <Printer className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-semibold whitespace-nowrap hidden lg:block">Print</span>
                        </button>
                        {onUndo && (
                            <button onClick={() => { onUndo(); setIsHeaderMoreOpen(false); }} disabled={!canUndo} className="p-2.5 w-full hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center gap-3 rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.undo || 'Undo'}>
                                <Undo2 className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-semibold whitespace-nowrap hidden lg:block">Undo</span>
                            </button>
                        )}
                        {onRedo && (
                            <button onClick={() => { onRedo(); setIsHeaderMoreOpen(false); }} disabled={!canRedo} className="p-2.5 w-full hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)] flex items-center gap-3 rounded-xl disabled:opacity-50 text-[var(--text-primary)] transition-colors" title={t.redo || 'Redo'}>
                                <Redo2 className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-semibold whitespace-nowrap hidden lg:block">Redo</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {!selectedTeacher || !teacherTimetableData ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectATeacher}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Workload Summary */}
          <TeacherAvailabilitySummary t={t} workloadStats={workloadStats} maxWorkload={maxTeacherWorkload} unscheduledCount={teacherUnscheduledCounts.get(selectedTeacherId) || 0} />

          {/* Timetable Grid - Modern Styled */}
          <div className="w-[100vw] sm:w-full -mx-1 sm:mx-0 max-w-[100vw] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <div className="bg-[#f9f9f9] dark:bg-[var(--bg-secondary)] rounded-none sm:rounded-[2rem] p-1 sm:p-2 md:p-4 shadow-inner overflow-x-auto overflow-y-hidden border-y sm:border border-[#c5d3df] dark:border-[var(--border-primary)] pb-3 md:pb-6 w-full">
                <div className="w-full min-w-[500px] md:min-w-0 flex flex-col gap-1 sm:gap-2 md:gap-3 lg:gap-2">
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
                                    const slotPeriods = teacherTimetableData[day]?.[periodIndex] || [];
                                    
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

                                        if (slotPeriods.length === 0) {
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
                                                style={{ transform: `scale(${contentScale})`, transformOrigin: 'top left' }}
                                            >
                                                {/* Card Content or Stack */}
                                                <div className="h-full flex flex-col relative z-10 w-full rounded-xl overflow-visible">
                                                    {groupedSlotPeriods.map((group, groupIndex) => {
                                                        const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                                                        const groupColorKey = group[0].jointPeriodId ? String(group[0].jointPeriodId) : `${group[0].classId}-${group[0].subjectId}`;
                                                        const colorData = getColorForId(groupColorKey, false);
                                                        const subject = subjects.find(s => s.id === group[0].subjectId);
                                                        const schoolClass = classes.find(c => c.id === group[0].classId);
                                                        
                                                        const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                                                        
                                                        let isDimmed = false;
                                                                                                                
                                                        const subjectName = subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown');
                                                        const classNameStr = schoolClass ? (language === 'ur' ? schoolClass.nameUr : schoolClass.nameEn) : 'No Class';

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
                                                                                {classNameStr}
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
                                                                            {subjectName}
                                                                        </span>
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
            
            {/* History Section REMOVED FROM HERE */}
          </div>

          {/* Unscheduled Periods Sidebar */}
          <div className="w-full space-y-6">
            <div 
                className={`bg-[#dbe4eb] dark:bg-[var(--bg-secondary)] border-2 border-[#c5d3df] dark:border-gray-700 rounded-[1.5rem] p-3 md:p-4 shadow-sm flex flex-col gap-3 min-h-[9.375rem] relative transition-colors ${draggedData?.sourceDay || (moveSource?.sourceDay) ? 'ring-2 ring-red-400 bg-red-50/50 cursor-pointer' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleSidebarDrop}
                onClick={moveSource?.sourceDay ? handleUnschedule : undefined}
            >
              <h3 className="text-xl sm:text-2xl font-black text-[#1f4061] dark:text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                  UNSCHEDULED
                  <span className="bg-[#8b0000] text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm">
                      {sidebarItems.length}
                  </span>
                  {moveSource && moveSource.sourceDay && (
                      <span className="text-[0.625rem] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse ml-2">Click here to Unschedule</span>
                  )}
              </h3>
              {sidebarItems.length === 0 ? (
                <div className="text-center py-8 px-4 opacity-60 m-auto">
                    <span className="block text-3xl mb-2">✨</span>
                    <p className="text-sm text-[#1f4061] dark:text-gray-400 font-bold">{t.allLessonsScheduled}</p>
                </div>
              ) : (
                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 max-h-[18.75rem] md:max-h-[30rem] overflow-y-auto custom-scrollbar pr-2 period-stack-clickable">
                  {sidebarItems.map((group, index) => {
                      const jp = group[0].jointPeriodId ? jointPeriods.find(j => j.id === group[0].jointPeriodId) : undefined;
                      const isSelected = moveSource && moveSource.periods[0].id === group[0].id;
                      const groupKey = jp ? `jp-${jp.id}` : `sub-${group[0].subjectId}`;
                      const groupColorKey = group[0].jointPeriodId ? String(group[0].jointPeriodId) : `${group[0].classId}-${group[0].subjectId}`;
                      const colorData = getColorForId(groupColorKey);
                      const subject = subjects.find(s => s.id === group[0].subjectId);
                      const schoolClass = classes.find(c => c.id === group[0].classId);
                      
                      return (
                          <div 
                              key={`unscheduled-${groupKey}-${index}`} 
                              draggable
                              onDragStart={() => handleDragStart(group)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleStackClick(group)}
                              className={`w-[130px] sm:w-[140px] flex-shrink-0 bg-white dark:bg-[#1e293b] rounded-[1rem] md:rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 flex items-center justify-between gap-1 shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-red-400 bg-red-50 dark:bg-red-900/10' : ''}`}
                              style={{ borderLeftColor: colorData.hex }}
                          >
                              <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm md:text-base font-bold text-[#1f4061] dark:text-gray-300 uppercase tracking-tight block w-full overflow-hidden whitespace-nowrap text-ellipsis" style={{ color: colorData.hex }}>
                                      {schoolClass ? (language === 'ur' ? schoolClass.nameUr : schoolClass.nameEn) : 'No Class'}
                                  </span>
                                  <span className="text-xs md:text-sm font-black text-black dark:text-white opacity-80 block w-full overflow-hidden whitespace-nowrap text-ellipsis" style={{ color: colorData.hex }}>
                                      {subject ? (language === 'ur' ? subject.nameUr : subject.nameEn) : (jp?.name || 'Unknown')}
                                  </span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                  {group.length > 1 && (
                                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">x{group.length}</span>
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
                                                <span className={`text-[0.5625rem] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                    log.type === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                                                    log.type === 'add' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                }`}>
                                                    {log.type}
                                                </span>
                                                <span className="text-[0.625rem] font-bold opacity-50 text-[var(--text-secondary)]">
                                                    {new Date(log.timestamp).toLocaleString([], { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                                                                {new Date(item.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-secondary)]">{item.dayName}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-[0.625rem] font-bold uppercase border ${item.leaveType === 'full' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
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
                                                                {new Date(item.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                <div className="text-[0.625rem] text-[var(--text-secondary)] uppercase font-bold">{item.dayName}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)] bg-[var(--bg-tertiary)]/30">{item.period}</td>
                                                            <td className="px-4 py-3">
                                                                {item.type === 'sub_given' ? (
                                                                    <span className="px-2 py-1 rounded text-[0.625rem] font-bold uppercase bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">Given ➔</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded text-[0.625rem] font-bold uppercase bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">Taken ⬅️</span>
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
    </div>
  );
};

export default TeacherTimetablePage;
