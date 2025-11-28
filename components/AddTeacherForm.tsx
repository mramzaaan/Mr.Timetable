
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Teacher } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddTeacherFormProps {
  t: any;
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

const AddTeacherForm: React.FC<AddTeacherFormProps> = ({ t, teachers, onAddTeacher, onUpdateTeacher, onDeleteTeacher }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [serialNumber, setSerialNumber] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  const [sortBy, setSortBy] = useState<'serial' | 'nameEn' | 'nameUr'>('serial');
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editingTeacher) {
        setNameEn(editingTeacher.nameEn);
        setNameUr(editingTeacher.nameUr);
        setContactNumber(editingTeacher.contactNumber || '');
        setGender(editingTeacher.gender);
        setSerialNumber(String(editingTeacher.serialNumber || ''));
    } else {
        setNameEn('');
        setNameUr('');
        setContactNumber('');
        setGender('');
        setSerialNumber('');
    }
  }, [editingTeacher]);

  const handleEditClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr || !contactNumber || !gender) {
      alert('Please fill out all fields.');
      return;
    }

    const teacherData = { nameEn, nameUr, contactNumber, gender, serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined };

    if (editingTeacher) {
        onUpdateTeacher({ ...editingTeacher, ...teacherData });
        alert('Teacher updated successfully!');
        setEditingTeacher(null);
    } else {
        onAddTeacher({
            id: Date.now().toString(),
            ...teacherData,
        });
        alert('Teacher added successfully!');
        setNameEn('');
        setNameUr('');
        setContactNumber('');
        setGender('');
        setSerialNumber('');
    }
  };

  const handleDelete = (teacher: Teacher) => {
    onDeleteTeacher(teacher.id);
  };

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => {
        if (sortBy === 'serial') return (a.serialNumber ?? Infinity) - (b.serialNumber ?? Infinity);
        if (sortBy === 'nameEn') return a.nameEn.localeCompare(b.nameEn);
        if (sortBy === 'nameUr') return a.nameUr.localeCompare(b.nameUr);
        return 0;
    });
  }, [teachers, sortBy]);

  return (
    <div>
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-[var(--bg-secondary)] rounded-lg shadow-md space-y-6 border border-[var(--border-primary)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingTeacher ? t.edit : t.addTeacher}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                <label htmlFor="teacherNameEn" className="block text-sm font-medium text-[var(--text-secondary)]">{t.teacherNameEn}</label>
                <input
                    type="text"
                    id="teacherNameEn"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    required
                />
                </div>
                <div>
                <label htmlFor="teacherNameUr" className="block text-sm font-medium text-[var(--text-secondary)]">{t.teacherNameUr}</label>
                <input
                    type="text"
                    id="teacherNameUr"
                    value={nameUr}
                    onChange={(e) => setNameUr(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm font-urdu"
                    dir="rtl"
                    placeholder="مثلاً سمیع اللہ"
                    required
                />
                </div>
                <div>
                    <label htmlFor="serialNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.serialNumber}</label>
                    <input
                        type="number"
                        id="serialNumber"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                        placeholder="e.g., 1"
                    />
                </div>
                 <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.contactNumber}</label>
                <input
                    type="tel"
                    id="contactNumber"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    placeholder="e.g., 0300-1234567"
                    required
                />
                </div>
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-[var(--text-secondary)]">{t.gender}</label>
                    <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | '')}
                        className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                        required
                    >
                        <option value="">{t.select}</option>
                        <option value="Male">{t.male}</option>
                        <option value="Female">{t.female}</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end space-x-4">
                {editingTeacher && (
                    <button type="button" onClick={handleCancelEdit} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                        {t.cancel}
                    </button>
                )}
                <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] transition-colors">
                {editingTeacher ? t.update : t.save}
                </button>
            </div>
        </form>

      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.existingTeachers}</h3>
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)]"
            >
                <option value="serial">Sort by: Serial</option>
                <option value="nameEn">Sort by: Name (En)</option>
                <option value="nameUr">Sort by: Name (Ur)</option>
            </select>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)]">
          <ul className="divide-y divide-[var(--border-primary)]">
            {sortedTeachers.map((teacher) => (
              <li key={teacher.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="flex items-center">
                    <div className="flex-shrink-0 w-12 text-center text-sm font-medium text-[var(--text-secondary)]">
                        {teacher.serialNumber}
                    </div>
                    <div className="flex-grow border-l border-[var(--border-primary)]">
                        <SwipeableListItem
                          t={t}
                          item={teacher}
                          onEdit={handleEditClick}
                          onDelete={handleDelete}
                          renderContent={(item) => (
                            <div>
                                <p className="font-semibold text-[var(--text-primary)]">{item.nameEn} <span className="font-urdu">/ {item.nameUr}</span></p>
                                <p className="text-sm text-[var(--text-secondary)]">{item.contactNumber} ({item.gender})</p>
                            </div>
                          )}
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

export default AddTeacherForm;
