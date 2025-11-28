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
  fontSize: number;
  setFontSize: (size: number) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newSchoolConfig: Partial<SchoolConfig>) => void;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  adjustments: Record<string, Adjustment[]>;
}

const themeOptions: { id: Theme; name: string; colors: [string, string, string] }[] = [
    { id: 'light', name: 'Light', colors: ['#f9fafb', '#0d9488', '#1f2937'] },
    { id: 'dark', name: 'Dark', colors: ['#111827', '#2dd4bf', '#f9fafb'] },
    { id: 'contrast', name: 'Contrast', colors: ['#ffffff', '#0000ff', '#000000'] },
    { id: 'mint', name: 'Mint', colors: ['#f0fdfa', '#0d9488', '#064e3b'] },
    { id: 'ocean', name: 'Ocean', colors: ['#f0f9ff', '#0284c7', '#0c4a6e'] },
    { id: 'sunset', name: 'Sunset', colors: ['#fff7ed', '#ea580c', '#7c2d12'] },
    { id: 'rose', name: 'Rose', colors: ['#fff1f2', '#e11d48', '#881337'] },
    { id: 'amoled', name: 'Amoled', colors: ['#000000', '#00e5ff', '#e0e0e0'] },
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
    { label: 'Modern (Lato)', value: 'Lato' },
    { label: 'Clean (Roboto)', value: 'Roboto' },
    { label: 'Standard (Open Sans)', value: 'Open Sans' },
    { label: 'Elegant (Montserrat)', value: 'Montserrat' },
    { label: 'Formal (Times New Roman)', value: 'Times New Roman' },
    { label: 'Classic (Merriweather)', value: 'Merriweather' },
    { label: 'System (Arial)', value: 'Arial' },
    { label: 'Urdu (Nastaliq)', value: 'Noto Nastaliq Urdu' },
    { label: 'Urdu (Jameel Noori)', value: 'Jameel Noori Nastaleeq' },
    { label: 'Urdu (Jameel Kasheeda)', value: 'Jameel Noori Nastaleeq Kasheeda' },
    { label: 'Urdu (Gulzar)', value: 'Gulzar' },
    { label: 'Arabic/Urdu (Lateef)', value: 'Lateef' },
    { label: 'Arabic (Amiri)', value: 'Amiri' },
    { label: 'Arabic (Almarai)', value: 'Almarai' },
    { label: 'Arabic (Scheherazade)', value: 'Scheherazade New' },
    { label: 'Arabic (Reem Kufi)', value: 'Reem Kufi' },
    { label: 'Arabic (Aref Ruqaa)', value: 'Aref Ruqaa' },
];

const ThemeCard: React.FC<{
    themeInfo: typeof themeOptions[0],
    currentTheme: Theme,
    setTheme: (theme: Theme) => void,
}> = ({ themeInfo, currentTheme, setTheme }) => {
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
            {/* Glass overlay */}
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

const SettingsPanel: React.FC<{
    options: DownloadDesignConfig,
    setOptions: React.Dispatch<React.SetStateAction<DownloadDesignConfig>>,
    onSaveDesign: (options: DownloadDesignConfig) => void,
    resetToDefaults: () => void,
}> = ({ options, setOptions, onSaveDesign, resetToDefaults }) => {
    const [activeTab, setActiveTab] = useState<'page' | 'header' | 'table' | 'footer'>('page');

    const handleValueChange = (path: string, value: any) => {
        setOptions(prev => {
            const newOptions = JSON.parse(JSON.stringify(prev)); // Deep copy
            const keys = path.split('.');
            let current: any = newOptions;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newOptions;
        });
    };

    const NumberControl = ({ label, path, value, min = 0, max = 100, step = 1, unit = 'px' }: any) => (
        <div className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-200">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-700">{label}</label>
                <span className="text-xs text-gray-500">{unit}</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handleValueChange(path, Math.max(min, parseFloat((value - step).toFixed(2))))}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold transition-colors"
                >-</button>
                <input 
                    type="number" 
                    value={value} 
                    onChange={(e) => {
                        let val = parseFloat(e.target.value);
                        if (isNaN(val)) val = min;
                        handleValueChange(path, Math.min(max, Math.max(min, val)));
                    }}
                    className="flex-grow text-center text-sm font-mono bg-gray-50 py-1 rounded border border-gray-200 w-16 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <button 
                    onClick={() => handleValueChange(path, Math.min(max, parseFloat((value + step).toFixed(2))))}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold transition-colors"
                >+</button>
            </div>
        </div>
    );

    const SelectControl = ({ label, path, value, options: opts }: any) => (
        <div className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-200">
             <label className="text-xs font-semibold text-gray-700">{label}</label>
             <select value={value} onChange={e => handleValueChange(path, e.target.value)} className="h-8 bg-gray-50 border border-gray-300 rounded text-xs px-2 focus:ring-teal-500 focus:border-teal-500 w-full">
                {opts.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
             </select>
        </div>
    );
    
    const ColorControl = ({ label, path, value }: any) => (
        <div className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-gray-200">
             <label className="text-xs font-semibold text-gray-700">{label}</label>
             <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded border border-gray-300" style={{ backgroundColor: value }}></div>
                <input 
                    type="color" 
                    value={value} 
                    onChange={e => handleValueChange(path, e.target.value)} 
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
             </div>
        </div>
    );
    
    const ToggleControl = ({ label, path, value }: any) => (
        <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 h-full">
             <label htmlFor={path} className="text-xs font-semibold text-gray-700 cursor-pointer select-none flex-grow">{label}</label>
             <div className="relative inline-block w-10 flex-shrink-0 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name={path} id={path} checked={value} onChange={e => handleValueChange(path, e.target.checked)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5 border-gray-300 checked:border-teal-500"/>
                <label htmlFor={path} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${value ? 'bg-teal-500' : 'bg-gray-300'}`}></label>
            </div>
        </div>
    );

    const tabs = [
        { id: 'page', label: 'Page Layout' },
        { id: 'header', label: 'Header' },
        { id: 'table', label: 'Table Style' },
        { id: 'footer', label: 'Footer' },
    ];

    return (
        <div className="bg-gray-100 text-gray-800 border-b border-gray-300 shadow-sm flex flex-col w-full max-h-[70dvh] sm:max-h-[60vh]">
            <div className="flex border-b border-gray-300 bg-white">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-4 pb-24 overflow-y-auto custom-scrollbar flex-grow min-h-0 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {activeTab === 'page' && (
                        <>
                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-1 mb-1">General</div>
                            <NumberControl label="Rows Per Page" path="rowsPerPage" value={options.rowsPerPage} min={5} max={100} unit="rows" />
                            <SelectControl label="Color Mode" path="colorMode" value={options.colorMode} options={[{value: 'color', label: 'Color'}, {value: 'bw', label: 'Black & White'}]} />
                            
                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-2 mb-1">Paper</div>
                            <SelectControl label="Size" path="page.size" value={options.page.size} options={[{value: 'a4', label: 'A4'}, {value: 'letter', label: 'Letter'}, {value: 'legal', label: 'Legal'}]} />
                            <SelectControl label="Orientation" path="page.orientation" value={options.page.orientation} options={[{value: 'portrait', label: 'Portrait'}, {value: 'landscape', label: 'Landscape'}]} />
                            <NumberControl label="Watermark Opacity" path="page.watermarkOpacity" value={options.page.watermarkOpacity} min={0} max={1} step={0.05} unit="" />

                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-2 mb-1">Margins</div>
                            <NumberControl label="Top" path="page.margins.top" value={options.page.margins.top} min={0} max={50} unit="mm" />
                            <NumberControl label="Bottom" path="page.margins.bottom" value={options.page.margins.bottom} min={0} max={50} unit="mm" />
                            <NumberControl label="Left" path="page.margins.left" value={options.page.margins.left} min={0} max={50} unit="mm" />
                            <NumberControl label="Right" path="page.margins.right" value={options.page.margins.right} min={0} max={50} unit="mm" />
                        </>
                    )}

                    {activeTab === 'header' && (
                        <>
                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-2 mb-1">School Name</div>
                            <SelectControl label="Font Family" path="header.schoolName.fontFamily" value={options.header.schoolName.fontFamily} options={fontOptions} />
                            <NumberControl label="Font Size" path="header.schoolName.fontSize" value={options.header.schoolName.fontSize} min={10} max={60} />
                            <SelectControl label="Alignment" path="header.schoolName.align" value={options.header.schoolName.align} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} />
                            <ColorControl label="Color" path="header.schoolName.color" value={options.header.schoolName.color} />

                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-2 mb-1">Details & Logo</div>
                            <SelectControl label="Details Font" path="header.details.fontFamily" value={options.header.details.fontFamily} options={fontOptions} />
                            <NumberControl label="Details Size" path="header.details.fontSize" value={options.header.details.fontSize} min={8} max={24} />
                            
                            <ToggleControl label="Show Logo" path="header.showLogo" value={options.header.showLogo} />
                            <NumberControl label="Logo Size" path="header.logoSize" value={options.header.logoSize} min={20} max={200} />
                            <SelectControl label="Logo Position" path="header.logoPosition" value={options.header.logoPosition} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} />
                            
                            <div className="col-span-full font-bold text-xs text-gray-500 uppercase mt-2 mb-1">Report Title</div>
                            <ToggleControl label="Show Title" path="header.showTitle" value={options.header.showTitle} />
                            <NumberControl label="Title Size" path="header.title.fontSize" value={options.header.title.fontSize} min={10} max={40} />
                            <ToggleControl label="Show Divider" path="header.divider" value={options.header.divider} />
                        </>
                    )}

                    {activeTab === 'table' && (
                        <>
                            <SelectControl label="Content Font" path="table.fontFamily" value={options.table.fontFamily} options={fontOptions} />
                            <NumberControl label="Font Size" path="table.fontSize" value={options.table.fontSize} min={8} max={24} />
                            <NumberControl label="Cell Padding" path="table.cellPadding" value={options.table.cellPadding} min={0} max={20} />
                            
                            <ColorControl label="Header BG" path="table.headerBgColor" value={options.table.headerBgColor} />
                            <ColorControl label="Header Text" path="table.headerColor" value={options.table.headerColor} />
                            <ColorControl label="Body BG" path="table.bodyBgColor" value={options.table.bodyBgColor} />
                            <ColorControl label="Body Text" path="table.bodyColor" value={options.table.bodyColor || '#000000'} />
                            <ColorControl label="Striped Row BG" path="table.altRowColor" value={options.table.altRowColor} />
                            <ColorControl label="Borders" path="table.borderColor" value={options.table.borderColor} />
                            
                            <NumberControl label="Period Width" path="table.periodColumnWidth" value={options.table.periodColumnWidth} min={20} max={100} />
                            <ColorControl label="Period BG" path="table.periodColumnBgColor" value={options.table.periodColumnBgColor} />
                        </>
                    )}

                    {activeTab === 'footer' && (
                        <>
                            <ToggleControl label="Show Footer" path="footer.show" value={options.footer.show} />
                            <SelectControl label="Font" path="footer.fontFamily" value={options.footer.fontFamily} options={fontOptions} />
                            <NumberControl label="Font Size" path="footer.fontSize" value={options.footer.fontSize} min={8} max={20} />
                            <SelectControl label="Align" path="footer.align" value={options.footer.align} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} />
                            <ToggleControl label="Page Numbers" path="footer.includePageNumber" value={options.footer.includePageNumber} />
                            <ColorControl label="Text Color" path="footer.color" value={options.footer.color} />
                        </>
                    )}
                </div>
            </div>
            <div className="p-3 border-t border-gray-300 bg-gray-100 flex justify-end gap-3 flex-shrink-0 z-20 relative">
                 <button onClick={resetToDefaults} className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"><ResetIcon /> Reset</button>
                 <button onClick={() => onSaveDesign(options)} className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-sm">Apply & Save</button>
            </div>
        </div>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({
  t,
  language,
  setLanguage,
  theme,
  setTheme,
  navPosition,
  setNavPosition,
  navDesign,
  setNavDesign,
  navShape,
  setNavShape,
  fontSize,
  setFontSize,
  schoolConfig,
  onUpdateSchoolConfig,
  classes,
  teachers,
  subjects,
  adjustments
}) => {
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
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert("File is too large. Please select an image smaller than 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSchoolLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = ''; // Reset file input
  };
  
  const handleRemoveLogo = () => {
      setLocalSchoolLogo(null);
  };

  const handleSettingsSave = () => {
    onUpdateSchoolConfig({
      schoolNameEn: localSchoolNameEn,
      schoolNameUr: localSchoolNameUr,
      schoolLogoBase64: localSchoolLogo,
    });
    setFeedback({ message: t.schoolInfoSaved, type: 'success' });
    setTimeout(() => setFeedback({ message: '', type: null }), 3000);
  };

  const handleWorkloadReportClick = () => {
    setSelectedTeacherIdsForReport(teachers.map(t => t.id));
    setIsTeacherSelectionOpen(true);
  };

  const handleTeacherSelectionConfirm = () => {
    if (selectedTeacherIdsForReport.length === 0) {
        alert(t.selectTeachersToDownload);
        return;
    }
    setIsTeacherSelectionOpen(false);
    setIsWorkloadPreviewOpen(true);
  };

  const handleSelectAllTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTeacherIdsForReport(e.target.checked ? teachers.map(t => t.id) : []);
  };

  const handleSelectTeacher = (id: string, isChecked: boolean) => {
    setSelectedTeacherIdsForReport(prev => isChecked ? [...prev, id] : prev.filter(teacherId => teacherId !== id));
  };
  
  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  
  const TeacherSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsTeacherSelectionOpen(false)}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{t.selectTeachersToDownload}</h3>
        <div className="flex-grow border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg overflow-y-auto p-3 space-y-2">
            <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10">
                <input
                    type="checkbox"
                    className="form-checkbox text-[var(--accent-primary)] rounded"
                    checked={teachers.length > 0 && selectedTeacherIdsForReport.length === teachers.length}
                    onChange={handleSelectAllTeachers}
                />
                <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span>
            </label>
            {teachers.map(teacher => (
                <label key={teacher.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-md hover:bg-[var(--accent-secondary-hover)]">
                    <input
                        type="checkbox"
                        className="form-checkbox text-[var(--accent-primary)] rounded"
                        checked={selectedTeacherIdsForReport.includes(teacher.id)}
                        onChange={(e) => handleSelectTeacher(teacher.id, e.target.checked)}
                    />
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
       
       {/* About Modal */}
       {isAboutOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 animate-fade-in" onClick={() => setIsAboutOpen(false)}>
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[var(--accent-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--accent-primary)]">
                            <AboutIcon />
                        </div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">About Mr. 🇵🇰</h3>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">Timetable Management System</p>
                    </div>
                    
                    <div className="space-y-3">
                        <a href="https://wa.me/923009541797" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl transition-all group">
                            <div className="text-[#25D366]"><WhatsAppLogo /></div>
                            <div className="text-left">
                                <div className="font-bold text-[var(--text-primary)]">Contact Support</div>
                                <div className="text-xs text-[var(--text-secondary)]">+92 300 9541797</div>
                            </div>
                        </a>
                        
                        <a href="https://whatsapp.com/channel/0029VaU50UPADTOEpHNSJa0r" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl transition-all group">
                            <div className="text-[#25D366]"><BroadcastIcon /></div>
                            <div className="text-left">
                                <div className="font-bold text-[var(--text-primary)]">WhatsApp Channel</div>
                                <div className="text-xs text-[var(--text-secondary)]">Stay updated with news</div>
                            </div>
                        </a>
                    </div>

                    <button onClick={() => setIsAboutOpen(false)} className="mt-6 w-full py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            </div>
        )}

       <PrintPreview
            t={t}
            isOpen={isBasicInfoPreviewOpen}
            onClose={() => setIsBasicInfoPreviewOpen(false)}
            title={t.basicInformation}
            fileNameBase="Basic_Information"
            generateHtml={(lang, options) => generateBasicInformationHtml(t, lang, options, classes, teachers, schoolConfig)}
            onGenerateExcel={(lang, options) => generateBasicInformationExcel(t, lang, options, classes, teachers)}
            designConfig={schoolConfig.downloadDesigns.basicInfo}
            onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, basicInfo: newDesign }})}
        />
        <PrintPreview
            t={t}
            isOpen={isWorkloadPreviewOpen}
            onClose={() => setIsWorkloadPreviewOpen(false)}
            title={t.workloadSummaryReport}
            fileNameBase="Teacher_Workload_Summary"
            generateHtml={(lang, options) => {
              const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id));
              return generateWorkloadSummaryHtml(t, lang, options, selectedTeachers, schoolConfig, classes, adjustments);
            }}
            onGenerateExcel={(lang, options) => {
              const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id));
              generateWorkloadSummaryExcel(t, lang, options, selectedTeachers, classes, adjustments)
            }}
            designConfig={schoolConfig.downloadDesigns.teacher}
            onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, teacher: newDesign }})}
        />
        <PrintPreview
            t={t}
            isOpen={isByPeriodPreviewOpen}
            onClose={() => setIsByPeriodPreviewOpen(false)}
            title={t.byPeriod}
            fileNameBase="Free_Teachers_Report"
            generateHtml={(lang, options) => generateByPeriodHtml(t, lang, options, schoolConfig, classes, teachers)}
            onGenerateExcel={(lang, options) => generateByPeriodExcel(t, lang, options, schoolConfig, classes, teachers)}
            designConfig={schoolConfig.downloadDesigns.alternative}
            onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, alternative: newDesign }})}
        />
        
        <PrintPreview
            t={t}
            isOpen={isSchoolTimingsPreviewOpen}
            onClose={() => setIsSchoolTimingsPreviewOpen(false)}
            title="School Timings"
            fileNameBase="School_Timings"
            generateHtml={(lang, options) => generateSchoolTimingsHtml(t, lang, options, schoolConfig)}
            designConfig={schoolConfig.downloadDesigns.schoolTimings}
            onSaveDesign={(newDesign) => onUpdateSchoolConfig({ downloadDesigns: { ...schoolConfig.downloadDesigns, schoolTimings: newDesign }})}
        />


      <div className="max-w-4xl mx-auto relative">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{t.settings}</h2>
            <button 
                onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-full shadow-md hover:shadow-lg border border-[var(--border-secondary)] transition-all hover:scale-105 active:scale-95"
                title={language === 'en' ? "Switch to Urdu" : "Switch to English"}
            >
                <div className="p-1 bg-[var(--accent-secondary)] rounded-full text-[var(--accent-primary)]">
                    <LanguageIcon />
                </div>
                <span className={`font-bold text-sm ${language === 'ur' ? 'font-urdu' : ''}`}>
                    {language === 'en' ? 'English' : 'اردو'}
                </span>
            </button>
        </div>
        
        {feedback.message && (
            <div className={`p-3 rounded-md text-sm mb-4 animate-scale-in ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
                {feedback.message}
            </div>
        )}

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsThemeOptionsOpen(!isThemeOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.theme}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isThemeOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`grid transition-all duration-500 ${isThemeOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {themeOptions.map(themeInfo => (
                                <ThemeCard key={themeInfo.id} themeInfo={themeInfo} currentTheme={theme} setTheme={setTheme} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsInterfaceOptionsOpen(!isInterfaceOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Interface Settings</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isInterfaceOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`grid transition-all duration-500 ${isInterfaceOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0 space-y-6">
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Global Font Size: {fontSize}px</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="16" 
                                    step="1" 
                                    value={fontSize} 
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                                />
                            </div>
                        </div>
                        
                        <div className="border-t border-[var(--border-secondary)] pt-4">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Navigation Button Style</label>
                            
                            {/* Design Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {['classic', 'modern', 'minimal', '3d', 'neon', 'glass', 'gradient', 'outline'].map((design) => (
                                     <label key={design} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${navDesign === design ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/20' : 'border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="navDesign" checked={navDesign === design} onChange={() => setNavDesign(design as any)} className="form-radio text-[var(--accent-primary)]" />
                                            <span className="text-sm font-medium capitalize text-[var(--text-primary)]">{design}</span>
                                        </div>
                                        {navDesign === design && <div className="text-[var(--accent-primary)]"><CheckIcon /></div>}
                                    </label>
                                ))}
                            </div>

                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Navigation Button Shape</label>
                            {/* Shape Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                {['square', 'rounded', 'pill', 'circle', 'leaf'].map((shape) => (
                                     <label key={shape} className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border transition-all ${navShape === shape ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]/20' : 'border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                        <div className={`w-8 h-8 bg-[var(--accent-primary)] mb-2 ${
                                            shape === 'square' ? 'rounded-none' : 
                                            shape === 'rounded' ? 'rounded-md' : 
                                            shape === 'pill' ? 'rounded-full w-12' : 
                                            shape === 'circle' ? 'rounded-full' :
                                            shape === 'leaf' ? 'rounded-tr-xl rounded-bl-xl' : ''
                                        }`}></div>
                                        <div className="flex items-center gap-2">
                                            <input type="radio" name="navShape" checked={navShape === shape} onChange={() => setNavShape(shape as any)} className="hidden" />
                                            <span className="text-xs font-medium capitalize text-[var(--text-primary)]">{shape}</span>
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
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isSchoolInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
             </button>
            <div className={`grid transition-all duration-500 ${isSchoolInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden"><div className="p-6 pt-0 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label htmlFor="schoolNameEn" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameEn}</label><input type="text" id="schoolNameEn" value={localSchoolNameEn} onChange={(e) => setLocalSchoolNameEn(e.target.value)} className={inputStyleClasses} /></div><div><label htmlFor="schoolNameUr" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameUr}</label><input type="text" id="schoolNameUr" value={localSchoolNameUr} onChange={(e) => setLocalSchoolNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu`} dir="rtl" /></div></div><div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">School Logo</label><div className="flex items-center gap-4"><div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-md flex items-center justify-center border-2 border-dashed border-[var(--border-secondary)] overflow-hidden">{localSchoolLogo ? <img src={localSchoolLogo} alt="School Logo Preview" className="w-full h-full object-contain" /> : <span className="text-xs text-center text-[var(--text-placeholder)]">No Logo</span>}</div><div className="flex flex-col gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm hover:bg-[var(--accent-secondary-hover)] border border-[var(--border-secondary)]">Upload Logo</button>{localSchoolLogo && <button onClick={handleRemoveLogo} className="px-4 py-2 text-sm font-semibold text-red-600 rounded-md hover:bg-red-50">Remove</button>}</div></div></div></div></div>
            </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.printViewAction}</h3>
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setIsBasicInfoPreviewOpen(true)}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors"
                >
                    {t.basicInformation}
                </button>
                <button
                    onClick={handleWorkloadReportClick}
                    disabled={teachers.length === 0}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors disabled:opacity-50"
                >
                    {t.workloadReport}
                </button>
                <button
                    onClick={() => setIsByPeriodPreviewOpen(true)}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors"
                >
                    {t.byPeriod}
                </button>
                <button
                    onClick={() => setIsSchoolTimingsPreviewOpen(true)}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors"
                >
                    School Timings
                </button>
            </div>
        </div>
        
        <div className="flex justify-end items-center mt-8">
            <button 
                onClick={handleSettingsSave} 
                className="group flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
                <span className="font-semibold text-sm tracking-wide">{t.saveSettings}</span>
                <SaveIcon />
            </button>
        </div>

        {/* Floating About Button */}
        <button 
            onClick={() => setIsAboutOpen(true)}
            className="fixed bottom-24 xl:bottom-8 right-6 p-3 bg-[var(--accent-primary)] text-white rounded-full shadow-lg hover:bg-[var(--accent-primary-hover)] transition-all z-40 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
            title="About & Contact"
        >
            <AboutIcon />
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;