
import React, { useState, useEffect, useRef } from 'react';
import type { JointPeriod, JointPeriodAssignment, Teacher, SchoolClass, Subject } from '../types';
import { generateUniqueId } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddJointPeriodFormProps {
  t: any;
  jointPeriods: JointPeriod[];
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
}

const AddJointPeriodForm: React.FC<AddJointPeriodFormProps> = ({ t, jointPeriods, teachers, classes, subjects, onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod }) => {
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(1);
  const [assignments, setAssignments] = useState<JointPeriodAssignment[]>([{ classId: '', subjectId: '' }]);
  const [editingJointPeriod, setEditingJointPeriod] = useState<JointPeriod | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setName('');
    setTeacherId('');
    setPeriodsPerWeek(1);
    setAssignments([{ classId: '', subjectId: '' }]);
    setEditingJointPeriod(null);
  };

  useEffect(() => {
    if (editingJointPeriod) {
      setIsFormOpen(true);
      setName(editingJointPeriod.name);
      setTeacherId(editingJointPeriod.teacherId);
      setPeriodsPerWeek(editingJointPeriod.periodsPerWeek);
      setAssignments(editingJointPeriod.assignments.length > 0 ? editingJointPeriod.assignments : [{ classId: '', subjectId: '' }]);
    } else {
      resetForm();
    }
  }, [editingJointPeriod]);

  const handleTeacherChange = (newTeacherId: string) => {
    setTeacherId(newTeacherId);
    // When the teacher for the joint period is changed,
    // the available subjects for each class assignment change too.
    // Resetting the subject selections prevents an invalid state.
    setAssignments(prev => prev.map(a => ({ ...a, subjectId: '' })));
  };

  const handleAssignmentChange = (index: number, field: keyof JointPeriodAssignment, value: string) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    // When class changes, reset subject
    if (field === 'classId') {
      newAssignments[index].subjectId = '';
    }
    setAssignments(newAssignments);
  };

  const addAssignment = () => {
    setAssignments([...assignments, { classId: '', subjectId: '' }]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      setAssignments(assignments.filter((_, i) => i !== index));
    }
  };

  const handleCancel = () => {
    setEditingJointPeriod(null);
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teacherId || assignments.some(a => !a.classId || !a.subjectId)) {
      alert('Please fill out all required fields.');
      return;
    }

    const uniqueAssignments = Array.from(new Set(assignments.map(a => `${a.classId}__||__${a.subjectId}`)))
        .map((pair) => {
            const strPair = pair as string;
            const [classId, subjectId] = strPair.split('__||__');
            return { classId, subjectId };
        });

    if (uniqueAssignments.length !== assignments.length) {
        alert('Duplicate class-subject assignments are not allowed.');
        return;
    }

    const jointPeriodData: Omit<JointPeriod, 'id'> = {
      name,
      teacherId,
      periodsPerWeek,
      assignments: uniqueAssignments,
    };

    if (editingJointPeriod) {
      onUpdateJointPeriod({ ...editingJointPeriod, ...jointPeriodData });
    } else {
      onAddJointPeriod({ id: generateUniqueId(), ...jointPeriodData });
    }
    resetForm();
    setIsFormOpen(false);
  };
  
  const getSubjectsForClass = (classId: string) => {
      const schoolClass = classes.find(c => c.id === classId);
      if (!schoolClass) return [];
      
      const teacherSubjects = new Set(
        classes.flatMap(c => c.subjects)
          .filter(s => s.teacherId === teacherId)
          .map(s => s.subjectId)
      );
      
      return schoolClass.subjects
          .filter(cs => teacherSubjects.has(cs.subjectId))
          .map(cs => subjects.find(s => s.id === cs.subjectId))
          .filter((s): s is Subject => !!s);
  };

  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem]  text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";

  return (
    <div>
      {!isFormOpen ? (
        <button 
            onClick={() => setIsFormOpen(true)}
            className="w-full py-6 border-2 border-dashed border-[var(--border-secondary)] rounded-[2rem] text-[var(--text-secondary)] font-bold text-lg hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-secondary)]/10 transition-all flex items-center justify-center gap-2  mb-8"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t.addJointPeriod}
        </button>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[1.25rem]  space-y-6  mb-8 animate-scale-in">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingJointPeriod ? t.edit : t.addJointPeriod}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
                <label htmlFor="jpName" className="block text-sm font-medium text-[var(--text-secondary)]">{t.jointPeriodName}</label>
                <input type="text" id="jpName" value={name} onChange={e => setName(e.target.value)} className={inputStyleClasses} required />
            </div>
            <div>
                <label htmlFor="jpTeacher" className="block text-sm font-medium text-[var(--text-secondary)]">{t.assignTeacher}</label>
                <select id="jpTeacher" value={teacherId} onChange={e => handleTeacherChange(e.target.value)} className={inputStyleClasses} required>
                <option value="">{t.selectTeacher}</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.nameEn}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="jpPeriods" className="block text-sm font-medium text-[var(--text-secondary)]">{t.periodsPerWeek}</label>
                <select id="jpPeriods" value={periodsPerWeek} onChange={e => setPeriodsPerWeek(Number(e.target.value))} className={inputStyleClasses} required>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            </div>

            <div>
            <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t.jointPeriodAssignments}</h4>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{t.selectClassesAndSubjects}</p>
            <div className="space-y-3">
                {assignments.map((assignment, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-center p-3 bg-[var(--bg-tertiary)] rounded-[1rem]">
                    <select value={assignment.classId} onChange={e => handleAssignmentChange(index, 'classId', e.target.value)} className={inputStyleClasses} required disabled={!teacherId}>
                    <option value="">{teacherId ? t.selectAClass : 'Select teacher first'}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                    </select>
                    <select value={assignment.subjectId} onChange={e => handleAssignmentChange(index, 'subjectId', e.target.value)} className={inputStyleClasses} required disabled={!assignment.classId}>
                    <option value="">{assignment.classId ? t.select : 'Select class first'}</option>
                    {getSubjectsForClass(assignment.classId).map(s => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
                    </select>
                    <button type="button" onClick={() => removeAssignment(index)} disabled={assignments.length <= 1} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                ))}
            </div>
            <button type="button" onClick={addAssignment} className="mt-4 px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[1.25rem] hover:bg-[var(--accent-secondary-hover)] transition-colors">+ Add Assignment</button>
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={handleCancel} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-[1.25rem] hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button>
                <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-[1.25rem]  hover:bg-[var(--accent-primary-hover)]">{editingJointPeriod ? t.update : t.save}</button>
            </div>
        </form>
      )}

      <div className="mt-10">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.existingJointPeriods}</h3>
        <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[1.25rem]  ">
          <ul className="divide-y divide-[var(--border-primary)]">
            {jointPeriods.map((jp, index) => (
              <li key={jp.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-12 text-center text-sm font-medium text-[var(--text-secondary)]">
                        {index + 1}
                    </div>
                    <div className="flex-grow border-l border-[var(--border-primary)]">
                        <SwipeableListItem
                          t={t}
                          item={jp}
                          onEdit={(item: JointPeriod) => {
                              setEditingJointPeriod(item);
                              setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                          }}
                          onDelete={(item: JointPeriod) => onDeleteJointPeriod(item.id)}
                          renderContent={(item) => {
                            const teacher = teachers.find(t => t.id === item.teacherId);
                            return (
                              <div>
                                <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                                <p className="text-sm text-[var(--text-secondary)]">{teacher?.nameEn || 'Unknown Teacher'} - {item.periodsPerWeek} p/w</p>
                                <div className="flex flex-wrap text-xs text-[var(--text-placeholder)] mt-2 gap-1">
                                  {item.assignments.map(a => {
                                      const c = classes.find(cls => cls.id === a.classId);
                                      const s = subjects.find(sub => sub.id === a.subjectId);
                                      return <span key={`${a.classId}-${a.subjectId}`} className="inline-block bg-[var(--bg-tertiary)]  rounded-full px-2 py-0.5">{c?.nameEn}/{s?.nameEn}</span>;
                                  })}
                                </div>
                              </div>
                            )
                          }}
                        />
                    </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddJointPeriodForm;
