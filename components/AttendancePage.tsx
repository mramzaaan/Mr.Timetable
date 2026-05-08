
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Language, SchoolClass, TimetableSession, AttendanceData, SchoolConfig, DownloadDesignConfig } from '../types';
import AttendanceForm from './AttendanceForm';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import PrintPreview from './PrintPreview';
import { generateAttendanceReportHtml, generateAttendanceReportExcel } from './reportUtils';
import { Share2, ArrowUpDown, Printer, Calendar, FileDown, FileUp } from 'lucide-react';

interface AttendancePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  currentTimetableSession: TimetableSession | null;
  onUpdateSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  schoolConfig: SchoolConfig;
  userRole?: string;
  userEmail: string | null;
}

const PrintIcon = () => <Printer className="h-5 w-5" />;
const UploadIcon = () => <FileUp className="h-5 w-5" />;
const DownloadIcon = () => <FileDown className="h-5 w-5" />;

export const AttendancePage: React.FC<AttendancePageProps> = ({ t, language, classes, currentTimetableSession, onUpdateSession, onUpdateSchoolConfig, schoolConfig, userRole = 'admin', userEmail }) => {
  const isAdmin = userRole === 'admin';
  const currentTeacher = useMemo(() => {
    if (!currentTimetableSession || !userEmail) return null;
    return currentTimetableSession.teachers.find(t => t.email?.toLowerCase() === userEmail.toLowerCase());
  }, [currentTimetableSession, userEmail]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter classes based on role and responsibility
  const visibleClasses = useMemo(() => {
    const allFiltered = classes.filter(c => c.id !== 'non-teaching-duties');
    if (isAdmin) return allFiltered;
    if (!currentTeacher || !currentTimetableSession) return [];

    const dayNames: any = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[new Date(selectedDate).getDay()];

    return allFiltered.filter(c => {
        // Condition 1: Is In-Charge
        if (c.inCharge === currentTeacher.id) return true;

        // Condition 2: Has first period today in this class
        const todayTimetable = c.timetable?.[selectedDayName as keyof typeof c.timetable];
        if (todayTimetable && todayTimetable[0]) {
            if (todayTimetable[0].some(s => s.teacherId === currentTeacher.id)) return true;
        }

        // Condition 3: Has substitution in first period today in this class
        const adjustmentsForDay = currentTimetableSession.adjustments?.[selectedDate] || [];
        const isSubbingFirstPeriod = adjustmentsForDay.some(adj => 
            adj.classId === c.id && 
            adj.substituteTeacherId === currentTeacher.id && 
            adj.periodIndex === 0
        );
        if (isSubbingFirstPeriod) return true;

        return false;
    });
  }, [classes, isAdmin, currentTeacher, currentTimetableSession, selectedDate]);

  useEffect(() => {
    if (!selectedClassId && visibleClasses.length > 0) {
      setSelectedClassId(visibleClasses[0].id);
    }
  }, [visibleClasses, selectedClassId]);

  const selectedClass = visibleClasses.find(c => c.id === selectedClassId);
  const isClassInCharge = useMemo(() => {
    if (isAdmin) return true;
    
    // Support granular permission
    const userEmailLower = userEmail?.toLowerCase() || '';
    if (currentTimetableSession?.userPermissions?.[userEmailLower]?.canTakeAttendance) return true;

    if (!selectedClass || !currentTeacher || !currentTimetableSession) return false;
    
    // Original Logic: Fixed In-Charge
    const isFixedInCharge = selectedClass.inCharge === currentTeacher.id;
    
    // New Logic: Check if first period is in this class
    const dayNames: any = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[new Date(selectedDate).getDay()];
    
    // Find teacher's first period for today
    let firstPeriodClassId = null;
    
    // Check all classes to see where this teacher is in period 1
    for (const c of currentTimetableSession.classes) {
        const todayTimetable = c.timetable?.[selectedDayName as keyof typeof c.timetable];
        if (todayTimetable && todayTimetable[0]) {
            // Period indices are 0-based
            const firstPeriodSubjects = todayTimetable[0];
            if (firstPeriodSubjects.some(s => s.teacherId === currentTeacher.id)) {
                firstPeriodClassId = c.id;
                break;
            }
        }
    }

    // Check for adjustments (subs) for period 1
    const adjustmentsForDay = currentTimetableSession.adjustments[selectedDate] || [];
    const firstPeriodAdj = adjustmentsForDay.find(adj => 
        adj.substituteTeacherId === currentTeacher.id && 
        adj.periodIndex === 0
    );
    if (firstPeriodAdj) {
        firstPeriodClassId = firstPeriodAdj.classId;
    }

    // A teacher can take attendance ONLY if their first period is here today (either by timetable or adjustment)
    const isAllowed = (firstPeriodClassId === selectedClass.id);
    
    return isAllowed;
  }, [isAdmin, selectedClass, currentTeacher, currentTimetableSession, selectedDate]);

  const attendanceRecord = currentTimetableSession?.attendance?.[selectedDate]?.[selectedClassId || ''];

  const vacationToday = useMemo(() => {
    return currentTimetableSession?.vacations?.find(v => {
        const start = new Date(v.startDate);
        const end = new Date(v.endDate);
        const current = new Date(selectedDate);
        return current >= start && current <= end;
    });
  }, [selectedDate, currentTimetableSession?.vacations]);

  // Logic to determine who is submitting attendance
  const submitterInfo = useMemo(() => {
      if (!selectedClass || !currentTimetableSession) return { name: '', role: 'inCharge' };
      
      const inChargeId = selectedClass.inCharge;
      const inCharge = currentTimetableSession.teachers.find(t => t.id === inChargeId);
      
      // Check if in-charge is on leave today
      const leave = currentTimetableSession.leaveDetails?.[selectedDate]?.[inChargeId];
      // Check for absence in period 1 specifically
      const isAbsent = leave?.leaveType === 'full' || (leave?.leaveType === 'half' && (leave.periods ? leave.periods.includes(1) : leave.startPeriod === 1));
      
      if (isAbsent) {
          // Find the teacher taking the FIRST period for this class today
          const adjustmentsForDay = currentTimetableSession.adjustments[selectedDate] || [];
          const firstPeriodAdj = adjustmentsForDay.find(adj => adj.classId === selectedClass.id && adj.periodIndex === 0);
          
          if (firstPeriodAdj) {
              const subTeacher = currentTimetableSession.teachers.find(t => t.id === firstPeriodAdj.substituteTeacherId);
              if (subTeacher) {
                  return { 
                      name: `${subTeacher.nameEn} (Substitute)`, 
                      nameUr: `${subTeacher.nameUr} (متبادل)`,
                      role: 'substitute' 
                  };
              }
          }
      }
      
      return { 
          name: inCharge ? inCharge.nameEn : 'Unknown', 
          nameUr: inCharge ? inCharge.nameUr : 'نامعلوم',
          role: 'inCharge' 
      };
  }, [selectedClass, selectedDate, currentTimetableSession]);

  const handleSaveAttendance = (data: AttendanceData) => {
    if (!selectedClassId) return;

    onUpdateSession(session => {
      const newAttendance = { ...(session.attendance || {}) };
      if (!newAttendance[selectedDate]) newAttendance[selectedDate] = {};
      newAttendance[selectedDate][selectedClassId] = data;
      return { ...session, attendance: newAttendance };
    });
    
    // Mini feedback
    const toast = document.createElement('div');
    toast.textContent = t.attendanceSaved;
    toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full  font-bold z-[200] animate-bounce-short';
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) document.body.removeChild(toast); }, 3000);
  };

  const handleDownloadJson = () => {
    if (!currentTimetableSession) return;
    const data = currentTimetableSession.attendance || {};
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${selectedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const uploadedData = JSON.parse(event.target?.result as string);
            
            onUpdateSession(session => {
                const currentAttendance = { ...(session.attendance || {}) };
                
                // Detect structure
                // Format A: Single class submission file ({ date, classId, attendance })
                if (uploadedData.date && uploadedData.classId && uploadedData.attendance) {
                    const { date, classId, attendance: data } = uploadedData;
                    if (!currentAttendance[date]) currentAttendance[date] = {};
                    currentAttendance[date][classId] = data;
                } 
                // Format B: Bulk session export map ({ "YYYY-MM-DD": { "classId": data } })
                else {
                    Object.keys(uploadedData).forEach(date => {
                        if (typeof uploadedData[date] === 'object' && uploadedData[date] !== null) {
                            if (!currentAttendance[date]) currentAttendance[date] = {};
                            Object.keys(uploadedData[date]).forEach(classId => {
                                currentAttendance[date][classId] = uploadedData[date][classId];
                            });
                        }
                    });
                }
                
                return { ...session, attendance: currentAttendance };
            });
            
            alert("Attendance data imported and merged successfully.");
        } catch (error) {
            console.error("Upload error:", error);
            alert("Invalid JSON file format.");
        }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
      onUpdateSchoolConfig({
          downloadDesigns: { ...schoolConfig.downloadDesigns, attendance: newDesign }
      });
  };

  const formattedDateForTitle = new Date(selectedDate).toLocaleDateString(language === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  if (!currentTimetableSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <PrintPreview 
        t={t} 
        isOpen={isPrintPreviewOpen} 
        onClose={() => setIsPrintPreviewOpen(false)} 
        title={`${t.attendanceReport}: ${formattedDateForTitle}`} 
        fileNameBase={`Attendance_Report_${selectedDate}`} 
        generateHtml={(lang, design) => {
            return generateAttendanceReportHtml(
                t, lang, design, 
                classes, currentTimetableSession.teachers, schoolConfig, 
                selectedDate, 
                currentTimetableSession.adjustments, 
                currentTimetableSession.leaveDetails || {}, 
                currentTimetableSession.attendance || {}
            );
        }} 
        onGenerateExcel={(lang, design) => {
            generateAttendanceReportExcel(
                t, lang, design, schoolConfig, classes, currentTimetableSession.teachers, selectedDate,
                currentTimetableSession.adjustments, 
                currentTimetableSession.leaveDetails || {}, 
                currentTimetableSession.attendance || {}
            );
        }}
        designConfig={schoolConfig.downloadDesigns.attendance} 
        onSaveDesign={handleSavePrintDesign} 
      />

      <div className="mb-10 text-center relative">
        <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">
            {t.studentAttendance.toUpperCase()}
        </h2>
        <div className="w-16 h-1 bg-indigo-500 mx-auto opacity-80 rounded-full"></div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-200  p-8 sm:p-12 mb-10 flex flex-col items-center gap-8">
        <div className="flex flex-wrap items-center justify-center gap-10 w-full">
            <div className="flex flex-col gap-2">
            <label className="text-[0.6875rem] font-black uppercase text-gray-400 px-1 tracking-widest text-center">SELECT DATE</label>
            <div className="relative group cursor-pointer">
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <div className="flex items-center gap-4 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 px-5 py-2.5 rounded-[2rem] border-2 border-[var(--border-secondary)]  group-hover:border-[var(--accent-primary)] transition-all min-w-[150px]">
                    <div className="flex flex-col items-center border-r border-[var(--border-secondary)] pr-4">
                        <span className="text-[0.65rem] font-black text-[#6366f1] uppercase leading-none tracking-wider">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-2xl font-bold text-[#0f172a] dark:text-white mt-1 leading-none">
                            {new Date(selectedDate).getDate()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[0.75rem] font-bold text-[#475569] dark:text-[#94a3b8] uppercase leading-none tracking-tight">
                            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long' })}
                        </span>
                        <span className="text-[0.75rem] font-bold text-[#94a3b8] dark:text-[#64748b] leading-none mt-1">
                            {new Date(selectedDate).getFullYear()}
                        </span>
                    </div>
                </div>
            </div>
            </div>
            <div className="flex flex-col gap-2">
            <label className="text-[0.6875rem] font-black uppercase text-gray-400 px-1 tracking-widest text-center">SELECT A CLASS</label>
            <select 
                value={selectedClassId || ''} 
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-[2rem] text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none  transition-all min-w-[15rem]"
            >
                {visibleClasses.map(c => (
                <option key={c.id} value={c.id}>{c.nameEn} / {c.nameUr}</option>
                ))}
            </select>
            </div>
        </div>

        <div className={`flex items-center gap-4 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
            <button 
                onClick={handleDownloadJson}
                title={t.downloadAttendanceJson}
                className="p-4 bg-gray-100 text-gray-600 border border-gray-200 rounded-[2rem]  hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
                <DownloadIcon />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                title={t.uploadAttendanceJson}
                className="p-4 bg-gray-100 text-gray-600 border border-gray-200 rounded-[2rem]  hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
                <UploadIcon />
                <input type="file" ref={fileInputRef} onChange={handleUploadJson} accept=".json" className="hidden" />
            </button>
            <button 
                onClick={() => setIsPrintPreviewOpen(true)}
                title={t.printViewAction}
                className="p-4 bg-indigo-600 text-white border border-indigo-700 rounded-[2rem]  hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
                <PrintIcon />
            </button>
        </div>
      </div>

      {vacationToday && (
          <div className="mb-8 p-6 bg-orange-100 border-l-4 border-orange-500 text-orange-700 rounded-r-lg  animate-scale-in">
              <h3 className="font-bold text-lg mb-1">{t.onVacation}: {vacationToday.name}</h3>
              <p className="text-sm">Attendance submission is disabled for school vacation days.</p>
          </div>
      )}

      {!vacationToday && selectedClass ? (
        <div className="animate-scale-in">
            <AttendanceForm 
                t={t}
                classItem={selectedClass}
                currentDate={selectedDate}
                attendanceRecord={attendanceRecord}
                onSaveAttendance={handleSaveAttendance}
                submitterName={submitterInfo.name}
                isAdmin={isClassInCharge}
            />
        </div>
      ) : !vacationToday ? (
        <p className="text-center text-[var(--text-secondary)] italic py-10">No class selected</p>
      ) : null}
    </div>
  );
};
