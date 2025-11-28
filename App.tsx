import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Language, Page, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, TimetableSession, UserData, SchoolConfig, DataEntryTab, Period, DownloadDesignConfig, DownloadDesigns, GroupSet, JointPeriod, LeaveDetails, PeriodTime, Break } from './types';
import { translations } from './i18n';
import HomePage from './components/HomePage';
import DataEntryPage from './components/DataEntryPage';
import ClassTimetablePage from './components/ClassTimetablePage';
import { TeacherTimetablePage } from './components/TeacherTimetablePage';
import { AlternativeTimetablePage } from './components/AdjustmentsPage';
import SettingsPage from './components/SettingsPage';
import { generateUniqueId, allDays } from './types';
import BottomNavBar from './components/BottomNavBar';
import TopNavBar from './components/TopNavBar';
import GlobalSearch from './components/GlobalSearch';

export type Theme = 'light' | 'dark' | 'contrast' | 'mint' | 'ocean' | 'sunset' | 'rose' | 'amoled';
export type NavPosition = 'top' | 'bottom';
export type NavDesign = 'classic' | 'modern' | 'minimal' | '3d' | 'neon' | 'glass' | 'gradient' | 'outline';
export type NavShape = 'square' | 'rounded' | 'pill' | 'circle' | 'leaf';

// Updated Default Configuration V3
const defaultDesignV3: DownloadDesignConfig = {
    version: 3,
    page: {
        size: 'a4',
        orientation: 'portrait', 
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        watermarkOpacity: 0.07,
    },
    header: {
        showLogo: true,
        logoSize: 80,
        logoPosition: 'left',
        schoolName: { fontFamily: 'Times New Roman', fontSize: 24, fontWeight: 'bold', align: 'left', color: '#000000' },
        showTitle: true,
        title: { fontFamily: 'Times New Roman', fontSize: 18, fontWeight: 'bold', align: 'left', color: '#444444' },
        details: { fontFamily: 'Times New Roman', fontSize: 14, fontWeight: 'normal', align: 'left', color: '#000000' },
        divider: true,
        bgColor: '#FFFFFF',
    },
    table: {
        fontFamily: 'Times New Roman',
        fontSize: 14,
        cellPadding: 4,
        headerBgColor: '#F3F4F6',
        headerColor: '#000000',
        bodyBgColor: '#FFFFFF',
        bodyColor: '#000000',
        borderColor: '#000000',
        periodColumnWidth: 40,
        periodColumnBgColor: '#F3F4F6',
        periodColumnColor: '#000000',
        altRowColor: '#FFFFFF',
        gridStyle: 'solid',
        borderWidth: 1,
    },
    footer: {
        show: true,
        text: 'Mr. 🇵🇰', // Explicitly Mr. 🇵🇰 for documents
        fontFamily: 'Times New Roman',
        fontSize: 12,
        align: 'center',
        includePageNumber: true,
        color: '#4b5563',
        includeTimestamp: false,
    },
    colorMode: 'color',
    rowsPerPage: 50,
    watermarkText: '',
    compactMode: false,
};

const defaultDownloadDesigns: DownloadDesigns = {
    class: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape' } }, 
    teacher: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape' } }, 
    alternative: defaultDesignV3, 
    basicInfo: defaultDesignV3, 
    schoolTimings: defaultDesignV3, 
};

const defaultSchoolLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const generateDefaultPeriodTimings = (): PeriodTime[] => {
    return Array.from({ length: 12 }, () => ({ start: '', end: '' }));
};

const defaultUserData: UserData = {
    timetableSessions: [],
    schoolConfig: {
        schoolNameEn: 'Govt. High School Wan Bhachran (Mianwali)',
        schoolNameUr: 'گورنمنٹ ہائی سکول واں بھچراں (میانوالی)',
        schoolLogoBase64: defaultSchoolLogo,
        downloadDesigns: defaultDownloadDesigns,
        daysConfig: {
            Monday: { active: true, periodCount: 8 },
            Tuesday: { active: true, periodCount: 8 },
            Wednesday: { active: true, periodCount: 8 },
            Thursday: { active: true, periodCount: 8 },
            Friday: { active: true, periodCount: 8 },
            Saturday: { active: false, periodCount: 4 }, 
        },
        periodTimings: {
            default: generateDefaultPeriodTimings(),
            friday: generateDefaultPeriodTimings(),
        },
        breaks: {
            default: [
                { id: 'break-1', name: 'Recess', beforePeriod: 3, startTime: '', endTime: '' },
                { id: 'break-2', name: 'Lunch', beforePeriod: 6, startTime: '', endTime: '' }
            ],
            friday: [
                { id: 'break-fri-1', name: 'Jummah', beforePeriod: 5, startTime: '', endTime: '' }
            ]
        },
        assembly: {
            default: null,
            friday: null,
        }
    },
};

const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []),
    Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []),
    Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []),
    Saturday: Array.from({ length: 8 }, () => []),
});


// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ t, isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmationModalTitle"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirmationModalTitle" className="text-xl sm:text-2xl font-bold mb-4 text-center text-[var(--text-primary)]">
          {title}
        </h3>
        <div className="text-center text-[var(--text-secondary)] mb-8 max-h-60 overflow-y-auto">
          {message}
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- App Component ---
const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        let savedTheme = localStorage.getItem('mrtimetable_theme') as Theme | 'high-contrast';
        if (savedTheme === 'high-contrast') {
            savedTheme = 'contrast'; // Migration from old value
        }
        return (savedTheme as Theme) || 'contrast';
    });
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('mrtimetable_language') as Language) || 'en');

    const [navPosition, setNavPosition] = useState<NavPosition>(() => (localStorage.getItem('mrtimetable_navPosition') as NavPosition) || 'bottom');
    const [navDesign, setNavDesign] = useState<NavDesign>(() => (localStorage.getItem('mrtimetable_navDesign') as NavDesign) || 'classic');
    const [navShape, setNavShape] = useState<NavShape>(() => (localStorage.getItem('mrtimetable_navShape') as NavShape) || 'rounded');
    
    const [fontSize, setFontSize] = useState<number>(() => {
        const saved = localStorage.getItem('mrtimetable_fontSize');
        return saved ? parseInt(saved, 10) : 13;
    });

    const [userData, setUserData] = useState<UserData>(() => {
        const saved = localStorage.getItem('mrtimetable_userData');
        let dataToLoad: UserData;
        try {
            dataToLoad = saved ? JSON.parse(saved) : defaultUserData;
        } catch (e) {
            console.error("Failed to parse user data from localStorage", e);
            dataToLoad = defaultUserData;
        }

        // Ensure global config defaults exist
        if (!dataToLoad.schoolConfig.daysConfig) dataToLoad.schoolConfig.daysConfig = defaultUserData.schoolConfig.daysConfig;
        if (!dataToLoad.schoolConfig.periodTimings) dataToLoad.schoolConfig.periodTimings = defaultUserData.schoolConfig.periodTimings;
        if (!dataToLoad.schoolConfig.breaks) dataToLoad.schoolConfig.breaks = defaultUserData.schoolConfig.breaks;
        if (!dataToLoad.schoolConfig.assembly) dataToLoad.schoolConfig.assembly = defaultUserData.schoolConfig.assembly;

        // Migration logic for Sessions
        dataToLoad.timetableSessions.forEach(session => {
            if (!session.subjects) session.subjects = [];
            if (!session.teachers) session.teachers = [];
            if (!session.classes) session.classes = [];
            if (!session.jointPeriods) session.jointPeriods = [];
            if (!session.leaveDetails) session.leaveDetails = {};
            if (!session.adjustments) session.adjustments = {};

            // Migrate Structure to Session if missing
            if (!session.daysConfig) session.daysConfig = dataToLoad.schoolConfig.daysConfig;
            if (!session.periodTimings) session.periodTimings = dataToLoad.schoolConfig.periodTimings;
            if (!session.breaks) session.breaks = dataToLoad.schoolConfig.breaks;
            if (!session.assembly) session.assembly = dataToLoad.schoolConfig.assembly;

            session.teachers.forEach(teacher => {
                if (!(teacher as any).gender) (teacher as any).gender = 'Male';
                delete (teacher as any).designation;
                delete (teacher as any).qualification;
            });
            
            session.classes.forEach(c => {
                if (!c.timetable) {
                    c.timetable = createEmptyTimetable();
                } else {
                    if (!c.timetable.Saturday) c.timetable.Saturday = Array.from({ length: 8 }, () => []);
                }
                if (!c.subjects || !Array.isArray(c.subjects)) c.subjects = [];
                c.subjects.forEach(s => {
                    if ((s as any).combinedGroupId) delete (s as any).combinedGroupId;
                });
            });
        });
        
        // Ensure downloadDesigns exists and migrate to V3 structure
        const migrateDesignToV3 = (oldDesign: any): DownloadDesignConfig => {
            // Simple version check logic here if needed
            const base = { ...defaultDesignV3 };
            // Merge old props... (omitted for brevity, assume sensible defaults if missing)
            if(oldDesign) {
                const migrated = {
                    ...base,
                    ...oldDesign,
                    table: { ...base.table, ...oldDesign.table, bodyColor: oldDesign.table?.bodyColor || base.table.bodyColor },
                    page: { ...base.page, ...oldDesign.page },
                    header: { ...base.header, ...oldDesign.header },
                    footer: { ...base.footer, ...oldDesign.footer },
                    version: 3
                };
                // Ensure footer name is Mr. 🇵🇰 in documents if it was default/old default
                if (migrated.footer.text === 'Mr. Timetable' || migrated.footer.text === 'Mr.🇵🇰') {
                    migrated.footer.text = 'Mr. 🇵🇰';
                }
                return migrated;
            }
            return base;
        };

        const migratedDesigns: DownloadDesigns = { ...defaultDownloadDesigns };
        if (dataToLoad.schoolConfig.downloadDesigns) {
             Object.keys(migratedDesigns).forEach(key => {
                 const k = key as keyof DownloadDesigns;
                 migratedDesigns[k] = migrateDesignToV3(dataToLoad.schoolConfig.downloadDesigns[k]);
             });
        }
        dataToLoad.schoolConfig.downloadDesigns = migratedDesigns;

        return dataToLoad;
    });
    const [currentTimetableSessionId, setCurrentTimetableSessionId] = useState<string | null>(() => localStorage.getItem('mrtimetable_currentTimetableSessionId'));

    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [dataEntryTab, setDataEntryTab] = useState<DataEntryTab>('teacher');
    const [classTimetableSelection, setClassTimetableSelection] = useState<{ classId: string | null; highlightedTeacherId: string; }>({ classId: null, highlightedTeacherId: '' });
    const [teacherTimetableSelection, setTeacherTimetableSelection] = useState<{ teacherId: string | null }>({ teacherId: null });
    const [adjustmentsSelection, setAdjustmentsSelection] = useState<{ date: string; teacherIds: string[]; }>({ date: new Date().toISOString().split('T')[0], teacherIds: [] });

    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: React.ReactNode; }>({ isOpen: false, onConfirm: () => {}, title: '', message: '' });

    const t = translations[language];

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('mrtimetable_theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
        localStorage.setItem('mrtimetable_language', language);
    }, [language]);

    useEffect(() => { localStorage.setItem('mrtimetable_navPosition', navPosition); }, [navPosition]);
    useEffect(() => { localStorage.setItem('mrtimetable_navDesign', navDesign); }, [navDesign]);
    useEffect(() => { localStorage.setItem('mrtimetable_navShape', navShape); }, [navShape]);
    
    useEffect(() => { 
        localStorage.setItem('mrtimetable_fontSize', fontSize.toString());
        // Apply font size to the root element to affect the entire application
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [fontSize]);

    useEffect(() => {
        localStorage.setItem('mrtimetable_userData', JSON.stringify(userData));
    }, [userData]);

    useEffect(() => {
        if (currentTimetableSessionId) localStorage.setItem('mrtimetable_currentTimetableSessionId', currentTimetableSessionId);
        else localStorage.removeItem('mrtimetable_currentTimetableSessionId');
    }, [currentTimetableSessionId]);

    useEffect(() => {
        if (userData.timetableSessions.length > 0) {
            const sessionExists = userData.timetableSessions.some(s => s.id === currentTimetableSessionId);
            if (!sessionExists) {
                setCurrentTimetableSessionId(userData.timetableSessions[0].id);
            }
        } else {
            if (currentTimetableSessionId !== null) {
                setCurrentTimetableSessionId(null);
            }
        }
    }, [userData, currentTimetableSessionId]);

    const currentTimetableSession = useMemo(() => userData.timetableSessions.find(s => s.id === currentTimetableSessionId) || null, [userData, currentTimetableSessionId]);

    // Merge Session Structure with Global Config to create the Effective Config used by components
    const effectiveSchoolConfig = useMemo(() => {
        if (!currentTimetableSession) return userData.schoolConfig;
        return {
            ...userData.schoolConfig,
            // Prefer Session Structure, fallback to Global Defaults if somehow missing (though migration prevents this)
            daysConfig: currentTimetableSession.daysConfig || userData.schoolConfig.daysConfig,
            periodTimings: currentTimetableSession.periodTimings || userData.schoolConfig.periodTimings,
            breaks: currentTimetableSession.breaks || userData.schoolConfig.breaks,
            assembly: currentTimetableSession.assembly || userData.schoolConfig.assembly,
        };
    }, [userData.schoolConfig, currentTimetableSession]);

    const openConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void) => {
        setConfirmationState({ isOpen: true, title, message, onConfirm });
    };

    const updateCurrentSession = useCallback((updater: (session: TimetableSession) => TimetableSession) => {
        if (!currentTimetableSessionId) return;
        setUserData(prev => {
            const newSessions = prev.timetableSessions.map(session =>
                session.id === currentTimetableSessionId ? updater(session) : session
            );
            return { ...prev, timetableSessions: newSessions };
        });
    }, [currentTimetableSessionId]);

    const handleCreateTimetableSession = (name: string, startDate: string, endDate: string) => {
        const newSession: TimetableSession = {
            id: generateUniqueId(), name, startDate, endDate,
            subjects: [], teachers: [], classes: [], jointPeriods: [], adjustments: {}, leaveDetails: {},
            // Initialize with default structure from global config
            daysConfig: userData.schoolConfig.daysConfig,
            periodTimings: userData.schoolConfig.periodTimings,
            breaks: userData.schoolConfig.breaks,
            assembly: userData.schoolConfig.assembly
        };
        setUserData(prev => ({
            ...prev,
            timetableSessions: [...prev.timetableSessions, newSession]
        }));
        setCurrentTimetableSessionId(newSession.id);
    };

    const handleUpdateTimetableSession = (id: string, name: string, startDate: string, endDate: string) => {
        setUserData(prev => ({
            ...prev,
            timetableSessions: prev.timetableSessions.map(s =>
                s.id === id ? { ...s, name, startDate, endDate } : s
            )
        }));
    };

    const handleDeleteTimetableSession = (id: string) => {
        openConfirmation(t.delete, t.areYouSure, () => {
            setUserData(prev => {
                const newSessions = prev.timetableSessions.filter(s => s.id !== id);
                if (currentTimetableSessionId === id) {
                    setCurrentTimetableSessionId(newSessions.length > 0 ? newSessions[0].id : null);
                }
                return { ...prev, timetableSessions: newSessions };
            });
        });
    };

    const handleUploadTimetableSession = (session: TimetableSession) => {
        // Ensure imported session has structure (fallback to default if missing in JSON)
        if (!session.daysConfig) session.daysConfig = userData.schoolConfig.daysConfig;
        if (!session.periodTimings) session.periodTimings = userData.schoolConfig.periodTimings;
        if (!session.breaks) session.breaks = userData.schoolConfig.breaks;
        if (!session.assembly) session.assembly = userData.schoolConfig.assembly;

        setUserData(prev => {
            const sessionExists = prev.timetableSessions.some(s => s.id === session.id);
            const newSessions = sessionExists 
                ? prev.timetableSessions.map(s => s.id === session.id ? session : s)
                : [...prev.timetableSessions, session];
            return { ...prev, timetableSessions: newSessions };
        });
        setCurrentTimetableSessionId(session.id);
    };

    const handleUpdateSchoolConfig = (newConfig: Partial<SchoolConfig>) => {
        setUserData(prev => ({
            ...prev,
            schoolConfig: { ...prev.schoolConfig, ...newConfig }
        }));
    };

    const handleSetClasses = (newClasses: SchoolClass[]) => updateCurrentSession(s => ({ ...s, classes: newClasses }));
    const handleSetAdjustments = (date: string, adjustmentsForDate: Adjustment[]) => updateCurrentSession(s => ({ ...s, adjustments: { ...s.adjustments, [date]: adjustmentsForDate } }));
    const handleSetLeaveDetails = (date: string, leaveDetailsForDate: Record<string, LeaveDetails>) => {
        updateCurrentSession(s => ({
            ...s,
            leaveDetails: {
                ...(s.leaveDetails || {}),
                [date]: leaveDetailsForDate
            }
        }));
    };
    
    const handleDeleteSubject = useCallback((subjectId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== subjectId) }))), [t, updateCurrentSession]);
    const handleDeleteTeacher = useCallback((teacherId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, teachers: s.teachers.filter(t => t.id !== teacherId) }))), [t, updateCurrentSession]);
    const handleDeleteClass = useCallback((classId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, classes: s.classes.filter(c => c.id !== classId) }))), [t, updateCurrentSession]);
    const handleDeleteJointPeriod = useCallback((jointPeriodId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.filter(jp => jp.id !== jointPeriodId) }))), [t, updateCurrentSession]);
    
    const handleAddJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: [...s.jointPeriods, jointPeriod] }));
    const handleUpdateJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.map(jp => jp.id === jointPeriod.id ? jointPeriod : jp) }));

    const handleSearchResultClick = (type: 'class' | 'teacher' | 'subject', id: string) => {
        switch(type) {
            case 'class':
                setClassTimetableSelection({ classId: id, highlightedTeacherId: '' });
                setCurrentPage('classTimetable');
                break;
            case 'teacher':
                setTeacherTimetableSelection({ teacherId: id });
                setCurrentPage('teacherTimetable');
                break;
            case 'subject':
                setDataEntryTab('subject');
                setCurrentPage('dataEntry');
                break;
        }
    };
    
    const renderPage = () => {
        if (!currentTimetableSession && currentPage !== 'home' && currentPage !== 'settings') {
             return <HomePage
                    t={t} language={language} setCurrentPage={setCurrentPage}
                    currentTimetableSessionId={currentTimetableSessionId}
                    timetableSessions={userData.timetableSessions}
                    setCurrentTimetableSessionId={setCurrentTimetableSessionId}
                    onCreateTimetableSession={handleCreateTimetableSession}
                    onUpdateTimetableSession={handleUpdateTimetableSession}
                    onDeleteTimetableSession={handleDeleteTimetableSession}
                    onUploadTimetableSession={handleUploadTimetableSession}
                    schoolConfig={effectiveSchoolConfig} 
                    onUpdateCurrentSession={updateCurrentSession}
                    onSearchResultClick={handleSearchResultClick}
                />;
        }

        switch (currentPage) {
            case 'dataEntry':
                return <DataEntryPage
                    t={t}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    classes={currentTimetableSession?.classes || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    onAddSubject={subject => updateCurrentSession(s => ({ ...s, subjects: [...s.subjects, subject] }))}
                    onUpdateSubject={updatedSubject => updateCurrentSession(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === updatedSubject.id ? updatedSubject : sub) }))}
                    onDeleteSubject={handleDeleteSubject}
                    onAddTeacher={teacher => updateCurrentSession(s => ({ ...s, teachers: [...s.teachers, teacher] }))}
                    onUpdateTeacher={updatedTeacher => updateCurrentSession(s => ({ ...s, teachers: s.teachers.map(teach => teach.id === updatedTeacher.id ? updatedTeacher : teach) }))}
                    onDeleteTeacher={handleDeleteTeacher}
                    onSetClasses={handleSetClasses}
                    onDeleteClass={handleDeleteClass}
                    onAddJointPeriod={handleAddJointPeriod}
                    onUpdateJointPeriod={handleUpdateJointPeriod}
                    onDeleteJointPeriod={handleDeleteJointPeriod}
                    activeTab={dataEntryTab}
                    onTabChange={setDataEntryTab}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    // NEW: Pass session structure props
                    currentTimetableSession={currentTimetableSession}
                    onUpdateTimetableSession={updateCurrentSession}
                />;
            case 'classTimetable':
                return <ClassTimetablePage 
                    t={t} language={language} 
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    onSetClasses={handleSetClasses}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    selection={classTimetableSelection}
                    onSelectionChange={setClassTimetableSelection}
                    openConfirmation={openConfirmation}
                />;
            case 'teacherTimetable':
                return <TeacherTimetablePage 
                    t={t} language={language}
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    onSetClasses={handleSetClasses}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    selectedTeacherId={teacherTimetableSelection.teacherId}
                    onSelectedTeacherChange={(id) => setTeacherTimetableSelection({ teacherId: id })}
                 />;
            case 'alternativeTimetable':
                return <AlternativeTimetablePage 
                    t={t} language={language}
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    leaveDetails={currentTimetableSession?.leaveDetails}
                    onSetAdjustments={handleSetAdjustments}
                    onSetLeaveDetails={handleSetLeaveDetails}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    selection={adjustmentsSelection}
                    onSelectionChange={setAdjustmentsSelection}
                    openConfirmation={openConfirmation}
                />;
            case 'settings':
                return <SettingsPage 
                    t={t} language={language} setLanguage={setLanguage}
                    theme={theme} setTheme={setTheme}
                    navPosition={navPosition} setNavPosition={setNavPosition}
                    navDesign={navDesign} setNavDesign={setNavDesign}
                    navShape={navShape} setNavShape={setNavShape}
                    fontSize={fontSize} setFontSize={setFontSize}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    classes={currentTimetableSession?.classes || []}
                    teachers={currentTimetableSession?.teachers || []}
                    subjects={currentTimetableSession?.subjects || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                 />;
            case 'home':
            default:
                return <HomePage
                    t={t} language={language} setCurrentPage={setCurrentPage}
                    currentTimetableSessionId={currentTimetableSessionId}
                    timetableSessions={userData.timetableSessions}
                    setCurrentTimetableSessionId={setCurrentTimetableSessionId}
                    onCreateTimetableSession={handleCreateTimetableSession}
                    onUpdateTimetableSession={handleUpdateTimetableSession}
                    onDeleteTimetableSession={handleDeleteTimetableSession}
                    onUploadTimetableSession={handleUploadTimetableSession}
                    schoolConfig={effectiveSchoolConfig}
                    onUpdateCurrentSession={updateCurrentSession}
                    onSearchResultClick={handleSearchResultClick}
                />;
        }
    };
    
    return (
        <div className="flex flex-col h-screen overflow-hidden">
             <ConfirmationModal
                t={t}
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationState.onConfirm}
                title={confirmationState.title}
                message={confirmationState.message}
            />
            {currentPage !== 'home' && (
                <TopNavBar 
                    t={t} 
                    currentPage={currentPage} 
                    setCurrentPage={setCurrentPage} 
                    schoolConfig={effectiveSchoolConfig}
                />
            )}
            {/* Adjust padding based on nav position */}
            <div className={`flex-grow overflow-y-auto ${navPosition === 'bottom' ? 'pb-24 xl:pb-0' : 'pt-24 pb-4 xl:pt-0'}`}>
                {renderPage()}
            </div>
            {currentPage !== 'home' && (
                <BottomNavBar 
                    t={t} 
                    currentPage={currentPage} 
                    setCurrentPage={setCurrentPage} 
                    position={navPosition}
                    design={navDesign}
                    shape={navShape}
                />
            )}
        </div>
    );
};

export default App;