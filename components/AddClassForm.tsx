
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  isAdmin?: boolean;
}

const createEmptyTimetable = (): TimetableGridData => ({
  Monday: Array.from({ length: 8 }, () => []),
  Tuesday: Array.from({ length: 8 }, () => []),
  Wednesday: Array.from({ length: 8 }, () => []),
  Thursday: Array.from({ length: 8 }, () => []),
  Friday: Array.from({ length: 8 }, () => []),
  Saturday: Array.from({ length: 8 }, () => []),
});

const AddClassForm: React.FC<AddClassFormProps> = ({ t, subjects, teachers, classes, onSetClasses, onDeleteClass, triggerOpenForm, isAdmin = true }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [section, setSection] = useState('');
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
    setSection('');
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
        setNameEn(editingClass.nameEn || '');
        setNameUr(editingClass.nameUr || '');
        setSection(editingClass.section || '');
        setAcademicLevel(editingClass.academicLevel || '');
        setInCharge(editingClass.inCharge || '');
        setRoomNumber(editingClass.roomNumber || '');
        setStudentCount(String(editingClass.studentCount || ''));
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

  const handleNumericChange = (setter: (val: string) => void, val: string, maxDigits: number) => {
      if (/^\d*$/.test(val) && val.length <= maxDigits) {
          setter(val);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedNameEn = nameEn.trim();
    const trimmedNameUr = nameUr.trim();

    if (isExtraRoom) {
        if (!trimmedNameEn || !trimmedNameUr || !roomNumber) {
            alert('Please fill out Room Name (En), Room Name (Ur), and Room Number.');
            return;
        }
    } else {
        if (!trimmedNameEn || !trimmedNameUr || !academicLevel || !inCharge || !roomNumber || !studentCount) {
            alert('Please fill out all required class fields.');
            return;
        }
    }

    const classData: SchoolClass = {
        id: editingClass ? editingClass.id : generateUniqueId(),
        serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined,
        nameEn: trimmedNameEn, 
        nameUr: trimmedNameUr, 
        section: isExtraRoom ? undefined : section.trim(),
        academicLevel: isExtraRoom ? undefined : academicLevel as any,
        inCharge: isExtraRoom ? '' : inCharge, 
        roomNumber,
        studentCount: isExtraRoom ? 0 : (parseInt(studentCount, 10) || 0),
        subjects: editingClass ? editingClass.subjects : [],
        timetable: editingClass ? editingClass.timetable : createEmptyTimetable(),
        groupSets: editingClass ? editingClass.groupSets : [],
        isExtraRoom,
        comments: comments.trim(),
    };
    
    let updatedClasses = [...classes];
    const existingIndex = classes.findIndex(c => c.id === classData.id);
    if (existingIndex !== -1) {
      updatedClasses[existingIndex] = classData;
    } else {
      updatedClasses.push(classData);
    }
    onSetClasses(updatedClasses);
    setEditingClass(null);
    resetForm();
    setIsFormOpen(false);
  };
  
  const labelStyle = "block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1";
  const urduLabelStyle = "block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1 text-right";
  const inputStyleClasses = "block w-full px-4 py-3 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none transition-all";

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

      {isFormOpen && createPortal(
        <div className="fixed inset-0 w-screen h-[100dvh] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[200] transition-opacity" onClick={handleCancel}>
            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-elevation-5 border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2.5rem] max-w-2xl w-full mx-4 max-h-[90dvh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col">
                    <div className="mb-8 text-center relative">
                        <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{editingClass ? t.edit : t.addClass}</h3>
                        <p className="text-[0.65rem] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] opacity-60 mt-1">Class Configuration</p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 bg-black/5 dark:bg-white/5 p-4 rounded-3xl">
                            <div className="flex flex-col items-center">
                                <label className={labelStyle}>Serial</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={serialNumber}
                                    onChange={(e) => handleNumericChange(setSerialNumber, e.target.value, 2)}
                                    className="w-20 text-center px-4 py-2 bg-white/80 dark:bg-black/40 border border-white/20 rounded-2xl text-lg font-mono font-bold focus:outline-none"
                                    placeholder="00"
                                />
                            </div>

                            <div className="flex flex-col items-center">
                                <label className={labelStyle}>Is Extra Room?</label>
                                <button
                                    type="button"
                                    onClick={() => setIsExtraRoom(!isExtraRoom)}
                                    className={`relative w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isExtraRoom ? 'bg-[var(--accent-primary)]' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 transform ${isExtraRoom ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className={labelStyle}>{isExtraRoom ? 'Room Name (English)' : 'Class Name (English)'}</label>
                                <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputStyleClasses} placeholder={isExtraRoom ? "e.g. Lab 1" : "e.g. Grade 10"} required />
                            </div>
                            <div>
                                <label className={urduLabelStyle}>{isExtraRoom ? 'کمرے کا نام' : 'کلاس کا نام'}</label>
                                <input 
                                    type="text" 
                                    value={nameUr} 
                                    onChange={(e) => setNameUr(e.target.value)} 
                                    className={inputStyleClasses + " text-right text-lg"} 
                                    dir="rtl" 
                                    style={{ fontFamily: 'system-ui, sans-serif' }}
                                    placeholder={isExtraRoom ? "مثلاً کمپیوٹر لیب" : "مثلاً دہم"}
                                    required 
                                />
                            </div>
                            
                            {!isExtraRoom ? (
                                <>
                                    <div>
                                        <label className={labelStyle}>Section</label>
                                        <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className={inputStyleClasses} placeholder="e.g. A" />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Academic Level</label>
                                        <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value as any)} className={inputStyleClasses} required>
                                            <option value="">Select Level</option>
                                            <option value="Primary">Primary</option>
                                            <option value="Elementary">Elementary</option>
                                            <option value="Secondary">Secondary</option>
                                            <option value="Higher Secondary">Higher Secondary</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Student Count (Max 3)</label>
                                        <input 
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={studentCount} 
                                            onChange={(e) => handleNumericChange(setStudentCount, e.target.value, 3)} 
                                            className={inputStyleClasses + " font-mono"} 
                                            placeholder="000"
                                            required 
                                        />
                                    </div>
                                </>
                            ) : null}

                            <div>
                                <label className={labelStyle}>Room Number (Max 2)</label>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={roomNumber} 
                                    onChange={(e) => handleNumericChange(setRoomNumber, e.target.value, 2)} 
                                    className={inputStyleClasses + " font-mono"} 
                                    placeholder="00"
                                    required 
                                />
                            </div>

                            {!isExtraRoom && (
                                <div className="sm:col-span-2">
                                    <label className={labelStyle}>Incharge Teacher</label>
                                    <select value={inCharge} onChange={(e) => setInCharge(e.target.value)} className={inputStyleClasses} required>
                                        <option value="">Assign Teacher</option>
                                        {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.nameEn} ({teacher.nameUr})</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="sm:col-span-2">
                                <label className={labelStyle}>Comments</label>
                                <textarea 
                                    value={comments} 
                                    onChange={(e) => setComments(e.target.value)} 
                                    className={inputStyleClasses + " h-20 resize-none"} 
                                    placeholder="Optional notes about this class/room..."
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-10 space-y-3">
                        <button type="submit" className="w-full py-4 bg-[var(--accent-primary)] text-[var(--accent-text)] font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary-hover)] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                            {editingClass ? t.update : 'Create Class'}
                        </button>
                        <button type="button" onClick={handleCancel} className="w-full py-2 text-[var(--text-secondary)] font-bold text-[0.65rem] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                            {t.cancel}
                        </button>
                    </div>
                </form>
            </div>
        </div>, document.body
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
              <div key={schoolClass.id} className="bg-white/40 dark:bg-black/20 backdrop-blur-lg rounded-[2rem] border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <SwipeableListItem
                  t={t}
                  item={schoolClass}
                  onEdit={handleEditClick}
                  onDelete={(item) => onDeleteClass(item.id)}
                  isAdmin={isAdmin}
                  renderContent={(c) => {
                    const inChargeTeacher = teachers.find(t => t.id === c.inCharge);
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg font-bold">
                            {c.serialNumber || c.nameEn.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-base">
                                {c.nameEn}{c.section ? ` ${c.section}` : ''} <span className="font-urdu text-sm font-normal text-gray-500">/ {c.nameUr}</span>
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                {c.academicLevel && (
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {t[c.academicLevel.includes(' ') ? c.academicLevel.split(' ').map((s, i) => i === 0 ? s.toLowerCase() : (s || '').charAt(0).toUpperCase() + (s || '').slice(1).toLowerCase()).join('') : c.academicLevel.toLowerCase()]}
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
