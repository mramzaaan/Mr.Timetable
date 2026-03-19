
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Language, SchoolClass, TimetableSession, AttendanceData, SchoolConfig, DownloadDesignConfig } from '../types';
import AttendanceForm from './AttendanceForm';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import PrintPreview from './PrintPreview';
import { generateAttendanceReportHtml, generateAttendanceReportExcel } from './reportUtils';

interface AttendancePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  currentTimetableSession: TimetableSession | null;
  onUpdateSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  schoolConfig: SchoolConfig;
}

const PrintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2v4h10z" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

export const AttendancePage: React.FC<AttendancePageProps> = ({ t, language, classes, currentTimetableSession, onUpdateSession, onUpdateSchoolConfig, schoolConfig }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out the pseudo-class 'non-teaching-duties'
  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties'), [classes]);

  useEffect(() => {
    if (!selectedClassId && visibleClasses.length > 0) {
      setSelectedClassId(visibleClasses[0].id);
    }
  }, [visibleClasses, selectedClassId]);

  if (!currentTimetableSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  const selectedClass = visibleClasses.find(c => c.id === selectedClassId);
  const attendanceRecord = currentTimetableSession.attendance?.[selectedDate]?.[selectedClassId || ''];

  const vacationToday = useMemo(() => {
    return currentTimetableSession.vacations?.find(v => {
        const start = new Date(v.startDate);
        const end = new Date(v.endDate);
        const current = new Date(selectedDate);
        return current >= start && current <= end;
    });
  }, [selectedDate, currentTimetableSession.vacations]);

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
    toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[200] animate-bounce-short';
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) document.body.removeChild(toast); }, 3000);
  };

  const handleDownloadJson = () => {
    const data = currentTimetableSession.attendance || {};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_export_${new Date().toISOString().split('T')[0]}.json`;
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
        onGenerateExcel={(lang) => {
            generateAttendanceReportExcel(
                t, lang, classes, currentTimetableSession.teachers, selectedDate,
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

      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-2xl p-8 sm:p-12 mb-10 flex flex-col items-center gap-8">
        <div className="flex flex-wrap items-center justify-center gap-10 w-full">
            <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black uppercase text-gray-400 px-1 tracking-widest text-center">SELECT DATE</label>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            />
            </div>
            <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black uppercase text-gray-400 px-1 tracking-widest text-center">SELECT A CLASS</label>
            <select 
                value={selectedClassId || ''} 
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all min-w-[240px]"
            >
                {visibleClasses.map(c => (
                <option key={c.id} value={c.id}>{c.nameEn} / {c.nameUr}</option>
                ))}
            </select>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={handleDownloadJson}
                title={t.downloadAttendanceJson}
                className="p-4 bg-gray-100 text-gray-600 border border-gray-200 rounded-2xl shadow-md hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
                <DownloadIcon />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                title={t.uploadAttendanceJson}
                className="p-4 bg-gray-100 text-gray-600 border border-gray-200 rounded-2xl shadow-md hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
                <UploadIcon />
                <input type="file" ref={fileInputRef} onChange={handleUploadJson} accept=".json" className="hidden" />
            </button>
            <button 
                onClick={() => setIsPrintPreviewOpen(true)}
                title={t.printViewAction}
                className="p-4 bg-indigo-600 text-white border border-indigo-700 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
                <PrintIcon />
            </button>
        </div>
      </div>

      {vacationToday && (
          <div className="mb-8 p-6 bg-orange-100 border-l-4 border-orange-500 text-orange-700 rounded-r-lg shadow-md animate-scale-in">
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
            />
        </div>
      ) : !vacationToday ? (
        <p className="text-center text-[var(--text-secondary)] italic py-10">No class selected</p>
      ) : null}
    </div>
  );
};
