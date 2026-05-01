import React, { useState, useMemo, useEffect } from 'react';
import type { Teacher, SchoolClass, Subject, JointPeriod, TimetableSession, GroupSet, TimetableChangeLog, TimetableGridData, Period } from '../types';
import { generateUniqueId, allDays, getColorForId } from '../types';

interface AddLessonFormProps {
  t: any;
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  jointPeriods: JointPeriod[];
  onSetClasses: (classes: SchoolClass[]) => void;
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
  limitToClassId?: string;
  limitToTeacherId?: string;
}

const NON_TEACHING_CLASS_ID = 'non-teaching-duties';

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

const AddLessonForm: React.FC<AddLessonFormProps> = ({ 
    t, teachers, classes, subjects, jointPeriods, 
    onSetClasses, onUpdateTimetableSession, openConfirmation,
    limitToClassId, limitToTeacherId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Unified Form State
  const [teacherId, setTeacherId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [periodsCount, setPeriodsCount] = useState<number>(1);
  const [isPracticalSubject, setIsPracticalSubject] = useState(false);
  const [practicalPeriodsCount, setPracticalPeriodsCount] = useState<number>(1);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]); 
  
  // Groups
  const [isGroupLesson, setIsGroupLesson] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');
  const [customGroupSetName, setCustomGroupSetName] = useState('Subject Groups');

  // List View State
  const [sortBy, setSortBy] = useState<'class' | 'teacher'>('class');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isClassesExpanded, setIsClassesExpanded] = useState(false);
  const [isJointPeriod, setIsJointPeriod] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Edit Context
  const [editingLesson, setEditingLesson] = useState<{
      originalType: 'single' | 'joint';
      // For Single:
      originalClassId?: string;
      originalSubjectIndex?: number;
      // For Joint:
      originalJointPeriodId?: string;
  } | null>(null);

  useEffect(() => {
      if (limitToClassId) {
          setExpandedId(limitToClassId);
          setSelectedClassIds([limitToClassId]);
      }
      if (limitToTeacherId) {
          setTeacherId(limitToTeacherId);
      }
  }, [limitToClassId, limitToTeacherId]);

  const resetForm = () => {
    setTeacherId(limitToTeacherId || '');
    setSubjectId('');
    setPeriodsCount(1);
    setIsPracticalSubject(false);
    setPracticalPeriodsCount(1);
    setSelectedClassIds(limitToClassId ? [limitToClassId] : []);
    setIsClassesExpanded(false);
    setIsJointPeriod(true);
    setIsGroupLesson(false);
    setCustomGroupName('');
    setCustomGroupSetName('Subject Groups');
    setEditingLesson(null);
  };

  const visibleClasses = useMemo(() => classes.filter(c => c.id !== NON_TEACHING_CLASS_ID), [classes]);

  const getOrCreateGroup = (schoolClass: SchoolClass, setName: string, groupName: string): { updatedClass: SchoolClass, groupSetId: string, groupId: string } => {
      const cls = { ...schoolClass };
      cls.groupSets = cls.groupSets ? [...cls.groupSets] : [];

      let groupSetIndex = cls.groupSets.findIndex(gs => gs.name.toLowerCase() === setName.trim().toLowerCase());
      let groupSet: GroupSet;

      if (groupSetIndex === -1) {
          groupSet = { id: generateUniqueId(), name: setName.trim(), groups: [] };
          cls.groupSets.push(groupSet);
          groupSetIndex = cls.groupSets.length - 1;
      } else {
          groupSet = { ...cls.groupSets[groupSetIndex], groups: [...cls.groupSets[groupSetIndex].groups] };
          cls.groupSets[groupSetIndex] = groupSet;
      }

      let group = groupSet.groups.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
      if (!group) {
          group = { id: generateUniqueId(), name: groupName.trim() };
          groupSet.groups.push(group);
      }

      return { 
          updatedClass: cls, 
          groupSetId: groupSet.id, 
          groupId: group.id 
      };
  };

  const handleSave = () => {
    if (!subjectId) {
      alert('Please select a subject.');
      return;
    }

    if (selectedClassIds.length === 0) {
        alert('Please select at least one class.');
        return;
    }

    if (isGroupLesson && !customGroupName.trim()) {
        alert('Please enter a Group Name (e.g., "Biology", "Group A").');
        return;
    }

    onUpdateTimetableSession((session) => {
        // Deep copy classes including timetable for safe mutation
        let currentClasses = session.classes.map(c => ({
            ...c, 
            subjects: [...c.subjects],
            timetable: Object.fromEntries(
                Object.entries(c.timetable).map(([key, daySlots]) => [
                    key, 
                    (daySlots as any).map((slot: any) => Array.isArray(slot) ? [...slot] : []) // Deep copy slots safely
                ])
            ) as TimetableGridData
        }));
        
        let currentJointPeriods = [...session.jointPeriods];
        let currentLogs = session.changeLogs || [];
        const logDetails: { msg: string, entityType: 'teacher'|'class', entityId: string }[] = [];

        // 1. Handle Removal of Old Lesson Definition (Allocation)
        if (editingLesson) {
            if (editingLesson.originalType === 'single' && editingLesson.originalClassId && typeof editingLesson.originalSubjectIndex === 'number') {
                const clsIndex = currentClasses.findIndex(c => c.id === editingLesson.originalClassId);
                if (clsIndex !== -1) {
                    const cls = currentClasses[clsIndex];
                    const newSubjects = [...cls.subjects];
                    if (editingLesson.originalSubjectIndex >= 0 && editingLesson.originalSubjectIndex < newSubjects.length) {
                        const removed = newSubjects[editingLesson.originalSubjectIndex];
                        const sub = subjects.find(s => s.id === removed.subjectId);
                        logDetails.push({ 
                            msg: `Removed lesson: ${sub?.nameEn || 'Subject'}`, 
                            entityType: 'class', 
                            entityId: cls.id 
                        });
                        newSubjects.splice(editingLesson.originalSubjectIndex, 1);
                        cls.subjects = newSubjects;
                        currentClasses[clsIndex] = cls;
                    }
                }
            } else if (editingLesson.originalType === 'joint' && editingLesson.originalJointPeriodId) {
                const jp = currentJointPeriods.find(j => j.id === editingLesson.originalJointPeriodId);
                if (jp) {
                    if (jp.teacherId) {
                        logDetails.push({ msg: `Removed Joint Lesson: ${jp.name}`, entityType: 'teacher', entityId: jp.teacherId });
                    }
                    currentJointPeriods = currentJointPeriods.filter(j => j.id !== editingLesson.originalJointPeriodId);
                }
            }
        }

        const sub = session.subjects.find(s => s.id === subjectId);
        const tea = session.teachers.find(t => t.id === teacherId);
        const actionType = editingLesson ? 'update' : 'add';

        // 2. Add New Lesson Definition (Allocation)
        if (selectedClassIds.length === 1 || !isJointPeriod) {
            selectedClassIds.forEach(targetClassId => {
                const targetClassIndex = currentClasses.findIndex(c => c.id === targetClassId);
                
                if (targetClassIndex !== -1) {
                    let targetClass = currentClasses[targetClassIndex];
                    
                    let assignedGroupSetId: string | undefined = undefined;
                    let assignedGroupId: string | undefined = undefined;

                    if (isGroupLesson) {
                        const result = getOrCreateGroup(targetClass, customGroupSetName || 'Subject Groups', customGroupName);
                        targetClass = result.updatedClass;
                        assignedGroupSetId = result.groupSetId;
                        assignedGroupId = result.groupId;
                    }

                    const newSubjectEntry = {
                        subjectId,
                        teacherId: teacherId || '',
                        periodsPerWeek: periodsCount,
                        practicalPeriodsCount: isPracticalSubject ? practicalPeriodsCount : undefined,
                        groupSetId: assignedGroupSetId,
                        groupId: assignedGroupId
                    };

                    targetClass = { ...targetClass, subjects: [...targetClass.subjects, newSubjectEntry] };
                    currentClasses[targetClassIndex] = targetClass;
                    
                    const desc = `${actionType === 'add' ? 'Added' : 'Updated'} lesson: ${sub?.nameEn} (${periodsCount} periods/week)${tea ? ` assigned to ${tea.nameEn}` : ''}`;
                    currentLogs.push(createLog(actionType, desc, 'class', targetClass.id));
                    if (tea) {
                        currentLogs.push(createLog(actionType, `${desc} for class ${targetClass.nameEn}`, 'teacher', tea.id));
                    }
                }
            });
        } else {
            const name = `${sub?.nameEn || 'Lesson'} (${tea?.nameEn || 'No Teacher'})`;

            const assignmentsWithGroups = selectedClassIds.map(classId => {
                const clsIndex = currentClasses.findIndex(c => c.id === classId);
                if (clsIndex === -1) return { classId, subjectId };

                let cls = currentClasses[clsIndex];
                let groupSetId: string | undefined = undefined;
                let groupId: string | undefined = undefined;

                if (isGroupLesson) {
                    const result = getOrCreateGroup(cls, customGroupSetName || 'Subject Groups', customGroupName);
                    cls = result.updatedClass;
                    groupSetId = result.groupSetId;
                    groupId = result.groupId;
                    
                    currentClasses[clsIndex] = cls;
                }

                return {
                    classId,
                    subjectId,
                    groupSetId,
                    groupId
                };
            });

            const jpData = {
                id: editingLesson?.originalJointPeriodId || generateUniqueId(), 
                name,
                teacherId: teacherId || '',
                periodsPerWeek: periodsCount,
                practicalPeriodsCount: isPracticalSubject ? practicalPeriodsCount : undefined,
                assignments: assignmentsWithGroups
            };
            
            currentJointPeriods.push(jpData);
            
            const desc = `${actionType === 'add' ? 'Added' : 'Updated'} Joint Lesson: ${name} (${periodsCount} periods/week)`;
            if (tea) {
                currentLogs.push(createLog(actionType, desc, 'teacher', tea.id));
            }
        }

        // 3. Grid Synchronization: Update existing scheduled cards
        // Iterate through all classes involved in this lesson update
        selectedClassIds.forEach(clsId => {
            const cls = currentClasses.find(c => c.id === clsId);
            if (!cls) return;

            allDays.forEach(day => {
                const daySlots = cls.timetable[day];
                if (!daySlots) return;

                // We need to modify slots in place or replace them
                const newDaySlots = daySlots.map((slot, pIdx) => {
                    const updatedSlot: Period[] = [];
                    let slotModified = false;

                    slot.forEach(p => {
                        // Check if this period corresponds to the lesson being saved.
                        // We match by Subject ID.
                        // (Note: If joint period logic is complex, we might need more checks, 
                        // but usually subject match + class context is sufficient for single-subject updates)
                        
                        let isMatch = false;
                        if (editingLesson?.originalType === 'joint' && editingLesson.originalJointPeriodId) {
                             if (p.jointPeriodId === editingLesson.originalJointPeriodId) isMatch = true;
                        } else if (p.subjectId === subjectId) {
                             isMatch = true;
                        }

                        if (isMatch) {
                            // Check if new Teacher is busy in any OTHER class at this time
                            let isConflict = false;
                            if (teacherId && teacherId !== p.teacherId) {
                                isConflict = currentClasses.some(otherClass => 
                                    otherClass.timetable[day]?.[pIdx]?.some(otherP => 
                                        otherP.teacherId === teacherId && otherP.id !== p.id // Don't conflict with self if somehow duplicated
                                    )
                                );
                            }

                            if (isConflict) {
                                // Conflict: Unschedule (Drop this card)
                                slotModified = true;
                                // Log implicitly handled by UI state update
                            } else {
                                // No Conflict: Update Teacher
                                if (p.teacherId !== (teacherId || '')) {
                                    updatedSlot.push({ ...p, teacherId: teacherId || '' });
                                    slotModified = true;
                                } else {
                                    updatedSlot.push(p);
                                }
                            }
                        } else {
                            updatedSlot.push(p);
                        }
                    });
                    
                    return updatedSlot;
                });
                
                cls.timetable[day] = newDaySlots;
            });
        });
        
        return {
            ...session,
            classes: currentClasses,
            jointPeriods: currentJointPeriods,
            changeLogs: currentLogs
        };
    });

    const subName = subjects.find(s => s.id === subjectId)?.nameEn || 'Lesson';
    setNotification({ message: `${subName} saved successfully.`, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
    setIsModalOpen(false);
    resetForm();
  };

  const handleClassSelectionChange = (classId: string, checked: boolean) => {
      if (checked) setSelectedClassIds(prev => [...prev, classId]);
      else setSelectedClassIds(prev => prev.filter(id => id !== classId));
  };

  const handleEditClick = (lesson: any) => {
      resetForm();
      const type = lesson.type; 

      if (type === 'single') {
          const { classId, subjectIndex, subject } = lesson;
          setTeacherId(subject.teacherId);
          setSubjectId(subject.subjectId);
          setPeriodsCount(subject.periodsPerWeek);
          setIsPracticalSubject(!!subject.practicalPeriodsCount);
          setPracticalPeriodsCount(subject.practicalPeriodsCount || 1);
          setSelectedClassIds([classId]);
          
          if (subject.groupId) {
              setIsGroupLesson(true);
              const cls = classes.find(c => c.id === classId);
              const groupSet = cls?.groupSets?.find(gs => gs.id === subject.groupSetId);
              const group = groupSet?.groups.find(g => g.id === subject.groupId);
              if (group) setCustomGroupName(group.name);
              if (groupSet) setCustomGroupSetName(groupSet.name);
          } else {
              setIsGroupLesson(false);
          }

          setEditingLesson({ originalType: 'single', originalClassId: classId, originalSubjectIndex: subjectIndex });

      } else {
          const { jointPeriod } = lesson;
          setTeacherId(jointPeriod.teacherId);
          setSubjectId(jointPeriod.assignments[0]?.subjectId || '');
          setPeriodsCount(jointPeriod.periodsPerWeek);
          setIsPracticalSubject(!!jointPeriod.practicalPeriodsCount);
          setPracticalPeriodsCount(jointPeriod.practicalPeriodsCount || 1);
          
          const assignedIds = jointPeriod.assignments.map((a: any) => a.classId);
          if (assignedIds.length > 0 && assignedIds[0] !== NON_TEACHING_CLASS_ID) {
              setSelectedClassIds(assignedIds);
              setEditingLesson({ originalType: 'joint', originalJointPeriodId: jointPeriod.id });
          } else {
              setSelectedClassIds([]);
          }

          const firstAssign = jointPeriod.assignments[0];
          if (firstAssign && firstAssign.groupId) {
             setIsGroupLesson(true);
             const cls = classes.find(c => c.id === firstAssign.classId);
             const gs = cls?.groupSets?.find(gs => gs.id === firstAssign.groupSetId);
             const g = gs?.groups.find(g => g.id === firstAssign.groupId);
             if (g) setCustomGroupName(g.name);
             if (gs) setCustomGroupSetName(gs.name);
          } else {
             setIsGroupLesson(false);
          }
      }
      setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, lesson: any) => {
      e.stopPropagation();
      e.preventDefault(); 
      
      openConfirmation(t.delete, t.areYouSure || 'Are you sure?', () => {
          onUpdateTimetableSession((session) => {
              let currentClasses = session.classes.map(c => ({...c, subjects: [...c.subjects]}));
              let currentJointPeriods = [...session.jointPeriods];
              let currentLogs = session.changeLogs || [];

              if (lesson.type === 'single') {
                  const { classId } = lesson;
                  const targetClassIndex = currentClasses.findIndex(c => c.id === classId);
                  
                  if (targetClassIndex !== -1) {
                      const cls = { ...currentClasses[targetClassIndex] };
                      const newSubjects = [...cls.subjects];
                      
                      const subjectToRemove = lesson.subject;
                      const realIndex = newSubjects.findIndex(s => 
                          s.subjectId === subjectToRemove.subjectId && 
                          s.teacherId === subjectToRemove.teacherId && 
                          s.periodsPerWeek === subjectToRemove.periodsPerWeek &&
                          s.groupId === subjectToRemove.groupId
                      );

                      if (realIndex !== -1) {
                          const sub = session.subjects.find(s => s.id === subjectToRemove.subjectId);
                          const tea = session.teachers.find(t => t.id === subjectToRemove.teacherId);
                          const desc = `Deleted lesson: ${sub?.nameEn || 'Subject'} (${tea?.nameEn || 'No Teacher'})`;
                          
                          currentLogs.push(createLog('delete', desc, 'class', cls.id));
                          if(tea) currentLogs.push(createLog('delete', `${desc} from class ${cls.nameEn}`, 'teacher', tea.id));

                          newSubjects.splice(realIndex, 1);
                          cls.subjects = newSubjects;
                          currentClasses[targetClassIndex] = cls;
                      } else if (lesson.subjectIndex >= 0 && lesson.subjectIndex < newSubjects.length) {
                          const removed = newSubjects[lesson.subjectIndex];
                          const sub = session.subjects.find(s => s.id === removed.subjectId);
                          currentLogs.push(createLog('delete', `Deleted lesson: ${sub?.nameEn}`, 'class', cls.id));

                          newSubjects.splice(lesson.subjectIndex, 1);
                          cls.subjects = newSubjects;
                          currentClasses[targetClassIndex] = cls;
                      }
                  }
              } else {
                  if (lesson.jointPeriod.teacherId) {
                      currentLogs.push(createLog('delete', `Deleted Joint Lesson: ${lesson.jointPeriod.name}`, 'teacher', lesson.jointPeriod.teacherId));
                  }
                  currentJointPeriods = currentJointPeriods.filter(jp => jp.id !== lesson.jointPeriod.id);
              }

              return {
                  ...session,
                  classes: currentClasses,
                  jointPeriods: currentJointPeriods,
                  changeLogs: currentLogs
              };
          });
      });
  };

  const sortedList = useMemo(() => {
      if (limitToClassId) {
          const c = classes.find(cls => cls.id === limitToClassId);
          if (!c) return [];
          
          const teacherGroups = new Map<string, any[]>();
          
          c.subjects.forEach((s, idx) => {
              if (!s.teacherId) return;
              if (!teacherGroups.has(s.teacherId)) teacherGroups.set(s.teacherId, []);
              teacherGroups.get(s.teacherId)!.push({
                  type: 'single', key: `single-${c.id}-${idx}`, classId: c.id, subjectIndex: idx, subject: s,
                  displaySubject: subjects.find(sub => sub.id === s.subjectId), displayTeacher: teachers.find(t => t.id === s.teacherId),
                  groupName: s.groupId ? c.groupSets?.find(gs => gs.id === s.groupSetId)?.groups.find(g => g.id === s.groupId)?.name : undefined
              });
          });
          
          jointPeriods.filter(jp => jp.assignments?.some(a => a.classId === c.id)).forEach(jp => {
              if (!jp.teacherId) return;
              if (!teacherGroups.has(jp.teacherId)) teacherGroups.set(jp.teacherId, []);
              const firstAssign = jp.assignments.find(a => a.classId === c.id);
              teacherGroups.get(jp.teacherId)!.push({
                type: 'joint', key: `joint-${jp.id}`, jointPeriod: jp,
                displaySubject: subjects.find(sub => sub.id === firstAssign?.subjectId), displayTeacher: teachers.find(t => t.id === jp.teacherId),
                jointClassNames: jp.assignments?.map(a => classes.find(c => c.id === a.classId)?.nameEn).filter(Boolean).join(', '),
                groupName: firstAssign?.groupId ? c.groupSets?.find(gs => gs.id === firstAssign.groupSetId)?.groups.find(g => g.id === firstAssign.groupId)?.name : undefined
              });
          });
          
          return Array.from(teacherGroups.entries()).map(([teacherId, items]) => {
              const t = teachers.find(teacher => teacher.id === teacherId);
              return {
                  id: teacherId,
                  label: t?.nameEn || 'Unknown Teacher',
                  subLabel: t?.nameUr || '',
                  items: items.sort((a, b) => (a.displaySubject?.nameEn || '').localeCompare(b.displaySubject?.nameEn || ''))
              };
          }).sort((a, b) => a.label.localeCompare(b.label));
      }
      
      if (limitToTeacherId) {
          return classes.filter(c => c.id !== NON_TEACHING_CLASS_ID).map(c => {
               const standard = c.subjects.map((s, idx) => ({ s, idx })).filter(({ s }) => s.teacherId === limitToTeacherId).map(({ s, idx }) => ({
                  type: 'single', key: `single-${c.id}-${idx}`, classId: c.id, subjectIndex: idx, subject: s,
                  displaySubject: subjects.find(sub => sub.id === s.subjectId), displayTeacher: teachers.find(t => t.id === s.teacherId),
                  groupName: s.groupId ? c.groupSets?.find(gs => gs.id === s.groupSetId)?.groups.find(g => g.id === s.groupId)?.name : undefined
               }));
               const joints = jointPeriods.filter(jp => jp.teacherId === limitToTeacherId && jp.assignments.some(a => a.classId === c.id)).map(jp => {
                    const firstAssign = jp.assignments.find(a => a.classId === c.id);
                    return {
                        type: 'joint', key: `joint-${jp.id}`, jointPeriod: jp,
                        displaySubject: subjects.find(sub => sub.id === firstAssign?.subjectId), displayTeacher: teachers.find(t => t.id === jp.teacherId),
                        jointClassNames: jp.assignments?.map(a => classes.find(cls => cls.id === a.classId)?.nameEn).filter(Boolean).join(', '),
                        groupName: firstAssign?.groupId ? c.groupSets?.find(gs => gs.id === firstAssign.groupSetId)?.groups.find(g => g.id === firstAssign.groupId)?.name : undefined
                    };
                });
               const combinedItems = [...standard, ...joints].sort((a, b) => (a.displaySubject?.nameEn || '').localeCompare(b.displaySubject?.nameEn || ''));
               return { id: c.id, label: c.nameEn, subLabel: c.nameUr, items: combinedItems };
          }).filter(group => group.items.length > 0);
      }

      return classes.filter(c => c.id !== NON_TEACHING_CLASS_ID).map(c => ({ id: c.id, label: c.nameEn, subLabel: c.nameUr, items: [] }));
  }, [classes, teachers, subjects, jointPeriods, sortBy, limitToClassId, limitToTeacherId]);

  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem]  text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";

  return (
    <div className="space-y-6 relative">
      {notification && (
          <div className={`fixed top-4 right-4 z-[200] px-6 py-3 rounded-[2rem]  flex items-center gap-3 animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              <span className="font-bold">{notification.message}</span>
          </div>
      )}

      <div className="flex justify-between items-center">
          <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{t.lessonList}</h3>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="flex items-center gap-2 px-6 py-3 bg-[#10b981] text-white text-sm font-black uppercase tracking-wider rounded-full hover:bg-[#059669] transition-all  hover: hover:-translate-y-0.5 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span>{t.addLesson}</span>
          </button>
      </div>

      <div className="space-y-4">
          {sortedList.map(entity => (
              <div key={entity.id} className="bg-white dark:bg-[#1e293b] rounded-[1.5rem]  border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <button 
                    onClick={() => setExpandedId(expandedId === entity.id ? null : entity.id)} 
                    className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none group"
                  >
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-[1.25rem] text-sm font-bold  group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
                            {entity.label}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold ">
                            {entity.items.length}
                        </div>
                        {entity.subLabel && <span className="text-lg font-urdu text-gray-500 dark:text-gray-400">{entity.subLabel}</span>}
                      </div>
                      
                      <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors transform duration-200" style={{ transform: expandedId === entity.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </div>
                  </button>
                  
                  {expandedId === entity.id && (
                      <div className="p-4 bg-gray-50/30 dark:bg-gray-800/30 animate-fade-in">
                          {entity.items.length === 0 ? (
                              <p className="p-8 text-center text-gray-400 italic">No lessons found for this class.</p>
                          ) : (
                              <div className="space-y-3">
                                  {entity.items.map((item: any, index: number) => {
                                      const periodsCount = item.type === 'single' ? item.subject.periodsPerWeek : item.jointPeriod.periodsPerWeek;
                                      const keyForColor = item.type === 'joint' ? String(item.jointPeriod.id) : String(item.displaySubject?.id || item.key);
                                      const colorData = getColorForId(keyForColor);
                                      
                                      return (
                                          <div key={item.key} className="relative bg-white dark:bg-[#1a2332] rounded-[1.25rem]  border border-gray-100 dark:border-gray-700 p-5 flex justify-between items-start border-l-[0.375rem] hover: transition-shadow" style={{ borderLeftColor: colorData.hex }}>
                                              {/* Left Content */}
                                              <div className="space-y-4">
                                                  <div>
                                                      <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1">SUBJECT</p>
                                                      <h4 className="text-xl font-black text-slate-800 leading-none tracking-tight">{item.displaySubject?.nameEn || 'Unknown'}</h4>
                                                  </div>
                                                  <div>
                                                      <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">PERIODS</p>
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                              {periodsCount} {periodsCount === 1 ? 'PERIOD' : 'PERIODS'}
                                                          </span>
                                                          {item.type === 'joint' && !item.isDuty && sortBy === 'class' && (
                                                              <span className="text-[0.625rem] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-[1rem] border border-orange-100 uppercase tracking-wide">Joint</span>
                                                          )}
                                                          {item.type === 'single' && item.subject.practicalPeriodsCount > 0 && (
                                                              <span className="text-[0.625rem] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-[1rem] border border-teal-100 uppercase tracking-wide">{item.subject.practicalPeriodsCount} Prac</span>
                                                          )}
                                                          {item.type === 'joint' && item.jointPeriod.practicalPeriodsCount > 0 && (
                                                              <span className="text-[0.625rem] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-[1rem] border border-teal-100 uppercase tracking-wide">{item.jointPeriod.practicalPeriodsCount} Prac</span>
                                                          )}
                                                          {item.groupName && (
                                                              <span className="text-[0.625rem] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-[1rem] border border-purple-100 uppercase tracking-wide">{item.groupName}</span>
                                                          )}
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* Right Content */}
                                              <div className="text-right flex flex-col items-end justify-between h-full min-h-[5.625rem]">
                                                  <div className="mb-4">
                                                      <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1">TEACHER</p>
                                                      <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">{sortBy === 'class' ? (item.displayTeacher?.nameEn || t.withoutTeacher) : (item.type === 'single' ? item.displayClass?.nameEn : item.displayClasses)}</p>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-4 mt-auto">
                                                      <button type="button" onClick={() => handleEditClick(item)} className="text-blue-500 hover:text-blue-600 transition-colors p-1" title="Edit">
                                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                      </button>
                                                      <button type="button" onClick={(e) => handleDeleteClick(e, item)} className="text-red-400 hover:text-red-500 transition-colors p-1" title="Delete">
                                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 w-screen h-[100dvh] bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 transition-opacity" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-[2rem] max-w-md w-full max-h-[90dvh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <div className="p-8 pb-6">
                    <h3 className="text-2xl font-bold text-slate-900">{editingLesson ? t.updateLesson : t.addLesson}</h3>
                </div>
                <div className="px-8 pb-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Teacher */}
                    <div>
                        <label className="block text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest mb-2">{t.teacher}</label>
                        <div className="relative">
                            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent appearance-none font-medium" disabled={!!limitToTeacherId}>
                                <option value="">{t.withoutTeacher}</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.nameEn}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    {/* Subject */}
                    <div>
                        <label className="block text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest mb-2">{t.subject} <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent appearance-none font-medium">
                                <option value="">{t.select}</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    {/* Periods/Week */}
                    <div>
                        <label className="block text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest mb-2">{t.periodsPerWeek}</label>
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[2rem]">
                            <button 
                                type="button"
                                onClick={() => setPeriodsCount(Math.max(1, periodsCount - 1))}
                                className="w-10 h-10 rounded-[2rem] bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            </button>
                            <span className="text-lg font-bold text-slate-800 w-12 text-center">{periodsCount}</span>
                            <button 
                                type="button"
                                onClick={() => setPeriodsCount(Math.min(20, periodsCount + 1))}
                                className="w-10 h-10 rounded-[2rem] bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    </div>
                    {/* Practical Period */}
                    <div>
                        <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-[2rem] border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isPracticalSubject ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-slate-300 bg-white'}`}>
                                {isPracticalSubject && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <input type="checkbox" checked={isPracticalSubject} onChange={(e) => setIsPracticalSubject(e.target.checked)} className="hidden" />
                            <span className="text-sm font-bold text-slate-700">Contains Practical Periods</span>
                        </label>
                        {isPracticalSubject && (
                            <div className="mt-3 ml-8 animate-fade-in">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Number of Practical Periods / Week</label>
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-[2rem] max-w-[12rem]">
                                    <button 
                                        type="button"
                                        onClick={() => setPracticalPeriodsCount(Math.max(1, practicalPeriodsCount - 1))}
                                        className="w-8 h-8 rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                    <span className="text-base font-bold text-slate-800 w-10 text-center">{practicalPeriodsCount}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setPracticalPeriodsCount(Math.min(periodsCount, practicalPeriodsCount + 1))}
                                        className="w-8 h-8 rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Class */}
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">{t.class} <span className="text-red-500">*</span></label>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 font-medium">{selectedClassIds.length} selected</span>
                                {!isClassesExpanded && visibleClasses.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsClassesExpanded(true)}
                                        className="text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                                    >
                                        + Add More
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="border border-slate-100 rounded-[2rem] p-4 bg-slate-50/50 grid grid-cols-2 gap-2">
                            {visibleClasses
                                .filter(c => isClassesExpanded || selectedClassIds.includes(c.id) || (selectedClassIds.length === 0 && visibleClasses.indexOf(c) === 0))
                                .map(c => {
                                const isSelected = selectedClassIds.includes(c.id);
                                return (
                                    <label key={c.id} className={`flex items-center space-x-3 cursor-pointer p-2 rounded-[2rem] transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-100'}`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                        </div>
                                        <input type="checkbox" checked={isSelected} onChange={(e) => handleClassSelectionChange(c.id, e.target.checked)} disabled={!!limitToClassId && c.id === limitToClassId} className="hidden" />
                                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-blue-800' : 'text-slate-600'}`}>{c.nameEn}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Multiple Classes Config */}
                    {selectedClassIds.length > 1 && (
                        <div className="pt-4 border-t border-slate-100">
                            <label className="flex items-center gap-3 cursor-pointer mb-2">
                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isJointPeriod ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                    {isJointPeriod && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                </div>
                                <input type="checkbox" checked={isJointPeriod} onChange={(e) => setIsJointPeriod(e.target.checked)} className="hidden" />
                                <span className="text-[0.8125rem] font-bold text-slate-800 uppercase tracking-wide">Combine as Joint Period</span>
                            </label>
                            <p className="text-xs text-slate-500 pl-8">
                                {isJointPeriod 
                                    ? "Classes will be taught together by the same teacher at the same time." 
                                    : "A separate lesson will be created for each selected class."}
                            </p>
                        </div>
                    )}

                    {/* Group Config */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isGroupLesson ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                {isGroupLesson && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <input type="checkbox" checked={isGroupLesson} onChange={(e) => setIsGroupLesson(e.target.checked)} className="hidden" />
                            <span className="text-[0.8125rem] font-bold text-slate-800 uppercase tracking-wide">{t.groupConfiguration || 'Group Configuration'}</span>
                        </label>
                        {isGroupLesson && (
                            <div className="space-y-4 pl-8 animate-scale-in mt-4">
                                <div>
                                    <label className="block text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.groupName || 'Group Name'} (e.g. Bio, Comp)</label>
                                    <input type="text" value={customGroupName} onChange={(e) => setCustomGroupName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm font-medium" placeholder="Enter group name" />
                                </div>
                                <div>
                                    <label className="block text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.groupSetName || 'Group Set Name'} (Optional)</label>
                                    <input type="text" value={customGroupSetName} onChange={(e) => setCustomGroupSetName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm font-medium" placeholder="e.g. Science Group" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="pt-6 flex justify-center sm:justify-end items-center gap-8 sm:gap-6">
                        <button onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">{t.cancel}</button>
                        <button onClick={handleSave} className="px-10 py-3.5 text-sm font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-[2rem]  shadow-[var(--accent-primary)]/30 transition-transform active:scale-95">{t.save}</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AddLessonForm;
