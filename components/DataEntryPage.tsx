
import React, { useState } from 'react';
import type { DataEntryTab, Subject, Teacher, SchoolClass, JointPeriod, SchoolConfig, TimetableSession, UserData, UserRole } from '../types';
import AddSubjectForm from './AddSubjectForm';
import AddTeacherForm from './AddTeacherForm';
import AddClassForm from './AddClassForm';
import TimetableStructureForm from './TimetableStructureForm';
import NoSessionPlaceholder from './NoSessionPlaceholder';
import CsvManagementModal from './CsvManagementModal';
import ImportExportChoiceModal from './ImportExportChoiceModal';
import BackupRestoreModal from './BackupRestoreModal';

interface DataEntryPageProps {
  t: any;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods: JointPeriod[];
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSetClasses: (classes: SchoolClass[]) => void;
  onDeleteClass: (classId: string) => void;
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
  activeTab: DataEntryTab;
  onTabChange: (tab: DataEntryTab) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
  currentTimetableSession: TimetableSession | null;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
  onOpenSchoolInfo: () => void;
  userData: UserData;
  onRestore: (data: UserData, fontData?: Record<string, string>) => void;
  userRole?: UserRole;
}

// Icon Components for Tabs
const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SubjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>;
const ClassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const StructureIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SchoolIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>;
const TransferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;

const TAB_ICONS: Record<DataEntryTab, React.ReactNode> = {
    teacher: <TeacherIcon />,
    subject: <SubjectIcon />,
    class: <ClassIcon />,
    structure: <StructureIcon />,
    school: <SchoolIcon />,
    importExport: <TransferIcon />,
    jointPeriods: <ClassIcon /> // Fallback or similar
};

const DataEntryPage: React.FC<DataEntryPageProps> = ({ 
  t, subjects, teachers, classes, jointPeriods,
  onAddSubject, onUpdateSubject, onDeleteSubject, 
  onAddTeacher, onUpdateTeacher, onDeleteTeacher, 
  onSetClasses, onDeleteClass,
  onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod,
  activeTab, onTabChange,
  schoolConfig, onUpdateSchoolConfig,
  currentTimetableSession, onUpdateTimetableSession,
  openConfirmation,
  onOpenSchoolInfo,
  userData,
  onRestore,
  userRole
}) => {
  const canEdit = currentTimetableSession?.canEdit ?? (userRole === 'admin');
  const isAdmin = canEdit;

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [triggerTeacher, setTriggerTeacher] = useState(0);
  const [triggerSubject, setTriggerSubject] = useState(0);
  const [triggerClass, setTriggerClass] = useState(0);

  const handleFabClick = (tab: DataEntryTab) => {
      onTabChange(tab);
      setIsFabOpen(false);
      setTimeout(() => {
          if (tab === 'teacher') setTriggerTeacher(prev => prev + 1);
          if (tab === 'subject') setTriggerSubject(prev => prev + 1);
          if (tab === 'class') setTriggerClass(prev => prev + 1);
      }, 50);
  };
  
  if (!currentTimetableSession) {
    return <NoSessionPlaceholder t={t} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'class':
        return <AddClassForm t={t} subjects={subjects} teachers={teachers} classes={classes} onSetClasses={onSetClasses} onDeleteClass={onDeleteClass} triggerOpenForm={triggerClass} isAdmin={isAdmin} />;
      case 'teacher':
        return <AddTeacherForm t={t} teachers={teachers} onAddTeacher={onAddTeacher} onUpdateTeacher={onUpdateTeacher} onDeleteTeacher={onDeleteTeacher} triggerOpenForm={triggerTeacher} isAdmin={isAdmin} />;
      case 'subject':
        return <AddSubjectForm t={t} subjects={subjects} onAddSubject={onAddSubject} onUpdateSubject={onUpdateSubject} onDeleteSubject={onDeleteSubject} triggerOpenForm={triggerSubject} isAdmin={isAdmin} />;
      case 'structure':
        const structureKey = currentTimetableSession 
            ? `${currentTimetableSession.id}-${JSON.stringify(currentTimetableSession.periodTimings || {})}-${JSON.stringify(currentTimetableSession.breaks || {})}`
            : 'default-structure';
            
        return <TimetableStructureForm 
            key={structureKey}
            t={t} 
            schoolConfig={schoolConfig} 
            onUpdateSchoolConfig={onUpdateSchoolConfig}
            currentTimetableSession={currentTimetableSession}
            onUpdateTimetableSession={onUpdateTimetableSession}
            isAdmin={isAdmin}
        />;
       case 'importExport':
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]   text-center">
                <div className="bg-[var(--bg-tertiary)] p-8 rounded-full mb-6 text-[var(--accent-primary)] shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79-8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tighter">{t.dataImportExportCsv}</h3>
                <p className="text-[var(--text-secondary)] max-w-md mb-8 font-medium">Manage your school data through CSV imports or a full system backup.</p>
                
                <button 
                    onClick={() => setIsChoiceModalOpen(true)}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase tracking-[0.2em] rounded-[2rem]  hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-[0.98]"
                >
                    {t.importExport}
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabName: DataEntryTab; label: string }> = ({ tabName, label }) => {
    const isActive = activeTab === tabName;
    return (
        <button
          onClick={() => onTabChange(tabName)}
          className={`flex items-center justify-center px-4 sm:px-8 py-3 text-sm sm:text-base font-bold rounded-full transition-all duration-200 whitespace-nowrap min-w-[5rem] sm:min-w-[6.25rem] ${
            isActive
              ? 'bg-[var(--bg-primary)] text-[var(--accent-primary)]  ring-1 ring-[var(--border-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          {label}
        </button>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28">
      
      <div className="max-w-[100rem] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
                <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter">DATA ENTRY</h2>
                <p className="text-[var(--text-secondary)] font-bold text-xs sm:text-sm uppercase tracking-widest mt-1 opacity-70">Manage school infrastructure</p>
            </div>

            {isAdmin && (
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4">
                     <button 
                        onClick={() => setIsChoiceModalOpen(true)} 
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-[#10b981] text-white rounded-[2rem]  hover: hover:-translate-y-0.5 transition-all group"
                     >
                        <div className="p-1.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                            <TransferIcon />
                        </div>
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">{t.importExport}</span>
                     </button>
                     <button 
                        onClick={onOpenSchoolInfo} 
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-[#f59e0b] text-white rounded-[2rem]  hover: hover:-translate-y-0.5 transition-all group"
                     >
                        <div className="p-1.5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                            <SchoolIcon />
                        </div>
                        <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">School Info</span>
                     </button>
                </div>
            )}
        </div>

        <div className="flex justify-center mb-8 overflow-x-auto no-scrollbar pb-2">
            <div className="inline-flex bg-[var(--bg-tertiary)] p-1.5 rounded-full shadow-inner flex-nowrap min-w-max">
                <TabButton tabName="teacher" label={t.teacher} />
                <TabButton tabName="subject" label={t.subject} />
                <TabButton tabName="class" label={t.class} />
                <TabButton tabName="structure" label={t.timetableStructure} />
            </div>
        </div>
        
        <div className="animate-fade-in bg-[var(--bg-secondary)] backdrop-blur-[30px] border border-[var(--border-primary)] rounded-[2.5rem] p-4 sm:p-6 lg:p-8">{renderTabContent()}</div>
      </div>
      <CsvManagementModal t={t} isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} currentTimetableSession={currentTimetableSession} onUpdateTimetableSession={onUpdateTimetableSession} />
      <ImportExportChoiceModal t={t} isOpen={isChoiceModalOpen} onClose={() => setIsChoiceModalOpen(false)} onOpenCsv={() => setIsCsvModalOpen(true)} onOpenBackup={() => setIsBackupModalOpen(true)} />
      <BackupRestoreModal t={t} isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} userData={userData} onRestore={onRestore} />

      {/* Floating Action Button */}
      {isAdmin && (
          <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-[80] flex flex-col items-end">
              {/* Menu Options */}
          <div className={`flex flex-col gap-3 mb-4 transition-all duration-300 origin-bottom ${isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10 pointer-events-none'}`}>
              <button 
                  onClick={() => handleFabClick('class')}
                  className="flex items-center justify-end gap-3 group"
              >
                  <span className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] shadow-xl text-[var(--text-primary)] font-bold px-3 py-1.5 rounded-[2rem] text-sm group-hover:scale-105 transition-transform">{t.addClass || "Add Class"}</span>
                  <div className="w-9 h-9 bg-[var(--accent-secondary)] rounded-full flex items-center justify-center text-[var(--accent-primary)]  group-hover:bg-[var(--accent-secondary-hover)] transition-colors">
                      <ClassIcon />
                  </div>
              </button>
              <button 
                  onClick={() => handleFabClick('subject')}
                  className="flex items-center justify-end gap-3 group"
              >
                  <span className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] shadow-xl text-[var(--text-primary)] font-bold px-3 py-1.5 rounded-[2rem] text-sm group-hover:scale-105 transition-transform">{t.addSubject || "Add Subject"}</span>
                  <div className="w-9 h-9 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400  group-hover:bg-purple-500/30 transition-colors">
                      <SubjectIcon />
                  </div>
              </button>
              <button 
                  onClick={() => handleFabClick('teacher')}
                  className="flex items-center justify-end gap-3 group"
              >
                  <span className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] shadow-xl text-[var(--text-primary)] font-bold px-3 py-1.5 rounded-[2rem] text-sm group-hover:scale-105 transition-transform">{t.addTeacher || "Add Teacher"}</span>
                  <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400  group-hover:bg-emerald-500/30 transition-colors">
                      <TeacherIcon />
                  </div>
              </button>
          </div>
          
          {/* Main Button */}
          <button 
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white shadow-oneui transition-all duration-300 transform active:scale-95 ${isFabOpen ? 'bg-[var(--text-secondary)] rotate-45' : 'bg-[var(--accent-primary)] hover:-translate-y-1'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
          </button>
      </div>
      )}
      {/* Overlay to close FAB when clicking outside */}
      {isFabOpen && (
          <div 
              className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm transition-opacity"
              onClick={() => setIsFabOpen(false)}
          />
      )}
    </div>
  );
};

export default DataEntryPage;
