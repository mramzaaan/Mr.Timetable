
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, DownloadFormat, DownloadLanguage, SchoolConfig, Adjustment, JointPeriod, ClassSubject, DownloadDesignConfig } from '../types';
import { allDays } from '../types';
import PeriodCard from './PeriodCard';
import PeriodStack from './PeriodStack';
import CopyTimetableModal from './CopyTimetableModal';
import PrintPreview from './PrintPreview';
import { generateUniqueId } from '../types';
import { translations } from '../i18n';
import ClassCommunicationModal from './ClassCommunicationModal';
import DownloadModal from './DownloadModal';
import { generateClassTimetableHtml } from './reportUtils';

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
}

type SlotAvailability = { status: 'available' | 'conflict'; reason?: string };
type AvailabilityGrid = Record<keyof TimetableGridData, SlotAvailability[]>;

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 bg-white/80 rounded-full p-0.5 shadow-md" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const ClearIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;


const ClassTimetablePage: React.FC<ClassTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, onUpdateSchoolConfig, selection, onSelectionChange, openConfirmation }) => {
  const { classId: selectedClassId, highlightedTeacherId } = selection;
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  
  // Ref for detecting clicks outside
  const tableRef = useRef<HTMLDivElement>(null);

  // Derived active days and periods based on config
  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8)), [activeDays, schoolConfig.daysConfig]);
  const periodLabels = useMemo(() => Array.from({length: maxPeriods}, (_, i) => (i + 1).toString()), [maxPeriods]);

  useEffect(() => {
      if (!selectedClassId && classes.length > 0) {
          onSelectionChange(prev => ({ ...prev, classId: classes[0].id }));
      }
  }, [classes, selectedClassId, onSelectionChange]);
  
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const getTeacherAvailability = useCallback((day: keyof TimetableGridData, periodIndex: number): Set<string> => {
      const busyTeacherIds = new Set<string>();
      classes.forEach(c => {
          if (c.id === selectedClassId) return; 
          
          c.timetable[day]?.[periodIndex]?.forEach(p => {
              busyTeacherIds.add(p.teacherId);
          });
      });
      return busyTeacherIds;
  }, [classes, selectedClassId]);

  const availabilityGrid = useMemo(() => {
      if (!selectedClass || !draggedData) return null;
      
      const grid: AvailabilityGrid = {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
      };
      
      activeDays.forEach(day => {
          const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
          
          for (let i = 0; i < maxPeriods; i++) {
              if (i >= periodLimit) {
                   grid[day].push({ status: 'conflict', reason: 'Closed' });
                   continue;
              }
              
              let hasConflict = false;
              let conflictReason = '';
              
              const busyTeachers = getTeacherAvailability(day, i);
              
              for (const p of draggedData.periods) {
                  if (busyTeachers.has(p.teacherId)) {
                      hasConflict = true;
                      const conflictTeacher = teachers.find(t => t.id === p.teacherId);
                      conflictReason = `${conflictTeacher?.nameEn || 'Teacher'} is busy`;
                      break;
                  }
              }
              
              if (!hasConflict) {
                  const currentPeriods = selectedClass.timetable[day]?.[i] || [];
                  const potentialPeriods = [...currentPeriods, ...draggedData.periods];
                  
                  const groupSetsInSlot = new Set<string>();
                  let hasStandardSubject = false;
                  let valid = true;
                  
                  const groupUsage = new Map<string, Set<string>>(); 

                  for (const p of potentialPeriods) {
                      const classSubject = selectedClass.subjects.find(s => s.subjectId === p.subjectId);
                      
                      if (p.jointPeriodId) {
                          if (potentialPeriods.length > 1 && potentialPeriods.some(op => op !== p)) {
                          }
                          hasStandardSubject = true; 
                      } else if (classSubject?.groupSetId && classSubject.groupId) {
                          groupSetsInSlot.add(classSubject.groupSetId);
                          if (!groupUsage.has(classSubject.groupSetId)) {
                              groupUsage.set(classSubject.groupSetId, new Set());
                          }
                          if (groupUsage.get(classSubject.groupSetId)!.has(classSubject.groupId)) {
                              valid = false; 
                              conflictReason = "Duplicate group";
                          }
                          groupUsage.get(classSubject.groupSetId)!.add(classSubject.groupId);
                      } else {
                          hasStandardSubject = true;
                      }
                  }

                  if (valid) {
                      if (hasStandardSubject && groupSetsInSlot.size > 0) {
                           valid = false;
                           conflictReason = "Cannot mix Standard & Grouped";
                      } else if (groupSetsInSlot.size > 1) {
                          valid = false;
                          conflictReason = "Mixed Group Sets";
                      } 
                  }
                  
                  if (!valid) {
                      hasConflict = true;
                      if (!conflictReason) conflictReason = "Invalid Combination";
                  }
              }
              
              grid[day].push({ 
                  status: hasConflict ? 'conflict' : 'available', 
                  reason: conflictReason 
              });
          }
      });
      return grid;
  }, [selectedClass, draggedData, activeDays, maxPeriods, schoolConfig.daysConfig, getTeacherAvailability, subjects]);


  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject, index) => {
      map.set(subject.id, subjectColorNames[index % subjectColorNames.length]);
    });
    return map;
  }, [subjects]);

  const handleDragStart = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => {
    setDraggedData({ periods, sourceDay, sourcePeriodIndex });
  };
  
  const handleDragEnd = () => {
      setDraggedData(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: keyof TimetableGridData, targetPeriodIndex: number) => {
    e.preventDefault();
    const data = draggedData;
    if (!data || !selectedClass) return;

    // Dynamic period check
    const periodLimit = schoolConfig.daysConfig?.[targetDay]?.periodCount ?? 8;
    if (targetPeriodIndex >= periodLimit) return;

    const { periods, sourceDay, sourcePeriodIndex } = data;

    if (sourceDay === targetDay && sourcePeriodIndex === targetPeriodIndex) return;

    const busyTeachers = getTeacherAvailability(targetDay, targetPeriodIndex);
    const conflictPeriod = periods.find(p => busyTeachers.has(p.teacherId));

    const performMove = () => {
        const updatedClass = { ...selectedClass };
        const newTimetable = { ...updatedClass.timetable };

        // 1. Remove from source (Immutable update)
        if (sourceDay && sourcePeriodIndex !== undefined) {
             const sourceDayPeriods = [...newTimetable[sourceDay]]; // Copy the day array
             const sourceSlot = sourceDayPeriods[sourcePeriodIndex] || [];
             const idsToRemove = new Set(periods.map(p => p.id));
             sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(p => !idsToRemove.has(p.id));
             newTimetable[sourceDay] = sourceDayPeriods;
        }

        // 2. Add to target (Immutable update)
        const targetDayPeriods = [...newTimetable[targetDay]]; // Copy the day array
        const targetSlot = targetDayPeriods[targetPeriodIndex] || [];
        targetDayPeriods[targetPeriodIndex] = [...targetSlot, ...periods];
        newTimetable[targetDay] = targetDayPeriods;

        updatedClass.timetable = newTimetable;
        const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
        onSetClasses(newClasses);
    };

    if (conflictPeriod) {
        const teacher = teachers.find(t => t.id === conflictPeriod.teacherId);
        openConfirmation(
            t.teacherConflictWarning,
            t.teacherConflictConfirmation.replace('{teacherName}', teacher?.nameEn || 'Teacher'),
            performMove
        );
    } else {
        performMove();
    }
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const data = draggedData;
      if (!data || !selectedClass) return;
      
      const { periods, sourceDay, sourcePeriodIndex } = data;
      
      // If it's coming from the grid (sourceDay is defined), "remove" it by not placing it anywhere else.
      if (sourceDay && sourcePeriodIndex !== undefined) {
          const updatedClass = { ...selectedClass };
          const newTimetable = { ...updatedClass.timetable };
          
          // Immutable removal
          const sourceDayPeriods = [...newTimetable[sourceDay]];
          const sourceSlot = sourceDayPeriods[sourcePeriodIndex];
          const idsToRemove = new Set(periods.map(p => p.id));
          sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(p => !idsToRemove.has(p.id));
          newTimetable[sourceDay] = sourceDayPeriods;
          
          updatedClass.timetable = newTimetable;
          const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
          onSetClasses(newClasses);
      }
  };

  const handleDragOver = (e: React.DragEvent, day?: keyof TimetableGridData, periodIndex?: number) => {
      e.preventDefault(); 
  };
  
  const handleDeleteStack = (periods: Period[]) => {
     if (!selectedClass) return;
     
     const updatedClass = { ...selectedClass };
     const newTimetable = { ...updatedClass.timetable };
     
     activeDays.forEach(day => {
         const dayPeriods = [...newTimetable[day]];
         let changed = false;
         dayPeriods.forEach((slot, idx) => {
             const idsToRemove = new Set(periods.map(p => p.id));
             if (slot.some(p => idsToRemove.has(p.id))) {
                 dayPeriods[idx] = slot.filter(p => !idsToRemove.has(p.id));
                 changed = true;
             }
         });
         if(changed) newTimetable[day] = dayPeriods;
     });
     
     updatedClass.timetable = newTimetable;
     const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
     onSetClasses(newClasses);
  };
  
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
          const relevantJointPeriod = jointPeriods.find(jp => 
              jp.assignments.some(a => a.classId === selectedClass.id && a.subjectId === sub.subjectId)
          );
          
          if (relevantJointPeriod) {
               return;
          }
          
          const scheduled = scheduledCounts.get(sub.subjectId) || 0;
          const remaining = sub.periodsPerWeek - scheduled;
          
          for (let i = 0; i < remaining; i++) {
              unscheduled.push({
                  id: generateUniqueId(),
                  classId: selectedClass.id,
                  subjectId: sub.subjectId,
                  teacherId: sub.teacherId
              });
          }
      });
      
      jointPeriods.forEach(jp => {
          const assignment = jp.assignments.find(a => a.classId === selectedClass.id);
          if (assignment) {
               const scheduled = scheduledCounts.get(`jp-${jp.id}`) || 0;
               const remaining = jp.periodsPerWeek - scheduled;
               
               for(let i=0; i<remaining; i++){
                   unscheduled.push({
                       id: generateUniqueId(),
                       classId: selectedClass.id,
                       subjectId: assignment.subjectId,
                       teacherId: jp.teacherId,
                       jointPeriodId: jp.id
                   });
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

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({
      downloadDesigns: { ...schoolConfig.downloadDesigns, class: newDesign }
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedClass && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.classTimetable}: ${selectedClass.nameEn}`} fileNameBase={`Timetable_${selectedClass.nameEn.replace(' ', '_')}`} generateHtml={(lang, options) => generateClassTimetableHtml(selectedClass, lang, options, teachers, subjects, schoolConfig)} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={handleSavePrintDesign} />)}
      {selectedClass && <CopyTimetableModal t={t} isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} classes={classes} subjects={subjects} teachers={teachers} onUpdateClass={(updatedClass) => { const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c); onSetClasses(newClasses); }} sourceClassId={selectedClass.id} />}
      {selectedClass && (<ClassCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedClass={selectedClass} inChargeTeacher={teachers.find(t => t.id === selectedClass.inCharge)!} subjects={subjects} teachers={teachers} schoolConfig={schoolConfig} subjectColorMap={subjectColorMap} />)}
      
      <DownloadModal
        t={t}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title={t.downloadTimetable}
        fileNameBase="Class_Timetables"
        items={classes}
        itemType="class"
        generateFullPageHtml={(item, lang, design) => generateClassTimetableHtml(item, lang, design, teachers, subjects, schoolConfig)}
        designConfig={schoolConfig.downloadDesigns.class}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label htmlFor="class-select" className="block text-sm font-medium text-[var(--text-secondary)]">{t.selectAClass}</label>
          <select id="class-select" value={selectedClassId || ''} onChange={(e) => onSelectionChange(prev => ({ ...prev, classId: e.target.value }))} 
            className="block w-full md:w-auto pl-3 pr-10 py-2 text-base bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md shadow-sm">
            {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nameEn} / {c.nameUr}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setIsDownloadModalOpen(true)} disabled={classes.length === 0} title={t.download} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
            <button onClick={() => setIsCopyModalOpen(true)} disabled={!selectedClass} title={t.copyTimetable} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><CopyIcon /></button>
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedClass} title={t.sendToInCharge} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedClass} title={t.printViewAction} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
            {selectedClass && (
              <button onClick={() => openConfirmation(t.clearTimetable, t.clearTimetableConfirm, () => {
                  const updatedClass = { ...selectedClass, timetable: { Monday: Array.from({length:8},()=>[]), Tuesday: Array.from({length:8},()=>[]), Wednesday: Array.from({length:8},()=>[]), Thursday: Array.from({length:8},()=>[]), Friday: Array.from({length:8},()=>[]), Saturday: Array.from({length:8},()=>[]) } };
                  onSetClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c));
              })} className="p-2 text-sm font-medium text-red-600 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-red-50 transition-colors" title={t.clearTimetable}>
                  <ClearIcon />
              </button>
            )}
        </div>
      </div>

      {!selectedClass ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectAClass}</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Unscheduled Periods Sidebar */}
          <div className="lg:w-1/4">
            <div 
                className={`bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-primary)] sticky top-24 ${draggedData?.sourceDay ? 'unscheduled-drop-target' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleSidebarDrop}
            >
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{t.unscheduledPeriods}</h3>
              {Object.keys(groupedUnscheduled).length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] italic">{t.dragAndDropInstruction}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {Object.values(groupedUnscheduled).map((group, index) => (
                    <PeriodStack 
                        key={`unscheduled-${index}`} 
                        periods={group} 
                        onDragStart={handleDragStart} 
                        colorName={subjectColorMap.get(group[0].subjectId)}
                        language={language}
                        subjects={subjects}
                        teachers={teachers}
                        classes={classes}
                        displayContext="teacher"
                        isHighlighted={selection.highlightedTeacherId === group[0].teacherId}
                        isDimmed={selection.highlightedTeacherId ? selection.highlightedTeacherId !== group[0].teacherId : false}
                        showCount={true}
                    />
                  ))}
                </div>
              )}
            </div>
             <div className="mt-4 bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-primary)]">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t.highlightTeacher}</label>
                <select 
                    value={highlightedTeacherId} 
                    onChange={(e) => onSelectionChange(prev => ({ ...prev, highlightedTeacherId: e.target.value }))}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md"
                >
                    <option value="">{t.select}</option>
                    {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>{teacher.nameEn}</option>
                    ))}
                </select>
             </div>
          </div>

          {/* Timetable Grid */}
          <div className="lg:w-3/4 overflow-x-auto" ref={tableRef}>
            <div className="bg-[var(--bg-secondary)] shadow-lg rounded-lg overflow-hidden border border-[var(--border-primary)]">
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
                        const availability = availabilityGrid?.[day]?.[periodIndex];
                        const isConflict = availability?.status === 'conflict';

                       const groupedPeriods = Object.values(slotPeriods.reduce((acc, p) => {
                            const key = p.jointPeriodId || p.subjectId + (classes.find(c => c.id === p.classId)?.subjects.find(s => s.subjectId === p.subjectId)?.groupId || p.id);
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(p);
                            return acc;
                        }, {} as Record<string, Period[]>)) as Period[][];

                        return (
                          <td key={day} className={`border border-[var(--border-secondary)] h-24 p-1 align-top ${isDisabled ? 'bg-[var(--slot-disabled-bg)] cursor-not-allowed' : slotPeriods.length > 0 && isConflict ? 'bg-[var(--slot-conflict-bg)]' : 'bg-[var(--slot-available-bg)]'} transition-colors duration-300 ${!isDisabled ? 'drop-target-available' : ''} relative group`}
                            onDragOver={(e) => !isDisabled && handleDragOver(e, day, periodIndex)}
                            onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                            title={isConflict ? availability?.reason : ''}
                          >
                             {isConflict && !isDisabled && (
                                <div className="absolute top-0 right-0 p-0.5 z-20">
                                    <WarningIcon />
                                </div>
                             )}
                            {!isDisabled && (
                                <div className="h-full flex flex-col gap-1">
                                    {groupedPeriods.map((group, groupIndex) => (
                                        <PeriodStack 
                                            key={`${group[0].id}-${groupIndex}`}
                                            periods={group}
                                            onDragStart={(draggedPeriods) => handleDragStart(draggedPeriods, day, periodIndex)}
                                            onDragEnd={handleDragEnd}
                                            onDeleteStack={() => handleDeleteStack(group)}
                                            colorName={subjectColorMap.get(group[0].subjectId)}
                                            language={language}
                                            subjects={subjects}
                                            teachers={teachers}
                                            classes={classes}
                                            displayContext="teacher"
                                            isHighlighted={selection.highlightedTeacherId === group[0].teacherId}
                                            isDimmed={selection.highlightedTeacherId ? selection.highlightedTeacherId !== group[0].teacherId : false}
                                            className="w-full"
                                        />
                                    ))}
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
    </div>
  );
};

export default ClassTimetablePage;
