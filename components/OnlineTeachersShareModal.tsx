import React, { useState, useRef } from 'react';
import { Teacher, SchoolClass, Subject, SchoolConfig, TimetableGridData, allDays } from '../types';
import { toBlob } from 'html-to-image';

interface OnlineTeachersShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    schoolConfig: SchoolConfig;
    t: any;
    language: 'en' | 'ur';
}

export const OnlineTeachersShareModal: React.FC<OnlineTeachersShareModalProps> = ({
    isOpen, onClose, teachers, classes, subjects, schoolConfig, t, language
}) => {
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const toggleTeacher = (id: string) => {
        const newSet = new Set(selectedTeacherIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTeacherIds(newSet);
    };

    const selectAll = () => {
        if (selectedTeacherIds.size === teachers.length) {
            setSelectedTeacherIds(new Set());
        } else {
            setSelectedTeacherIds(new Set(teachers.map(t => t.id)));
        }
    };

    const getTeacherScheduleForToday = (teacherId: string) => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as keyof TimetableGridData;
        // Fallback to Monday if today is Sunday/not in list (for testing)
        const dayKey = allDays.includes(today) ? today : 'Monday';
        
        const schedule: { period: number, className: string, subjectName: string }[] = [];

        classes.forEach(c => {
            const daySlots = c.timetable[dayKey];
            if (daySlots) {
                daySlots.forEach((slot, index) => {
                    if (Array.isArray(slot)) {
                        slot.forEach(p => {
                            if (p.teacherId === teacherId) {
                                const sub = subjects.find(s => s.id === p.subjectId);
                                schedule.push({
                                    period: index + 1,
                                    className: language === 'ur' ? c.nameUr : c.nameEn,
                                    subjectName: sub ? (language === 'ur' ? sub.nameUr : sub.nameEn) : ''
                                });
                            }
                        });
                    }
                });
            }
        });

        return { day: dayKey, schedule: schedule.sort((a, b) => a.period - b.period) };
    };

    const handleShare = async () => {
        if (!contentRef.current || selectedTeacherIds.size === 0) return;
        setIsGenerating(true);

        let generatedBlob: Blob | null = null;
        try {
            generatedBlob = await toBlob(contentRef.current, {
                pixelRatio: 1.5, // Reduced from 2 to speed up generation
                backgroundColor: '#ffffff'
            });

            if (generatedBlob) {
                const file = new File([generatedBlob], `Teachers_Schedule_${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Teachers Schedule',
                    });
                } else {
                    const url = URL.createObjectURL(generatedBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Teachers_Schedule_${new Date().toISOString().split('T')[0]}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            }
        } catch (error: any) {
            if (generatedBlob && (error.name === 'NotAllowedError' || error.message?.includes('user gesture'))) {
                // Fallback download if share fails due to user gesture timeout
                console.warn("Share required user gesture, falling back to download.");
                const url = URL.createObjectURL(generatedBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Teachers_Schedule_${new Date().toISOString().split('T')[0]}.png`;
                link.click();
                URL.revokeObjectURL(url);
            } else {
                console.error('Sharing failed:', error);
                alert('Failed to share image.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const todayDate = new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Online Teachers Schedule</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: Teacher Selection */}
                    <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Select Teachers</span>
                            <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                {selectedTeacherIds.size === teachers.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {teachers.map(teacher => (
                                <button
                                    key={teacher.id}
                                    onClick={() => toggleTeacher(teacher.id)}
                                    className={`w-full text-left px-3 py-2 rounded-[1.25rem] text-sm flex items-center gap-2 transition-colors ${
                                        selectedTeacherIds.has(teacher.id) 
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' 
                                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTeacherIds.has(teacher.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                                        {selectedTeacherIds.has(teacher.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="truncate">{language === 'ur' ? teacher.nameUr : teacher.nameEn}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="w-full md:w-2/3 bg-gray-100 dark:bg-gray-900 p-4 overflow-y-auto flex items-start justify-center">
                        <div ref={contentRef} className="bg-white p-6 rounded-[2rem] shadow-lg w-full max-w-lg mx-auto min-h-[18.75rem]">
                            {/* Header */}
                            <div className="text-center mb-6 border-b-2 border-gray-100 pb-4">
                                <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-1">{schoolConfig.schoolNameEn}</h1>
                                <p className="text-sm font-medium text-gray-500">{todayDate}</p>
                            </div>

                            {/* Teachers List */}
                            <div className="space-y-6">
                                {Array.from(selectedTeacherIds).map(id => {
                                    const teacher = teachers.find(t => t.id === id);
                                    if (!teacher) return null;
                                    const { schedule } = getTeacherScheduleForToday(id as string);
                                    
                                    return (
                                        <div key={id} className="relative pl-4 border-l-4 border-blue-500">
                                            <h3 className="text-lg font-bold text-gray-900 leading-none mb-2">
                                                {language === 'ur' ? teacher.nameUr : teacher.nameEn}
                                            </h3>
                                            {schedule.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {schedule.map((s, idx) => (
                                                        <div key={idx} className="bg-gray-50 rounded px-2 py-1 border border-gray-200 flex items-center gap-2 text-sm">
                                                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded text-xs">{s.period}</span>
                                                            <span className="font-medium text-gray-700">{s.className}</span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-gray-500 text-xs truncate max-w-[5rem]">{s.subjectName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">No classes scheduled for today.</p>
                                            )}
                                        </div>
                                    );
                                })}
                                {selectedTeacherIds.size === 0 && (
                                    <p className="text-center text-gray-400 italic py-10">Select teachers to view their schedule slip.</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-[0.625rem] text-gray-400 uppercase tracking-widest">
                                <span>Generated by Mr. Timetable</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-[1.25rem] transition-colors">Cancel</button>
                    <button 
                        onClick={handleShare} 
                        disabled={selectedTeacherIds.size === 0 || isGenerating}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-[1.25rem] shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                                Share Slip
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
