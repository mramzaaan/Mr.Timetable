
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
    // Create structure with all days
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
          if (periodIndex < maxPeriods) { // Ensure safety
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

    const assignedPeriodsCount = new Map<string, number>(); // key: 'classId-subjectId' or 'jp-jointPeriodId'
    
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
              
              <div className="p-4 rounded-lg shadow-md border bg-[var(--bg-secondary)] border-[var(--border-primary)]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{t.unscheduledPeriods} ({(Object.values(groupedUnscheduled) as Period[][]).reduce((sum, group) => sum + (group[0].jointPeriodId ? 1 : group.length), 0)})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {(Object.values(groupedUnscheduled) as Period[][]).map((group, index) => {
                      const isJoint = !!group[0].jointPeriodId;
                      const firstPeriod = group[0];
                      const subject = subjects.find(s => s.id === firstPeriod.subjectId);
                      let contextDisplay: React.ReactNode;
                      if(isJoint) {
                        const classesInvolved = [...new Set(group.map(p => p.classId))].map(id => classes.find(c => c.id === id)?.nameEn).join(', ');
                        contextDisplay = `(Joint: ${classesInvolved})`;
                      } else {
                        const className = classes.find(c => c.id === firstPeriod.classId)?.nameEn;
                        contextDisplay = `(${className})`;
                      }
                      
                      return (
                        <div key={`${firstPeriod.id}-${index}`} className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `var(--${subjectColorMap.get(firstPeriod.subjectId) || 'subject-default'}-bg)`, color: `var(--${subjectColorMap.get(firstPeriod.subjectId) || 'subject-default'}-text)` }}>
                              x{group.length / (isJoint ? new Set(group.map(p=>p.classId)).size : 1)}
                          </div>
                          <div className="text-sm">
                            <p className="font-semibold text-[var(--text-primary)]">{subject?.nameEn}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{contextDisplay}</p>
                          </div>
                        </div>
                      )
                  })}
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
                          <td key={day} className={`border border-[var(--border-secondary)] h-28 p-0.5 align-top ${isDisabled ? 'bg-[var(--slot-disabled-bg)]' : ''}`}>
                            <div className="h-full flex flex-col items-stretch justify-start gap-0.5">
                                {slotPeriods.map(period => (
                                    <PeriodCard
                                        key={period.id}
                                        period={period}
                                        onDragStart={()=>{}}
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
