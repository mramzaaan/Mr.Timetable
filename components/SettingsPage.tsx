
// ... imports ...
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Language, SchoolConfig, SchoolClass, Teacher, Subject, Adjustment, DownloadDesignConfig, FontFamily } from '../types';
import type { Theme, NavPosition, NavDesign, NavShape } from '../App';
import { allDays } from '../types';
import PrintPreview from './PrintPreview';
import { 
  generateBasicInformationHtml, 
  generateBasicInformationExcel, 
  generateByPeriodHtml, 
  generateByPeriodExcel, 
  generateWorkloadSummaryHtml, 
  generateWorkloadSummaryExcel,
  generateSchoolTimingsHtml
} from './reportUtils';

// ... interface definitions ...
interface SettingsPageProps {
  t: any; // Translation object
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  navPosition: NavPosition;
  setNavPosition: (pos: NavPosition) => void;
  navDesign: NavDesign;
  setNavDesign: (design: NavDesign) => void;
  navShape: NavShape;
  setNavShape: (shape: NavShape) => void;
  navShowLabels: boolean;
  setNavShowLabels: (show: boolean) => void;
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
}

const themeOptions: { id: Theme; name: string; colors: [string, string, string] }[] = [
    { id: 'light', name: 'Light', colors: ['#f8fafc', '#7c3aed', '#0f172a'] }, // Purple
    { id: 'dark', name: 'Dark', colors: ['#020617', '#8b5cf6', '#f8fafc'] }, // Deep Violet
    { id: 'contrast', name: 'Contrast', colors: ['#ffffff', '#0000ff', '#000000'] },
    { id: 'mint', name: 'Mint', colors: ['#f0fdfa', '#059669', '#042f2e'] },
    { id: 'ocean', name: 'Ocean', colors: ['#f0f9ff', '#0284c7', '#082f49'] },
    { id: 'sunset', name: 'Sunset', colors: ['#fff7ed', '#ea580c', '#431407'] },
    { id: 'rose', name: 'Rose', colors: ['#fff1f2', '#e11d48', '#881337'] },
    { id: 'amoled', name: 'Amoled', colors: ['#000000', '#00e5ff', '#ffffff'] },
];

const appFontOptions = [
    { label: 'System Default', value: '' },
    { label: 'Gulzar (Urdu)', value: 'Gulzar' },
    { label: 'Noto Nastaliq Urdu (Google)', value: 'Noto Nastaliq Urdu' },
    { label: 'Amiri (Naskh)', value: 'Amiri' },
    { label: 'Aref Ruqaa (Calligraphic)', value: 'Aref Ruqaa' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Impact', value: 'Impact' },
    { label: 'Calibri', value: 'Calibri' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Tahoma', value: 'Tahoma' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS' },
    { label: 'Segoe UI', value: 'Segoe UI' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS' },
    { label: 'Lato', value: 'Lato' },
    { label: 'Roboto', value: 'Roboto' },
    { label: 'Open Sans', value: 'Open Sans' },
    { label: 'Montserrat', value: 'Montserrat' },
    { label: 'Antonio', value: 'Antonio' },
    { label: 'Monoton', value: 'Monoton' },
    { label: 'Rubik Mono One', value: 'Rubik Mono One' },
    { label: 'Bodoni Moda', value: 'Bodoni Moda' },
    { label: 'Bungee Spice', value: 'Bungee Spice' },
    { label: 'Bebas Neue', value: 'Bebas Neue' },
    { label: 'Playfair Display', value: 'Playfair Display' },
    { label: 'Oswald', value: 'Oswald' },
    { label: 'Anton', value: 'Anton' },
    { label: 'Instrument Serif', value: 'Instrument Serif' },
    { label: 'Orbitron', value: 'Orbitron' },
    { label: 'Fjalla One', value: 'Fjalla One' },
    { label: 'Playwrite', value: 'Playwrite CU' },
];

// Icons for About Modal
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

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>;

const fontOptions: { label: string, value: FontFamily }[] = [
    { label: 'System Default', value: 'sans-serif' as FontFamily },
    { label: 'Gulzar (Urdu)', value: 'Gulzar' as FontFamily },
    { label: 'Noto Nastaliq Urdu (Google)', value: 'Noto Nastaliq Urdu' as FontFamily },
    { label: 'Amiri (Naskh)', value: 'Amiri' as FontFamily },
    { label: 'Aref Ruqaa (Calligraphic)', value: 'Aref Ruqaa' as FontFamily },
    { label: 'Modern (Lato)', value: 'Lato' },
    { label: 'Clean (Roboto)', value: 'Roboto' },
    { label: 'Standard (Open Sans)', value: 'Open Sans' },
    { label: 'Elegant (Montserrat)', value: 'Montserrat' },
    { label: 'Formal (Times New Roman)', value: 'Times New Roman' },
    { label: 'Classic (Merriweather)', value: 'Merriweather' },
    { label: 'System (Arial)', value: 'Arial' },
];

const ThemeCard: React.FC<{
    themeInfo: typeof themeOptions[0],
    currentTheme: Theme,
    setTheme: (theme: Theme) => void,
}> = ({ themeInfo, currentTheme, setTheme }) => {
    // ... same ThemeCard logic ...
    const isSelected = themeInfo.id === currentTheme;
    return (
        <button
            onClick={() => setTheme(themeInfo.id)}
            className={`group relative p-4 rounded-xl transition-all duration-300 overflow-hidden ${
                isSelected 
                ? 'shadow-[0_8px_20px_rgba(0,0,0,0.15)] scale-[1.02] ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-secondary)]' 
                : 'shadow-md hover:shadow-lg hover:-translate-y-1'
            }`}
            style={{
                background: `linear-gradient(135deg, ${themeInfo.colors[0]}, ${themeInfo.colors[0]})`
            }}
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="absolute inset-0 border border-black/5 dark:border-white/10 rounded-xl pointer-events-none"></div>

            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-sm" style={{ color: themeInfo.colors[2] }}>{themeInfo.name}</span>
                    {isSelected && (
                        <div className="bg-[var(--accent-primary)] text-white rounded-full p-1 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: themeInfo.colors[0] }} title="Background"></div>
                    <div className="h-6 w-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: themeInfo.colors[1] }} title="Accent"></div>
                    <div className="h-6 w-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: themeInfo.colors[2] }} title="Text"></div>
                </div>
            </div>
        </button>
    );
};

// Component for Nav Style Preview
const StyleOption: React.FC<{
    design: NavDesign;
    isActive: boolean;
    onClick: () => void;
}> = ({ design, isActive, onClick }) => {
    // Mimic the actual styles from BottomNavBar for authentic preview
    let buttonClass = "w-10 h-10 flex items-center justify-center transition-all duration-300 rounded-lg ";
    let containerClass = `relative flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer border transition-all duration-200 ${isActive ? 'bg-[var(--accent-secondary)]/30 border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]'}`;

    if (design === 'classic') buttonClass += 'text-[var(--accent-primary)] bg-[var(--accent-secondary)]';
    if (design === 'modern') buttonClass += 'bg-[var(--accent-primary)] text-white shadow-md scale-110';
    if (design === 'minimal') buttonClass += 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] rounded-none';
    if (design === '3d') buttonClass += 'bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white shadow-[0_3px_0_var(--accent-primary-hover)] translate-y-[-2px]';
    if (design === 'neon') buttonClass += 'text-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary),inset_0_0_3px_var(--accent-primary)] border border-[var(--accent-primary)] bg-black';
    if (design === 'glass') buttonClass += 'bg-white/40 border border-white/60 text-[var(--accent-primary)] shadow-sm backdrop-blur-sm';
    if (design === 'gradient') buttonClass += 'bg-gradient-to-tr from-[var(--accent-primary)] via-purple-500 to-pink-500 text-white';
    if (design === 'outline') buttonClass += 'border-2 border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10';

    return (
        <div onClick={onClick} className={containerClass}>
            <div className={buttonClass}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            </div>
            <span className="text-[10px] font-semibold mt-2 uppercase tracking-wide text-[var(--text-secondary)]">{design}</span>
            {isActive && <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-primary)] rounded-full"></div>}
        </div>
    );
};

// ... SettingsPanel placeholder logic if any ...
const SettingsPanel: React.FC<{
    options: DownloadDesignConfig,
    setOptions: React.Dispatch<React.SetStateAction<DownloadDesignConfig>>,
    onSaveDesign: (options: DownloadDesignConfig) => void,
    resetToDefaults: () => void,
}> = ({ options, setOptions, onSaveDesign, resetToDefaults }) => {
    return null; 
};

// ... Main SettingsPage Component ...
const SettingsPage: React.FC<SettingsPageProps> = ({
  t, language, setLanguage, theme, setTheme, navPosition, setNavPosition, navDesign, setNavDesign, navShape, setNavShape, navShowLabels, setNavShowLabels, fontSize, setFontSize, appFont, setAppFont, schoolConfig, onUpdateSchoolConfig, classes, teachers, subjects, adjustments
}) => {
  // ... state and effects ...
  const [localSchoolNameEn, setLocalSchoolNameEn] = useState(schoolConfig.schoolNameEn);
  const [localSchoolNameUr, setLocalSchoolNameUr] = useState(schoolConfig.schoolNameUr);
  const [localSchoolLogo, setLocalSchoolLogo] = useState<string | null>(schoolConfig.schoolLogoBase64);
  const [isSchoolInfoOpen, setIsSchoolInfoOpen] = useState(false);
  const [isThemeOptionsOpen, setIsThemeOptionsOpen] = useState(false);
  const [isInterfaceOptionsOpen, setIsInterfaceOptionsOpen] = useState(false);
  const [isBasicInfoPreviewOpen, setIsBasicInfoPreviewOpen] = useState(false);
  const [isWorkloadPreviewOpen, setIsWorkloadPreviewOpen] = useState(false);
  const [isTeacherSelectionOpen, setIsTeacherSelectionOpen] = useState(false);
  const [selectedTeacherIdsForReport, setSelectedTeacherIdsForReport] = useState<string[]>([]);
  const [isByPeriodPreviewOpen, setIsByPeriodPreviewOpen] = useState(false);
  const [isSchoolTimingsPreviewOpen, setIsSchoolTimingsPreviewOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSchoolNameEn(schoolConfig.schoolNameEn);
    setLocalSchoolNameUr(schoolConfig.schoolNameUr);
    setLocalSchoolLogo(schoolConfig.schoolLogoBase64);
  }, [schoolConfig]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
          alert("File is too large. Please select an image smaller than 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => { setLocalSchoolLogo(reader.result as string); };
      reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = '';
  };
  
  const handleRemoveLogo = () => { setLocalSchoolLogo(null); };

  const handleSettingsSave = () => {
    onUpdateSchoolConfig({ schoolNameEn: localSchoolNameEn, schoolNameUr: localSchoolNameUr, schoolLogoBase64: localSchoolLogo, });
    setFeedback({ message: t.schoolInfoSaved, type: 'success' });
    setTimeout(() => setFeedback({ message: '', type: null }), 3000);
  };

  const handleWorkloadReportClick = () => { setSelectedTeacherIdsForReport(teachers.map(t => t.id)); setIsTeacherSelectionOpen(true); };
  const handleTeacherSelectionConfirm = () => { if (selectedTeacherIdsForReport.length === 0) { alert(t.selectTeachersToDownload); return; } setIsTeacherSelectionOpen(false); setIsWorkloadPreviewOpen(true); };
  const handleSelectAllTeachers = (e: React.ChangeEvent<HTMLInputElement>) => { setSelectedTeacherIdsForReport(e.target.checked ? teachers.map(t => t.id) : []); };
  const handleSelectTeacher = (id: string, isChecked: boolean) => { setSelectedTeacherIdsForReport(prev => isChecked ? [...prev, id] : prev.filter(teacherId => teacherId !== id)); };
  
  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  
  const TeacherSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsTeacherSelectionOpen(false)}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{t.selectTeachersToDownload}</h3>
        <div className="flex-grow border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg overflow-y-auto p-3 space-y-2">
            <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10">
                <input type="checkbox" className="form-checkbox text-[var(--accent-primary)] rounded" checked={teachers.length > 0 && selectedTeacherIdsForReport.length === teachers.length} onChange={handleSelectAllTeachers} />
                <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span>
            </label>
            {teachers.map(teacher => (
                <label key={teacher.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-md hover:bg-[var(--accent-secondary-hover)]">
                    <input type="checkbox" className="form-checkbox text-[var(--accent-primary)] rounded" checked={selectedTeacherIdsForReport.includes(teacher.id)} onChange={(e) => handleSelectTeacher(teacher.id, e.target.checked)} />
                    <span className="text-[var(--text-primary)]">{teacher.nameEn} / <span className="font-urdu">{teacher.nameUr}</span></span>
                </label>
            ))}
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-primary)] mt-6">
            <button onClick={() => setIsTeacherSelectionOpen(false)} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button>
            <button onClick={handleTeacherSelectionConfirm} disabled={selectedTeacherIdsForReport.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50">{t.workloadReport}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24">
       {isTeacherSelectionOpen && <TeacherSelectionModal />}
       
       {isAboutOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setIsAboutOpen(false)}>
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[var(--accent-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--accent-primary)]"><AboutIcon /></div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">About Mr. 🇵🇰</h3>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">Timetable Management System</p>
                    </div>
                    <div className="space-y-3">
                        <a href="https://wa.me/923009541797" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl transition-all group">
                            <div className="text-[#25D366]"><WhatsAppLogo /></div>
                            <div className="text-left"><div className="font-bold text-[var(--text-primary)]">Contact Support</div><div className="text-xs text-[var(--text-secondary)]">+92 300 9541797</div></div>
                        </a>
                        <a href="https://whatsapp.com/channel/0029VaU50UPADTOEpHNSJa0r" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl transition-all group">
                            <div className="text-[#25D366]"><BroadcastIcon /></div>
                            <div className="text-left"><div className="font-bold text-[var(--text-primary)]">WhatsApp Channel</div><div className="text-xs text-[var(--text-secondary)]">Stay updated with news</div></div>
                        </a>
                    </div>
                    <button onClick={() => setIsAboutOpen(false)} className="mt-6 w-full py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Close</button>
                </div>
            </div>
        )}

        {/* ... PrintPreviews ... */}
       <PrintPreview t={t} isOpen={isBasicInfoPreviewOpen} onClose={() => setIsBasicInfoPreviewOpen(false)} title={t.basicInformation} fileNameBase="Basic_Information" generateHtml={(lang, options) => generateBasicInformationHtml(t, lang, options, classes, teachers, schoolConfig)} onGenerateExcel={(lang, options) => generateBasicInformationExcel(t, lang, options, classes, teachers)} designConfig={schoolConfig.downloadDesigns.basicInfo} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, basicInfo: newDesign }})} />
        <PrintPreview t={t} isOpen={isWorkloadPreviewOpen} onClose={() => setIsWorkloadPreviewOpen(false)} title={t.workloadSummaryReport} fileNameBase="Teacher_Workload_Summary" generateHtml={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id)); return generateWorkloadSummaryHtml(t, lang, options, selectedTeachers, schoolConfig, classes, adjustments); }} onGenerateExcel={(lang, options) => { const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id)); generateWorkloadSummaryExcel(t, lang, options, selectedTeachers, classes, adjustments) }} designConfig={schoolConfig.downloadDesigns.teacher} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }})} />
        <PrintPreview t={t} isOpen={isByPeriodPreviewOpen} onClose={() => setIsByPeriodPreviewOpen(false)} title={t.byPeriod} fileNameBase="Free_Teachers_Report" generateHtml={(lang, options) => generateByPeriodHtml(t, lang, options, schoolConfig, classes, teachers)} onGenerateExcel={(lang, options) => generateByPeriodExcel(t, lang, options, schoolConfig, classes, teachers)} designConfig={schoolConfig.downloadDesigns.alternative} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, alternative: newDesign }})} />
        <PrintPreview t={t} isOpen={isSchoolTimingsPreviewOpen} onClose={() => setIsSchoolTimingsPreviewOpen(false)} title="School Timings" fileNameBase="School_Timings" generateHtml={(lang, options) => generateSchoolTimingsHtml(t, lang, options, schoolConfig)} designConfig={schoolConfig.downloadDesigns.schoolTimings} onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, schoolTimings: newDesign }})} />

      <div className="max-w-4xl mx-auto relative">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{t.settings}</h2>
            <button onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-full shadow-md hover:shadow-lg border border-[var(--border-secondary)] transition-all hover:scale-105 active:scale-95" title={language === 'en' ? "Switch to Urdu" : "Switch to English"}>
                <div className="p-1 bg-[var(--accent-secondary)] rounded-full text-[var(--accent-primary)]"><LanguageIcon /></div>
                <span className={`font-bold text-sm ${language === 'ur' ? 'font-urdu' : ''}`}>{language === 'en' ? 'English' : 'اردو'}</span>
            </button>
        </div>
        
        {feedback.message && <div className={`p-3 rounded-md text-sm mb-4 animate-scale-in ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">{feedback.message}</div>}

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsThemeOptionsOpen(!isThemeOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.theme}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isThemeOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-500 ${isThemeOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden"><div className="p-6 pt-0"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{themeOptions.map(themeInfo => (<ThemeCard key={themeInfo.id} themeInfo={themeInfo} currentTheme={theme} setTheme={setTheme} />))}</div></div></div>
            </div>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsInterfaceOptionsOpen(!isInterfaceOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Interface Settings</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isInterfaceOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-500 ${isInterfaceOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0 space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Global Font Size: {fontSize}px</label>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="10" max="16" step="1" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">App Font</label>
                                <select value={appFont} onChange={(e) => setAppFont(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-lg text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]" style={{ fontFamily: appFont === 'CustomAppFont' ? 'inherit' : appFont }}>
                                    {appFontOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value === 'CustomAppFont' ? 'inherit' : opt.value }}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="border-t border-[var(--border-secondary)] pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">Navigation Button Style</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-secondary)]">Show Button Labels</span>
                                    <button 
                                        onClick={() => setNavShowLabels(!navShowLabels)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 ${navShowLabels ? 'bg-[var(--accent-primary)]' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${navShowLabels ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {['classic', 'modern', 'minimal', '3d', 'neon', 'glass', 'gradient', 'outline'].map((design) => (
                                     <StyleOption 
                                        key={design}
                                        design={design as NavDesign} 
                                        isActive={navDesign === design} 
                                        onClick={() => setNavDesign(design as any)}
                                     />
                                ))}
                            </div>

                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Navigation Button Shape</label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                {['square', 'rounded', 'pill', 'circle', 'leaf'].map((shape) => (
                                     <label key={shape} className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border transition-all ${navShape === shape ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/20 ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                        <div className={`mb-2 bg-[var(--accent-primary)] shadow-sm 
                                            ${ shape === 'square' ? 'rounded-none w-8 h-8' : 
                                               shape === 'rounded' ? 'rounded-md w-8 h-8' : 
                                               shape === 'pill' ? 'rounded-full w-12 h-6' : 
                                               shape === 'circle' ? 'rounded-full w-8 h-8' : 
                                               shape === 'leaf' ? 'rounded-tr-2xl rounded-bl-2xl w-8 h-8' : '' 
                                            }`}></div>
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="navShape" checked={navShape === shape} onChange={() => setNavShape(shape as any)} className="hidden" />
                                            <span className="text-xs font-medium capitalize text-[var(--text-primary)]">{shape === 'pill' ? 'Bridge' : shape}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-[var(--border-secondary)] pt-4">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Navigation Position (Mobile)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={navPosition === 'bottom'} onChange={() => setNavPosition('bottom')} className="form-radio text-[var(--accent-primary)]" />
                                    <span className="text-[var(--text-primary)]">Bottom</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={navPosition === 'top'} onChange={() => setNavPosition('top')} className="form-radio text-[var(--accent-primary)]" />
                                    <span className="text-[var(--text-primary)]">Top</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
             <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsSchoolInfoOpen(!isSchoolInfoOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.schoolInformation}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isSchoolInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
             </button>
            <div className={`grid transition-all duration-500 ${isSchoolInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden"><div className="p-6 pt-0 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label htmlFor="schoolNameEn" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameEn}</label><input type="text" id="schoolNameEn" value={localSchoolNameEn} onChange={(e) => setLocalSchoolNameEn(e.target.value)} className={inputStyleClasses} /></div><div><label htmlFor="schoolNameUr" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameUr}</label><input type="text" id="schoolNameUr" value={localSchoolNameUr} onChange={(e) => setLocalSchoolNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu`} dir="rtl" /></div></div><div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">School Logo</label><div className="flex items-center gap-4"><div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-md flex items-center justify-center border-2 border-dashed border-[var(--border-secondary)] overflow-hidden">{localSchoolLogo ? <img src={localSchoolLogo} alt="School Logo Preview" className="w-full h-full object-contain" /> : <span className="text-xs text-center text-[var(--text-placeholder)]">No Logo</span>}</div><div className="flex flex-col gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm hover:bg-[var(--accent-secondary-hover)] border border-[var(--border-secondary)]">Upload Logo</button>{localSchoolLogo && <button onClick={handleRemoveLogo} className="px-4 py-2 text-sm font-semibold text-red-600 rounded-md hover:bg-red-50">Remove</button>}</div></div></div></div></div>
            </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.printViewAction}</h3>
            <div className="flex flex-wrap gap-4">
                <button onClick={() => setIsBasicInfoPreviewOpen(true)} className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.basicInformation}</button>
                <button onClick={handleWorkloadReportClick} disabled={teachers.length === 0} className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors disabled:opacity-50">{t.workloadReport}</button>
                <button onClick={() => setIsByPeriodPreviewOpen(true)} className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors">{t.byPeriod}</button>
                <button onClick={() => setIsSchoolTimingsPreviewOpen(true)} className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors">School Timings</button>
            </div>
        </div>
        
        <div className="flex justify-end items-center mt-8">
            <button onClick={handleSettingsSave} className="group flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0">
                <span className="font-semibold text-sm tracking-wide">{t.saveSettings}</span>
                <SaveIcon />
            </button>
        </div>

        <button onClick={() => setIsAboutOpen(true)} className="fixed bottom-24 xl:bottom-8 right-6 p-3 bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:bg-[var(--accent-primary-hover)] transition-all z-40 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]" title="About & Contact"><AboutIcon /></button>
      </div>
    </div>
  );
};

export default SettingsPage;
