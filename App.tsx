
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Language, Page, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, TimetableSession, UserData, SchoolConfig, DataEntryTab, Period, DownloadDesignConfig, DownloadDesigns, GroupSet, JointPeriod, LeaveDetails, PeriodTime, Break, AttendanceData, NavPosition, NavDesign, NavShape } from './types';
import { translations } from './i18n';
import HomePage from './components/HomePage';
import DataEntryPage from './components/DataEntryPage';
import ClassTimetablePage from './components/ClassTimetablePage';
import { TeacherTimetablePage } from './components/TeacherTimetablePage';
import { AlternativeTimetablePage } from './components/AlternativeTimetablePage';
import { AttendancePage } from './components/AttendancePage';
import SettingsPage from './components/SettingsPage';
import { generateUniqueId, allDays } from './types';
import BottomNavBar from './components/BottomNavBar';
import SideNavBar from './components/SideNavBar';
import GlobalSearch from './components/GlobalSearch';
import SchoolInfoModal from './components/SchoolInfoModal';

export type Theme = 'light' | 'dark' | 'mint' | 'amoled';

// Great Theme Presets
const THEME_PRESETS: Record<Theme, { bgPrimary: string, bgSecondary: string, textPrimary: string, accentPrimary: string }> = {
    light: { bgPrimary: '#f8fafc', bgSecondary: '#ffffff', textPrimary: '#0f172a', accentPrimary: '#6366f1' }, // Indigo
    dark: { bgPrimary: '#0f172a', bgSecondary: '#1e293b', textPrimary: '#f8fafc', accentPrimary: '#8b5cf6' }, // Violet
    mint: { bgPrimary: '#f0fdfa', bgSecondary: '#ffffff', textPrimary: '#042f2e', accentPrimary: '#0d9488' }, // Teal
    amoled: { bgPrimary: '#000000', bgSecondary: '#121212', textPrimary: '#ffffff', accentPrimary: '#22d3ee' }, // Cyan
};

export interface ThemeColors {
    bgPrimary: string;
    bgSecondary: string;
    textPrimary: string;
    accentPrimary: string;
}

// Helper to manipulate colors
const adjustColor = (col: string, amt: number) => {
    let usePound = false;
    if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

const hexToRgba = (hex: string, alpha: number) => {
    // Basic hex parsing
    let c = hex.substring(1).split('');
    if(c.length === 3){
        c= [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const r = parseInt(c.slice(0, 2).join(''), 16);
    const g = parseInt(c.slice(2, 4).join(''), 16);
    const b = parseInt(c.slice(4, 6).join(''), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const defaultDesignV3: DownloadDesignConfig = {
    version: 3,
    page: { size: 'a4', orientation: 'portrait', margins: { top: 4, right: 4, bottom: 4, left: 4 }, watermarkOpacity: 0.07 },
    header: { showLogo: true, logoSize: 80, logoPosition: 'left', schoolName: { fontFamily: 'sans-serif', fontSize: 24, fontWeight: 'bold', align: 'left', color: '#000000' }, showTitle: true, title: { fontFamily: 'sans-serif', fontSize: 18, fontWeight: 'bold', align: 'left', color: '#444444' }, details: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: 'normal', align: 'left', color: '#000000' }, divider: true, bgColor: '#FFFFFF' },
    table: { fontFamily: 'sans-serif', fontSize: 14, cellPadding: 8, headerBgColor: '#1e293b', headerColor: '#FFFFFF', bodyBgColor: '#FFFFFF', bodyColor: '#000000', borderColor: '#000000', periodColumnWidth: 40, periodColumnBgColor: '#f1f5f9', periodColumnColor: '#000000', altRowColor: '#FFFFFF', gridStyle: 'solid', borderWidth: 1, headerFontSize: 14, cardStyle: 'minimal-left', triangleCorner: 'bottom-left', outlineWidth: 2 },
    footer: { show: false, text: 'Mr.🇵🇰', fontFamily: 'sans-serif', fontSize: 12, align: 'center', includePageNumber: false, color: '#4b5563', includeTimestamp: false },
    colorMode: 'color', rowsPerPage: 50, rowsPerFirstPage: 50, daysPerPage: 7, watermarkText: '', compactMode: false,
    visibleElements: { teacherName: true, subjectName: true, roomNumber: true }, contentScale: 1,
};
const defaultDownloadDesigns: DownloadDesigns = { 
    class: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape' } }, 
    teacher: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape' } }, 
    workload: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'portrait' }, table: { ...defaultDesignV3.table, cellPadding: 1 } },
    alternative: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 0, fontSize: 13, fontFamily: 'sans-serif', verticalAlign: 'middle' } }, 
    adjustments: { ...defaultDesignV3, table: { ...defaultDesignV3.table, fontFamily: 'sans-serif', fontSize: 13, cellPadding: 0, altRowColor: '#f5f5f5' } },
    basicInfo: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 2, fontSize: 16 } }, 
    attendance: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 4, fontSize: 14 } }, 
    schoolTimings: { 
        ...defaultDesignV3, 
        header: {
            ...defaultDesignV3.header,
            schoolName: {
                ...defaultDesignV3.header.schoolName,
                fontFamily: 'sans-serif',
                fontSize: 51
            }
        },
        table: { 
            ...defaultDesignV3.table, 
            fontSize: 32, // Updated to 32 as requested
            periodColumnBgColor: '#85ff8d',
            headerFontSize: 44, // Increased from 30
            borderWidth: 3
        } 
    } 
};
const defaultSchoolLogo = null;
const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const generateDefaultPeriodTimings = (): PeriodTime[] => Array.from({ length: 12 }, () => ({ start: '', end: '' }));
const defaultUserData: UserData = { timetableSessions: [], schoolConfig: { schoolNameEn: 'Govt. High School Wan Bhachran (Mianwali)', schoolNameUr: 'گورنمنٹ ہائی سکول واں بھچراں (میانوالی)', schoolLogoBase64: defaultSchoolLogo, downloadDesigns: defaultDownloadDesigns, daysConfig: { Monday: { active: true, periodCount: 8 }, Tuesday: { active: true, periodCount: 8 }, Wednesday: { active: true, periodCount: 8 }, Thursday: { active: true, periodCount: 8 }, Friday: { active: true, periodCount: 8 }, Saturday: { active: false, periodCount: 4 } }, periodTimings: { default: generateDefaultPeriodTimings(), friday: generateDefaultPeriodTimings() }, breaks: { default: [{ id: 'break-1', name: 'Recess', beforePeriod: 3, startTime: '', endTime: '' }, { id: 'break-2', name: 'Lunch', beforePeriod: 6, startTime: '', endTime: '' }], friday: [{ id: 'break-fri-1', name: 'Jummah', beforePeriod: 5, startTime: '', endTime: '' }] }, assembly: { default: null, friday: null } } };

interface ConfirmationModalProps { t: any; isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: React.ReactNode; }
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ t, isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101] transition-opacity" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-4 text-center text-[var(--text-primary)]">{title}</h3>
        <div className="text-center text-[var(--text-secondary)] mb-8 max-h-60 overflow-y-auto">{message}</div>
        <div className="flex justify-center gap-4"><button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.cancel}</button><button onClick={() => { onConfirm(); onClose(); }} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">{t.delete}</button></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        let savedTheme = localStorage.getItem('mrtimetable_theme') as any;
        if (savedTheme === 'high-contrast') savedTheme = 'light'; // Fallback
        if (savedTheme === 'custom') savedTheme = 'light'; 
        if (!['light', 'dark', 'mint', 'amoled'].includes(savedTheme)) savedTheme = 'light';
        return (savedTheme as Theme) || 'light';
    });
    
    const [themeColors, setThemeColors] = useState<ThemeColors>(() => {
        const saved = localStorage.getItem(`mrtimetable_themeColors_${theme}`);
        return saved ? JSON.parse(saved) : THEME_PRESETS[theme];
    });

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        const saved = localStorage.getItem(`mrtimetable_themeColors_${newTheme}`);
        setThemeColors(saved ? JSON.parse(saved) : THEME_PRESETS[newTheme]);
    };

    const handleColorChange = (key: keyof ThemeColors, value: string) => {
        setThemeColors(prev => {
            const newColors = { ...prev, [key]: value };
            localStorage.setItem(`mrtimetable_themeColors_${theme}`, JSON.stringify(newColors));
            return newColors;
        });
    };

    const resetThemeColors = () => {
        const defaults = THEME_PRESETS[theme];
        setThemeColors(defaults);
        localStorage.removeItem(`mrtimetable_themeColors_${theme}`);
    };

    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('mrtimetable_language') as Language) || 'en');
    const [navDesign, setNavDesign] = useState<NavDesign>(() => (localStorage.getItem('mrtimetable_navDesign') as NavDesign) || 'minimal');
    const [navShape, setNavShape] = useState<NavShape>(() => (localStorage.getItem('mrtimetable_navShape') as NavShape) || 'pill');
    
    const [navAnimation, setNavAnimation] = useState<boolean>(() => { const saved = localStorage.getItem('mrtimetable_navAnimation'); return saved !== null ? JSON.parse(saved) : true; });
    const [navBtnAlphaSelected, setNavBtnAlphaSelected] = useState<number>(() => { const saved = localStorage.getItem('mrtimetable_navBtnAlphaSelected'); return saved !== null ? parseFloat(saved) : 1.0; });
    const [navBtnAlphaUnselected, setNavBtnAlphaUnselected] = useState<number>(() => { const saved = localStorage.getItem('mrtimetable_navBtnAlphaUnselected'); return saved !== null ? parseFloat(saved) : 0.0; });
    const [navBarAlpha, setNavBarAlpha] = useState<number>(() => { const saved = localStorage.getItem('mrtimetable_navBarAlpha'); return saved !== null ? parseFloat(saved) : 0.8; });
    const [navBarColor, setNavBarColor] = useState<string>(() => (localStorage.getItem('mrtimetable_navBarColor') || ''));

    const [fontSize, setFontSize] = useState<number>(() => { const saved = localStorage.getItem('mrtimetable_fontSize'); return saved ? parseInt(saved, 10) : 13; });
    const [appFont, setAppFont] = useState<string>(() => (localStorage.getItem('mrtimetable_appFont') || ''));
    const [isSchoolInfoModalOpen, setIsSchoolInfoModalOpen] = useState(false);

    const [history, setHistory] = useState<UserData[]>(() => {
        const saved = localStorage.getItem('mrtimetable_userData');
        let dataToLoad: UserData;
        try { dataToLoad = saved ? JSON.parse(saved) : defaultUserData; } catch (e) { dataToLoad = defaultUserData; }
        if (!dataToLoad.schoolConfig.daysConfig) dataToLoad.schoolConfig.daysConfig = defaultUserData.schoolConfig.daysConfig;
        if (!dataToLoad.schoolConfig.periodTimings) dataToLoad.schoolConfig.periodTimings = defaultUserData.schoolConfig.periodTimings;
        if (!dataToLoad.schoolConfig.breaks) dataToLoad.schoolConfig.breaks = defaultUserData.schoolConfig.breaks;
        if (!dataToLoad.schoolConfig.assembly) dataToLoad.schoolConfig.assembly = defaultUserData.schoolConfig.assembly;
        if (!dataToLoad.schoolConfig.downloadDesigns.workload) dataToLoad.schoolConfig.downloadDesigns.workload = defaultUserData.schoolConfig.downloadDesigns.workload;
        if (!dataToLoad.schoolConfig.downloadDesigns.adjustments) dataToLoad.schoolConfig.downloadDesigns.adjustments = defaultDownloadDesigns.adjustments;
        if (!dataToLoad.schoolConfig.downloadDesigns.attendance) dataToLoad.schoolConfig.downloadDesigns.attendance = defaultDownloadDesigns.attendance;
        if (dataToLoad.schoolConfig.downloadDesigns.alternative.table.verticalAlign === undefined) dataToLoad.schoolConfig.downloadDesigns.alternative.table.verticalAlign = 'middle';
        
        if (dataToLoad.schoolConfig.downloadDesigns.schoolTimings) {
             const st = dataToLoad.schoolConfig.downloadDesigns.schoolTimings;
             if (st.table.periodColumnBgColor === '#f1f5f9') {
                st.table.periodColumnBgColor = '#86efac';
             }
             if (st.header.schoolName.fontFamily === 'Roboto' && st.header.schoolName.fontSize === 24) {
                 st.header.schoolName.fontFamily = 'sans-serif';
                 st.header.schoolName.fontSize = 51;
             }
             if (!st.table.borderWidth || st.table.borderWidth === 1) {
                 st.table.borderWidth = 3;
             }
             // Migration: Increase header font size if it's below the new default
             if (!st.table.headerFontSize || st.table.headerFontSize < 44) {
                 st.table.headerFontSize = 44;
             }
             // Migration: Update default font size from 34 to 32
             if (st.table.fontSize === 34) {
                 st.table.fontSize = 32;
             }
             // Ensure minimum font size is reasonable
             if (!st.table.fontSize || st.table.fontSize < 32) {
                 st.table.fontSize = 32;
             }
        }

        if (dataToLoad.schoolConfig.schoolLogoBase64 === transparentPixel) {
            dataToLoad.schoolConfig.schoolLogoBase64 = null;
        }

        dataToLoad.timetableSessions.forEach(session => {
            if (!session.subjects) session.subjects = []; if (!session.teachers) session.teachers = []; if (!session.classes) session.classes = []; if (!session.jointPeriods) session.jointPeriods = []; if (!session.leaveDetails) session.leaveDetails = {}; if (!session.adjustments) session.adjustments = {};
            if (!session.daysConfig) session.daysConfig = dataToLoad.schoolConfig.daysConfig; if (!session.periodTimings) session.periodTimings = dataToLoad.schoolConfig.periodTimings; if (!session.breaks) session.breaks = dataToLoad.schoolConfig.breaks; if (!session.assembly) session.assembly = dataToLoad.schoolConfig.assembly;
            if (!session.vacations) session.vacations = []; // Init Vacations
            if (!session.changeLogs) session.changeLogs = []; // Init Change Logs
            session.teachers.forEach(teacher => { if (!(teacher as any).gender) (teacher as any).gender = 'Male'; delete (teacher as any).designation; delete (teacher as any).qualification; });
            session.classes.forEach(c => { if (!c.timetable) { c.timetable = { Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []), Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []), Friday: Array.from({ length: 8 }, () => []), Saturday: Array.from({ length: 8 }, () => []) }; } else { if (!c.timetable.Saturday) c.timetable.Saturday = Array.from({ length: 8 }, () => []); } if (!c.subjects || !Array.isArray(c.subjects)) c.subjects = []; c.subjects.forEach(s => { if ((s as any).combinedGroupId) delete (s as any).combinedGroupId; }); });
        });
        return [dataToLoad];
    });
    
    const [historyIndex, setHistoryIndex] = useState(0);
    const userData = history[historyIndex];

    const setUserData = useCallback((action: UserData | ((prev: UserData) => UserData)) => {
        const newData = typeof action === 'function' ? action(userData) : action;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newData);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [userData, history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
    }, [historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
    }, [historyIndex, history.length]);

    const handleSave = useCallback(() => {
        const toast = document.createElement('div');
        toast.textContent = 'Changes Saved Successfully!';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl font-bold z-[200] animate-bounce-short';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) { handleRedo(); } else { handleUndo(); }
                e.preventDefault();
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                handleRedo(); e.preventDefault();
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault(); handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, handleSave]);

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
        const { bgPrimary, bgSecondary, textPrimary, accentPrimary } = themeColors;
        const isLight = parseInt(bgPrimary.slice(1), 16) > 0xffffff / 2;
        const contrastShift = isLight ? 60 : -60;
        const textSecondary = adjustColor(textPrimary, contrastShift); 
        const textPlaceholder = adjustColor(textPrimary, isLight ? 100 : -100);
        const bgTertiary = adjustColor(bgSecondary, isLight ? -5 : 10);
        const borderPrimary = adjustColor(bgSecondary, isLight ? -20 : 20);
        const borderSecondary = adjustColor(bgSecondary, isLight ? -10 : 15);
        const accentPrimaryHover = adjustColor(accentPrimary, -20);
        const accentSecondary = hexToRgba(accentPrimary, 0.1);
        const accentSecondaryHover = hexToRgba(accentPrimary, 0.15);
        const accentText = isLight ? '#ffffff' : (theme === 'amoled' || theme === 'dark' ? '#ffffff' : '#ffffff');
        const slotAvailableBg = hexToRgba(accentPrimary, 0.1);
        const slotConflictBg = 'rgba(239, 68, 68, 0.15)'; 
        const slotDisabledBg = bgTertiary;

        const styleId = 'dynamic-theme-styles';
        let style = document.getElementById(styleId);
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }

        style.innerHTML = `
            :root {
                --bg-primary: ${bgPrimary} !important;
                --bg-secondary: ${bgSecondary} !important;
                --bg-tertiary: ${bgTertiary} !important;
                --text-primary: ${textPrimary} !important;
                --text-secondary: ${textSecondary} !important;
                --text-placeholder: ${textPlaceholder} !important;
                --border-primary: ${borderPrimary} !important;
                --border-secondary: ${borderSecondary} !important;
                --accent-primary: ${accentPrimary} !important;
                --accent-primary-hover: ${accentPrimaryHover} !important;
                --accent-text: ${accentText} !important;
                --accent-secondary: ${accentSecondary} !important;
                --accent-secondary-hover: ${accentSecondaryHover} !important;
                --slot-available-bg: ${slotAvailableBg} !important;
                --slot-conflict-bg: ${slotConflictBg} !important;
                --slot-disabled-bg: ${slotDisabledBg} !important;
                --subject-default-bg: ${bgTertiary} !important;
                --subject-default-text: ${textPrimary} !important;
                --subject-default-border: ${borderSecondary} !important;
            }
        `;
    }, [theme, themeColors]);

    useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'; localStorage.setItem('mrtimetable_language', language); }, [language]);
    useEffect(() => { const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement; if (link) { link.href = userData.schoolConfig.schoolLogoBase64 || '/vite.svg'; } }, [userData.schoolConfig.schoolLogoBase64]);
    useEffect(() => { localStorage.setItem('mrtimetable_navDesign', navDesign); }, [navDesign]);
    useEffect(() => { localStorage.setItem('mrtimetable_navShape', navShape); }, [navShape]);
    useEffect(() => { localStorage.setItem('mrtimetable_navAnimation', JSON.stringify(navAnimation)); }, [navAnimation]);
    useEffect(() => { localStorage.setItem('mrtimetable_navBtnAlphaSelected', navBtnAlphaSelected.toString()); }, [navBtnAlphaSelected]);
    useEffect(() => { localStorage.setItem('mrtimetable_navBtnAlphaUnselected', navBtnAlphaUnselected.toString()); }, [navBtnAlphaUnselected]);
    useEffect(() => { localStorage.setItem('mrtimetable_navBarAlpha', navBarAlpha.toString()); }, [navBarAlpha]);
    useEffect(() => { localStorage.setItem('mrtimetable_navBarColor', navBarColor); }, [navBarColor]);
    useEffect(() => { localStorage.setItem('mrtimetable_fontSize', fontSize.toString()); document.documentElement.style.fontSize = `${fontSize}px`; }, [fontSize]);
    useEffect(() => { localStorage.removeItem('mrtimetable_customFontData'); }, []);
    useEffect(() => {
        localStorage.setItem('mrtimetable_appFont', 'sans-serif');
        const styleId = 'global-app-font-style';
        let style = document.getElementById(styleId);
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
        
        style.innerHTML = `:root { --font-app-primary: sans-serif; } body { font-family: var(--font-app-primary); } button, input, select, textarea { font-family: var(--font-app-primary); }`;
    }, [appFont]);
    
    useEffect(() => { localStorage.setItem('mrtimetable_userData', JSON.stringify(userData)); }, [userData]);
    useEffect(() => { if (currentTimetableSessionId) localStorage.setItem('mrtimetable_currentTimetableSessionId', currentTimetableSessionId); else localStorage.removeItem('mrtimetable_currentTimetableSessionId'); }, [currentTimetableSessionId]);
    useEffect(() => { if (userData.timetableSessions.length > 0) { const sessionExists = userData.timetableSessions.some(s => s.id === currentTimetableSessionId); if (!sessionExists) setCurrentTimetableSessionId(userData.timetableSessions[0].id); } else { if (currentTimetableSessionId !== null) setCurrentTimetableSessionId(null); } }, [userData, currentTimetableSessionId]);

    const currentTimetableSession = useMemo(() => userData.timetableSessions.find(s => s.id === currentTimetableSessionId) || null, [userData, currentTimetableSessionId]);
    const effectiveSchoolConfig = useMemo(() => { if (!currentTimetableSession) return userData.schoolConfig; return { ...userData.schoolConfig, daysConfig: currentTimetableSession.daysConfig || userData.schoolConfig.daysConfig, periodTimings: currentTimetableSession.periodTimings || userData.schoolConfig.periodTimings, breaks: currentTimetableSession.breaks || userData.schoolConfig.breaks, assembly: currentTimetableSession.assembly || userData.schoolConfig.assembly }; }, [userData.schoolConfig, currentTimetableSession]);
    const openConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void) => { setConfirmationState({ isOpen: true, title, message, onConfirm }); };
    const updateCurrentSession = useCallback((updater: (session: TimetableSession) => TimetableSession) => { if (!currentTimetableSessionId) return; setUserData(prev => { const newSessions = prev.timetableSessions.map(session => session.id === currentTimetableSessionId ? updater(session) : session); return { ...prev, timetableSessions: newSessions }; }); }, [currentTimetableSessionId, setUserData]);

    const handleCreateTimetableSession = (name: string, startDate: string, endDate: string) => { const newSession: TimetableSession = { id: generateUniqueId(), name, startDate, endDate, subjects: [], teachers: [], classes: [], jointPeriods: [], adjustments: {}, leaveDetails: {}, daysConfig: userData.schoolConfig.daysConfig, periodTimings: userData.schoolConfig.periodTimings, breaks: userData.schoolConfig.breaks, assembly: userData.schoolConfig.assembly, vacations: [], changeLogs: [] }; setUserData(prev => ({ ...prev, timetableSessions: [...prev.timetableSessions, newSession] })); setCurrentTimetableSessionId(newSession.id); };
    const handleUpdateTimetableSession = (id: string, name: string, startDate: string, endDate: string) => { setUserData(prev => ({ ...prev, timetableSessions: prev.timetableSessions.map(s => s.id === id ? { ...s, name, startDate, endDate } : s) })); };
    const handleDeleteTimetableSession = (id: string) => { openConfirmation(t.delete, t.areYouSure, () => { setUserData(prev => { const newSessions = prev.timetableSessions.filter(s => s.id !== id); if (currentTimetableSessionId === id) { setCurrentTimetableSessionId(newSessions.length > 0 ? newSessions[0].id : null); } return { ...prev, timetableSessions: newSessions }; }); }); };
    
    const handleUploadTimetableSession = (session: TimetableSession, newSchoolConfig?: Partial<SchoolConfig>) => { 
        if (!session.daysConfig) session.daysConfig = userData.schoolConfig.daysConfig; 
        if (!session.periodTimings) session.periodTimings = userData.schoolConfig.periodTimings; 
        if (!session.breaks) session.breaks = userData.schoolConfig.breaks; 
        if (!session.assembly) session.assembly = userData.schoolConfig.assembly; 
        if (!session.vacations) session.vacations = [];
        if (!session.changeLogs) session.changeLogs = [];
        
        setUserData(prev => { 
            const sessionExists = prev.timetableSessions.some(s => s.id === session.id); 
            const newSessions = sessionExists ? prev.timetableSessions.map(s => s.id === session.id ? session : s) : [...prev.timetableSessions, session]; 
            const nextState = { ...prev, timetableSessions: newSessions };
            if (newSchoolConfig) { nextState.schoolConfig = { ...nextState.schoolConfig, ...newSchoolConfig }; }
            return nextState; 
        }); 
        setCurrentTimetableSessionId(session.id); 
    };

    const handleUpdateSchoolConfig = (newConfig: Partial<SchoolConfig>) => { setUserData(prev => ({ ...prev, schoolConfig: { ...prev.schoolConfig, ...newConfig } })); };
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
    const handleSearchResultClick = (type: 'class' | 'teacher' | 'subject', id: string) => { switch(type) { case 'class': setClassTimetableSelection({ classId: id, highlightedTeacherId: '' }); setCurrentPage('classTimetable'); break; case 'teacher': setTeacherTimetableSelection({ teacherId: id }); setCurrentPage('teacherTimetable'); break; case 'subject': setDataEntryTab('subject'); setCurrentPage('dataEntry'); break; } };

    const historyProps = { onUndo: handleUndo, onRedo: handleRedo, onSave: handleSave, canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1 };

    const renderPage = () => {
        switch (currentPage) {
            case 'dataEntry': return <DataEntryPage t={t} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} classes={currentTimetableSession?.classes || []} jointPeriods={currentTimetableSession?.jointPeriods || []} onAddSubject={subject => updateCurrentSession(s => ({ ...s, subjects: [...s.subjects, subject] }))} onUpdateSubject={updatedSubject => updateCurrentSession(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === updatedSubject.id ? updatedSubject : sub) }))} onDeleteSubject={handleDeleteSubject} onAddTeacher={teacher => updateCurrentSession(s => ({ ...s, teachers: [...s.teachers, teacher] }))} onUpdateTeacher={updatedTeacher => updateCurrentSession(s => ({ ...s, teachers: s.teachers.map(teach => teach.id === updatedTeacher.id ? updatedTeacher : teach) }))} onDeleteTeacher={handleDeleteTeacher} onSetClasses={handleSetClasses} onDeleteClass={handleDeleteClass} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} activeTab={dataEntryTab} onTabChange={setDataEntryTab} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} currentTimetableSession={currentTimetableSession} onUpdateTimetableSession={updateCurrentSession} openConfirmation={openConfirmation} onOpenSchoolInfo={() => setIsSchoolInfoModalOpen(true)} />;
            case 'classTimetable': return <ClassTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} jointPeriods={currentTimetableSession?.jointPeriods || []} adjustments={currentTimetableSession?.adjustments || {}} onSetClasses={handleSetClasses} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selection={classTimetableSelection} onSelectionChange={setClassTimetableSelection} openConfirmation={openConfirmation} hasActiveSession={!!currentTimetableSession} {...historyProps} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} onUpdateTimetableSession={updateCurrentSession} changeLogs={currentTimetableSession?.changeLogs} />;
            case 'teacherTimetable': return <TeacherTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} jointPeriods={currentTimetableSession?.jointPeriods || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} onSetClasses={handleSetClasses} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selectedTeacherId={teacherTimetableSelection.teacherId} onSelectedTeacherChange={(id) => setTeacherTimetableSelection({ teacherId: id })} hasActiveSession={!!currentTimetableSession} {...historyProps} openConfirmation={openConfirmation} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} onUpdateTimetableSession={updateCurrentSession} />;
            case 'alternativeTimetable': return <AlternativeTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} onSetAdjustments={handleSetAdjustments} onSetLeaveDetails={handleSetLeaveDetails} onUpdateSession={updateCurrentSession} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selection={adjustmentsSelection} onSelectionChange={setAdjustmentsSelection} openConfirmation={openConfirmation} hasActiveSession={!!currentTimetableSession} jointPeriods={currentTimetableSession?.jointPeriods} />;
            case 'attendance': return <AttendancePage t={t} language={language} classes={currentTimetableSession?.classes || []} currentTimetableSession={currentTimetableSession} onUpdateSession={updateCurrentSession} onUpdateSchoolConfig={handleUpdateSchoolConfig} schoolConfig={effectiveSchoolConfig} />;
            case 'settings': return <SettingsPage t={t} language={language} setLanguage={setLanguage} theme={theme} setTheme={handleThemeChange} themeColors={themeColors} onColorChange={handleColorChange} onResetTheme={resetThemeColors} navDesign={navDesign} setNavDesign={setNavDesign} navShape={navShape} setNavShape={setNavShape} navBtnAlphaSelected={navBtnAlphaSelected} setNavBtnAlphaSelected={setNavBtnAlphaSelected} navBtnAlphaUnselected={navBtnAlphaUnselected} setNavBtnAlphaUnselected={setNavBtnAlphaUnselected} navBarAlpha={navBarAlpha} setNavBarAlpha={setNavBarAlpha} navBarColor={navBarColor} setNavBarColor={setNavBarColor} navAnimation={navAnimation} setNavAnimation={setNavAnimation} fontSize={fontSize} setFontSize={setFontSize} appFont={appFont} setAppFont={setAppFont} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} classes={currentTimetableSession?.classes || []} teachers={currentTimetableSession?.teachers || []} subjects={currentTimetableSession?.subjects || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} attendance={currentTimetableSession?.attendance || {}} />;
            case 'home': default: return <HomePage t={t} language={language} setCurrentPage={setCurrentPage} currentTimetableSessionId={currentTimetableSessionId} timetableSessions={userData.timetableSessions} setCurrentTimetableSessionId={setCurrentTimetableSessionId} onCreateTimetableSession={handleCreateTimetableSession} onUpdateTimetableSession={handleUpdateTimetableSession} onDeleteTimetableSession={handleDeleteTimetableSession} onUploadTimetableSession={handleUploadTimetableSession} schoolConfig={effectiveSchoolConfig} onUpdateCurrentSession={updateCurrentSession} onSearchResultClick={handleSearchResultClick} onUpdateSchoolConfig={handleUpdateSchoolConfig} onOpenSchoolInfo={() => setIsSchoolInfoModalOpen(true)} />;
        }
    };

    return (
        <>
            <ConfirmationModal t={t} isOpen={confirmationState.isOpen} onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} />
            <SchoolInfoModal t={t} isOpen={isSchoolInfoModalOpen} onClose={() => setIsSchoolInfoModalOpen(false)} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} />

            <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 flex flex-col`}>
                <SideNavBar t={t} currentPage={currentPage} setCurrentPage={setCurrentPage} schoolConfig={effectiveSchoolConfig} />
                <div className={`flex-1 flex flex-col min-w-0 pb-24 xl:pb-0 xl:pt-16`}>
                    <main className={`flex-1 ${currentPage === 'home' ? '!pt-0' : 'pt-6 xl:pt-8 px-4 xl:px-8'}`}>
                        {renderPage()}
                    </main>
                    
                    {currentPage !== 'home' && (
                        <BottomNavBar t={t} currentPage={currentPage} setCurrentPage={setCurrentPage} position="bottom" design={navDesign} shape={navShape} alphaSelected={navBtnAlphaSelected} alphaUnselected={navBtnAlphaUnselected} barAlpha={navBarAlpha} barColor={navBarColor} navAnimation={navAnimation} />
                    )}
                </div>
            </div>
        </>
    );
};

export default App;
