
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, DownloadLanguage, SchoolConfig, Adjustment, JointPeriod, ClassSubject, DownloadDesignConfig } from '../types';
import { allDays } from '../types';
import PeriodCard from './PeriodCard';
import PeriodStack from './PeriodStack';
import TeacherAvailabilitySummary from './TeacherAvailabilitySummary';
import { generateUniqueId } from '../types';
import PrintPreview from './PrintPreview';
import { translations } from '../i18n';
import TeacherCommunicationModal from './TeacherCommunicationModal';
import { calculateWorkloadStats, generateTeacherTimetableHtml } from './reportUtils';
import DownloadModal from './DownloadModal';

interface TeacherTimetablePageProps {
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
  selectedTeacherId: string | null;
  onSelectedTeacherChange: (id: string | null) => void;
}

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];

export const TeacherTimetablePage: React.FC<TeacherTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, onUpdateSchoolConfig, selectedTeacherId, onSelectedTeacherChange }) => {
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  
  // Drag and drop state
  const [draggedData, setDraggedData] = useState<{ periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number } | null>(null);

  // Derived active days and periods based on config
  const activeDays = useMemo(() => allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), [schoolConfig.daysConfig]);
  const maxPeriods = useMemo(() => Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8)), [activeDays, schoolConfig.daysConfig]);
  const periodLabels = useMemo(() => Array.from({length: maxPeriods}, (_, i) => (i + 1).toString()), [maxPeriods]);

  useEffect(() => {
    if (!selectedTeacherId && teachers && teachers.length > 0) {
      onSelectedTeacherChange(teachers[0].id);
    }
    // If a teacher was selected but is no longer in the list (e.g., deleted), select the first one.
    else if (selectedTeacherId && teachers && !teachers.some(t => t.id === selectedTeacherId)) {
      onSelectedTeacherChange(teachers.length > 0 ? teachers[0].id : null);
    }
  }, [selectedTeacherId, teachers, onSelectedTeacherChange]);

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject, index) => {
      map.set(subject.id, subjectColorNames[index % subjectColorNames.length]);
    });
    return map;
  }, [subjects]);

  const teacherTimetableData: TimetableGridData = useMemo(() => {
    const timetable: TimetableGridData = {
      Monday: Array.from({ length: maxPeriods }, (): Period[] => []),
      Tuesday: Array.from({ length: maxPeriods }, (): Period[] => []),
      Wednesday: Array.from({ length: maxPeriods }, (): Period[] => []),
      Thursday: Array.from({ length: maxPeriods }, (): Period[] => []),
      Friday: Array.from({ length: maxPeriods }, (): Period[] => []),
      Saturday: Array.from({ length: maxPeriods }, (): Period[] => []),
    };
    if (!selectedTeacherId) return timetable;

    classes.forEach(c => {
      allDays.forEach(day => {
        c.timetable[day]?.forEach((slot, periodIndex) => {
          if (periodIndex < maxPeriods) { 
              slot.forEach(p => {
                if (p.teacherId === selectedTeacherId) {
                  if (!timetable[day][periodIndex]) timetable[day][periodIndex] = [];
                  timetable[day][periodIndex].push(p);
                }
              });
          }
        });
      });
    });

    return timetable;
  }, [selectedTeacherId, classes, maxPeriods]);
  
  const workloadStats = useMemo(() => calculateWorkloadStats(selectedTeacherId, classes, adjustments), [selectedTeacherId, classes, adjustments]);

  const unscheduledPeriods = useMemo(() => {
    if (!selectedTeacherId) return [];

    const assignedPeriodsCount = new Map<string, number>(); 
    
    classes.forEach(c => {
      allDays.forEach(day => {
        c.timetable[day]?.forEach(slot => {
          slot.forEach(p => {
            if (p.teacherId !== selectedTeacherId) return;

            const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : `${p.classId}-${p.subjectId}`;
            assignedPeriodsCount.set(key, (assignedPeriodsCount.get(key) || 0) + 1);
          });
        });
      });
    });

    const unplaced: Period[] = [];
    
    classes.forEach(c => {
        c.subjects.forEach(cs => {
            if (cs.teacherId === selectedTeacherId) {
                const isJointAssignment = jointPeriods.some(jp => 
                    jp.assignments.some(a => a.classId === c.id && a.subjectId === cs.subjectId)
                );

                if (isJointAssignment) return;

                const assigned = assignedPeriodsCount.get(`${c.id}-${cs.subjectId}`) || 0;
                const needed = cs.periodsPerWeek - assigned;
                if (needed > 0) {
                    for(let i=0; i<needed; i++){
                        unplaced.push({ id: `unscheduled-${c.id}-${cs.subjectId}-${i}`, classId: c.id, subjectId: cs.subjectId, teacherId: cs.teacherId });
                    }
                }
            }
        });
    });

    jointPeriods.forEach(jp => {
        if(jp.teacherId === selectedTeacherId) {
            const assigned = assignedPeriodsCount.get(`jp-${jp.id}`) || 0;
            const needed = jp.periodsPerWeek - assigned;
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    jp.assignments.forEach(a => {
                        unplaced.push({
                            id: `unscheduled-jp-${jp.id}-${a.classId}-${i}`,
                            classId: a.classId, subjectId: a.subjectId,
                            teacherId: jp.teacherId, jointPeriodId: jp.id
                        });
                    });
                }
            }
        }
    });

    return unplaced;
  }, [selectedTeacherId, classes, jointPeriods]);

  const groupedUnscheduled = useMemo(() => {
    return unscheduledPeriods.reduce((acc, period) => {
        const key = period.jointPeriodId 
            ? `jp-${period.jointPeriodId}`
            : `${period.classId}-${period.subjectId}`;
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(period);
        return acc;
    }, {} as Record<string, Period[]>);
  }, [unscheduledPeriods]);
  
  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({
      downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (periods: Period[], sourceDay?: keyof TimetableGridData, sourcePeriodIndex?: number) => {
      // If the period being dragged is a Joint Period, we must drag all instances of it in this slot.
      // But in teacher timetable view, all instances are usually visible in the same slot if the teacher is the same.
      // However, if we drag from unscheduled, `periods` is already a group from the stack.
      // If we drag from the grid, we need to make sure we grab all periods if it's joint.
      
      let draggedPeriods = periods;
      
      if (sourceDay && sourcePeriodIndex !== undefined && periods.length === 1 && periods[0].jointPeriodId) {
          const jointId = periods[0].jointPeriodId;
          // Find all periods in this slot for this teacher that share the jointPeriodId
          const allInSlot = teacherTimetableData[sourceDay][sourcePeriodIndex];
          const related = allInSlot.filter(p => p.jointPeriodId === jointId);
          if (related.length > 0) {
              draggedPeriods = related;
          }
      }

      setDraggedData({ periods: draggedPeriods, sourceDay, sourcePeriodIndex });
  };

  const handleDragOver = (e: React.DragEvent, day?: keyof TimetableGridData, periodIndex?: number) => {
      e.preventDefault(); 
  };

  const getClassAvailability = (classId: string, day: keyof TimetableGridData, periodIndex: number): boolean => {
      const targetClass = classes.find(c => c.id === classId);
      if (!targetClass) return false;
      // Check if this class has ANY period scheduled at this time
      const slot = targetClass.timetable[day]?.[periodIndex] || [];
      return slot.length > 0;
  };

  const handleDrop = (e: React.DragEvent, targetDay: keyof TimetableGridData, targetPeriodIndex: number) => {
      e.preventDefault();
      if (!draggedData || !selectedTeacherId) return;

      // Dynamic period check
      const periodLimit = schoolConfig.daysConfig?.[targetDay]?.periodCount ?? 8;
      if (targetPeriodIndex >= periodLimit) return;

      const { periods, sourceDay, sourcePeriodIndex } = draggedData;
      if (sourceDay === targetDay && sourcePeriodIndex === targetPeriodIndex) return;

      // Check conflicts: Is the CLASS free at target slot?
      let conflictClassNames: string[] = [];
      
      periods.forEach(p => {
          // If moving to same slot (prevented above), no check needed.
          // Check if class is busy at new slot
          const isBusy = getClassAvailability(p.classId, targetDay, targetPeriodIndex);
          if (isBusy) {
              const c = classes.find(cls => cls.id === p.classId);
              if (c) conflictClassNames.push(c.nameEn);
          }
      });

      if (conflictClassNames.length > 0) {
          alert(`Cannot move: The following classes are already busy at this time: ${conflictClassNames.join(', ')}`);
          return;
      }

      // Perform Move (Immutable Update)
      const newClasses = [...classes];
      
      // 1. Remove from source (if any)
      if (sourceDay && sourcePeriodIndex !== undefined) {
          periods.forEach(p => {
              const classIndex = newClasses.findIndex(c => c.id === p.classId);
              if (classIndex !== -1) {
                  const updatedClass = { ...newClasses[classIndex] };
                  const updatedTimetable = { ...updatedClass.timetable };
                  
                  // Copy day array
                  const sourceDayPeriods = [...updatedTimetable[sourceDay]];
                  const sourceSlot = sourceDayPeriods[sourcePeriodIndex] || [];
                  
                  sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(existing => existing.id !== p.id);
                  updatedTimetable[sourceDay] = sourceDayPeriods;
                  
                  updatedClass.timetable = updatedTimetable;
                  newClasses[classIndex] = updatedClass;
              }
          });
      }

      // 2. Add to target
      periods.forEach(p => {
          const classIndex = newClasses.findIndex(c => c.id === p.classId);
          if (classIndex !== -1) {
              const updatedClass = { ...newClasses[classIndex] };
              const updatedTimetable = { ...updatedClass.timetable };
              
              // Copy day array
              const targetDayPeriods = [...updatedTimetable[targetDay]];
              const targetSlot = targetDayPeriods[targetPeriodIndex] || [];
              
              targetDayPeriods[targetPeriodIndex] = [...targetSlot, p];
              updatedTimetable[targetDay] = targetDayPeriods;
              
              updatedClass.timetable = updatedTimetable;
              newClasses[classIndex] = updatedClass;
          }
      });

      onSetClasses(newClasses);
      setDraggedData(null);
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const data = draggedData;
      if (!data || !selectedTeacherId) return;
      
      const { periods, sourceDay, sourcePeriodIndex } = data;
      
      // If coming from grid, remove it (unschedule)
      if (sourceDay && sourcePeriodIndex !== undefined) {
          const newClasses = [...classes];
          periods.forEach(p => {
              const classIndex = newClasses.findIndex(c => c.id === p.classId);
              if (classIndex !== -1) {
                  const updatedClass = { ...newClasses[classIndex] };
                  const updatedTimetable = { ...updatedClass.timetable };
                  
                  // Copy day array
                  const sourceDayPeriods = [...updatedTimetable[sourceDay]];
                  const sourceSlot = sourceDayPeriods[sourcePeriodIndex] || [];
                  
                  sourceDayPeriods[sourcePeriodIndex] = sourceSlot.filter(existing => existing.id !== p.id);
                  updatedTimetable[sourceDay] = sourceDayPeriods;
                  
                  updatedClass.timetable = updatedTimetable;
                  newClasses[classIndex] = updatedClass;
              }
          });
          onSetClasses(newClasses);
      }
      setDraggedData(null);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedTeacher && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.teacherTimetable}: ${selectedTeacher.nameEn}`} fileNameBase={`Timetable_${selectedTeacher.nameEn.replace(' ', '_')}`} generateHtml={(lang, options) => generateTeacherTimetableHtml(selectedTeacher, lang, options, classes, subjects, schoolConfig, adjustments)} designConfig={schoolConfig.downloadDesigns.teacher} onSaveDesign={handleSavePrintDesign} />)}
      {selectedTeacher && (<TeacherCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedTeacher={selectedTeacher} teacherTimetableData={teacherTimetableData} subjects={subjects} classes={classes} schoolConfig={schoolConfig} subjectColorMap={subjectColorMap} />)}
      
      <DownloadModal
        t={t}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title={t.downloadTimetable}
        fileNameBase="Teacher_Timetables"
        items={teachers}
        itemType="teacher"
        generateFullPageHtml={(item, lang, design) => generateTeacherTimetableHtml(item, lang, design, classes, subjects, schoolConfig, adjustments)}
        designConfig={schoolConfig.downloadDesigns.teacher}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label htmlFor="teacher-select" className="block text-sm font-medium text-[var(--text-secondary)]">{t.selectATeacher}</label>
          <select id="teacher-select" value={selectedTeacherId || ''} onChange={(e) => onSelectedTeacherChange(e.target.value)}
            className="block w-full md:w-auto pl-3 pr-10 py-2 text-base bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md shadow-sm">
            {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.nameEn} / {teacher.nameUr}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setIsDownloadModalOpen(true)} disabled={teachers.length === 0} title={t.download} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedTeacher} title={t.sendToTeacher} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedTeacher} title={t.printViewAction} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
        </div>
      </div>

      {!selectedTeacher ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectATeacher}</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <div className="sticky top-24 space-y-6">
              <TeacherAvailabilitySummary t={t} workloadStats={workloadStats} />
              
              <div 
                className={`p-4 rounded-lg shadow-md border bg-[var(--bg-secondary)] border-[var(--border-primary)] ${draggedData?.sourceDay ? 'unscheduled-drop-target' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleSidebarDrop}
              >
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{t.unscheduledPeriods} ({(Object.values(groupedUnscheduled) as Period[][]).reduce((sum, group) => sum + (group[0].jointPeriodId ? 1 : group.length), 0)})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {(Object.values(groupedUnscheduled) as Period[][]).map((group, index) => (
                      <PeriodStack 
                        key={`${group[0].id}-${index}`}
                        periods={group}
                        onDragStart={handleDragStart}
                        colorName={subjectColorMap.get(group[0].subjectId)}
                        language={language}
                        subjects={subjects}
                        teachers={teachers}
                        classes={classes}
                        displayContext="class"
                        showCount={true}
                        jointPeriodName={group[0].jointPeriodId ? jointPeriods.find(j=>j.id===group[0].jointPeriodId)?.name : undefined}
                      />
                  ))}
                </div>
              </div>

            </div>
          </div>
          <div className="lg:w-3/4 overflow-x-auto">
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
                        const slotPeriods = teacherTimetableData[day]?.[periodIndex] || [];
                        
                        return (
                          <td 
                            key={day} 
                            className={`border border-[var(--border-secondary)] h-28 p-0.5 align-top ${isDisabled ? 'bg-[var(--slot-disabled-bg)]' : ''} ${!isDisabled ? 'drop-target-available' : ''}`}
                            onDragOver={(e) => !isDisabled && handleDragOver(e, day, periodIndex)}
                            onDrop={(e) => !isDisabled && handleDrop(e, day, periodIndex)}
                          >
                            <div className="h-full flex flex-col items-stretch justify-start gap-0.5">
                                {slotPeriods.map(period => (
                                    <PeriodCard
                                        key={period.id}
                                        period={period}
                                        onDragStart={() => handleDragStart([period], day, periodIndex)}
                                        colorName={subjectColorMap.get(period.subjectId)}
                                        language={language}
                                        subjects={subjects}
                                        teachers={teachers}
                                        classes={classes}
                                        displayContext="class"
                                    />
                                ))}
                            </div>
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
