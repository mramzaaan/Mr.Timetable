
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { SchoolClass, Teacher, Subject, Language } from '../types';

export type SearchResult = { id: string; nameEn: string; nameUr: string; type: 'class' | 'teacher' | 'subject' };

// Icons
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ClassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SubjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>;

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
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const allData = useMemo<SearchResult[]>(() => [
        ...classes.map(c => ({ id: c.id, nameEn: c.nameEn, nameUr: c.nameUr, type: 'class' as const })),
        ...teachers.map(t => ({ id: t.id, nameEn: t.nameEn, nameUr: t.nameUr, type: 'teacher' as const })),
        ...subjects.map(s => ({ id: s.id, nameEn: s.nameEn, nameUr: s.nameUr, type: 'subject' as const })),
    ], [classes, teachers, subjects]);

    const filteredResults = useMemo(() => {
        if (!query.trim()) return [];
        const lowerCaseQuery = query.trim().toLowerCase();
        return allData.filter(item =>
            item.nameEn.toLowerCase().includes(lowerCaseQuery) ||
            item.nameUr.includes(query.trim())
        );
    }, [query, allData]);

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
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="block w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border-2 border-transparent rounded-2xl text-lg text-[var(--text-primary)] placeholder-[var(--text-placeholder)] shadow-2xl focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                    aria-label="Global search"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen && hasResults}
                />
            </div>
            {isOpen && query.trim() && (
                <div className="absolute top-full mt-3 w-full bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] z-50 max-h-96 overflow-y-auto animate-scale-in custom-scrollbar" role="listbox">
                    {hasResults ? (
                        <div className="py-2">
                            {resultCategories.map(category => (
                                <div key={category}>
                                    <h4 className="px-5 pt-3 pb-2 text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider bg-[var(--bg-tertiary)]/50" role="presentation">
                                        {t[`${category}sCsv`]}
                                    </h4>
                                    <ul role="group" aria-labelledby={`category-${category}`}>
                                        {groupedResults[category].map(item => (
                                            <li key={item.id} role="option" aria-selected="false">
                                                <button onClick={() => handleItemClick(item.type, item.id)} className="w-full text-left flex items-center gap-3 px-5 py-3 text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] transition-colors border-l-4 border-transparent hover:border-[var(--accent-primary)]">
                                                    <span className="text-[var(--accent-primary)]">{ICONS[item.type]}</span>
                                                    <span>{item.nameEn} <span className="font-urdu opacity-80">/ {item.nameUr}</span></span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="p-8 text-center text-sm text-[var(--text-secondary)]">No results found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
