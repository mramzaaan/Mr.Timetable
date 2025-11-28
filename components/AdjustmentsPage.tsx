



import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, SchoolConfig, Period, DownloadLanguage, LeaveDetails, DownloadDesignConfig } from '../types';
import PrintPreview from './PrintPreview';
import { translations } from '../i18n';
import { generateAdjustmentsExcel, generateAdjustmentsReportHtml } from './reportUtils';
import { generateUniqueId } from '../types';
import DownloadModal from './DownloadModal';

// Icons
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const ImportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12" /></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const ChevronUp = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const DoubleBookedWarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);
const WhatsAppIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" />
    </svg>
);

interface AlternativeTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails: Record<string, Record<string, LeaveDetails>> | undefined;
  onSetAdjustments: (date: string, adjustmentsForDate: Adjustment[]) => void;
  onSetLeaveDetails: (date: string, details: Record<string, LeaveDetails>) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  selection: { date: string; teacherIds: string[]; };
  onSelectionChange: React.Dispatch<React.SetStateAction<{ date: string; teacherIds: string[]; }>>;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type SubstituteStatus =
  | { type: 'IN_CHARGE' }
  | { type: 'TEACHES_CLASS' }
  | { type: 'AVAILABLE' }
  | { type: 'UNAVAILABLE'; reason: 'SUBSTITUTION' }
  | { type: 'UNAVAILABLE'; reason: 'DOUBLE_BOOK'; conflictClass: { classNameEn: string, classNameUr: string } };

type TeacherWithStatus = {
  teacher: Teacher;
  status: SubstituteStatus;
};

interface SubstitutionGroup {
    absentTeacher: Teacher;
    period: Period; 
    periodIndex: number;
    combinedClassIds: string[];
    combinedClassNames: { en: string; ur: string };
    subjectInfo: { en: string; ur: string };
}

export const AlternativeTimetablePage: React.FC<AlternativeTimetablePageProps> = ({ t, language, classes, subjects, teachers, adjustments, leaveDetails, onSetAdjustments, onSetLeaveDetails, schoolConfig, onUpdateSchoolConfig, selection, onSelectionChange, openConfirmation }) => {
  const { date: selectedDate, teacherIds: absentTeacherIds } = selection;
  
  const [dailyAdjustments, setDailyAdjustments] = useState<Adjustment[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [absenteeDetails, setAbsenteeDetails] = useState<Record<string, LeaveDetails>>({});
  const [isTeacherSelectionOpen, setIsTeacherSelectionOpen] = useState(false);
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set());
  const [messageLanguage, setMessageLanguage] = useState<Language>(language);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedDate = useRef<string | null>(null);

  const toggleTeacherCollapse = (teacherId: string) => {
    setExpandedTeacherIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };
  
  const getTeacherName = (t: Teacher) => language === 'ur' ? <span className="font-urdu">{t.nameUr}</span> : t.nameEn;
  const getRespectfulName = (teacher: Teacher, lang: Language) => {
    if (lang === 'ur') {
        if (teacher.gender === 'Male') return `محترم ${teacher.nameUr} صاحب`;
        if (teacher.gender === 'Female') return `محترمہ ${teacher.nameUr} صاحبہ`;
        return teacher.nameUr;
    }
    const prefix = teacher.gender === 'Male' ? 'Mr.' : (teacher.gender === 'Female' ? 'Ms.' : '');
    return `${prefix} ${teacher.nameEn}`.trim();
  };
  
  const dayOfWeek = useMemo(() => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    const dayIndex = date.getUTCDay(); 
    return dayIndex > 0 && dayIndex < 6 ? daysOfWeek[dayIndex - 1] : null;
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate === lastSyncedDate.current) {
        return;
    }

    const savedAdjustments = adjustments[selectedDate] || [];
    setDailyAdjustments(savedAdjustments);
    
    const savedLeaveDetails: Record<string, LeaveDetails> = leaveDetails?.[selectedDate] || {};
    
    const teacherIdsFromData = [...new Set([
        ...savedAdjustments.map(adj => adj.originalTeacherId),
        ...Object.keys(savedLeaveDetails)
    ])];

    onSelectionChange(prev => ({ 
        ...prev, 
        teacherIds: teacherIdsFromData.length > 0 ? teacherIdsFromData : prev.teacherIds 
    }));
    
    const initialDetails: Record<string, LeaveDetails> = {};
    teacherIdsFromData.forEach(id => {
        initialDetails[id] = savedLeaveDetails[id] || { leaveType: 'full', startPeriod: 1 };
    });
    setAbsenteeDetails(initialDetails);
    setExpandedTeacherIds(new Set()); 
    
    lastSyncedDate.current = selectedDate;
  }, [selectedDate, adjustments, leaveDetails, onSelectionChange]);


  const absentTeachers = useMemo(() => {
    return teachers.filter(teacher => absentTeacherIds.includes(teacher.id));
  }, [teachers, absentTeacherIds]);

  const substitutionGroups = useMemo((): SubstitutionGroup[] => {
    if (!dayOfWeek) return [];
    
    const groups: SubstitutionGroup[] = [];
    
    absentTeachers.forEach(absentTeacher => {
        const details = absenteeDetails[absentTeacher.id];
        const isFullDay = !details || details.leaveType === 'full';
        const startPeriod = isFullDay ? 0 : (details.startPeriod - 1);

        for (let periodIndex = startPeriod; periodIndex < 8; periodIndex++) {
            const periodsToCover = classes.map(c => 
                (c.timetable[dayOfWeek]?.[periodIndex] || [])
                    .filter(p => p.teacherId === absentTeacher.id)
            ).flat();

            if (periodsToCover.length > 0) {
                const processedJointPeriods = new Set<string>();
                periodsToCover.forEach(firstPeriod => {
                    const jointPeriodId = firstPeriod.jointPeriodId;
                    if(jointPeriodId && processedJointPeriods.has(jointPeriodId)) return;

                    const classIds = jointPeriodId 
                        ? classes.filter(c => c.timetable[dayOfWeek]?.[periodIndex]?.some(p => p.jointPeriodId === jointPeriodId)).map(c => c.id)
                        : [firstPeriod.classId];

                    const classNames = classIds.map(id => {
                        const c = classes.find(cls => cls.id === id);
                        return { en: c?.nameEn || '', ur: c?.nameUr || ''};
                    }).reduce((acc, curr) => ({ en: acc.en ? `${acc.en}, ${curr.en}` : curr.en, ur: acc.ur ? `${acc.ur}، ${curr.ur}`: curr.ur}), {en: '', ur: ''});

                    const subject = subjects.find(s => s.id === firstPeriod.subjectId);

                    groups.push({
                        absentTeacher: absentTeacher,
                        period: firstPeriod,
                        periodIndex: periodIndex,
                        combinedClassIds: classIds,
                        combinedClassNames: classNames,
                        subjectInfo: { en: subject?.nameEn || '', ur: subject?.nameUr || '' },
                    });
                    if(jointPeriodId) processedJointPeriods.add(jointPeriodId);
                });
            }
        }
    });
    return groups.sort((a,b) => a.absentTeacher.id.localeCompare(b.absentTeacher.id) || a.periodIndex - b.periodIndex);
  }, [dayOfWeek, absentTeachers, classes, subjects, absenteeDetails]);

  const teacherBookingsMap = useMemo(() => {
    const bookings = new Map<string, { classNameEn: string, classNameUr: string }>();
    daysOfWeek.forEach(day => {
        for (let periodIndex = 0; periodIndex < 8; periodIndex++) {
            classes.forEach(c => {
                c.timetable[day]?.[periodIndex]?.forEach(p => {
                    const key = `${day}-${periodIndex}-${p.teacherId}`;
                    if (!bookings.has(key)) {
                        bookings.set(key, { classNameEn: c.nameEn, classNameUr: c.nameUr });
                    }
                });
            });
        }
    });
    return bookings;
  }, [classes]);

  const findAvailableTeachers = useCallback((periodIndex: number, period: Period): TeacherWithStatus[] => {
    if (!dayOfWeek) return [];
    
    const busyThroughSubstitution = new Set(dailyAdjustments.filter(adj => adj.periodIndex === periodIndex).map(adj => adj.substituteTeacherId));
    
    const allTeachersWithStatus = teachers
        .filter(t => !absentTeacherIds.includes(t.id))
        .map(teacher => {
            let status: SubstituteStatus;

            if (busyThroughSubstitution.has(teacher.id)) {
                status = { type: 'UNAVAILABLE', reason: 'SUBSTITUTION' };
            } else {
                const bookingKey = `${dayOfWeek}-${periodIndex}-${teacher.id}`;
                const booking = teacherBookingsMap.get(bookingKey);
                if (booking) {
                    status = { type: 'UNAVAILABLE', reason: 'DOUBLE_BOOK', conflictClass: { classNameEn: booking.classNameEn, classNameUr: booking.classNameUr } };
                } else {
                    const targetClass = classes.find(c => c.id === period.classId);
                    if (targetClass?.inCharge === teacher.id) {
                        status = { type: 'IN_CHARGE' };
                    } else if (targetClass?.subjects.some(s => s.teacherId === teacher.id)) {
                        status = { type: 'TEACHES_CLASS' };
                    } else {
                        status = { type: 'AVAILABLE' };
                    }
                }
            }
            return { teacher, status };
        });

    return allTeachersWithStatus.sort((a, b) => {
        const order: Record<SubstituteStatus['type'], number> = { 'IN_CHARGE': 1, 'TEACHES_CLASS': 2, 'AVAILABLE': 3, 'UNAVAILABLE': 4 };
        return order[a.status.type] - order[b.status.type];
    });
  }, [dayOfWeek, dailyAdjustments, absentTeacherIds, teachers, classes, teacherBookingsMap]);

    const handleTeacherSelectionChange = (teacherId: string, isChecked: boolean) => {
        const newTeacherIds = isChecked
            ? [...absentTeacherIds, teacherId]
            : absentTeacherIds.filter(id => id !== teacherId);
        onSelectionChange(prev => ({ ...prev, teacherIds: newTeacherIds }));

        const newDetails = { ...absenteeDetails };
        if (isChecked) {
            if (!newDetails[teacherId]) {
                newDetails[teacherId] = { leaveType: 'full', startPeriod: 1 };
            }
        } else {
            delete newDetails[teacherId];
        }
        setAbsenteeDetails(newDetails);
        onSetLeaveDetails(selectedDate, newDetails);
    };

    const handleDetailChange = (teacherId: string, detail: Partial<LeaveDetails>) => {
        const newDetails = {
            ...absenteeDetails,
            [teacherId]: {
                ...(absenteeDetails[teacherId] || { leaveType: 'full', startPeriod: 1 }),
                ...detail
            }
        };
        setAbsenteeDetails(newDetails);
        onSetLeaveDetails(selectedDate, newDetails);
    };

  const handleSubstituteChange = (group: SubstitutionGroup, substituteTeacherId: string) => {
    if (!dayOfWeek) return;

    const availableTeachersList = findAvailableTeachers(group.periodIndex, group.period);
    const selectedTeacherInfo = availableTeachersList.find(t => t.teacher.id === substituteTeacherId);

    let conflictDetails: Adjustment['conflictDetails'];
    if (substituteTeacherId && selectedTeacherInfo?.status.type === 'UNAVAILABLE' && selectedTeacherInfo.status.reason === 'DOUBLE_BOOK') {
        conflictDetails = selectedTeacherInfo.status.conflictClass;
    }

    const { absentTeacher, periodIndex, combinedClassIds } = group;
    let newAdjustments = dailyAdjustments.filter(adj => 
        !(adj.periodIndex === periodIndex && adj.originalTeacherId === absentTeacher.id)
    );
    if (substituteTeacherId) {
        combinedClassIds.forEach(classId => {
            const periodInClass = classes.find(c => c.id === classId)?.timetable[dayOfWeek]?.[periodIndex].find(p => p.teacherId === absentTeacher.id || (p.jointPeriodId && group.period.jointPeriodId === p.jointPeriodId));
            if (periodInClass) {
                newAdjustments.push({
                    id: `${selectedDate}-${dayOfWeek}-${periodIndex}-${classId}-${absentTeacher.id}`,
                    classId,
                    subjectId: periodInClass.subjectId,
                    originalTeacherId: absentTeacher.id,
                    substituteTeacherId: substituteTeacherId,
                    day: dayOfWeek,
                    periodIndex,
                    conflictDetails: conflictDetails
                });
            }
        });
    }
    setDailyAdjustments(newAdjustments);
    onSetAdjustments(selectedDate, newAdjustments);
  };
  
  const handleSaveAdjustments = () => {
    onSetAdjustments(selectedDate, dailyAdjustments);
    alert(t.saveAdjustments);
  };
  
  const handleExportJson = () => {
    if (dailyAdjustments.length === 0) {
      alert("No adjustments to export.");
      return;
    }
    const dataStr = JSON.stringify(dailyAdjustments, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adjustments_${selectedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const imported: Adjustment[] = JSON.parse(json);
        if (!Array.isArray(imported)) throw new Error("Invalid format");

        const transformed = imported.map(adj => {
            const newId = generateUniqueId();
            return {
                ...adj,
                id: newId,
                day: dayOfWeek as keyof TimetableGridData,
            };
        });

        onSetAdjustments(selectedDate, transformed);
        setDailyAdjustments(transformed);
        
        const importedTeacherIds = [...new Set(transformed.map(adj => adj.originalTeacherId))];
        onSelectionChange(prev => {
             return { ...prev, teacherIds: [...new Set([...prev.teacherIds, ...importedTeacherIds])] };
        });
        
        const newDetails = { ...absenteeDetails };
        importedTeacherIds.forEach(id => {
            if (!newDetails[id]) {
                newDetails[id] = { leaveType: 'full', startPeriod: 1 };
            }
        });
        setAbsenteeDetails(newDetails);
        onSetLeaveDetails(selectedDate, newDetails);

        alert("Adjustments imported successfully.");
      } catch (err) {
        console.error(err);
        alert("Failed to import adjustments. Invalid file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

    const handleCancelAlternativeTimetable = () => {
        openConfirmation(
            t.cancelAlternativeTimetable,
            t.cancelAlternativeTimetableConfirm,
            () => {
                onSetAdjustments(selectedDate, []);
                onSetLeaveDetails(selectedDate, {});
                onSelectionChange(prev => ({ ...prev, teacherIds: [] }));
                setAbsenteeDetails({});
            }
        );
    };

  const handleWhatsAppNotify = (adjustment: Adjustment) => {
    const substitute = teachers.find(t => t.id === adjustment.substituteTeacherId);
    const originalTeacher = teachers.find(t => t.id === adjustment.originalTeacherId);
    const schoolClass = classes.find(c => c.id === adjustment.classId);
    const subject = subjects.find(s => s.id === adjustment.subjectId);

    if (!substitute?.contactNumber) {
        alert("Substitute's contact number not found.");
        return;
    }
    if (!originalTeacher || !schoolClass || !subject) {
        alert("Could not generate message due to missing data.");
        return;
    }
    
    const date = new Date(selectedDate);
    const dayOfWeekStr = date.toLocaleDateString(messageLanguage === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'long' });
    const respectfulName = getRespectfulName(substitute, messageLanguage);
    const msgT = translations[messageLanguage];
    
    // Format: Day Month(Word) Year
    const dateStr = date.toLocaleDateString(messageLanguage === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    let message;
    if (adjustment.conflictDetails) {
        message = msgT.substituteNotificationMessageDoubleBook
            .replace('{teacherName}', respectfulName)
            .replace('{date}', dateStr)
            .replace('{dayOfWeek}', dayOfWeekStr)
            .replace('{period}', String(adjustment.periodIndex + 1))
            .replace('{className}', messageLanguage === 'ur' ? schoolClass.nameUr : schoolClass.nameEn)
            .replace('{subjectName}', messageLanguage === 'ur' ? subject.nameUr : subject.nameEn)
            .replace('{originalTeacherName}', messageLanguage === 'ur' ? originalTeacher.nameUr : originalTeacher.nameEn)
            .replace('{conflictClassName}', messageLanguage === 'ur' ? adjustment.conflictDetails.classNameUr : adjustment.conflictDetails.classNameEn);
    } else {
        message = msgT.notificationTemplateDefault
            .replace('{teacherName}', respectfulName)
            .replace('{date}', dateStr)
            .replace('{dayOfWeek}', dayOfWeekStr)
            .replace('{period}', String(adjustment.periodIndex + 1))
            .replace('{className}', messageLanguage === 'ur' ? schoolClass.nameUr : schoolClass.nameEn)
            .replace('{subjectName}', messageLanguage === 'ur' ? subject.nameUr : subject.nameEn)
            .replace('{originalTeacherName}', messageLanguage === 'ur' ? originalTeacher.nameUr : originalTeacher.nameEn);
    }

    let phoneNumber = substitute.contactNumber.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopyAll = () => {
    if (dailyAdjustments.length === 0) {
        alert("No adjustments to copy.");
        return;
    }
    const date = new Date(selectedDate);
    const dayOfWeekStr = date.toLocaleDateString(messageLanguage === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString(messageLanguage === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const msgT = translations[messageLanguage];
    
    // Header
    let fullMessage = `📅 *${msgT.dailyAdjustments}* \n🗓️ ${dateStr} (${dayOfWeekStr})\n${"-".repeat(20)}\n\n`;

    const bySubstitute = dailyAdjustments.reduce((acc, adj) => {
        if (!acc[adj.substituteTeacherId]) acc[acc.substituteTeacherId] = [];
        acc[adj.substituteTeacherId].push(adj);
        return acc;
    }, {} as Record<string, Adjustment[]>);

    Object.entries(bySubstitute).forEach(([subId, adjs]) => {
        const substitute = teachers.find(t => t.id === subId);
        if (!substitute) return;
        
        // Teacher Name Header
        fullMessage += `👤 *${getRespectfulName(substitute, messageLanguage)}*\n`;
        
        (adjs as Adjustment[]).sort((a,b) => a.periodIndex - b.periodIndex).forEach(adj => {
             const schoolClass = classes.find(c => c.id === adj.classId);
             const subject = subjects.find(s => s.id === adj.subjectId);
             const originalTeacher = teachers.find(t => t.id === adj.originalTeacherId);
             
             const className = messageLanguage === 'ur' ? schoolClass?.nameUr : schoolClass?.nameEn;
             const subjectName = messageLanguage === 'ur' ? subject?.nameUr : subject?.nameEn;
             const originalTeacherName = messageLanguage === 'ur' ? originalTeacher?.nameUr : originalTeacher?.nameEn;
             
             // Clean format
             fullMessage += `   🕒 *P${adj.periodIndex + 1}* | 🏫 ${className} | 📖 ${subjectName}\n`;
             fullMessage += `      ↳ 🔄 ${msgT.substitution}: ${originalTeacherName}\n`;
             
             if(adj.conflictDetails) {
                const conflictClass = messageLanguage === 'ur' ? adj.conflictDetails.classNameUr : adj.conflictDetails.classNameEn;
                fullMessage += `      ⚠️ *${msgT.doubleBook} Warning:* ${conflictClass}\n`;
             }
        });
        fullMessage += `\n`;
    });

    navigator.clipboard.writeText(fullMessage).then(() => {
        alert(t.messagesCopied);
    });
  };
  
  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({
      downloadDesigns: { ...schoolConfig.downloadDesigns, alternative: newDesign }
    });
  };

  const formattedDateForTitle = new Date(selectedDate).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PrintPreview 
        t={t} 
        isOpen={isPrintPreviewOpen} 
        onClose={() => setIsPrintPreviewOpen(false)} 
        title={`${t.dailyAdjustments}: ${formattedDateForTitle}`} 
        fileNameBase={`Adjustments_${selectedDate}`}
        generateHtml={(lang, design) => generateAdjustmentsReportHtml(t, lang, design, dailyAdjustments, teachers, classes, subjects, schoolConfig, selectedDate)}
        onGenerateExcel={(lang) => generateAdjustmentsExcel(t, dailyAdjustments, teachers, classes, subjects, selectedDate)}
        designConfig={schoolConfig.downloadDesigns.alternative}
        onSaveDesign={handleSavePrintDesign}
      />
      
      <DownloadModal
        t={t}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        title={`${t.download} ${t.dailyAdjustments}`}
        fileNameBase={`Adjustments_${selectedDate}`}
        generateContentHtml={(lang, design) => generateAdjustmentsReportHtml(t, lang, design, dailyAdjustments, teachers, classes, subjects, schoolConfig, selectedDate).join('')}
        onGenerateExcel={(lang, design) => generateAdjustmentsExcel(t, dailyAdjustments, teachers, classes, subjects, selectedDate)}
        designConfig={schoolConfig.downloadDesigns.alternative}
      />
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label htmlFor="adjustment-date" className="block text-sm font-medium text-[var(--text-secondary)]">{t.selectDate}</label>
          <input type="date" id="adjustment-date" value={selectedDate} onChange={(e) => onSelectionChange(prev => ({ ...prev, date: e.target.value }))} className="block w-full md:w-auto pl-3 pr-10 py-2 text-base bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md shadow-sm" />
          <div className="relative">
             <button onClick={() => setIsTeacherSelectionOpen(!isTeacherSelectionOpen)} className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-md text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] shadow-sm">{t.teacherOnLeave} ({absentTeacherIds.length})</button>
             {isTeacherSelectionOpen && (
                 <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsTeacherSelectionOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-64 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg z-20 max-h-60 overflow-y-auto p-2 animate-scale-in">
                        {teachers.map(teacher => (
                            <label key={teacher.id} className="flex items-center space-x-3 p-2 hover:bg-[var(--accent-secondary-hover)] rounded cursor-pointer">
                                <input type="checkbox" checked={absentTeacherIds.includes(teacher.id)} onChange={(e) => handleTeacherSelectionChange(teacher.id, e.target.checked)} className="form-checkbox h-4 w-4 text-[var(--accent-primary)] rounded focus:ring-[var(--accent-primary)]" />
                                <span className="text-sm text-[var(--text-primary)]">{getTeacherName(teacher)}</span>
                            </label>
                        ))}
                    </div>
                 </>
             )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setMessageLanguage(prev => prev === 'en' ? 'ur' : 'en')} title="Toggle Message Language" className="px-3 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"><span className="text-xs text-center text-[var(--text-secondary)] uppercase">{t.msgLang}:</span><span className={messageLanguage === 'ur' ? 'font-urdu' : ''}>{messageLanguage === 'en' ? 'EN' : 'اردو'}</span></button>
            {dailyAdjustments.length > 0 && <button onClick={handleCopyAll} title={t.copyAllMessages} className="p-2 text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg></button>}
             <button onClick={handleSaveAdjustments} title={t.saveAdjustments} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg></button>
            <button onClick={handleExportJson} title="Export Adjustments JSON" className="p-2 text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors"><ExportIcon /></button>
            <button onClick={() => fileInputRef.current?.click()} title="Import Adjustments JSON" className="p-2 text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors"><ImportIcon /></button>
            <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
            <button onClick={() => setIsDownloadModalOpen(true)} disabled={dailyAdjustments.length === 0} title={t.download} className="p-2 text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={dailyAdjustments.length === 0} title={t.printViewAction} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
            <button onClick={handleCancelAlternativeTimetable} disabled={dailyAdjustments.length === 0 && absentTeacherIds.length === 0} title={t.cancelAlternativeTimetable} className="p-2 text-sm font-medium text-red-600 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         {absentTeacherIds.length > 0 && (
             <div className="bg-[var(--bg-secondary)] p-6 rounded-lg shadow-md border border-[var(--border-primary)] mb-6">
                 <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t.leaveDetails}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {absentTeachers.map(teacher => (
                        <div key={teacher.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-secondary)]">
                            <span className="font-medium text-[var(--text-primary)] truncate mr-2">{getTeacherName(teacher)}</span>
                            <div className="flex items-center gap-2">
                                <select value={absenteeDetails[teacher.id]?.leaveType || 'full'} onChange={(e) => handleDetailChange(teacher.id, { leaveType: e.target.value as 'full' | 'half' })} className="text-sm p-1 rounded border border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]">
                                    <option value="full">{t.fullDay}</option>
                                    <option value="half">{t.halfDay}</option>
                                </select>
                                {absenteeDetails[teacher.id]?.leaveType === 'half' && (
                                    <select value={absenteeDetails[teacher.id]?.startPeriod || 1} onChange={(e) => handleDetailChange(teacher.id, { startPeriod: parseInt(e.target.value) })} className="text-sm p-1 rounded border border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] w-16">
                                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{t.period} {p}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
         )}

         {dayOfWeek ? (
            substitutionGroups.length > 0 ? (
            <div className="space-y-4">
                {substitutionGroups.map((group) => {
                    const assignedAdj = dailyAdjustments.find(a => a.periodIndex === group.periodIndex && a.originalTeacherId === group.absentTeacher.id);
                    const currentSubstituteId = assignedAdj?.substituteTeacherId || '';
                    const availableTeachersList = findAvailableTeachers(group.periodIndex, group.period);
                    const isExpanded = expandedTeacherIds.has(group.absentTeacher.id);
                    const isFirstForTeacher = group.periodIndex === (substitutionGroups.find(g => g.absentTeacher.id === group.absentTeacher.id)?.periodIndex);

                    return (
                    <React.Fragment key={`${group.absentTeacher.id}-${group.periodIndex}`}>
                        {isFirstForTeacher && (
                            <div className="mt-6 mb-2 bg-red-50 p-3 rounded-t-lg border border-red-200 flex justify-between items-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => toggleTeacherCollapse(group.absentTeacher.id)}>
                                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-red-600 rounded-full inline-block"></span>
                                    {getTeacherName(group.absentTeacher)}
                                </h3>
                                <button className="text-red-600 hover:text-red-800">
                                    {!isExpanded ? <ChevronDown /> : <ChevronUp />}
                                </button>
                            </div>
                        )}
                        {isExpanded && (
                            <div className={`bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-secondary)] overflow-hidden transition-all ${currentSubstituteId ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-orange-400'}`}>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-1 text-center">
                                        <span className="block text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider">{t.period}</span>
                                        <span className="text-2xl font-bold text-[var(--text-primary)]">{group.periodIndex + 1}</span>
                                    </div>
                                    <div className="md:col-span-4">
                                        <div className="font-semibold text-[var(--text-primary)]">
                                            {language === 'ur' ? <span className="font-urdu">{group.combinedClassNames.ur}</span> : group.combinedClassNames.en}
                                        </div>
                                        <div className="text-sm text-[var(--text-secondary)]">
                                            {language === 'ur' ? <span className="font-urdu">{group.subjectInfo.ur}</span> : group.subjectInfo.en}
                                        </div>
                                    </div>
                                    <div className="md:col-span-5">
                                        <select value={currentSubstituteId} onChange={(e) => handleSubstituteChange(group, e.target.value)} className="block w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] sm:text-sm">
                                            <option value="">{t.select} {t.substituteTeacher}</option>
                                            {availableTeachersList.map(({ teacher, status }) => {
                                                let label = language === 'ur' ? teacher.nameUr : teacher.nameEn;
                                                let statusText = '';
                                                if (status.type === 'IN_CHARGE') statusText = t.statusInCharge;
                                                else if (status.type === 'TEACHES_CLASS') statusText = t.statusTeachesClass;
                                                else if (status.type === 'UNAVAILABLE') {
                                                    if (status.reason === 'SUBSTITUTION') statusText = `(${t.substitution})`;
                                                    else if (status.reason === 'DOUBLE_BOOK') {
                                                        const conflictName = language === 'ur' ? status.conflictClass.classNameUr : status.conflictClass.classNameEn;
                                                        statusText = `(${t.statusUnavailable} - ${conflictName})`;
                                                    }
                                                }
                                                return <option key={teacher.id} value={teacher.id} className={`font-urdu ${status.type === 'UNAVAILABLE' ? 'text-red-600 font-bold' : ''}`}>{label} {statusText}</option>;
                                            })}
                                        </select>
                                        {assignedAdj?.conflictDetails && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center">
                                                <DoubleBookedWarningIcon />
                                                <span className="ml-1">{t.doubleBook}: {language === 'ur' ? assignedAdj.conflictDetails.classNameUr : assignedAdj.conflictDetails.classNameEn}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-2">
                                        {currentSubstituteId && (
                                            <button onClick={() => handleWhatsAppNotify(assignedAdj!)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors" title={t.notifySubstitute}>
                                                <WhatsAppIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                    );
                })}
            </div>
            ) : <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-secondary)]"><p className="text-[var(--text-secondary)]">{t.noClassesScheduled}</p></div>
         ) : <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-lg border border-dashed border-[var(--border-secondary)]"><p className="text-[var(--text-secondary)]">Please select a date to begin.</p></div>}
      </div>
    </div>
  );
};
