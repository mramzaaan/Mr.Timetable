
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Subject } from '../types';
import { generateUniqueId } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddSubjectFormProps {
  t: any;
  subjects: Subject[];
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  triggerOpenForm?: number;
}

const AddSubjectForm: React.FC<AddSubjectFormProps> = ({ t, subjects, onAddSubject, onUpdateSubject, onDeleteSubject, triggerOpenForm }) => {
  const [serial, setSerial] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'serial' | 'nameEn' | 'nameUr'>('serial');
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
     if (triggerOpenForm && triggerOpenForm > 0) {
         setEditingSubject(null);
         resetForm();
         setIsFormOpen(true);
     }
  }, [triggerOpenForm]);

  const resetForm = () => {
    setSerial('');
    setNameEn('');
    setNameUr('');
  }

  useEffect(() => {
    if (editingSubject) {
      setIsFormOpen(true);
      setSerial(editingSubject.serialNumber?.toString() || '');
      setNameEn(editingSubject.nameEn);
      setNameUr(editingSubject.nameUr);
    } else {
      resetForm();
    }
  }, [editingSubject]);

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
  };

  const handleCancel = () => {
    setEditingSubject(null);
    setIsFormOpen(false);
    resetForm();
  };

  const handleSerialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits, max 2 chars
    if (/^\d{0,2}$/.test(value)) {
      setSerial(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr) {
      alert('Please fill out the primary subject name fields.');
      return;
    }

    const trimmedNameEn = nameEn.trim();
    const trimmedNameUr = nameUr.trim();
    const serialValue = serial ? parseInt(serial, 10) : undefined;

    const duplicateEn = subjects.find(
      s => s.nameEn.toLowerCase() === trimmedNameEn.toLowerCase() && s.id !== editingSubject?.id
    );

    if (duplicateEn) {
      alert(t.subjectNameEnExists || 'Subject name (English) already exists.');
      return;
    }

    const duplicateUr = subjects.find(
      s => s.nameUr === trimmedNameUr && s.id !== editingSubject?.id
    );

    if (duplicateUr) {
      alert(t.subjectNameUrExists || 'Subject name (Urdu) already exists.');
      return;
    }
    
    const subjectData: Partial<Subject> = {
        serialNumber: serialValue,
        nameEn: trimmedNameEn,
        nameUr: trimmedNameUr,
    };

    if (editingSubject) {
        onUpdateSubject({ ...editingSubject, ...subjectData } as Subject);
        setEditingSubject(null);
    } else {
        onAddSubject({
            id: generateUniqueId(),
            ...subjectData,
        } as Subject);
        resetForm();
    }
    setIsFormOpen(false);
  };

  const handleDelete = (subject: Subject) => {
    onDeleteSubject(subject.id);
  };

  const sortedSubjects = React.useMemo(() => {
    return [...subjects].sort((a, b) => {
        if (sortBy === 'serial') {
            const serialA = a.serialNumber ?? 999;
            const serialB = b.serialNumber ?? 999;
            return serialA - serialB;
        }
        if (sortBy === 'nameEn') return a.nameEn.localeCompare(b.nameEn);
        if (sortBy === 'nameUr') return a.nameUr.localeCompare(b.nameUr);
        return 0;
    });
  }, [subjects, sortBy]);

  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem]  text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  
  return (
    <div>
      {isFormOpen && createPortal(
        <div className="fixed inset-0 w-screen h-[100dvh] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[200] transition-opacity" onClick={handleCancel}>
            <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2rem] max-w-lg w-full mx-4 max-h-[90dvh] overflow-y-auto custom-scrollbar shadow-elevation-5" onClick={e => e.stopPropagation()}>
                <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col">
                    <div className="mb-6 text-center">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingSubject ? t.edit : t.addSubject}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">Minimalist Subject Entry</p>
                    </div>

                    <div className="space-y-5 flex-grow">
                        {/* Serial Number - Small Field */}
                        <div className="flex flex-col items-center">
                            <label htmlFor="serialNumber" className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Serial</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              id="serialNumber"
                              value={serial}
                              onChange={handleSerialChange}
                              className={`${inputStyleClasses} w-20 text-center font-mono text-lg`}
                              placeholder="00"
                              autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label htmlFor="subjectNameEn" className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Subject Name (English)</label>
                                <input
                                  type="text"
                                  id="subjectNameEn"
                                  value={nameEn}
                                  onChange={(e) => setNameEn(e.target.value)}
                                  className={inputStyleClasses}
                                  placeholder="e.g. Mathematics"
                                  required
                                />
                            </div>
                            <div>
                                <label htmlFor="subjectNameUr" className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1">Subject Name (Urdu)</label>
                                <input
                                  type="text"
                                  id="subjectNameUr"
                                  value={nameUr}
                                  onChange={(e) => setNameUr(e.target.value)}
                                  className={`${inputStyleClasses} text-right text-lg`}
                                  style={{ fontFamily: 'system-ui, sans-serif' }}
                                  dir="rtl"
                                  placeholder="مثلاً ریاضی"
                                  required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button type="submit" className="w-full py-3.5 bg-[var(--accent-primary)] text-[var(--accent-text)] font-black uppercase tracking-widest text-xs rounded-[1.25rem] shadow-xl shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary-hover)] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                            {editingSubject ? t.update : t.save}
                        </button>
                        <button type="button" onClick={handleCancel} className="w-full mt-3 py-2 text-[var(--text-secondary)] font-bold text-[0.65rem] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                            {t.cancel}
                        </button>
                    </div>
                </form>
            </div>
        </div>, document.body
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wide">{t.existingSubjects}</h3>
                <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{sortedSubjects.length} Total</span>
            </div>
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-transparent text-gray-500 font-medium focus:outline-none cursor-pointer hover:text-gray-700"
            >
                <option value="serial">Sort by: Default</option>
                <option value="nameEn">Sort by: Name (En)</option>
                <option value="nameUr">Sort by: Name (Ur)</option>
            </select>
        </div>

        <div className="flex flex-col gap-3">
            {sortedSubjects.map((subject, index) => (
                <div key={subject.id} className="bg-white/40 dark:bg-black/20 backdrop-blur-lg rounded-[2rem] border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                    <SwipeableListItem
                        t={t}
                        item={subject}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        renderContent={(s) => {
                            return (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-bold">
                                        {s.serialNumber || index + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">{s.nameEn}</h4>
                                        <p className="text-sm text-gray-500 font-urdu">{s.nameUr}</p>
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

export default AddSubjectForm;
