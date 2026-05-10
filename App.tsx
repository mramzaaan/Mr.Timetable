
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
extend([a11yPlugin]);

import type { Language, UserRole, Page, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, TimetableSession, UserData, SchoolConfig, DataEntryTab, Period, DownloadDesignConfig, DownloadDesigns, GroupSet, JointPeriod, LeaveDetails, PeriodTime, Break, AttendanceData, NavPosition, NavDesign, NavShape } from './types';
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
import LoginModal from './components/LoginModal';
import { supabase } from './lib/supabase';

export type Theme = 'light' | 'dark' | 'mint' | 'amoled' | 'system';

// Great Theme Presets
const THEME_PRESETS: Record<Exclude<Theme, 'system'>, { bgPrimary: string, bgSecondary: string, textPrimary: string, accentPrimary: string }> = {
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
    // Only take RGB parts if it's an 8-char hex
    const hex = col.length === 8 ? col.slice(0, 6) : (col.length === 4 ? col[0]+col[0]+col[1]+col[1]+col[2]+col[2] : col);
    const alpha = col.length === 8 ? col.slice(6, 8) : "";
    
    const num = parseInt(hex, 16);
    let r = (num >> 16) + amt;
    r = Math.max(0, Math.min(255, r));
    let g = ((num >> 8) & 0x00FF) + amt;
    g = Math.max(0, Math.min(255, g));
    let b = (num & 0x0000FF) + amt;
    b = Math.max(0, Math.min(255, b));
    
    return (usePound ? "#" : "") + 
           r.toString(16).padStart(2, '0') + 
           g.toString(16).padStart(2, '0') + 
           b.toString(16).padStart(2, '0') + 
           alpha;
};

const hexToRgba = (hex: string, alphaMultiplier: number) => {
    if (!hex) return `rgba(0,0,0,${alphaMultiplier})`;
    let c = hex.substring(1).split('');
    if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const r = parseInt(c.slice(0, 2).join(''), 16);
    const g = parseInt(c.slice(2, 4).join(''), 16);
    const b = parseInt(c.slice(4, 6).join(''), 16);
    let a = 1.0;
    if (c.length === 8) {
        a = parseInt(c.slice(6, 8).join(''), 16) / 255;
    }
    return `rgba(${r}, ${g}, ${b}, ${a * alphaMultiplier})`;
};

const defaultDesignV3: DownloadDesignConfig = {
    version: 3,
    page: { size: 'a4', orientation: 'portrait', margins: { top: 3, right: 3, bottom: 3, left: 3 }, watermarkOpacity: 0.07 },
    header: { showLogo: true, logoSize: 80, logoPosition: 'left', schoolName: { fontFamily: 'sans-serif', fontSize: 24, fontWeight: 'bold', align: 'left', color: '#000000' }, showTitle: true, title: { fontFamily: 'sans-serif', fontSize: 18, fontWeight: 'bold', align: 'left', color: '#444444' }, details: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: 'normal', align: 'left', color: '#000000' }, divider: true, bgColor: '#FFFFFF' },
    table: { fontFamily: 'sans-serif', fontSize: 14, cellPadding: 8, headerBgColor: '#1e293b', headerColor: '#FFFFFF', bodyBgColor: '#FFFFFF', bodyColor: '#000000', borderColor: '#000000', periodColumnWidth: 40, periodColumnBgColor: '#f1f5f9', periodColumnColor: '#000000', altRowColor: '#FFFFFF', gridStyle: 'solid', borderWidth: 1, headerFontSize: 14, cardStyle: 'minimal-left', triangleCorner: 'bottom-left', outlineWidth: 2 },
    footer: { show: true, text: 'Mr.🇵🇰', fontFamily: 'sans-serif', fontSize: 12, align: 'center', includePageNumber: false, color: '#4b5563', includeTimestamp: false, includeDate: true, appNamePlacement: 'left', datePlacement: 'right', pageNumberPlacement: 'center' },
    colorMode: 'color', rowsPerPage: 50, rowsPerFirstPage: 50, daysPerPage: 7, watermarkText: '', compactMode: false,
    visibleElements: { teacherName: true, subjectName: true, roomNumber: true }, contentScale: 1,
};
const defaultDownloadDesigns: DownloadDesigns = { 
    class: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape', size: 'legal' } }, 
    teacher: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'landscape' } }, 
    workload: { ...defaultDesignV3, page: { ...defaultDesignV3.page, orientation: 'portrait' }, table: { ...defaultDesignV3.table, cellPadding: 1 } },
    alternative: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 0, fontSize: 13, fontFamily: 'sans-serif', verticalAlign: 'middle' } }, 
    adjustments: { ...defaultDesignV3, table: { ...defaultDesignV3.table, fontFamily: 'sans-serif', fontSize: 13, cellPadding: 0, altRowColor: '#f5f5f5' } },
    basicInfo: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 2, fontSize: 16 } }, 
    attendance: { ...defaultDesignV3, table: { ...defaultDesignV3.table, cellPadding: 4, fontSize: 14 } }, 
    teachersTimetableSummary: { ...defaultDesignV3, header: { ...defaultDesignV3.header, showDate: false }, table: { ...defaultDesignV3.table, cellPadding: 2, fontSize: 10, headerFontSize: 12 }, page: { ...defaultDesignV3.page, orientation: 'landscape' } },
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
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] transition-opacity" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-4 text-center text-[var(--text-primary)]">{title}</h3>
        <div className="text-center text-[var(--text-secondary)] mb-8 max-h-60 overflow-y-auto">{message}</div>
        <div className="flex justify-center gap-4"><button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.cancel}</button><button onClick={() => { onConfirm(); onClose(); }} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">{t.delete}</button></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
    const [history, setHistory] = useState<UserData[]>([defaultUserData]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>('teacher');
    const [canEditGlobal, setCanEditGlobal] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [remoteSessions, setRemoteSessions] = useState<TimetableSession[]>([]);
    const [isLoadingRemote, setIsLoadingRemote] = useState(false);
    const [currentTimetableSessionId, setCurrentTimetableSessionId] = useState<string | null>(() => localStorage.getItem('mrtimetable_currentTimetableSessionId'));
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [dataEntryTab, setDataEntryTab] = useState<DataEntryTab>('teacher');
    const [classTimetableSelection, setClassTimetableSelection] = useState<{ classId: string | null; highlightedTeacherId: string; }>({ classId: null, highlightedTeacherId: '' });
    const [teacherTimetableSelection, setTeacherTimetableSelection] = useState<{ teacherId: string | null }>({ teacherId: null });
    const [adjustmentsSelection, setAdjustmentsSelection] = useState<{ date: string; teacherIds: string[]; }>({ date: new Date().toISOString().split('T')[0], teacherIds: [] });
    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: React.ReactNode; }>({ isOpen: false, onConfirm: () => {}, title: '', message: '' });
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
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [customFontsData, setCustomFontsData] = useState<Record<string, string>>({});
    const userData = history[historyIndex] || defaultUserData;

    const [theme, setTheme] = useState<Theme>(() => {
        let savedTheme = localStorage.getItem('mrtimetable_theme') as any;
        if (savedTheme === 'high-contrast') savedTheme = 'light'; // Fallback
        if (savedTheme === 'custom') savedTheme = 'light'; 
        if (!['light', 'dark', 'mint', 'amoled', 'system'].includes(savedTheme)) savedTheme = 'light';
        return (savedTheme as Theme) || 'light';
    });

    // Consolidate Theme Resolution
    const resolveTheme = useCallback((t: Theme): 'light' | 'dark' | 'mint' | 'amoled' => {
        if (t === 'system') {
            try {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } catch (e) {
                return 'light'; // Fallback
            }
        }
        return t as any;
    }, []);

    // Track the actual effective theme
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'mint' | 'amoled'>(() => resolveTheme(theme));

    const [themeColors, setThemeColors] = useState<ThemeColors>(() => {
        const activeTheme = resolveTheme(theme);
        const saved = localStorage.getItem(`mrtimetable_themeColors_${activeTheme}`);
        return saved ? JSON.parse(saved) : THEME_PRESETS[activeTheme as keyof typeof THEME_PRESETS];
    });

    // Listen for system theme changes & update resolution
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const updateTheme = () => {
            if (theme === 'system') {
                const newResolved = mq.matches ? 'dark' : 'light';
                setResolvedTheme(newResolved);
                
                const saved = localStorage.getItem(`mrtimetable_themeColors_${newResolved}`);
                setThemeColors(saved ? JSON.parse(saved) : THEME_PRESETS[newResolved]);
            } else {
                setResolvedTheme(theme as any);
            }
        };

        mq.addEventListener('change', updateTheme);
        // Only run if system is active to avoid resetting user choice on mount
        if (theme === 'system') updateTheme(); 
        return () => mq.removeEventListener('change', updateTheme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('mrtimetable_theme', newTheme);
        
        let targetTheme = newTheme;
        if (newTheme === 'system') {
            targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        const saved = localStorage.getItem(`mrtimetable_themeColors_${targetTheme}`);
        setThemeColors(saved ? JSON.parse(saved) : THEME_PRESETS[targetTheme as keyof typeof THEME_PRESETS]);
    };

    const handleColorChange = (key: keyof ThemeColors, value: string) => {
        setThemeColors(prev => {
            const newColors = { ...prev, [key]: value };
            // Save to the currently ACTIVE theme slot (the resolved one)
            localStorage.setItem(`mrtimetable_themeColors_${resolvedTheme}`, JSON.stringify(newColors));
            return newColors;
        });
    };

    const resetThemeColors = () => {
        const defaults = THEME_PRESETS[resolvedTheme];
        setThemeColors(defaults);
        localStorage.removeItem(`mrtimetable_themeColors_${resolvedTheme}`);
    };

    useEffect(() => {
        import('idb-keyval').then(({ get, set }) => {
            get<UserData>('mrtimetable_userData').then(async (saved) => {
                let dataToLoad: UserData;
                const backupSaved = localStorage.getItem('mrtimetable_userData_backup');
                if (backupSaved) {
                    try {
                        dataToLoad = JSON.parse(backupSaved);
                        localStorage.removeItem('mrtimetable_userData_backup');
                    } catch (e) {
                        dataToLoad = saved || defaultUserData;
                    }
                } else if (!saved) {
                    const localSaved = localStorage.getItem('mrtimetable_userData');
                    try { 
                        dataToLoad = localSaved ? JSON.parse(localSaved) : defaultUserData; 
                    } catch (e) { 
                        dataToLoad = defaultUserData; 
                    }
                    if (localSaved) {
                        try { localStorage.removeItem('mrtimetable_userData'); } catch (e) {}
                    }
                } else {
                    dataToLoad = saved;
                }
                
                // Data Fixes (Unchanged)
                if (!dataToLoad.schoolConfig.daysConfig) dataToLoad.schoolConfig.daysConfig = defaultUserData.schoolConfig.daysConfig;
                if (!dataToLoad.schoolConfig.periodTimings) dataToLoad.schoolConfig.periodTimings = defaultUserData.schoolConfig.periodTimings;
                if (!dataToLoad.schoolConfig.breaks) dataToLoad.schoolConfig.breaks = defaultUserData.schoolConfig.breaks;
                if (!dataToLoad.schoolConfig.assembly) dataToLoad.schoolConfig.assembly = defaultUserData.schoolConfig.assembly;
                if (!dataToLoad.schoolConfig.downloadDesigns.workload) dataToLoad.schoolConfig.downloadDesigns.workload = defaultUserData.schoolConfig.downloadDesigns.workload;
                if (!dataToLoad.schoolConfig.downloadDesigns.adjustments) dataToLoad.schoolConfig.downloadDesigns.adjustments = defaultDownloadDesigns.adjustments;
                if (!dataToLoad.schoolConfig.downloadDesigns.attendance) dataToLoad.schoolConfig.downloadDesigns.attendance = defaultDownloadDesigns.attendance;
                
                // ... (existing fixes)
                if (dataToLoad.schoolConfig.downloadDesigns.alternative.table.verticalAlign === undefined) dataToLoad.schoolConfig.downloadDesigns.alternative.table.verticalAlign = 'middle';
                
                // Font Migration: Extract data from schoolConfig.customFonts to separate store
                const fontsWithData = dataToLoad.schoolConfig.customFonts?.filter(f => f.data);
                if (fontsWithData && fontsWithData.length > 0) {
                    const newFontsData: Record<string, string> = {};
                    const currentFontsStore = await get<Record<string, string>>('mrtimetable_customFontsData') || {};
                    
                    fontsWithData.forEach(f => {
                        newFontsData[f.id] = f.data;
                        // Remote data from metadata to keep UserData slim
                        delete (f as any).data;
                    });
                    
                    const mergedFontsData = { ...currentFontsStore, ...newFontsData };
                    await set('mrtimetable_customFontsData', mergedFontsData);
                    setCustomFontsData(mergedFontsData);
                    
                    // Save the slimmed down UserData back to IDB immediately
                    await set('mrtimetable_userData', dataToLoad);
                } else {
                    // background load fonts if they were already split
                    get<Record<string, string>>('mrtimetable_customFontsData').then(fonts => {
                        if (fonts) setCustomFontsData(fonts);
                    });
                }

                if (dataToLoad.schoolConfig.downloadDesigns.schoolTimings) {
                     const st = dataToLoad.schoolConfig.downloadDesigns.schoolTimings;
                     if (st.table.periodColumnBgColor === '#f1f5f9') {
                        st.table.periodColumnBgColor = '#86efac';
                     }
                     if (st.header.schoolName.fontFamily === ('Roboto' as any) && st.header.schoolName.fontSize === 24) {
                         st.header.schoolName.fontFamily = 'sans-serif';
                         st.header.schoolName.fontSize = 51;
                     }
                     if (!st.table.borderWidth || st.table.borderWidth === 1) {
                         st.table.borderWidth = 3;
                     }
                     if (!st.table.headerFontSize || st.table.headerFontSize < 44) {
                         st.table.headerFontSize = 44;
                     }
                     if (st.table.fontSize === 34) {
                         st.table.fontSize = 32;
                     }
                     if (!st.table.fontSize || st.table.fontSize < 32) {
                         st.table.fontSize = 32;
                     }
                }

                if (dataToLoad.schoolConfig.schoolLogoBase64 === transparentPixel) {
                    dataToLoad.schoolConfig.schoolLogoBase64 = null;
                }

                dataToLoad.timetableSessions.forEach(session => {
                    const sc = dataToLoad.schoolConfig;
                    session.subjects = session.subjects || [];
                    session.teachers = session.teachers || [];
                    session.classes = session.classes || [];
                    session.jointPeriods = session.jointPeriods || [];
                    session.leaveDetails = session.leaveDetails || {};
                    session.adjustments = session.adjustments || {};
                    session.daysConfig = session.daysConfig || sc.daysConfig;
                    session.periodTimings = session.periodTimings || sc.periodTimings;
                    session.breaks = session.breaks || sc.breaks;
                    session.assembly = session.assembly || sc.assembly;
                    session.vacations = session.vacations || [];
                    session.changeLogs = session.changeLogs || [];
                    
                    session.classes.forEach(c => {
                        if (!c.timetable) {
                            c.timetable = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
                            allDays.forEach(day => { c.timetable[day] = Array.from({ length: 8 }, () => []); });
                        } else if (!c.timetable.Saturday) {
                            c.timetable.Saturday = Array.from({ length: 8 }, () => []);
                        }
                        if (!c.subjects || !Array.isArray(c.subjects)) c.subjects = [];
                    });
                });
                
                setHistory([dataToLoad]);
                setHistoryIndex(0);
                setIsUserDataLoaded(true);
            }).catch((err) => {
                console.error("Failed to load user data from IDB", err);
                setHistory([defaultUserData]);
                setHistoryIndex(0);
                setIsUserDataLoaded(true);
            });
        });
    }, []);

    const fetchSessions = useCallback(async (userId: string, email: string) => {
        setIsLoadingRemote(true);
        try {
            const emailLower = email.toLowerCase();
            
            // First, get sessions owned by user (My Creations)
            const { data: owned, error: ownedError } = await supabase
                .from('timetables')
                .select('*')
                .eq('created_by', emailLower);
            
            if (ownedError) throw ownedError;

            // Second, get sessions shared with the user (Shared with Me)
            const { data: shared, error: sharedError } = await supabase
                .from('timetables')
                .select('*')
                .neq('created_by', emailLower)
                .contains('teacher_email', [emailLower]);

            if (sharedError) {
                console.warn('Shared sessions fetch error:', sharedError.message);
            }

            const allRemote = [
                ...(owned || []).map(s => ({ ...s.data, id: s.id, ownerId: s.created_by, isShared: false, allowEdit: s.allow_edit })),
                ...(shared || []).map(s => ({ ...s.data, id: s.id, ownerId: s.created_by, isShared: true, allowEdit: s.allow_edit }))
            ];
            setRemoteSessions(allRemote);
        } catch (err) {
            console.error('Failed to fetch remote sessions:', err);
        } finally {
            setIsLoadingRemote(false);
        }
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Session retrieval error:', error.message);
                    if (error.message.includes('Refresh Token') || error.message.includes('not found')) {
                        await supabase.auth.signOut();
                    }
                }

                if (session?.user) {
                    const email = session.user.email || null;
                    setUserEmail(email);
                    setUserId(session.user.id);
                    setIsAuthModalOpen(false);
                    
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, can_edit, default_session_id')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (profile) {
                        setUserRole(profile.role as UserRole);
                        setCanEditGlobal(!!profile.can_edit);
                        if (profile.default_session_id) {
                            setCurrentTimetableSessionId(profile.default_session_id);
                        }
                    }

                    if (email) {
                        fetchSessions(session.user.id, email);
                    }
                } else {
                    setUserRole('teacher'); 
                    setUserEmail(null);
                    setIsAuthModalOpen(true);
                }
            } catch (err) {
                console.error('Auth verification failed:', err);
                setUserRole('teacher');
                setUserEmail(null);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
                setUserRole('teacher');
                setUserEmail(null);
                setUserId(null);
                setIsAuthModalOpen(true);
            } else if (session?.user) {
                setUserEmail(session.user.email || null);
                setUserId(session.user.id);
                setIsAuthModalOpen(false);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, can_edit')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) {
                    setUserRole(profile.role as UserRole);
                    setCanEditGlobal(!!profile.can_edit);
                }
            } else {
                setUserRole('teacher');
                setCanEditGlobal(false);
                setUserEmail(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);
    
    useEffect(() => {
        const handleSaveOnUnload = () => {
            // Use synchronous local storage as backup if IDB fails or is async
            localStorage.setItem('mrtimetable_save_pending', 'true');
        };
        window.addEventListener('beforeunload', handleSaveOnUnload);
        return () => window.removeEventListener('beforeunload', handleSaveOnUnload);
    }, [userData]);

    const setUserData = useCallback((action: UserData | ((prev: UserData) => UserData)) => {
        const newData = typeof action === 'function' ? action(userData) : action;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newData);
        
        // Optimize history for large data (fonts)
        const maxHistory = (newData.schoolConfig.customFonts?.length || 0) > 0 ? 5 : 20;
        if (newHistory.length > maxHistory) newHistory.shift();
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [userData, history, historyIndex]);

    useEffect(() => {
        if (!userId || !userEmail) return;

        const emailLower = userEmail.toLowerCase();

        const channel = supabase
            .channel('public:timetables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'timetables' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const newSessionDoc = payload.new as any;
                    const sessionData = newSessionDoc.data as TimetableSession;
                    if (!sessionData || !sessionData.id) return;
                    
                    const isOwner = newSessionDoc.created_by === emailLower;
                    const isShared = Array.isArray(newSessionDoc.teacher_email) && newSessionDoc.teacher_email.includes(emailLower);
                    
                    if (isOwner || isShared) {
                        const parsedSession = {
                            ...sessionData,
                            id: newSessionDoc.id,
                            ownerId: newSessionDoc.created_by,
                            isShared: !isOwner,
                            allowEdit: newSessionDoc.allow_edit
                        };
                        
                        setRemoteSessions(prev => {
                            const exists = prev.some(s => s.id === parsedSession.id);
                            if (exists) {
                                return prev.map(s => s.id === parsedSession.id ? parsedSession : s);
                            } else {
                                return [...prev, parsedSession];
                            }
                        });
                        
                        // We also need to update the currently loaded data if it's the exact same session being updated by someone else
                        setUserData(prev => {
                            const localIndex = prev.timetableSessions.findIndex(s => s.id === parsedSession.id);
                            if (localIndex !== -1) {
                                // If the incoming update has a different lastSyncAt (meaning it came from someone else), we apply it
                                // to avoid completely overwriting local unsaved changes, one might check timestamp, but a simple overwrite is asked here.
                                const newSessions = [...prev.timetableSessions];
                                newSessions[localIndex] = parsedSession;
                                return { ...prev, timetableSessions: newSessions };
                            } else if (isShared) {
                                // automatically load shared sessions into local data
                                return { ...prev, timetableSessions: [...prev.timetableSessions, parsedSession] };
                            }
                            return prev;
                        });
                    }
                } else if (payload.eventType === 'DELETE') {
                    const deletedSessionItem = payload.old as any;
                    setRemoteSessions(prev => prev.filter(s => s.id !== deletedSessionItem.id));
                    setUserData(prev => {
                        const localIndex = prev.timetableSessions.findIndex(s => s.id === deletedSessionItem.id);
                        if (localIndex !== -1) {
                            return { ...prev, timetableSessions: prev.timetableSessions.filter(s => s.id !== deletedSessionItem.id) };
                        }
                        return prev;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, userEmail, setUserData]);

    const handleSetDefaultSession = async (sessionId: string) => {
        setCurrentTimetableSessionId(sessionId);
        localStorage.setItem('mrtimetable_currentTimetableSessionId', sessionId);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await supabase
                .from('profiles')
                .update({ default_session_id: sessionId })
                .eq('id', session.user.id);
        }
    };

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

    const t = translations[language];

    useEffect(() => {
        // Use resolvedTheme (light/dark/etc) for classes
        document.documentElement.className = resolvedTheme;
        
        const { bgPrimary, bgSecondary, textPrimary, accentPrimary } = themeColors;
        
        // Use colord for accurate luminosity-based shifts
        const bg = colord(bgPrimary);
        const isLight = bg.isLight();
        const contrastShift = isLight ? 60 : -60;
        
        const textSecondary = adjustColor(textPrimary, contrastShift); 
        const textPlaceholder = adjustColor(textPrimary, isLight ? 100 : -100);
        const bgTertiary = adjustColor(bgSecondary, isLight ? -5 : 10);
        const borderPrimary = adjustColor(bgSecondary, isLight ? -20 : 20);
        const borderSecondary = adjustColor(bgSecondary, isLight ? -10 : 15);
        const accentPrimaryHover = adjustColor(accentPrimary, -20);
        const accentSecondary = hexToRgba(accentPrimary, 0.1);
        const accentSecondaryHover = hexToRgba(accentPrimary, 0.15);
        const accentText = colord(accentPrimary).isDark() ? '#ffffff' : '#000000'; 
        const slotAvailableBg = hexToRgba(accentPrimary, 0.1);
        const slotConflictBg = 'rgba(239, 68, 68, 0.15)'; 
        const slotDisabledBg = bgTertiary;

        const styleId = 'dynamic-theme-styles';
        let style = document.getElementById(styleId);
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }

        style.innerHTML = `
            :root {
                --theme-mode: "${resolvedTheme}";
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
    }, [resolvedTheme, themeColors]);

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
        localStorage.setItem('mrtimetable_appFont', appFont);
        const styleId = 'global-app-font-style';
        let style = document.getElementById(styleId);
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
        
        style.innerHTML = `:root { --font-app-primary: ${appFont ? `'${appFont}', sans-serif` : 'sans-serif'}; } body { font-family: var(--font-app-primary); } button, input, select, textarea { font-family: var(--font-app-primary); }`;
    }, [appFont]);

    useEffect(() => {
        const customFonts = userData.schoolConfig.customFonts;
        if (!customFonts || customFonts.length === 0) return;

        const styleId = 'custom-fonts-style';
        let styleNode = document.getElementById(styleId);
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = styleId;
            document.head.appendChild(styleNode);
        }

        // Only update if the number of fonts or their IDs change OR data becomes available
        const currentFontIds = customFonts.map(f => f.id).join(',');
        const availableDataIds = Object.keys(customFontsData).join(',');
        const cacheKey = `${currentFontIds}|${availableDataIds}`;
        
        if (styleNode.getAttribute('data-cache-key') === cacheKey) return;
        
        styleNode.setAttribute('data-cache-key', cacheKey);

        const cssRules = customFonts.map(font => {
            const fontData = customFontsData[font.id];
            if (!fontData) return ''; // Skip if data not loaded yet
            
            const format = font.type === 'ttf' ? 'truetype' : 
                          font.type === 'otf' ? 'opentype' : 
                          font.type === 'woff' ? 'woff' : 
                          font.type === 'woff2' ? 'woff2' : font.type;
            return `
                @font-face {
                    font-family: '${font.name}';
                    src: url('${fontData}') format('${format}');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                }
            `;
        }).filter(Boolean).join('\n');

        styleNode.innerHTML = cssRules;
    }, [userData.schoolConfig.customFonts, customFontsData]);
    
    useEffect(() => {
        if (!isUserDataLoaded) return;
        const syncFonts = async () => {
            const { get } = await import('idb-keyval');
            const fontsData = await get<Record<string, string>>('mrtimetable_customFontsData');
            if (fontsData) {
                setCustomFontsData(fontsData);
            }
        };
        syncFonts();
    }, [userData.schoolConfig.customFonts, isUserDataLoaded]);
    
    useEffect(() => {
        if (!isUserDataLoaded) return;
        
        const saveToStorage = async () => {
            try {
                const { set } = await import('idb-keyval');
                await set('mrtimetable_userData', userData);
            } catch (e) {
                console.error('Storage quota exceeded or error:', e);
                if (e instanceof Error && e.message.includes('Quota')) {
                    alert("Storage limit exceeded. Try deleting custom fonts or using smaller font files.");
                }
            }
        };

        const timer = setTimeout(saveToStorage, 1000);
        return () => clearTimeout(timer);
    }, [userData, isUserDataLoaded]);

    useEffect(() => {
        const handleSaveOnUnload = () => {
            try {
                // In case they close before debounce finishes, save synchronously
                localStorage.setItem('mrtimetable_userData_backup', JSON.stringify(userData));
            } catch (e) {
                // Quota exceeded, ignore
            }
        };
        window.addEventListener('beforeunload', handleSaveOnUnload);
        return () => window.removeEventListener('beforeunload', handleSaveOnUnload);
    }, [userData]);
    useEffect(() => { if (currentTimetableSessionId) localStorage.setItem('mrtimetable_currentTimetableSessionId', currentTimetableSessionId); else localStorage.removeItem('mrtimetable_currentTimetableSessionId'); }, [currentTimetableSessionId]);
    useEffect(() => { if (userData.timetableSessions.length > 0) { const sessionExists = userData.timetableSessions.some(s => s.id === currentTimetableSessionId); if (!sessionExists) setCurrentTimetableSessionId(userData.timetableSessions[0].id); } else { if (currentTimetableSessionId !== null) setCurrentTimetableSessionId(null); } }, [userData, currentTimetableSessionId]);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const validateSessionData = (session: TimetableSession): boolean => {
        // Basic structure check
        if (!session || !session.id || !session.name) return false;
        // Be lenient so that even if arrays are missing it will sync
        return true;
    };

    const handleSaveToCloud = useCallback(async (session: TimetableSession) => {
        if (!userId || !userEmail) return;

        // Validation: Basic sanity check
        if (!session.name || session.name.trim() === '') {
            console.warn('Cannot save session without a name');
            return;
        }

        if (!validateSessionData(session)) {
            console.error('Invalid session data. Sync aborted.');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 5000);
            return;
        }

        // Ensure current user has permission
        const emailLower = userEmail.toLowerCase();
        const isOwner = session.ownerId === userId || session.ownerId === userEmail;
        const allowEdit = (session as any).allowEdit === true;
        
        // If it's a known cloud session and the user has no rights, block it
        if (session.ownerId && !isOwner && !(session.isShared && allowEdit)) {
             console.error('Permission denied: You do not have permission to sync this session to the cloud.');
             setSaveStatus('error');
             return;
        }

        const updatedSession: any = { 
            ...session, 
            ownerId: session.ownerId || userEmail,
            updatedBy: userEmail,
            lastSyncAt: new Date().toISOString()
        };

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const teacherEmails = updatedSession.teachers?.map((t: any) => t.email).filter(Boolean) || [];

            const { error } = await supabase
                .from('timetables')
                .upsert({
                    id: updatedSession.id,
                    created_by: updatedSession.ownerId === userId ? userEmail : updatedSession.ownerId, // Migrate old UUIDs to email
                    teacher_email: teacherEmails,
                    allow_edit: updatedSession.allowEdit || false,
                    data: updatedSession
                });
            
            if (error) throw error;
            
            // Sync augmented state back to local so UI sees auto-added admins
            setUserData(prev => ({
                ...prev,
                timetableSessions: prev.timetableSessions.map(s => s.id === updatedSession.id ? updatedSession : s)
            }));

            setSaveStatus('success');
            // Notification is handled by the state which is passed to HomePage
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Failed to sync session to cloud:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 5000);
        } finally {
            setIsSaving(false);
        }
    }, [userId, userEmail, userData.schoolConfig.schoolNameEn]);

    useEffect(() => {
        if (!isUserDataLoaded || !userId || !currentTimetableSessionId) return;

        // Automatically sync to cloud if it's the user's session or they are session admin
        const syncToCloud = async () => {
            const session = userData.timetableSessions.find(s => s.id === currentTimetableSessionId);
            if (!session) return;
            
            const isOwner = session.ownerId === userId;
            const isSessAdmin = session.admins?.some(email => email.toLowerCase() === (userEmail?.toLowerCase() || ''));
            
            if (isOwner || isSessAdmin) {
                handleSaveToCloud(session);
            }
        };

        const timer = setTimeout(syncToCloud, 1000); // 1s sync for live updates
        return () => clearTimeout(timer);
    }, [userData, currentTimetableSessionId, userId, userEmail, isUserDataLoaded, handleSaveToCloud]);

    const handleSetCurrentTimetableSessionId = useCallback(async (id: string | null) => {
        setCurrentTimetableSessionId(id);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && id) {
            await supabase
                .from('profiles')
                .update({ default_session_id: id })
                .eq('id', session.user.id);
        }
    }, []);

    const allSessions = useMemo(() => {
        const local = userData.timetableSessions;
        // Filter out remote sessions that are already in local by ID to avoid duplicates
        const filteredRemote = remoteSessions.filter(rs => !local.some(ls => ls.id === rs.id));
        return [...local, ...filteredRemote];
    }, [userData.timetableSessions, remoteSessions]);

    const filteredUserData = useMemo(() => {
        const userEmailLower = userEmail?.toLowerCase() || '';
        
        // If user is a global DB admin OR has global edit permission, show everything with full edit rights
        if (userRole === 'admin' || canEditGlobal) {
            return {
                ...userData,
                timetableSessions: allSessions.map(s => ({ ...s, canEdit: true, isAdmin: true }))
            };
        }

        const filteredSessions = allSessions.map(session => {
            const isLocalUnowned = !session.ownerId && !session.isShared;
            const isOwner = (userId && session.ownerId === userId) || isLocalUnowned;
            const isSessionAdmin = session.admins?.some(email => email.toLowerCase() === userEmailLower);
            const isSessionEditor = session.editors?.some(email => email.toLowerCase() === userEmailLower);
            const isTeacher = session.teachers?.some(t => t.email?.toLowerCase() === userEmailLower);
            const userPerms = session.userPermissions?.[userEmailLower];

            // Access Level Determination
            const hasFullControl = isOwner || isSessionAdmin;
            const hasEditAccess = hasFullControl || isSessionEditor || !!userPerms?.canEditTimetable;

            // If user has no relation to this session, check if it's public/discoverable (assume shared for now)
            if (!isOwner && !isSessionAdmin && !isSessionEditor && !isTeacher) {
                return { 
                    ...session, 
                    subjects: [], 
                    teachers: [], 
                    classes: [], 
                    jointPeriods: [],
                    adjustments: {},
                    isRestricted: true,
                    canEdit: false,
                    isAdmin: false 
                };
            }

            return { 
                ...session, 
                isAdmin: hasFullControl,
                canEdit: hasEditAccess,
                isShared: !isOwner
            };
        });

        return {
            ...userData,
            timetableSessions: filteredSessions
        };
    }, [userData, userRole, canEditGlobal, userEmail, allSessions, userId]);

    const currentTimetableSession = useMemo(() => filteredUserData.timetableSessions.find(s => s.id === currentTimetableSessionId) || null, [filteredUserData, currentTimetableSessionId]);
    const effectiveSchoolConfig = useMemo(() => { if (!currentTimetableSession) return userData.schoolConfig; return { ...userData.schoolConfig, daysConfig: currentTimetableSession.daysConfig || userData.schoolConfig.daysConfig, periodTimings: currentTimetableSession.periodTimings || userData.schoolConfig.periodTimings, breaks: currentTimetableSession.breaks || userData.schoolConfig.breaks, assembly: currentTimetableSession.assembly || userData.schoolConfig.assembly }; }, [userData.schoolConfig, currentTimetableSession]);

    const openConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void) => { setConfirmationState({ isOpen: true, title, message, onConfirm }); };
    const updateCurrentSession = useCallback((updater: (session: TimetableSession) => TimetableSession) => { if (!currentTimetableSessionId) return; setUserData(prev => { const newSessions = prev.timetableSessions.map(session => session.id === currentTimetableSessionId ? updater(session) : session); return { ...prev, timetableSessions: newSessions }; }); }, [currentTimetableSessionId, setUserData]);

    const handleCreateTimetableSession = (name: string, startDate: string, endDate: string, schoolNameEn?: string, schoolNameUr?: string, schoolLogo?: string | null) => { 
        const newSession: TimetableSession = { 
            id: generateUniqueId(), 
            name, 
            startDate, 
            endDate, 
            subjects: [], 
            teachers: [], 
            classes: [], 
            jointPeriods: [], 
            adjustments: {}, 
            leaveDetails: {}, 
            daysConfig: userData.schoolConfig.daysConfig, 
            periodTimings: userData.schoolConfig.periodTimings, 
            breaks: userData.schoolConfig.breaks, 
            assembly: userData.schoolConfig.assembly, 
            vacations: [], 
            changeLogs: [],
            admins: [], // Initial empty admins list
            ownerId: userId || undefined,
            schoolName: schoolNameEn || userData.schoolConfig.schoolNameEn
        }; 

        setUserData(prev => {
            const nextState = { 
                ...prev, 
                timetableSessions: [...prev.timetableSessions, newSession] 
            };
            if (schoolNameEn) {
                nextState.schoolConfig = {
                    ...nextState.schoolConfig,
                    schoolNameEn,
                    schoolNameUr: schoolNameUr || nextState.schoolConfig.schoolNameUr,
                    schoolLogoBase64: schoolLogo !== undefined ? schoolLogo : nextState.schoolConfig.schoolLogoBase64
                };
            }
            return nextState;
        });

        setCurrentTimetableSessionId(newSession.id);
        
        // Save new session to cloud immediately to trigger sync
        handleSaveToCloud(newSession);
    };
    const handleUpdateTimetableSession = (id: string, name: string, startDate: string, endDate: string) => { 
        setUserData(prev => {
            const updatedSessions = prev.timetableSessions.map(s => s.id === id ? { ...s, name, startDate, endDate } : s);
            const session = updatedSessions.find(s => s.id === id);
            if (session) {
                handleSaveToCloud(session);
            }
            return { ...prev, timetableSessions: updatedSessions };
        }); 
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
            // Also try to delete from backend if it was the user's session
            const sessionToDelete = userData.timetableSessions.find(s => s.id === id);
            if (sessionToDelete && sessionToDelete.ownerId === userId) {
                handleDeleteSessionFromBackend(sessionToDelete);
            }
        }); 
    };
    
    const handleDeleteSessionFromBackend = async (session: TimetableSession) => {
        const confirmDelete = async () => {
            try {
                // Remove from local and remote state first for snappiness
                setRemoteSessions(prev => prev.filter(s => s.id !== session.id));
                setUserData(prev => ({
                    ...prev,
                    timetableSessions: prev.timetableSessions.filter(s => s.id !== session.id)
                }));
                
                if (currentTimetableSessionId === session.id) {
                    setCurrentTimetableSessionId(null);
                    // Also nullify in profile if it was the default
                    await supabase
                        .from('profiles')
                        .update({ default_session_id: null })
                        .eq('id', userId)
                        .eq('default_session_id', session.id);
                }

                const { error, count } = await supabase
                    .from('timetables')
                    .delete({ count: 'exact' })
                    .eq('id', session.id);
                
                if (error) {
                    throw new Error(error.message || 'Unknown Supabase error');
                }
                
                const isOwner = session.ownerId === userId || session.ownerId === userEmail;
                if (count === 0 && !isOwner) {
                    throw new Error('Deletion failed. You may not be the owner of this session or it does not exist online.');
                }
                
            } catch (err: any) {
                console.error('Failed to delete session from backend:', err);
                alert(`Session removed locally, but we encountered a cloud synchronization error: ${err.message || 'Unknown error'}`);
            }
        };

        const downloadBackup = () => {
            const dataStr = JSON.stringify(session);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${session.name}_backup.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };

        openConfirmation(
            t.delete || 'Delete Session',
            <div className="space-y-4">
                <p>{t.areYouSure || 'Are you sure you want to delete this session from online storage?'}</p>
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-secondary)]">
                    <p className="text-xs font-bold uppercase mb-2">Recommendation</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); downloadBackup(); }}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Download Backup Before Deleting
                    </button>
                </div>
            </div>,
            confirmDelete
        );
    };

    const handleUploadTimetableSession = async (session: TimetableSession, newSchoolConfig?: Partial<SchoolConfig>) => { 
        if (!session.daysConfig) session.daysConfig = userData.schoolConfig.daysConfig; 
        if (!session.periodTimings) session.periodTimings = userData.schoolConfig.periodTimings; 
        if (!session.breaks) session.breaks = userData.schoolConfig.breaks; 
        if (!session.assembly) session.assembly = userData.schoolConfig.assembly; 
        if (!session.vacations) session.vacations = [];
        if (!session.changeLogs) session.changeLogs = [];
        
        // Ensure imported JSON becomes a new independent session owned by the current user
        // This prevents RLS errors and overwriting someone else's timetable in the cloud
        const sessionWithId = { 
            ...session, 
            id: generateUniqueId(),
            ownerId: userEmail || undefined,
            isShared: false
        };

        // Add user as admin if they are uploading
        if (userEmail) {
            const admins = sessionWithId.admins || [];
            if (!admins.some(email => email.toLowerCase() === userEmail.toLowerCase())) {
                sessionWithId.admins = [...admins, userEmail.toLowerCase()];
            }
        }

        // Local Update
        setUserData(prev => { 
            const sessionExists = prev.timetableSessions.some(s => s.id === sessionWithId.id); 
            const newSessions = sessionExists ? prev.timetableSessions.map(s => s.id === sessionWithId.id ? sessionWithId : s) : [...prev.timetableSessions, sessionWithId]; 
            const nextState = { ...prev, timetableSessions: newSessions };
            if (newSchoolConfig) { nextState.schoolConfig = { ...nextState.schoolConfig, ...newSchoolConfig }; }
            return nextState; 
        }); 

        // Automatically sync uploaded session to the cloud so rules & triggers apply immediately
        if (userEmail) {
            handleSaveToCloud(sessionWithId);
        }
        setCurrentTimetableSessionId(sessionWithId.id);

        // Backend Update
        handleSaveToCloud(sessionWithId);
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

    const handleRestoreData = async (restoredUserData: UserData, fontData?: Record<string, string>) => {
        if (fontData) {
            const { set } = await import('idb-keyval');
            await set('mrtimetable_customFontsData', fontData);
            setCustomFontsData(fontData);
        }
        
        // Ensure restored sessions are owned by the current user so they can be deleted/synced properly
        const sanitizedData = { ...restoredUserData };
        if (sanitizedData.timetableSessions) {
            sanitizedData.timetableSessions = sanitizedData.timetableSessions.map(session => ({
                ...session,
                ownerId: userEmail || userId || undefined,
                isShared: false
            }));
        }
        
        setUserData(sanitizedData);
    };

    const handleDeleteSubject = useCallback((subjectId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== subjectId) }))), [t, updateCurrentSession]);
    const handleDeleteTeacher = useCallback((teacherId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, teachers: s.teachers.filter(t => t.id !== teacherId) }))), [t, updateCurrentSession]);
    const handleDeleteClass = useCallback((classId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, classes: s.classes.filter(c => c.id !== classId) }))), [t, updateCurrentSession]);
    const handleDeleteJointPeriod = useCallback((jointPeriodId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.filter(jp => jp.id !== jointPeriodId) }))), [t, updateCurrentSession]);
    const handleAddJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: [...s.jointPeriods, jointPeriod] }));
    const handleUpdateJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.map(jp => jp.id === jointPeriod.id ? jointPeriod : jp) }));
    const handleSearchResultClick = (type: 'class' | 'teacher' | 'subject', id: string) => { switch(type) { case 'class': setClassTimetableSelection({ classId: id, highlightedTeacherId: '' }); setCurrentPage('classTimetable'); break; case 'teacher': setTeacherTimetableSelection({ teacherId: id }); setCurrentPage('teacherTimetable'); break; case 'subject': setDataEntryTab('subject'); setCurrentPage('dataEntry'); break; } };

    const historyProps = { onUndo: handleUndo, onRedo: handleRedo, onSave: handleSave, canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1 };

    const handleSignOut = async () => {
        try {
            // First clear all local state to make the UI update immediately
            setUserId(null);
            setUserEmail(null);
            setUserRole('teacher');
            setRemoteSessions([]);
            setCurrentTimetableSessionId(null);
            
            // Clear localStorage keys related to sessions and auth
            localStorage.removeItem('mrtimetable_currentTimetableSessionId');
            
            // Specifically clear supabase auth tokens to be sure
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });

            setIsAuthModalOpen(true);

            // Attempt to sign out from supabase but don't let it block the redirect if it's slow
            // We use a Promise.race or just fire and forget if it's not critical, 
            // but usually we want to try for at least a short bit.
            try {
                await Promise.race([
                    supabase.auth.signOut(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 2000))
                ]);
            } catch (authErr) {
                console.warn('Supabase sign out error or timeout:', authErr);
            }
            
            // Full reload to clear any remaining in-memory caches or leakages
            window.location.replace(window.location.origin);
        } catch (err) {
            console.error('Sign out failed:', err);
            // Even on error, try to clear locally and reload
            localStorage.clear();
            window.location.replace(window.location.origin);
        }
    };

    const isSessionAdmin = useMemo(() => {
        if (userRole === 'admin' || canEditGlobal) return true; // Global Database Admin or Global Editor
        if (!currentTimetableSession) return true; // Local session with no data yet
        if (userId && currentTimetableSession.ownerId === userId) return true; // Owner of the session
        
        const userEmailLower = userEmail?.toLowerCase() || '';
        if (currentTimetableSession.ownerId === userEmailLower) return true; // Owner by email
        if (currentTimetableSession.admins?.some(email => email.toLowerCase() === userEmailLower)) return true;
        
        // Dynamic permission from backend table 'allow_edit'
        if ((currentTimetableSession as any).allowEdit === true) return true;
        
        // Granular permissions for administrative actions
        if (currentTimetableSession.userPermissions?.[userEmailLower]?.canManageData) return true;

        // If it's a local session with no ownerId yet, user is admin
        if (!currentTimetableSession.ownerId && !currentTimetableSession.isShared) return true;
        return false;
    }, [userRole, canEditGlobal, currentTimetableSession, userId, userEmail]);

    const effectiveUserRole = isSessionAdmin ? 'admin' : 'teacher';

    const renderPage = () => {
        switch (currentPage) {
            case 'dataEntry': return <DataEntryPage t={t} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} classes={currentTimetableSession?.classes || []} jointPeriods={currentTimetableSession?.jointPeriods || []} onAddSubject={subject => updateCurrentSession(s => ({ ...s, subjects: [...s.subjects, subject] }))} onUpdateSubject={updatedSubject => updateCurrentSession(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === updatedSubject.id ? updatedSubject : sub) }))} onDeleteSubject={handleDeleteSubject} onAddTeacher={teacher => updateCurrentSession(s => ({ ...s, teachers: [...s.teachers, teacher] }))} onUpdateTeacher={updatedTeacher => updateCurrentSession(s => ({ ...s, teachers: s.teachers.map(teach => teach.id === updatedTeacher.id ? updatedTeacher : teach) }))} onDeleteTeacher={handleDeleteTeacher} onSetClasses={handleSetClasses} onDeleteClass={handleDeleteClass} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} activeTab={dataEntryTab} onTabChange={setDataEntryTab} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} currentTimetableSession={currentTimetableSession} onUpdateTimetableSession={updateCurrentSession} openConfirmation={openConfirmation} onOpenSchoolInfo={() => setIsSchoolInfoModalOpen(true)} userData={userData} onRestore={handleRestoreData} userRole={effectiveUserRole} />;
            case 'classTimetable': return <ClassTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} jointPeriods={currentTimetableSession?.jointPeriods || []} adjustments={currentTimetableSession?.adjustments || {}} onSetClasses={handleSetClasses} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selection={classTimetableSelection} onSelectionChange={setClassTimetableSelection} openConfirmation={openConfirmation} hasActiveSession={!!currentTimetableSession} {...historyProps} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} onUpdateTimetableSession={updateCurrentSession} changeLogs={currentTimetableSession?.changeLogs} appFont={appFont} theme={theme} userRole={effectiveUserRole} />;
            case 'teacherTimetable': return <TeacherTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} jointPeriods={currentTimetableSession?.jointPeriods || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} onSetClasses={handleSetClasses} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selectedTeacherId={teacherTimetableSelection.teacherId} onSelectedTeacherChange={(id) => setTeacherTimetableSelection({ teacherId: id })} hasActiveSession={!!currentTimetableSession} {...historyProps} openConfirmation={openConfirmation} onAddJointPeriod={handleAddJointPeriod} onUpdateJointPeriod={handleUpdateJointPeriod} onDeleteJointPeriod={handleDeleteJointPeriod} onUpdateTimetableSession={updateCurrentSession} appFont={appFont} theme={theme} userRole={effectiveUserRole} />;
            case 'alternativeTimetable': return <AlternativeTimetablePage t={t} language={language} classes={currentTimetableSession?.classes || []} subjects={currentTimetableSession?.subjects || []} teachers={currentTimetableSession?.teachers || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} onSetAdjustments={handleSetAdjustments} onSetLeaveDetails={handleSetLeaveDetails} onUpdateSession={updateCurrentSession} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} selection={adjustmentsSelection} onSelectionChange={setAdjustmentsSelection} openConfirmation={openConfirmation} hasActiveSession={!!currentTimetableSession} jointPeriods={currentTimetableSession?.jointPeriods} userRole={effectiveUserRole} />;
            case 'attendance': return <AttendancePage t={t} language={language} classes={currentTimetableSession?.classes || []} currentTimetableSession={currentTimetableSession} onUpdateSession={updateCurrentSession} onUpdateSchoolConfig={handleUpdateSchoolConfig} schoolConfig={effectiveSchoolConfig} userRole={effectiveUserRole} userEmail={userEmail} />;
            case 'settings': {
                return <SettingsPage t={t} language={language} setLanguage={setLanguage} theme={theme} setTheme={handleThemeChange} themeColors={themeColors} onColorChange={handleColorChange} onResetTheme={resetThemeColors} navDesign={navDesign} setNavDesign={setNavDesign} navShape={navShape} setNavShape={setNavShape} navBtnAlphaSelected={navBtnAlphaSelected} setNavBtnAlphaSelected={setNavBtnAlphaSelected} navBtnAlphaUnselected={navBtnAlphaUnselected} setNavBtnAlphaUnselected={setNavBtnAlphaUnselected} navBarAlpha={navBarAlpha} setNavBarAlpha={setNavBarAlpha} navBarColor={navBarColor} setNavBarColor={setNavBarColor} navAnimation={navAnimation} setNavAnimation={setNavAnimation} fontSize={fontSize} setFontSize={setFontSize} appFont={appFont} setAppFont={setAppFont} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} classes={currentTimetableSession?.classes || []} teachers={currentTimetableSession?.teachers || []} subjects={currentTimetableSession?.subjects || []} adjustments={currentTimetableSession?.adjustments || {}} leaveDetails={currentTimetableSession?.leaveDetails} attendance={currentTimetableSession?.attendance || {}} userRole={effectiveUserRole} userEmail={userEmail} onUpdateSession={updateCurrentSession} currentTimetableSession={currentTimetableSession} onDeleteSessionFromBackend={handleDeleteSessionFromBackend} userId={userId} canEditGlobal={canEditGlobal} />;
            }
            case 'home': default: return <HomePage t={t} language={language} setCurrentPage={setCurrentPage} currentTimetableSessionId={currentTimetableSessionId} timetableSessions={filteredUserData.timetableSessions} setCurrentTimetableSessionId={handleSetCurrentTimetableSessionId} onCreateTimetableSession={handleCreateTimetableSession} onUpdateTimetableSession={handleUpdateTimetableSession} onDeleteTimetableSession={handleDeleteTimetableSession}  onDeleteSessionFromBackend={handleDeleteSessionFromBackend} onUploadTimetableSession={handleUploadTimetableSession} schoolConfig={effectiveSchoolConfig} onUpdateCurrentSession={updateCurrentSession} onSearchResultClick={handleSearchResultClick} onUpdateSchoolConfig={handleUpdateSchoolConfig} onOpenSchoolInfo={() => setIsSchoolInfoModalOpen(true)} userRole={effectiveUserRole} userEmail={userEmail} userId={userId} canEditGlobal={canEditGlobal} onSignOut={handleSignOut} onSaveToCloud={handleSaveToCloud} onSetDefaultSession={handleSetDefaultSession} userData={userData} onRestoreData={handleRestoreData} isSaving={isSaving} saveStatus={saveStatus} />;
        }
    };

    if (!isUserDataLoaded) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-primary)] z-50">
                <div className="text-[var(--text-primary)] font-bold animate-pulse text-lg tracking-widest uppercase">Loading Timetable...</div>
            </div>
        );
    }

    return (
        <>
            <ConfirmationModal t={t} isOpen={confirmationState.isOpen} onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} />
            <SchoolInfoModal t={t} isOpen={isSchoolInfoModalOpen} onClose={() => setIsSchoolInfoModalOpen(false)} schoolConfig={effectiveSchoolConfig} onUpdateSchoolConfig={handleUpdateSchoolConfig} />
            {isAuthModalOpen && <LoginModal t={t} onLogin={() => setIsAuthModalOpen(false)} />}

            <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 flex`}>
                <SideNavBar t={t} currentPage={currentPage} setCurrentPage={setCurrentPage} schoolConfig={effectiveSchoolConfig} />
                <div className={`flex-1 flex flex-col min-w-0 ${currentPage === 'home' ? 'pb-0' : 'pb-24'} md:landscape:pb-6 lg:pb-6 md:landscape:pl-32 lg:pl-32`}>
                    <main className={`flex-1 ${currentPage === 'home' ? 'pt-0 px-0' : 'pt-6 lg:pt-8 px-4 lg:px-8'}`}>
                        {renderPage()}
                    </main>
                    
                    <BottomNavBar t={t} currentPage={currentPage} setCurrentPage={setCurrentPage} position="bottom" design={navDesign} shape={navShape} alphaSelected={navBtnAlphaSelected} alphaUnselected={navBtnAlphaUnselected} barAlpha={navBarAlpha} barColor={navBarColor} navAnimation={navAnimation} />
                </div>
            </div>
        </>
    );
};

export default App;
