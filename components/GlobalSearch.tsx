
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { SchoolClass, Teacher, Subject, Language } from '../types';

export type SearchResult = { 
    id: string; 
    nameEn: string; 
    nameUr: string; 
    type: 'class' | 'teacher' | 'subject';
    serialNumber?: number | string;
    roomNumber?: string;
    totalPeriods?: number;
};

// Icons
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ClassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SubjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;

const ICONS = {
    class: <ClassIcon />,
    teacher: <TeacherIcon />,
    subject: <SubjectIcon />
};

interface GlobalSearchProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  onResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
  autoFocus?: boolean;
  className?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ t, language, classes, teachers, subjects, onResultClick, autoFocus, className }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'class' | 'teacher' | 'subject'>('all');
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const allData = useMemo<SearchResult[]>(() => {
        const classResults = classes.map(c => ({
            id: c.id,
            nameEn: c.nameEn,
            nameUr: c.nameUr,
            type: 'class' as const,
            serialNumber: c.serialNumber,
            roomNumber: c.roomNumber,
            totalPeriods: c.subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0)
        }));

        const teacherResults = teachers.map(t => {
            const totalPeriods = classes.reduce((acc, c) => {
                const classTeacherPeriods = c.subjects
                    .filter(s => s.teacherId === t.id)
                    .reduce((sum, s) => sum + s.periodsPerWeek, 0);
                return acc + classTeacherPeriods;
            }, 0);
            return {
                id: t.id,
                nameEn: t.nameEn,
                nameUr: t.nameUr,
                type: 'teacher' as const,
                serialNumber: t.serialNumber,
                totalPeriods
            };
        });

        const subjectResults = subjects.map(s => {
             const totalPeriods = classes.reduce((acc, c) => {
                const classSubjectPeriods = c.subjects
                    .filter(sub => sub.subjectId === s.id)
                    .reduce((sum, sub) => sum + sub.periodsPerWeek, 0);
                return acc + classSubjectPeriods;
            }, 0);
            return {
                id: s.id,
                nameEn: s.nameEn,
                nameUr: s.nameUr,
                type: 'subject' as const,
                totalPeriods
            };
        });

        return [...classResults, ...teacherResults, ...subjectResults];
    }, [classes, teachers, subjects]);

    const filteredResults = useMemo(() => {
        if (!query.trim()) return [];
        const lowerCaseQuery = query.trim().toLowerCase();
        
        return allData.filter(item => {
            if (filterType !== 'all' && item.type !== filterType) return false;

            const matchesNameEn = item.nameEn.toLowerCase().includes(lowerCaseQuery);
            const matchesNameUr = item.nameUr.includes(query.trim());
            const matchesSerial = item.serialNumber?.toString().includes(lowerCaseQuery);
            const matchesRoom = item.roomNumber?.toLowerCase().includes(lowerCaseQuery);
            const matchesPeriods = item.totalPeriods?.toString() === lowerCaseQuery;

            return matchesNameEn || matchesNameUr || matchesSerial || matchesRoom || matchesPeriods;
        });
    }, [query, allData, filterType]);

    const groupedResults = useMemo(() => {
        return filteredResults.reduce((acc, item) => {
            if (!acc[item.type]) { acc[item.type] = []; }
            acc[item.type].push(item);
            return acc;
        }, {} as Record<'class' | 'teacher' | 'subject', SearchResult[]>);
    }, [filteredResults]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [autoFocus]);

    const handleItemClick = (type: 'class' | 'teacher' | 'subject', id: string) => {
        onResultClick(type, id);
        setQuery('');
        setIsOpen(false);
    };

    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim() || !text) return text;
        const parts = text.toString().split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white rounded px-0.5 font-bold">{part}</span> : part
        );
    };

    const hasResults = filteredResults.length > 0;
    const resultCategories = Object.keys(groupedResults) as ('class' | 'teacher' | 'subject')[];

    return (
        <div className={`relative w-full mx-auto ${className || 'max-w-lg'}`} ref={searchContainerRef}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-placeholder)] group-focus-within:text-[var(--accent-primary)] transition-colors">
                    <SearchIcon />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search by name, serial, room, periods..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="block w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border-2 border-transparent rounded-2xl text-lg text-[var(--text-primary)] placeholder-[var(--text-placeholder)] shadow-2xl focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                    aria-label="Global search"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen && hasResults}
                />
            </div>
            {isOpen && (
                <div className="absolute top-full mt-3 w-full bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] z-50 max-h-96 overflow-hidden animate-scale-in flex flex-col" role="listbox">
                    {/* Filter Tabs */}
                    <div className="flex p-2 gap-2 border-b border-[var(--border-secondary)] bg-[var(--bg-tertiary)]/30 overflow-x-auto no-scrollbar">
                        {(['all', 'class', 'teacher', 'subject'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                    filterType === type 
                                    ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {type === 'all' && <FilterIcon />}
                                {type === 'all' ? 'All' : t[`${type}s`]}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-grow">
                        {query.trim() ? (
                            hasResults ? (
                                <div className="py-2">
                                    {resultCategories.map(category => (
                                        <div key={category}>
                                            <h4 className="px-5 pt-3 pb-2 text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider bg-[var(--bg-tertiary)]/50 sticky top-0 backdrop-blur-sm" role="presentation">
                                                {t[`${category}sCsv`]}
                                            </h4>
                                            <ul role="group" aria-labelledby={`category-${category}`}>
                                                {groupedResults[category].map(item => (
                                                    <li key={item.id} role="option" aria-selected="false">
                                                        <button onClick={() => handleItemClick(item.type, item.id)} className="w-full text-left flex items-center gap-3 px-5 py-3 text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] transition-colors border-l-4 border-transparent hover:border-[var(--accent-primary)] group">
                                                            <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--accent-primary)] group-hover:bg-white group-hover:shadow-sm transition-all">
                                                                {ICONS[item.type]}
                                                            </div>
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold truncate">{highlightText(item.nameEn, query)}</span>
                                                                    <span className="font-urdu opacity-80 truncate">{highlightText(item.nameUr, query)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium uppercase tracking-wide">
                                                                    {item.serialNumber && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="opacity-60">#</span>
                                                                            {highlightText(item.serialNumber.toString(), query)}
                                                                        </span>
                                                                    )}
                                                                    {item.roomNumber && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="opacity-60">RM</span>
                                                                            {highlightText(item.roomNumber, query)}
                                                                        </span>
                                                                    )}
                                                                    {item.totalPeriods !== undefined && (
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="opacity-60">Pds</span>
                                                                            {highlightText(item.totalPeriods.toString(), query)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-8 text-center text-sm text-[var(--text-secondary)]">No results found.</p>
                            )
                        ) : (
                            <div className="p-8 text-center opacity-50">
                                <p className="text-sm text-[var(--text-secondary)]">Type to search...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
