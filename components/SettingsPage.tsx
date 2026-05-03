
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Language, SchoolConfig, SchoolClass, Teacher, Subject, Adjustment, DownloadDesignConfig, FontFamily, LeaveDetails, AttendanceData } from '../types';
import type { Theme, ThemeColors } from '../App';
import type { NavPosition, NavDesign, NavShape } from '../types';
import { allDays } from '../types';
import PrintPreview from './PrintPreview';
import AdvancedColorPicker, { ColorProperty } from './AdvancedColorPicker';
import { 
  generateBasicInformationHtml, 
  generateBasicInformationExcel, 
  generateByPeriodHtml, 
  generateByPeriodExcel, 
  generateWorkloadSummaryHtml, 
  generateWorkloadSummaryExcel,
  generateSchoolTimingsHtml,
  generateSchoolTimingsExcel,
  generateClassTimetableHtml,
  generateTeacherTimetableHtml,
  generateAdjustmentsReportHtml,
  generateAdjustmentsExcel,
  generateAttendanceReportHtml,
  generateAttendanceReportExcel
} from './reportUtils';

interface SettingsPageProps {
  t: any; 
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeColors: ThemeColors;
  onColorChange: (key: keyof ThemeColors, value: string) => void;
  onResetTheme: () => void;
  navDesign: NavDesign;
  setNavDesign: (design: NavDesign) => void;
  navShape: NavShape;
  setNavShape: (shape: NavShape) => void;
  navBtnAlphaSelected: number;
  setNavBtnAlphaSelected: (val: number) => void;
  navBtnAlphaUnselected: number;
  setNavBtnAlphaUnselected: (val: number) => void;
  navBarAlpha: number;
  setNavBarAlpha: (val: number) => void;
  navBarColor: string;
  setNavBarColor: (val: string) => void;
  navAnimation: boolean;
  setNavAnimation: (val: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  appFont: string;
  setAppFont: (font: string) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newSchoolConfig: Partial<SchoolConfig>) => void;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails?: Record<string, Record<string, LeaveDetails>>; 
  attendance: Record<string, Record<string, AttendanceData>>;
}

const themeOptions: { id: Theme; name: string; colors: [string, string, string] }[] = [
    { id: 'light', name: 'Light', colors: ['#f8fafc', '#6366f1', '#0f172a'] },
    { id: 'dark', name: 'Dark', colors: ['#0f172a', '#8b5cf6', '#f8fafc'] },
    { id: 'mint', name: 'Mint', colors: ['#f0fdfa', '#0d9488', '#042f2e'] },
    { id: 'amoled', name: 'Amoled', colors: ['#000000', '#22d3ee', '#ffffff'] },
];



const appFontOptions = [
    { label: 'System Default', value: '' },
    { label: 'Sans-Serif', value: 'sans-serif' },
    { label: 'Inter', value: 'Inter' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Serif', value: 'serif' },
    { label: 'Jameel Noori Kasheeda (Kishida)', value: 'Jameel Noori Kasheeda' },
    { label: 'Jameel Noori Nastaleeq', value: 'Jameel Noori Nastaleeq' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Bebas Neue', value: 'Bebas Neue' },
    { label: 'Fjalla One', value: 'Fjalla One' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Zeyada', value: 'Zeyada' },
    { label: 'League Gothic', value: 'League Gothic' },
    { label: 'Amatic SC', value: 'Amatic SC' },
    { label: 'Yellowtail', value: 'Yellowtail' },
    { label: 'Instrument Serif', value: 'Instrument Serif' },
    { label: 'Gulzar', value: 'Gulzar' },
    { label: 'Noto Nastaliq Urdu', value: 'Noto Nastaliq Urdu' },
    { label: 'Lateef', value: 'Lateef' },
    { label: 'Rakkas', value: 'Rakkas' },
    { label: 'Reem Kufi', value: 'Reem Kufi' },
    { label: 'Reem Kufi Fun', value: 'Reem Kufi Fun' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Pinyon Script', value: 'Pinyon Script' },
    { label: 'Italianno', value: 'Italianno' },
    { label: 'Alex Brush', value: 'Alex Brush' },
];

const protectedFonts = ['', 'Roboto', 'Inter', 'Fjalla One', 'serif', 'sans-serif', 'Jameel Noori Kasheeda', 'Jameel Noori Nastaleeq'];

const AboutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WhatsAppLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" />
    </svg>
);

const BroadcastIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
);

const LanguageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m4 13l4-16M12 19l2-5M3 10h12M3 15h12" />
  </svg>
);

const ThemeCard: React.FC<{
    id: Theme,
    name: string,
    colors: [string, string, string],
    currentTheme: Theme,
    setTheme: (theme: Theme) => void,
}> = ({ id, name, colors, currentTheme, setTheme }) => {
    const isSelected = id === currentTheme;
    return (
        <button
            onClick={() => setTheme(id)}
            className={`group relative p-4 rounded-[2rem] transition-all duration-300 overflow-hidden bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${
                isSelected 
                ? 'shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)]' 
                : ' hover: hover:-translate-y-0.5'
            }`}
        >
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex justify-between items-center mb-3">
                    <span className={`font-bold text-sm ${isSelected ? 'text-[var(--accent-primary)]' : 'text-gray-700 dark:text-gray-300'}`}>{name}</span>
                    {isSelected && (
                        <div className="bg-[var(--accent-primary)] text-white rounded-full p-0.5 ">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full  border border-gray-300 dark:border-gray-600" style={{ backgroundColor: colors[0] }} title="Background"></div>
                    <div className="h-6 w-6 rounded-full  border border-gray-300 dark:border-gray-600" style={{ backgroundColor: colors[1] }} title="Accent"></div>
                    <div className="h-6 w-6 rounded-full  border border-gray-300 dark:border-gray-600" style={{ backgroundColor: colors[2] }} title="Text"></div>
                </div>
            </div>
        </button>
    );
};



interface SelectionModalProps { title: string; items: { id: string; label: React.ReactNode }[]; selectedIds: string[]; onSelect: (id: string, isChecked: boolean) => void; onSelectAll: (isChecked: boolean) => void; onConfirm: () => void; onCancel: () => void; confirmLabel: string; isOpen: boolean; t: any; children?: React.ReactNode; }
const SelectionModal: React.FC<SelectionModalProps> = ({ title, items, selectedIds, onSelect, onSelectAll, onConfirm, onCancel, confirmLabel, isOpen, t, children }) => { 
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null; 
  
  return ( 
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onCancel}> 
      <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2rem]  max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}> 
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{title}</h3> 
        {children} 
        <div className="flex-grow  bg-[var(--bg-tertiary)] rounded-[1.25rem] overflow-y-auto p-3 space-y-2"> 
          <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10"> 
            <input type="checkbox" className="form-checkbox text-[var(--accent-primary)] rounded" checked={items.length > 0 && selectedIds.length === items.length} onChange={(e) => onSelectAll(e.target.checked)} /> 
            <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span> 
          </label> 
          {items.map(item => ( 
            <label key={item.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-[1rem] hover:bg-[var(--accent-secondary-hover)]"> 
              <input type="checkbox" className="form-checkbox text-[var(--accent-primary)] rounded" checked={selectedIds.includes(item.id)} onChange={(e) => onSelect(item.id, e.target.checked)} /> 
              <span className="text-[var(--text-primary)]">{item.label}</span> 
            </label> 
          ))} 
        </div> 
        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-primary)] mt-6"> 
          <button onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-[1.25rem] hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button> 
          <button onClick={onConfirm} disabled={selectedIds.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-[1.25rem] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50">{confirmLabel}</button> 
        </div> 
      </div> 
    </div> 
  ); 
};

const ModernColorPicker = ({ value, onChange, label, hideLabel = false }: { value: string, onChange: (val: string) => void, label?: string, hideLabel?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const presets = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
        '#f59e0b', '#10b981', '#06b6d4', '#000000', 
        '#64748b', '#ffffff'
    ];

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            {!hideLabel && <label className="block text-xs font-semibold text-[var(--text-secondary)]">{label}</label>}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative w-10 h-10 rounded-[2rem]   overflow-hidden flex-shrink-0 group cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: value }}></div>
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {value.toLowerCase() === '#ffffff' && <div className="absolute inset-0 border border-black/5 rounded-[2rem] pointer-events-none" />}
                </button>
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-grow px-3 py-2 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[2rem] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] uppercase tracking-wider"
                    maxLength={7}
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 p-3 bg-[var(--bg-primary)]  rounded-[2rem]  animate-scale-in w-48 left-0 top-full">
                    <div className="grid grid-cols-5 gap-2 mb-3">
                        {presets.map(p => (
                            <button
                                key={p}
                                onClick={() => { onChange(p); setIsOpen(false); }}
                                className={`w-6 h-6 rounded-[1.25rem] transition-transform hover:scale-110 active:scale-90 border border-black/10 ${value.toLowerCase() === p.toLowerCase() ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}`}
                                style={{ backgroundColor: p }}
                            />
                        ))}
                    </div>
                    <div className="relative pt-2 border-t border-[var(--border-secondary)]">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-full h-8 rounded-[1.25rem] bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 relative overflow-hidden flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white drop-">CUSTOM</span>
                                <input 
                                    type="color" 
                                    value={value} 
                                    onChange={(e) => onChange(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                                />
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

const ColorPickerInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    return <ModernColorPicker label={label} value={value} onChange={onChange} />;
};

const OpacityControl = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="space-y-2">
        <label className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">{label}</label>
        <div className="flex items-center bg-[var(--bg-primary)] rounded-[2rem]  h-10 px-1 w-full shadow-inner">
            <button 
                onClick={() => onChange(Math.max(0, parseFloat((value - 0.05).toFixed(2))))} 
                className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors text-lg font-bold"
            >
                —
            </button>
            <div className="flex-grow text-center text-sm font-bold text-[var(--text-primary)] tabular-nums">
                {Math.round(value * 100)}%
            </div>
            <button 
                onClick={() => onChange(Math.min(1, parseFloat((value + 0.05).toFixed(2))))} 
                className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors text-lg font-bold"
            >
                +
            </button>
        </div>
    </div>
);

const ReportCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    colorGradient: string;
    onClick: () => void;
}> = ({ title, description, icon, colorGradient, onClick }) => {
    return (
        <button 
            onClick={onClick} 
            className="group flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-[2rem]  hover:border-[var(--accent-primary)] hover: transition-all text-left w-full"
        >
            <div className={`h-12 w-12 flex-shrink-0 rounded-[1.25rem] bg-gradient-to-br ${colorGradient} text-white flex items-center justify-center  group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--accent-primary)] transition-colors truncate">{title}</h4>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{description}</p>
            </div>
        </button>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({
  t, language, setLanguage, theme, setTheme, themeColors, onColorChange, onResetTheme, navDesign, setNavDesign, navShape, setNavShape, navBtnAlphaSelected, setNavBtnAlphaSelected, navBtnAlphaUnselected, setNavBtnAlphaUnselected, navBarAlpha, setNavBarAlpha, navBarColor, setNavBarColor, navAnimation, setNavAnimation, fontSize, setFontSize, appFont, setAppFont, schoolConfig, onUpdateSchoolConfig, classes, teachers, subjects, adjustments, leaveDetails, attendance
}) => {
  const [isThemeOptionsOpen, setIsThemeOptionsOpen] = useState(false); 
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isInterfaceOptionsOpen, setIsInterfaceOptionsOpen] = useState(false);
  const [isPrintSectionOpen, setIsPrintSectionOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  
  // Advanced Color Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProperty, setPickerProperty] = useState<ColorProperty>('accent');
  const [recentlyUsedColors, setRecentlyUsedColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrtimetable_recentlyUsedColors');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    localStorage.setItem('mrtimetable_recentlyUsedColors', JSON.stringify(recentlyUsedColors));
  }, [recentlyUsedColors]);
  
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setIsFontDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fontDropdownRef]);

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 15MB to avoid storage/memory issues
    if (file.size > 15 * 1024 * 1024) {
      alert('Font file is too large. Please upload smaller files (under 15MB).');
      if (e.target) e.target.value = '';
      return;
    }

    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(fileType || '')) {
      alert('Only TTF, OTF, WOFF and WOFF2 files are supported.');
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
        const fontId = Math.random().toString(36).substr(2, 9);
        const newFontMetadata = {
          id: fontId,
          name: fontName,
          type: fileType as 'ttf' | 'otf' | 'woff' | 'woff2'
        };
        
        // Save large data to separate IDB store
        try {
          const { get, set } = await import('idb-keyval');
          const currentFontsData = await get<Record<string, string>>('mrtimetable_customFontsData') || {};
          await set('mrtimetable_customFontsData', { ...currentFontsData, [fontId]: base64Data });
          
          // Update metadata in schoolConfig
          const updatedCustomFonts = [...(schoolConfig.customFonts || []), newFontMetadata];
          onUpdateSchoolConfig({ customFonts: updatedCustomFonts });
        } catch (error) {
          console.error("Failed to save font data", error);
          alert("Failed to save font. Storage may be full.");
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleHideBuiltInFont = (fontValue: string) => {
    const updatedHiddenFonts = [...(schoolConfig.hiddenFonts || []), fontValue];
    onUpdateSchoolConfig({ hiddenFonts: updatedHiddenFonts });
  };

  const handleDeleteCustomFont = async (id: string) => {
    const fontToDelete = schoolConfig.customFonts?.find(f => f.id === id);
    const updatedCustomFonts = (schoolConfig.customFonts || []).filter(f => f.id !== id);
    
    // Remove from metadata
    onUpdateSchoolConfig({ customFonts: updatedCustomFonts });
    
    // Remove from separate IDB store
    try {
      const { get, set } = await import('idb-keyval');
      const currentFontsData = await get<Record<string, string>>('mrtimetable_customFontsData') || {};
      if (currentFontsData[id]) {
        const newData = { ...currentFontsData };
        delete newData[id];
        await set('mrtimetable_customFontsData', newData);
      }
    } catch (error) {
       console.error("Failed to delete font data", error);
    }

    if (fontToDelete && appFont === fontToDelete.name) {
      setAppFont('');
    }
  };

  const [workloadReportMode, setWorkloadReportMode] = useState<'weekly' | 'range'>('weekly');
  const [workloadStartDate, setWorkloadStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [workloadEndDate, setWorkloadEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceReportDate, setAttendanceReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
      if (workloadReportMode === 'weekly') {
          const date = new Date(selectedWeekDate);
          const day = date.getDay() || 7; 
          if (day !== 1) date.setHours(-24 * (day - 1)); 
          const start = new Date(date);
          const end = new Date(date);
          end.setDate(date.getDate() + 6); 
          
          setWorkloadStartDate(start.toISOString().split('T')[0]);
          setWorkloadEndDate(end.toISOString().split('T')[0]);
      }
  }, [selectedWeekDate, workloadReportMode]);

  const [isBasicInfoPreviewOpen, setIsBasicInfoPreviewOpen] = useState(false);
  const [isTeacherSelectionForWorkloadOpen, setIsTeacherSelectionForWorkloadOpen] = useState(false);
  const [selectedTeacherIdsForWorkload, setSelectedTeacherIdsForWorkload] = useState<string[]>([]);
  const [isWorkloadPreviewOpen, setIsWorkloadPreviewOpen] = useState(false);
  const [isByPeriodPreviewOpen, setIsByPeriodPreviewOpen] = useState(false);
  const [isSchoolTimingsPreviewOpen, setIsSchoolTimingsPreviewOpen] = useState(false);
  const [isClassSelectionForPrintOpen, setIsClassSelectionForPrintOpen] = useState(false);
  const [selectedClassIdsForPrint, setSelectedClassIdsForPrint] = useState<string[]>([]);
  const [isClassTimetablePreviewOpen, setIsClassTimetablePreviewOpen] = useState(false);
  const [isTeacherSelectionForPrintOpen, setIsTeacherSelectionForPrintOpen] = useState(false);
  const [selectedTeacherIdsForPrint, setSelectedTeacherIdsForPrint] = useState<string[]>([]);
  const [isTeacherTimetablePreviewOpen, setIsTeacherTimetablePreviewOpen] = useState(false);
  const [isAlternativePreviewOpen, setIsAlternativePreviewOpen] = useState(false);
  const [isAttendanceReportPreviewOpen, setIsAttendanceReportPreviewOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const visibleClasses = useMemo(() => classes.filter(c => c.id !== 'non-teaching-duties'), [classes]);
  const handleWorkloadReportClick = () => { const idsToSelect = teachers.filter(t => { const name = t.nameEn.toUpperCase(); return !name.includes('MIAN M. YOUNAS') && !name.includes('MIAN M. YOUNIS'); }).map(t => t.id); setWorkloadReportMode('weekly'); setSelectedWeekDate(new Date().toISOString().split('T')[0]); setSelectedTeacherIdsForWorkload(idsToSelect); setIsTeacherSelectionForWorkloadOpen(true); };
  const handleWorkloadConfirm = () => { setIsTeacherSelectionForWorkloadOpen(false); setIsWorkloadPreviewOpen(true); };
  const handleClassTimetableClick = () => { setSelectedClassIdsForPrint(visibleClasses.map(c => c.id)); setIsClassSelectionForPrintOpen(true); };
  const handleClassPrintConfirm = () => { setIsClassSelectionForPrintOpen(false); setIsClassTimetablePreviewOpen(true); };
  const handleTeacherTimetableClick = () => { setSelectedTeacherIdsForPrint(teachers.map(t => t.id)); setIsTeacherSelectionForPrintOpen(true); };
  const handleTeacherPrintConfirm = () => { setIsTeacherSelectionForPrintOpen(false); setIsTeacherTimetablePreviewOpen(true); };
  const teacherItems = useMemo(() => teachers.map(t => ({ id: t.id, label: <span>{t.nameEn} / <span className="font-urdu">{t.nameUr}</span></span> })), [teachers]);
  const classItems = useMemo(() => visibleClasses.map(c => ({ id: c.id, label: <span>{c.nameEn} / <span className="font-urdu">{c.nameUr}</span></span> })), [visibleClasses]);



  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24">
       {/* ... (Previous modals remain unchanged) ... */}
       {isAboutOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setIsAboutOpen(false)}><div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]  p-8 max-w-sm w-full transform transition-all scale-100" onClick={e => e.stopPropagation()}><div className="text-center mb-8"><div className="flex justify-center mb-4">{schoolConfig.schoolLogoBase64 ? (<img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="w-64 h-64 object-contain rounded-[2rem]  bg-white p-1" />) : (<div className="w-48 h-48 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>)}</div><h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">About Mr. TMS</h3><p className="text-[var(--text-secondary)] text-sm">Timetable Management System</p></div><div className="space-y-4"><a href="https://wa.me/923009541797" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#e9f5e9] hover:bg-[#dceddd] border border-[#c8e6c9] rounded-[2rem] transition-all group"><div className="p-2 bg-white rounded-full text-[#25D366] "><WhatsAppLogo /></div><div className="text-left"><div className="font-bold text-gray-800 text-sm">Contact Support</div><div className="text-xs text-gray-600">+92 300 9541797</div></div></a><a href="https://whatsapp.com/channel/0029VaU50UPADTOEpHNSJa0r" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#e9f5e9] hover:bg-[#dceddd] border border-[#c8e6c9] rounded-[2rem] transition-all group"><div className="p-2 bg-white rounded-full text-[#25D366] "><BroadcastIcon /></div><div className="text-left"><div className="font-bold text-gray-800 text-sm">WhatsApp Channel</div><div className="text-xs text-gray-600">Stay updated with news</div></div></a></div><button onClick={() => setIsAboutOpen(false)} className="mt-8 w-full py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Close</button></div></div>)}
       
       {/* ... (Other selection modals) ... */}
       <SelectionModal isOpen={isTeacherSelectionForWorkloadOpen} title={t.selectTeachersToDownload} items={teacherItems} selectedIds={selectedTeacherIdsForWorkload} onSelect={(id, checked) => setSelectedTeacherIdsForWorkload(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id))} onSelectAll={(checked) => setSelectedTeacherIdsForWorkload(checked ? teachers.map(t => t.id) : [])} onConfirm={handleWorkloadConfirm} onCancel={() => setIsTeacherSelectionForWorkloadOpen(false)} confirmLabel={t.workloadReport} t={t}>
            <div className="mb-4 space-y-4">
                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-[1.25rem] ">
                    <button onClick={() => setWorkloadReportMode('weekly')} className={`flex-1 py-2 text-sm font-bold rounded-[1rem] transition-colors ${workloadReportMode === 'weekly' ? 'bg-[var(--accent-primary)] text-white ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Weekly Summary</button>
                    <button onClick={() => setWorkloadReportMode('range')} className={`flex-1 py-2 text-sm font-bold rounded-[1rem] transition-colors ${workloadReportMode === 'range' ? 'bg-[var(--accent-primary)] text-white ' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Date Range</button>
                </div>
                
                {workloadReportMode === 'weekly' && (
                    <div className="bg-[var(--bg-tertiary)] p-3 rounded-[1.25rem]  animate-scale-in">
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Select Week (Any date)</label>
                        <input type="date" value={selectedWeekDate} onChange={(e) => setSelectedWeekDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1rem] text-sm text-[var(--text-primary)]" />
                        <p className="text-[0.625rem] text-[var(--text-secondary)] mt-1">
                            Week: {workloadStartDate} to {workloadEndDate}
                        </p>
                    </div>
                )}

                {workloadReportMode === 'range' && (
                    <div className="grid grid-cols-2 gap-3 bg-[var(--bg-tertiary)] p-3 rounded-[1.25rem]  animate-scale-in">
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.startDate}</label>
                            <input type="date" value={workloadStartDate} onChange={(e) => setWorkloadStartDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1.25rem] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] " />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t.endDate}</label>
                            <input type="date" value={workloadEndDate} onChange={(e) => setWorkloadEndDate(e.target.value)} className="block w-full px-2 py-1.5 bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10  rounded-[1.25rem] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] " />
                        </div>
                    </div>
                )}
            </div>
       </SelectionModal>
       
       <SelectionModal isOpen={isClassSelectionForPrintOpen} title={t.selectClassesToDownload} items={classItems} selectedIds={selectedClassIdsForPrint} onSelect={(id, checked) => setSelectedClassIdsForPrint(prev => checked ? [...prev, id] : prev.filter(cid => cid !== id))} onSelectAll={(checked) => setSelectedClassIdsForPrint(checked ? visibleClasses.map(c => c.id) : [])} onConfirm={handleClassPrintConfirm} onCancel={() => setIsClassSelectionForPrintOpen(false)} confirmLabel={t.printViewAction} t={t} />
       <SelectionModal isOpen={isTeacherSelectionForPrintOpen} title={t.selectTeachersToDownload} items={teacherItems} selectedIds={selectedTeacherIdsForPrint} onSelect={(id, checked) => setSelectedTeacherIdsForPrint(prev => checked ? [...prev, id] : prev.filter(tid => tid !== id))} onSelectAll={(checked) => setSelectedTeacherIdsForPrint(checked ? teachers.map(t => t.id) : [])} onConfirm={handleTeacherPrintConfirm} onCancel={() => setIsTeacherSelectionForPrintOpen(false)} confirmLabel={t.printViewAction} t={t} />

       {/* ... (Print previews) ... */}
       <PrintPreview t={t} isOpen={isBasicInfoPreviewOpen} onClose={() => setIsBasicInfoPreviewOpen(false)} title={t.basicInformation} fileNameBase="Basic_Information" generateHtml={(lang, options) => generateBasicInformationHtml(t, lang, options, visibleClasses, teachers, schoolConfig)} onGenerateExcel={(lang, options) => generateBasicInformationExcel(t, lang, options, schoolConfig, visibleClasses, teachers)} designConfig={schoolConfig.downloadDesigns.basicInfo} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, basicInfo: newDesign }})} />
       <PrintPreview t={t} isOpen={isWorkloadPreviewOpen} onClose={() => setIsWorkloadPreviewOpen(false)} title={t.workloadSummaryReport} fileNameBase="Teacher_Workload_Summary" generateHtml={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForWorkload.includes(t.id)); return generateWorkloadSummaryHtml(t, lang, options, selectedTeachers, schoolConfig, classes, adjustments, leaveDetails, workloadStartDate, workloadEndDate, workloadReportMode); }} onGenerateExcel={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForWorkload.includes(t.id)); generateWorkloadSummaryExcel(t, lang, options, selectedTeachers, schoolConfig, classes, adjustments, leaveDetails, workloadStartDate, workloadEndDate, workloadReportMode) }} designConfig={schoolConfig.downloadDesigns.workload} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, workload: newDesign }})} />
       <PrintPreview t={t} isOpen={isByPeriodPreviewOpen} onClose={() => setIsByPeriodPreviewOpen(false)} title={t.byPeriod} fileNameBase="Free_Teachers_Report" generateHtml={(lang, options) => generateByPeriodHtml(t, lang, options, schoolConfig, classes, teachers)} onGenerateExcel={(lang, options) => generateByPeriodExcel(t, lang, options, schoolConfig, classes, teachers)} designConfig={schoolConfig.downloadDesigns.alternative} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, alternative: newDesign }})} />
       <PrintPreview t={t} isOpen={isSchoolTimingsPreviewOpen} onClose={() => setIsSchoolTimingsPreviewOpen(false)} title={t.schoolTimings} fileNameBase="School_Timings" generateHtml={(lang, options) => generateSchoolTimingsHtml(t, lang, options, schoolConfig)} onGenerateExcel={(lang, design) => generateSchoolTimingsExcel(t, lang, design, schoolConfig)} designConfig={schoolConfig.downloadDesigns.schoolTimings} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, schoolTimings: newDesign }})} />
       <PrintPreview t={t} isOpen={isClassTimetablePreviewOpen} onClose={() => setIsClassTimetablePreviewOpen(false)} title={t.classTimetable} fileNameBase="Class_Timetables" generateHtml={(lang, options) => { const selectedClasses = visibleClasses.filter(c => selectedClassIdsForPrint.includes(c.id)); 
       return (selectedClasses.map(c => generateClassTimetableHtml(c, lang, options, teachers, subjects, schoolConfig)) as any).flat(); }} designConfig={schoolConfig.downloadDesigns.class} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, class: newDesign }})} />
       <PrintPreview t={t} isOpen={isTeacherTimetablePreviewOpen} onClose={() => setIsTeacherTimetablePreviewOpen(false)} title={t.teacherTimetable} fileNameBase="Teacher_Timetables" generateHtml={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForPrint.includes(t.id)); 
       return (selectedTeachers.map(t => generateTeacherTimetableHtml(t, lang, options, classes, subjects, schoolConfig, adjustments, teachers)) as any).flat(); }} designConfig={schoolConfig.downloadDesigns.teacher} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }})} />
       <PrintPreview t={t} isOpen={isAlternativePreviewOpen} onClose={() => setIsAlternativePreviewOpen(false)} title={t.dailyAdjustments} fileNameBase={`Adjustments_${new Date().toISOString().split('T')[0]}`} generateHtml={(lang, options) => { const today = new Date().toISOString().split('T')[0]; const todayAdjustments = adjustments[today] || []; return generateAdjustmentsReportHtml(t, lang, options, todayAdjustments, teachers, visibleClasses, subjects, schoolConfig, today, []); }} onGenerateExcel={(lang, options) => { const today = new Date().toISOString().split('T')[0]; const todayAdjustments = adjustments[today] || []; generateAdjustmentsExcel(t, lang, options, schoolConfig, todayAdjustments, teachers, visibleClasses, subjects, today); }} designConfig={schoolConfig.downloadDesigns.adjustments} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, adjustments: newDesign }})} />
       <PrintPreview 
            t={t} 
            isOpen={isAttendanceReportPreviewOpen} 
            onClose={() => setIsAttendanceReportPreviewOpen(false)} 
            title={t.attendanceReport} 
            fileNameBase={`Attendance_Report_${attendanceReportDate}`} 
            generateHtml={(lang, design) => generateAttendanceReportHtml(t, lang, design, classes, teachers, schoolConfig, attendanceReportDate, adjustments, leaveDetails || {}, attendance)} 
            onGenerateExcel={(lang, design) => generateAttendanceReportExcel(t, lang, design, schoolConfig, classes, teachers, attendanceReportDate, adjustments, leaveDetails || {}, attendance)}
            designConfig={schoolConfig.downloadDesigns.attendance} 
            onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, attendance: newDesign }})}
        />

      <div className="max-w-4xl mx-auto relative">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{t.settings}</h2>
        </div>
        
        <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[2rem]   mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsThemeOptionsOpen(!isThemeOptionsOpen)}>
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Appearance</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Customize your visual experience</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isThemeOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-500 ${isThemeOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0 space-y-8">
                        
                        {/* THEME MODE */}
                        <div>
                            <h4 className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">THEME MODE</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={() => setTheme('system')}
                                    className={`group flex flex-col items-center gap-2 p-3 rounded-[2rem] border transition-all ${theme === 'system' ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/10 ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                                >
                                    <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-r from-gray-300 to-gray-800 flex items-center justify-center">
                                        <div className="w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"></div>
                                    </div>
                                    <span className={`text-[0.6rem] sm:text-xs font-bold leading-tight text-center ${theme === 'system' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>Auto</span>
                                </button>

                                <button 
                                    onClick={() => setTheme('light')}
                                    className={`group flex flex-col items-center gap-2 p-3 rounded-[2rem] border transition-all ${theme === 'light' || theme === 'mint' ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/10 ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                                >
                                    <div className="w-10 h-10 rounded-[1.25rem] bg-[#f8fafc] flex items-center justify-center border border-gray-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                    <span className={`text-[0.6rem] sm:text-xs font-bold leading-tight text-center ${theme === 'light' || theme === 'mint' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>Light</span>
                                </button>

                                <button 
                                    onClick={() => setTheme('dark')}
                                    className={`group flex flex-col items-center gap-2 p-3 rounded-[2rem] border transition-all ${theme === 'dark' || theme === 'amoled' ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/10 ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                                >
                                    <div className="w-10 h-10 rounded-[1.25rem] bg-[#0f172a] flex items-center justify-center border border-gray-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                    </div>
                                    <span className={`text-[0.6rem] sm:text-xs font-bold leading-tight text-center ${theme === 'dark' || theme === 'amoled' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>Dark</span>
                                </button>
                            </div>
                        </div>

                        {/* COLOR PALETTE */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-wider">CORE THEME COLORS</h4>
                                <button onClick={onResetTheme} className="text-[0.6rem] font-bold text-rose-500 hover:underline uppercase tracking-tight">Reset to default</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { key: 'bgPrimary' as keyof ThemeColors, label: 'Background', color: themeColors.bgPrimary, prop: 'background' as ColorProperty },
                                    { key: 'bgSecondary' as keyof ThemeColors, label: 'Surface', color: themeColors.bgSecondary, prop: 'surface' as ColorProperty },
                                    { key: 'accentPrimary' as keyof ThemeColors, label: 'Accent', color: themeColors.accentPrimary, prop: 'accent' as ColorProperty },
                                    { key: 'textPrimary' as keyof ThemeColors, label: 'Typography', color: themeColors.textPrimary, prop: 'text' as ColorProperty },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => {
                                            setPickerProperty(item.prop);
                                            setPickerOpen(true);
                                        }}
                                        className="group relative flex flex-col items-center gap-2 p-3 rounded-[2rem] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all overflow-hidden"
                                    >
                                        <div className="w-10 h-10 p-1 bg-white/50 backdrop-blur-sm rounded-full shadow-inner group-hover:scale-110 transition-transform">
                                            <div className="w-full h-full rounded-full border border-black/10" style={{ backgroundColor: item.color }} />
                                        </div>
                                        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{item.label}</span>
                                        <div className="absolute right-2 top-2 p-1 bg-white/50 dark:bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PRESETS (Simplified) */}
                        <div>
                            <h4 className="text-[0.625rem] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">QUICK ACCENTS</h4>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899',
                                ].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            onColorChange('accentPrimary', color);
                                            if (!recentlyUsedColors.includes(color)) {
                                                setRecentlyUsedColors(prev => [color, ...prev].slice(0, 10));
                                            }
                                        }}
                                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${themeColors.accentPrimary === color ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)] ring-offset-[var(--bg-secondary)] scale-110' : 'hover:scale-110 shadow-sm'}`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {themeColors.accentPrimary === color && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => { setPickerProperty('accent'); setPickerOpen(true); }}
                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 p-0.5"
                                >
                                    <div className="w-full h-full rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* REMOVED OLD CUSTOMIZE DETAILS TO CLEAN UP */}

                        {/* ACTION BUTTONS */}
                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={() => setIsThemeOptionsOpen(false)}
                                className="flex-1 py-3 rounded-[2rem]  text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => setIsThemeOptionsOpen(false)}
                                className="flex-1 py-3 rounded-[2rem] bg-[var(--accent-primary)] text-white font-semibold hover:bg-[var(--accent-primary-hover)]  shadow-[var(--accent-primary)]/20 transition-all hover:-translate-y-0.5"
                            >
                                Save Changes
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        {/* Advanced Color Picker */}
        <AdvancedColorPicker 
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            property={pickerProperty}
            initialColor={(() => {
                switch(pickerProperty) {
                    case 'background': return themeColors.bgPrimary;
                    case 'surface': return themeColors.bgSecondary;
                    case 'text': return themeColors.textPrimary;
                    case 'accent': return themeColors.accentPrimary;
                    default: return themeColors.accentPrimary;
                }
            })()}
            surfaceColor={pickerProperty === 'text' ? themeColors.bgSecondary : undefined}
            recentlyUsed={recentlyUsedColors}
            onAddRecentlyUsed={(c) => {
                if (!recentlyUsedColors.includes(c)) {
                    setRecentlyUsedColors(prev => [c, ...prev].slice(0, 10));
                }
            }}
            onSetColor={(color) => {
                switch(pickerProperty) {
                    case 'background': onColorChange('bgPrimary', color); break;
                    case 'surface': onColorChange('bgSecondary', color); break;
                    case 'text': onColorChange('textPrimary', color); break;
                    case 'accent': onColorChange('accentPrimary', color); break;
                }
            }}
        />

        <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[1.25rem]   mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsTypographyOpen(!isTypographyOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">App Typography & Language</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isTypographyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-500 ${isTypographyOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0 space-y-8">
                        <div>
                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 ml-1">Language & Typography</h4>
                            
                            {/* App Language */}
                            <div className="mb-4">
                                <div className="bg-[var(--bg-tertiary)] rounded-[2rem] p-5 flex items-center justify-between ">
                                    <div>
                                        <h5 className="text-base font-bold text-[var(--text-primary)] mb-1">{t.appLanguage}</h5>
                                        <p className="text-xs text-[var(--text-secondary)]">{t.switchLanguageDesc}</p>
                                    </div>
                                    <div className="flex bg-[var(--bg-primary)] rounded-[1.25rem] p-1  shadow-inner">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`px-4 py-1.5 rounded-[1rem] text-sm font-bold transition-all ${language === 'en' ? 'bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 text-[var(--accent-primary)] ring-1 ring-black/5 dark:ring-white/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            English
                                        </button>
                                        <button
                                            onClick={() => setLanguage('ur')}
                                            className={`px-4 py-1.5 rounded-[1rem] text-sm font-bold transition-all font-urdu ${language === 'ur' ? 'bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 text-[var(--accent-primary)] ring-1 ring-black/5 dark:ring-white/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            اردو
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {/* Font Size */}
                                <div className="bg-[var(--bg-tertiary)] rounded-[2rem] p-5 flex items-center justify-between">
                                    <div>
                                        <h5 className="text-base font-bold text-[var(--text-primary)] mb-1">Font Size</h5>
                                        <p className="text-xs text-[var(--text-secondary)]">Current: {fontSize}px</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-[var(--bg-primary)] p-1 rounded-[2rem] h-10 px-1 w-40 sm:w-48 shadow-inner">
                                        <button 
                                            onClick={() => setFontSize(Math.max(8, fontSize - 1))} 
                                            className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors text-lg font-bold"
                                        >—</button>
                                        <div className="flex-grow text-center text-sm font-bold text-[var(--text-primary)] tabular-nums">{fontSize}px</div>
                                        <button 
                                            onClick={() => setFontSize(Math.min(fontSize + 1, 32))} 
                                            className="w-10 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors text-lg font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                {/* Custom Font / Existing Fonts */}
                                <div className="bg-[var(--bg-tertiary)] rounded-[2rem] p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h5 className="text-base font-bold text-[var(--text-primary)] mb-1">App Font</h5>
                                            <p className="text-xs text-[var(--text-secondary)]">Select, hide, or upload a custom font</p>
                                        </div>
                                        <div>
                                            <label className="cursor-pointer bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-bold py-2 px-4 rounded-[1rem] shadow-sm transition-all focus:outline-none">
                                                Upload TTF/OTF
                                                <input type="file" accept=".ttf,.otf" className="hidden" onChange={handleCustomFontUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[24rem] overflow-y-auto custom-scrollbar pr-2">
                                        {/* Built-in Fonts list */}
                                        {appFontOptions.filter(f => !(schoolConfig.hiddenFonts || []).includes(f.value)).map(font => (
                                            <div key={font.value} className={`relative flex justify-between items-center bg-[var(--bg-primary)] shadow-sm rounded-[1rem] p-3 border ${appFont === font.value ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'border-transparent'}`}>
                                                <div 
                                                    className="cursor-pointer flex-1 truncate" 
                                                    onClick={() => setAppFont(font.value)}
                                                    style={{ fontFamily: font.value || 'inherit' }}
                                                >
                                                    <span className={`text-sm ${appFont === font.value ? 'font-bold text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                                                        {font.label}
                                                    </span>
                                                </div>
                                                {(!protectedFonts.includes(font.value)) && (
                                                    <button onClick={() => handleHideBuiltInFont(font.value)} className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2" title="Hide Font">
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {/* Custom Fonts list */}
                                        {(schoolConfig.customFonts || []).map(font => (
                                            <div key={font.id} className={`relative flex justify-between items-center bg-[var(--bg-primary)] shadow-sm rounded-[1rem] p-3 border ${appFont === font.name ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'border-transparent'}`}>
                                                <div 
                                                    className="cursor-pointer flex-1 truncate" 
                                                    onClick={() => setAppFont(font.name)}
                                                    style={{ fontFamily: font.name }}
                                                >
                                                    <span className={`text-sm tracking-tight ${appFont === font.name ? 'font-bold text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                                                        {font.name} <span className="text-[0.625rem] text-[var(--text-secondary)] uppercase bg-[var(--bg-tertiary)] px-1 py-0.5 rounded ml-1">{font.type}</span>
                                                    </span>
                                                </div>
                                                <button onClick={() => handleDeleteCustomFont(font.id)} className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2" title="Delete Uploaded Font">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {(schoolConfig.hiddenFonts && schoolConfig.hiddenFonts.length > 0) && (
                                        <div className="mt-2 text-right">
                                            <button 
                                                onClick={() => onUpdateSchoolConfig({ hiddenFonts: [] })} 
                                                className="text-xs text-blue-500 hover:underline"
                                            >
                                                Restore hidden default fonts
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>



        <div className="bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10 rounded-[1.25rem]   mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsInterfaceOptionsOpen(!isInterfaceOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.interfaceSettings}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isInterfaceOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-500 ${isInterfaceOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                {/* ... (Interface Settings content unchanged) ... */}
                <div className="overflow-hidden">
                    <div className="p-6 pt-0 space-y-8">
                         {/* GENERAL (Now only contains Navigation toggle) */}
                         <div>
                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 ml-1">General</h4>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-[var(--bg-tertiary)] rounded-[2rem] p-5  flex items-center justify-between ">
                                    <div>
                                        <h5 className="text-base font-bold text-[var(--text-primary)] mb-1">Auto-hide Navigation</h5>
                                        <p className="text-xs text-[var(--text-secondary)]">Hide navigation bar when scrolling down</p>
                                    </div>
                                    <button 
                                        onClick={() => setNavAnimation(!navAnimation)} 
                                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${navAnimation ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${navAnimation ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>



        <button onClick={() => setIsAboutOpen(true)} className="fixed bottom-24 right-6 xl:bottom-8 xl:right-8 z-40 bg-[var(--accent-primary)] text-white w-12 h-12 rounded-full  hover: hover:bg-[var(--accent-primary-hover)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center" title="About Mr. TMS"><AboutIcon /></button>
      </div>
    </div>
  );
};

export default SettingsPage;
