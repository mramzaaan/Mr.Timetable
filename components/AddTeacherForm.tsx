
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Teacher } from '../types';
import SwipeableListItem from './SwipeableListItem';
import { countries, Country } from '../countries';
import { Search, ChevronDown } from 'lucide-react';

interface AddTeacherFormProps {
  t: any;
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  triggerOpenForm?: number;
  isAdmin?: boolean;
}

const AddTeacherForm: React.FC<AddTeacherFormProps> = ({ t, teachers, onAddTeacher, onUpdateTeacher, onDeleteTeacher, triggerOpenForm, isAdmin = true }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => countries.find(c => c.code === 'PK') || countries[0]);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [serialNumber, setSerialNumber] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  const [sortBy, setSortBy] = useState<'serial' | 'nameEn' | 'nameUr'>('serial');
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
     if (triggerOpenForm && triggerOpenForm > 0) {
         setEditingTeacher(null);
         setNameEn('');
         setNameUr('');
         setContactNumber('');
         setGender('');
         setSerialNumber('');
         setIsFormOpen(true);
     }
  }, [triggerOpenForm]);

  useEffect(() => {
    if (editingTeacher) {
        setIsFormOpen(true);
        setNameEn(editingTeacher.nameEn || '');
        setNameUr(editingTeacher.nameUr || '');
        setContactNumber(editingTeacher.contactNumber || '');
        setGender(editingTeacher.gender || '');
        setSerialNumber(String(editingTeacher.serialNumber || ''));
        setEmail(editingTeacher.email || '');
        const country = countries.find(c => c.dial_code === editingTeacher.countryCode) || countries.find(c => c.code === 'PK') || countries[0];
        setSelectedCountry(country);
    } else {
        setNameEn('');
        setNameUr('');
        setContactNumber('');
        setGender('');
        setSerialNumber('');
        setEmail('');
        setSelectedCountry(countries.find(c => c.code === 'PK') || countries[0]);
    }
  }, [editingTeacher]);

  const handleEditClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
  };

  const handleCancel = () => {
    setEditingTeacher(null);
    setIsFormOpen(false);
    setNameEn('');
    setNameUr('');
    setContactNumber('');
    setGender('');
    setSerialNumber('');
    setEmail('');
    setSelectedCountry(countries.find(c => c.code === 'PK') || countries[0]);
  };

  const handleSerialChange = (val: string) => {
    if (/^\d{0,2}$/.test(val)) setSerialNumber(val);
  };

  const handlePhoneChange = (val: string) => {
    if (/^\d*$/.test(val)) setContactNumber(val);
  };

  const filteredCountries = useMemo(() => {
    return countries.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.dial_code.includes(countrySearch)
    );
  }, [countrySearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr || !contactNumber || !gender) {
      alert('Please fill out Name, Contact, and Gender.');
      return;
    }

    const teacherData = { 
        nameEn, 
        nameUr, 
        contactNumber, 
        countryCode: selectedCountry.dial_code,
        email: email.toLowerCase().trim(),
        gender, 
        serialNumber: serialNumber ? parseInt(serialNumber, 10) : undefined 
    };

    if (editingTeacher) {
        onUpdateTeacher({ ...editingTeacher, ...teacherData } as Teacher);
        setEditingTeacher(null);
    } else {
        onAddTeacher({
            id: Date.now().toString(),
            ...teacherData,
        } as Teacher);
        resetForm();
    }
    setIsFormOpen(false);
  };

  const resetForm = () => {
    setNameEn('');
    setNameUr('');
    setContactNumber('');
    setGender('');
    setSerialNumber('');
    setEmail('');
    setSelectedCountry(countries.find(c => c.code === 'PK') || countries[0]);
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
        {isFormOpen && createPortal(
            <div className="fixed inset-0 w-screen h-[100dvh] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[200] transition-opacity" onClick={handleCancel}>
                <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2rem] max-w-2xl w-full mx-4 max-h-[90dvh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col">
                        <div className="mb-6 text-center">
                            <h3 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-tight">{editingTeacher ? t.edit : t.addTeacher}</h3>
                            <p className="text-[0.65rem] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-60">Teacher Registration</p>
                        </div>

                        <div className="space-y-6">
                            {/* Serial Number */}
                            <div className="flex flex-col items-center">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Serial</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={serialNumber}
                                    onChange={(e) => handleSerialChange(e.target.value)}
                                    className="w-20 text-center px-3 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-sm border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] font-mono text-lg focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none"
                                    placeholder="00"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Name (English)</label>
                                    <input
                                        type="text"
                                        value={nameEn}
                                        onChange={(e) => setNameEn(e.target.value)}
                                        className="block w-full px-4 py-3 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none"
                                        placeholder="e.g. John Doe"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1 text-right">نام (اردو)</label>
                                    <input
                                        type="text"
                                        value={nameUr}
                                        onChange={(e) => setNameUr(e.target.value)}
                                        className="block w-full px-4 py-3 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] text-right text-lg focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none"
                                        style={{ fontFamily: 'system-ui, sans-serif' }}
                                        dir="rtl"
                                        placeholder="مثلاً سمیع اللہ"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Gender</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['Male', 'Female'] as const).map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setGender(g)}
                                                className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                                    gender === g 
                                                    ? 'bg-[var(--accent-primary)] text-white shadow-glow shadow-[var(--accent-primary)]/30' 
                                                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-black/10'
                                                }`}
                                            >
                                                <span className="text-base">{g === 'Male' ? '👨' : '👩'}</span>
                                                {g === 'Male' ? 'Male (M)' : 'Female (F)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Contact Number</label>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                                className="h-full flex items-center gap-2 px-3 bg-white/60 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm font-bold min-w-[90px] focus:outline-none"
                                            >
                                                <span>{selectedCountry.flag}</span>
                                                <span>{selectedCountry.dial_code}</span>
                                                <ChevronDown size={14} className={`opacity-50 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isCountryDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-72 bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl z-[300] overflow-hidden animate-in fade-in zoom-in duration-200">
                                                    <div className="p-4 border-b border-white/10">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
                                                            <input 
                                                                type="text"
                                                                placeholder="Search countries..."
                                                                value={countrySearch}
                                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                                className="w-full pl-9 pr-4 py-2 bg-black/5 dark:bg-white/5 rounded-full text-xs outline-none"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                                                        {filteredCountries.map(c => (
                                                            <button
                                                                key={c.code}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCountry(c);
                                                                    setIsCountryDropdownOpen(false);
                                                                    setCountrySearch('');
                                                                }}
                                                                className={`w-full flex items-center justify-between p-3 rounded-2xl text-sm hover:bg-[var(--accent-primary)]/10 transition-colors ${selectedCountry.code === c.code ? 'bg-[var(--accent-primary)]/20' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-lg">{c.flag}</span>
                                                                    <span className="font-medium">{c.name}</span>
                                                                </div>
                                                                <span className="text-[var(--text-secondary)] font-mono text-xs">{c.dial_code}</span>
                                                            </button>
                                                        ))}
                                                        {filteredCountries.length === 0 && (
                                                            <div className="p-4 text-center text-xs opacity-50">No results found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={contactNumber}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            className="flex-grow px-4 py-3 bg-white/60 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] text-sm font-mono focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none"
                                            placeholder="3001234567"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full px-4 py-3 bg-white/60 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none"
                                        placeholder="teacher@school.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button type="submit" className="w-full py-4 bg-[var(--accent-primary)] text-[var(--accent-text)] font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary-hover)] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                                {editingTeacher ? t.update : 'Register Teacher'}
                            </button>
                            <button type="button" onClick={handleCancel} className="w-full py-2 text-[var(--text-secondary)] font-bold text-[0.65rem] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                                {t.cancel}
                            </button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wide">{t.existingTeachers}</h3>
                <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{sortedTeachers.length} Total</span>
            </div>
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-transparent text-gray-500 font-medium focus:outline-none cursor-pointer hover:text-gray-700"
            >
                <option value="serial">Sort by: Serial</option>
                <option value="nameEn">Sort by: Name (En)</option>
                <option value="nameUr">Sort by: Name (Ur)</option>
            </select>
        </div>
        
        <div className="flex flex-col gap-3">
            {sortedTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white/40 dark:bg-black/20 backdrop-blur-lg rounded-[2rem] border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <SwipeableListItem
                  t={t}
                  item={teacher}
                  onEdit={handleEditClick}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                  renderContent={(item) => (
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            item.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            {item.serialNumber || item.nameEn.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-base">{item.nameEn}</h4>
                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                    {item.countryCode} {item.contactNumber}
                                </div>
                                {item.email && (
                                    <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                        {item.email}
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    {item.gender}
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AddTeacherForm;
