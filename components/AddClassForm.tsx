
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SchoolClass, Subject, Teacher, TimetableGridData } from '../types';
import { generateUniqueId } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddClassFormProps {
  t: any;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  onSetClasses: (classes: SchoolClass[]) => void;
  onDeleteClass: (classId: string) => void;
  triggerOpenForm?: number;
}

const createEmptyTimetable = (): TimetableGridData => ({
  Monday: Array.from({ length: 8 }, () => []),
  Tuesday: Array.from({ length: 8 }, () => []),
  Wednesday: Array.from({ length: 8 }, () => []),
  Thursday: Array.from({ length: 8 }, () => []),
  Friday: Array.from({ length: 8 }, () => []),
  Saturday: Array.from({ length: 8 }, () => []),
});

const AddClassForm: React.FC<AddClassFormProps> = ({ t, subjects, teachers, classes, onSetClasses, onDeleteClass, triggerOpenForm }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'Primary' | 'Elementary' | 'Secondary' | 'Higher Secondary' | ''>('');
  const [inCharge, setInCharge] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isExtraRoom, setIsExtraRoom] = useState(false);
  const [comments, setComments] = useState('');
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [sortBy, setSortBy] = useState<'serial' | 'nameEn' | 'nameUr' | 'studentCount'>('serial');
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
     if (triggerOpenForm && triggerOpenForm > 0) {
         setEditingClass(null);
         resetForm();
         setIsFormOpen(true);
     }
  }, [triggerOpenForm]);

  // Filter out pseudo-class 'non-teaching-duties'
  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties'), [classes]);

  const resetForm = () => {
    setNameEn('');
    setNameUr('');
    setAcademicLevel('');
    setInCharge('');
    setRoomNumber('');
    setStudentCount('');
    setSerialNumber('');
    setIsExtraRoom(false);
    setComments('');
  };

  useEffect(() => {
    if (editingClass) {
        setIsFormOpen(true);
        setNameEn(editingClass.nameEn);
        setNameUr(editingClass.nameUr);
        setAcademicLevel(editingClass.academicLevel || '');
        setInCharge(editingClass.inCharge);
        setRoomNumber(editingClass.roomNumber);
        setStudentCount(String(editingClass.studentCount));
        setSerialNumber(String(editingClass.serialNumber || ''));
        setIsExtraRoom(editingClass.isExtraRoom || false);
        setComments(editingClass.comments || '');
    } else {
        resetForm();
    }
  }, [editingClass]);

  const handleEditClick = (schoolClass: SchoolClass) => {
    setEditingClass(schoolClass);
  };

  const handleCancel = () => {
    setEditingClass(null);
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExtraRoom) {
        if (!nameEn || !nameUr || !roomNumber) {
            alert('Please fill out all required extra room details.');
            return;
        }
    } else {
        if (!nameEn || !nameUr || !academicLevel || !inCharge || !roomNumber || !studentCount) {
            alert('Please fill out all required class details.');
            return;
        }
    }

    const classData: SchoolClass = {
        id: editingClass ? editingClass.id : generateUniqueId(),
        serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined,
        nameEn, nameUr, 
        academicLevel: academicLevel as 'Primary' | 'Elementary' | 'Secondary' | 'Higher Secondary',
        inCharge, roomNumber,
        studentCount: parseInt(studentCount, 10) || 0,
        // Preserve existing subjects and groups if editing
        subjects: editingClass ? editingClass.subjects : [],
        timetable: editingClass ? editingClass.timetable : createEmptyTimetable(),
        groupSets: editingClass ? editingClass.groupSets : [],
        isExtraRoom,
        comments,
    };
    
    let updatedClasses = [...classes];
    const existingIndex = classes.findIndex(c => c.id === classData.id);
    if (existingIndex !== -1) {
      updatedClasses[existingIndex] = classData;
    } else {
      updatedClasses.push(classData);
    }
    onSetClasses(updatedClasses);
    alert(editingClass ? 'Class updated successfully!' : 'Class added successfully!');
    setEditingClass(null);
    resetForm();
    setIsFormOpen(false);
  };
  
  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";

  const sortedClasses = useMemo(() => {
    return [...visibleClasses].sort((a, b) => {
        if (sortBy === 'serial') return (a.serialNumber ?? Infinity) - (b.serialNumber ?? Infinity);
        if (sortBy === 'nameEn') return a.nameEn.localeCompare(b.nameEn);
        if (sortBy === 'nameUr') return a.nameUr.localeCompare(b.nameUr);
        if (sortBy === 'studentCount') return b.studentCount - a.studentCount;
        return 0;
    });
  }, [visibleClasses, sortBy]);

  return (
    <div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity" onClick={handleCancel}>
            <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-3xl w-full mx-4 transform transition-all border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingClass ? t.edit : t.addClass}</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{t.classDetails}</p>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isExtraRoom"
                                checked={isExtraRoom}
                                onChange={(e) => setIsExtraRoom(e.target.checked)}
                                className="h-4 w-4 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] border-gray-300 rounded"
                            />
                            <label htmlFor="isExtraRoom" className="ml-2 block text-sm text-[var(--text-primary)] font-medium">
                                Extra Room
                            </label>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="classNameEn" className="block text-sm font-medium text-[var(--text-secondary)]">{isExtraRoom ? 'Room Name (En)' : t.classNameEn}</label>
                            <input type="text" id="classNameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputStyleClasses} required />
                        </div>
                        <div>
                            <label htmlFor="classNameUr" className="block text-sm font-medium text-[var(--text-secondary)]">{isExtraRoom ? 'Room Name (Ur)' : t.classNameUr}</label>
                            <input type="text" id="classNameUr" value={nameUr} onChange={(e) => setNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu`} dir="rtl" required />
                        </div>
                        
                        {!isExtraRoom && (
                            <>
                                <div>
                                    <label htmlFor="academicLevel" className="block text-sm font-medium text-[var(--text-secondary)]">{t.academicLevel}</label>
                                    <select id="academicLevel" value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value as any)} className={inputStyleClasses} required={!isExtraRoom}>
                                        <option value="">{t.select}</option>
                                        <option value="Primary">{t.primary}</option>
                                        <option value="Elementary">{t.elementary}</option>
                                        <option value="Secondary">{t.secondary}</option>
                                        <option value="Higher Secondary">{t.higherSecondary}</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="classInCharge" className="block text-sm font-medium text-[var(--text-secondary)]">{t.classInCharge}</label>
                                    <select id="classInCharge" value={inCharge} onChange={(e) => setInCharge(e.target.value)} className={inputStyleClasses} required={!isExtraRoom}>
                                        <option value="">{t.selectTeacher}</option>
                                        {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.nameEn}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <div>
                            <label htmlFor="roomNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.roomNumber}</label>
                            <input type="text" id="roomNumber" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={inputStyleClasses} required />
                        </div>
                        
                        {!isExtraRoom && (
                            <div>
                                <label htmlFor="studentCount" className="block text-sm font-medium text-[var(--text-secondary)]">{t.studentCount}</label>
                                <input type="number" id="studentCount" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} className={inputStyleClasses} required={!isExtraRoom} />
                            </div>
                        )}

                        <div className={isExtraRoom ? '' : 'sm:col-span-2'}>
                            <label htmlFor="serialNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.serialNumber}</label>
                            <input type="number" id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputStyleClasses} />
                        </div>

                        {isExtraRoom && (
                            <div className="sm:col-span-2">
                                <label htmlFor="comments" className="block text-sm font-medium text-[var(--text-secondary)]">Comments</label>
                                <input type="text" id="comments" value={comments} onChange={(e) => setComments(e.target.value)} className={inputStyleClasses} />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4 border-t border-[var(--border-primary)]">
                        <button type="button" onClick={handleCancel} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button>
                        <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)]">{editingClass ? t.update : t.save}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wide">{t.existingClasses}</h3>
                <span className="bg-green-100 text-green-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{sortedClasses.length} Total</span>
            </div>
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-transparent text-gray-500 font-medium focus:outline-none cursor-pointer hover:text-gray-700"
            >
                <option value="serial">Sort by: Serial</option>
                <option value="nameEn">Sort by: Name (En)</option>
                <option value="nameUr">Sort by: Name (Ur)</option>
                <option value="studentCount">Sort by: Students</option>
            </select>
        </div>
        
        <div className="flex flex-col gap-3">
            {sortedClasses.map((schoolClass) => (
              <div key={schoolClass.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <SwipeableListItem
                  t={t}
                  item={schoolClass}
                  onEdit={handleEditClick}
                  onDelete={(item) => onDeleteClass(item.id)}
                  renderContent={(c) => {
                    const inChargeTeacher = teachers.find(t => t.id === c.inCharge);
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg font-bold">
                            {c.serialNumber || c.nameEn.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-base">{c.nameEn} <span className="font-urdu text-sm font-normal text-gray-500">/ {c.nameUr}</span></h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                {c.academicLevel && (
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {t[c.academicLevel.includes(' ') ? c.academicLevel.split(' ').map((s, i) => i === 0 ? s.toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('') : c.academicLevel.toLowerCase()]}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                                    </svg>
                                    {c.roomNumber}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                    </svg>
                                    {c.studentCount}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    {inChargeTeacher?.nameEn || c.inCharge}
                                </div>
                            </div>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AddClassForm;
