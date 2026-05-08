
import React, { useState } from 'react';
import type { TimetableSession, SchoolConfig, Language } from '../types';
import { 
  FileText, 
  Users, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Download, 
  Printer,
  ChevronRight,
  ChevronLeft,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateReportHTML, 
  calculateWorkloadStats, 
  calculateAllTeachersWorkloadStats 
} from './reportUtils';
import PrintPreview from './PrintPreview';

interface ReportsPageProps {
  t: any;
  currentTimetableSession: TimetableSession | null;
  schoolConfig: SchoolConfig;
  language: Language;
}

type ReportType = 'teacher' | 'class' | 'free' | 'attendance' | 'workload';

const ReportsPage: React.FC<ReportsPageProps> = ({ t, currentTimetableSession, schoolConfig, language }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  
  if (!currentTimetableSession) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="p-6 bg-amber-500/10 rounded-full mb-6">
          <FileText className="h-16 w-16 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter">No Active Session</h2>
        <p className="text-[var(--text-secondary)] mt-2 font-medium">Please select or create a timetable session to view reports.</p>
      </div>
    );
  }

  const reports = [
    {
      id: 'teacher',
      title: t.teacherTimetable || 'Teacher Timetable',
      description: 'Personal schedules for individual teachers.',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-blue-500',
    },
    {
      id: 'class',
      title: t.classTimetable || 'Class Timetable',
      description: 'Weekly schedules for each class.',
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-indigo-500',
    },
    {
      id: 'free',
      title: t.byPeriod || 'Free Teachers',
      description: 'List of teachers available during periods.',
      icon: <Clock className="h-6 w-6" />,
      color: 'bg-emerald-500',
    },
    {
      id: 'attendance',
      title: t.attendanceReport || 'Student Attendance',
      description: 'Daily attendance logs and summaries.',
      icon: <CheckSquare className="h-6 w-6" />,
      color: 'bg-teal-500',
    },
    {
      id: 'workload',
      title: t.workloadReport || 'Workload Report',
      description: 'Teaching hours and assignment breakdown.',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-violet-500',
    }
  ];

  const handleGenerateReport = (type: ReportType) => {
    // This is a placeholder for actual generation logic
    // We will integrate with reportUtils functions here
    
    let html = '';
    let title = '';

    const design = schoolConfig.downloadDesigns[type] || schoolConfig.downloadDesigns.class;
    const lang = language === 'ur' ? 'ur' : 'en';

    switch (type) {
      case 'workload':
        title = t.workloadReport || 'Workload Report';
        const workloadStats = calculateAllTeachersWorkloadStats(
          currentTimetableSession.teachers,
          currentTimetableSession.classes,
          currentTimetableSession.adjustments,
          currentTimetableSession.leaveDetails || {},
          undefined,
          undefined,
          schoolConfig
        );
        
        html = `
          <div style="padding: 10px;">
            <table style="width:100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
              <thead>
                <tr style="background: #f3f4f6; border-bottom: 2px solid #333;">
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: left;">Teacher Name</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Periods/Week</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Leaves</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Substitutions</th>
                  <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Total Workload</th>
                </tr>
              </thead>
              <tbody>
                ${workloadStats.map(stat => `
                  <tr>
                    <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold;">
                      ${stat.nameEn}
                      <div style="font-size: 10px; color: #666;">${stat.nameUr}</div>
                    </td>
                    <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">${stat.weeklyPeriods}</td>
                    <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">${stat.leavesTaken}</td>
                    <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center;">${stat.substitutionsTaken}</td>
                    <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #4338ca;">${stat.totalWorkload}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        break;

      case 'free':
        title = t.freeTeachersReport || 'Free Teachers Report';
        // group teachers by day and period where they are free
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        html = `
          <div style="padding: 10px;">
            ${days.map(day => `
              <div style="margin-bottom: 30px;">
                <h3 style="background: #1e293b; color: white; padding: 8px 15px; border-radius: 8px; margin-bottom: 10px; font-size: 14px;">${day}</h3>
                <div style="display: grid; grid-template-cols: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                  ${Array.from({ length: 8 }).map((_, pIdx) => {
                    const period = pIdx + 1;
                    const freeTeachers = currentTimetableSession.teachers.filter(teacher => {
                      // Check if teacher has any period in any class for this day/period
                      const isBusy = currentTimetableSession.classes.some(cls => 
                        cls.timetable?.[day]?.[pIdx]?.teacherId === teacher.id
                      );
                      return !isBusy;
                    });
                    return `
                      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; background: #f8fafc;">
                        <div style="font-weight: 800; font-size: 10px; color: #64748b; margin-bottom: 5px;">PERIOD ${period}</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          ${freeTeachers.slice(0, 10).map(ft => `<div style="font-size: 11px; font-weight: 600;">${ft.nameEn}</div>`).join('')}
                          ${freeTeachers.length > 10 ? `<div style="font-size: 9px; color: #94a3b8;">+ ${freeTeachers.length - 10} more</div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
        break;

      case 'attendance':
        title = t.attendanceReport || 'Attendance Report';
        const date = new Date().toISOString().split('T')[0];
        html = `
          <div style="padding: 10px;">
            <div style="margin-bottom: 20px; font-weight: bold; text-align: center;">DATE: ${date}</div>
            <table style="width:100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; border: 1px solid #ddd;">Class</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Present</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Absent</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">%</th>
                </tr>
              </thead>
              <tbody>
                ${currentTimetableSession.classes.map(cls => {
                  const att = currentTimetableSession.attendance?.[date]?.[cls.id] || { present: 0, absent: 0, late: 0, total: 0 };
                  const percent = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
                  return `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${cls.nameEn}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${att.total}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${att.present}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${att.absent}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${percent}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
        break;

      case 'teacher':
        title = t.teacherTimetable || 'Teacher Timetable';
        html = `
          <div style="padding: 10px;">
            ${currentTimetableSession.teachers.map(teacher => {
              // days comes from outer scope if I define it there, but I'll define it here for safety
              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return `
                <div style="margin-bottom: 40px; page-break-after: always;">
                  <h2 style="border-bottom: 2px solid #333; padding-bottom: 5px; font-family: sans-serif;">${teacher.nameEn} <span style="font-family: inherit; direction: rtl;">${teacher.nameUr}</span></h2>
                  <table style="width:100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; font-family: sans-serif;">
                    <thead>
                      <tr style="background: #eee;">
                        <th style="border: 1px solid #000; width: 60px;">Day</th>
                        ${Array.from({ length: 8 }).map((_, i) => `<th style="border: 1px solid #000;">P${i+1}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${days.map(day => `
                        <tr>
                          <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">${day}</td>
                          ${Array.from({ length: 8 }).map((_, pIdx) => {
                            const assignment = currentTimetableSession.classes.find(cls => 
                              cls.timetable?.[day]?.[pIdx]?.some(p => p.teacherId === teacher.id)
                            );
                            const periodData = assignment?.timetable?.[day]?.[pIdx]?.find(p => p.teacherId === teacher.id);
                            return `
                              <td style="border: 1px solid #000; padding: 5px; text-align: center;">
                                ${assignment ? `
                                  <div style="font-weight: bold;">${assignment.nameEn}</div>
                                  <div style="font-size: 8px;">${periodData?.subjectId || ''}</div>
                                ` : '-'}
                              </td>
                            `;
                          }).join('')}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        `;
        break;

      case 'class':
        title = t.classTimetable || 'Class Timetable';
        html = `
          <div style="padding: 10px;">
            ${currentTimetableSession.classes.map(cls => {
              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return `
                <div style="margin-bottom: 40px; page-break-after: always;">
                  <h2 style="border-bottom: 2px solid #333; padding-bottom: 5px; font-family: sans-serif;">Class: ${cls.nameEn}</h2>
                  <table style="width:100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; font-family: sans-serif;">
                    <thead>
                      <tr style="background: #eee;">
                        <th style="border: 1px solid #000; width: 60px;">Day</th>
                        ${Array.from({ length: 8 }).map((_, i) => `<th style="border: 1px solid #000;">P${i+1}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${days.map(day => `
                        <tr>
                          <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background: #f9f9f9;">${day}</td>
                          ${Array.from({ length: 8 }).map((_, pIdx) => {
                            const p = cls.timetable?.[day]?.[pIdx]?.[0]; // Show first for simple view
                            const more = (cls.timetable?.[day]?.[pIdx]?.length || 0) > 1 ? `<div style="font-size: 7px; color: #666;">+${cls.timetable?.[day]?.[pIdx]!.length - 1}</div>` : '';
                            return `
                              <td style="border: 1px solid #000; padding: 5px; text-align: center;">
                                ${p ? `
                                  <div style="font-weight: bold;">${p.subjectId}</div>
                                  <div style="font-size: 8px;">${p.teacherId}</div>
                                  ${more}
                                ` : '-'}
                              </td>
                            `;
                          }).join('')}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        `;
        break;

      default:
        title = type.toUpperCase() + " REPORT";
        html = '<div style="padding: 40px; text-align: center;">Report content coming soon...</div>';
    }

    const fullHtml = generateReportHTML(schoolConfig, design, title, lang, html);
    setPreviewHtml(fullHtml);
    setPreviewTitle(title);
    setShowPreview(true);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 pb-24">
      <div className="max-w-[100rem] mx-auto">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Reports & Documents</h2>
          <p className="text-[var(--text-secondary)] font-bold text-sm uppercase tracking-widest mt-1 opacity-70">Generate, view, and print school records</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <motion.button
              key={report.id}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleGenerateReport(report.id as ReportType)}
              className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2.5rem] p-8 text-left group transition-all hover:shadow-2xl hover:shadow-[var(--accent-primary)]/10"
            >
              <div className={`${report.color} w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                {report.icon}
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">{report.title}</h3>
              <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed mb-6 opacity-80">{report.description}</p>
              
              <div className="flex items-center text-[var(--accent-primary)] font-black text-xs uppercase tracking-widest gap-2 group-hover:gap-4 transition-all">
                <span>Generate Report</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col">
            <div className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
               <button 
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-2 text-slate-600 font-bold hover:text-black transition-colors"
               >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back to Reports</span>
               </button>
               <h1 className="font-black uppercase tracking-tighter text-lg">{previewTitle}</h1>
               <div className="flex gap-3">
                  <button 
                    onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                            win.document.write(previewHtml);
                            win.document.close();
                            win.focus();
                            win.print();
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print PDF</span>
                  </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-100 p-4 md:p-8 flex justify-center">
               <div 
                  className="bg-white shadow-2xl origin-top"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.95)' }}
               />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
