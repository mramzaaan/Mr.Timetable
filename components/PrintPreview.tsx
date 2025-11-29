
import React, { useState, useEffect, useRef } from 'react';
import type { DownloadLanguage, DownloadDesignConfig, FontFamily } from '../types';

declare const html2canvas: any;
declare const jspdf: any;

interface PrintPreviewProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  generateHtml: (lang: DownloadLanguage, design: DownloadDesignConfig) => string | string[];
  onGenerateExcel?: (lang: DownloadLanguage, design: DownloadDesignConfig) => void;
  fileNameBase: string;
  children?: React.ReactNode;
  designConfig: DownloadDesignConfig;
  onSaveDesign: (newDesign: DownloadDesignConfig) => void;
}

// ... (Icon Components remain the same - abbreviated for brevity)
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>;
const ExcelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1-1H3a1 1 0 01-1-1V3zm2 2v2h3V5H4zm0 3v2h3V8H4zm0 3v2h3v-2H4zm4 2v-2h3v2H8zm0-3v-2h3v2H8zm0-3V5h3v3H8zm4 5v-2h3v2h-3zm0-3v-2h3v2h-3zm0-3V5h3v3h-3z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const AlignLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 15h12v2H3v-2zm0-5h18v2H3v-2zm0-5h12v2H3V9z"/></svg>;
const AlignCenterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm2 15h14v2H5v-2zm-2-5h18v2H3v-2zm2-5h14v2H5V9z"/></svg>;
const AlignRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 15h12v2H9v-2zm-6-5h18v2H3v-2zm6-5h12v2H9V9z"/></svg>;
const BoldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-1v1h1a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm5 6h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-3v4zm0 8h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-3v4z"/></svg>;
const ItalicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>;

const fontOptions: { label: string, value: FontFamily }[] = [
    { label: 'System Default', value: 'sans-serif' as FontFamily },
    { label: 'Gulzar (Urdu)', value: 'Gulzar' as FontFamily },
    { label: 'Noto Nastaliq Urdu (Google)', value: 'Noto Nastaliq Urdu' as FontFamily },
    { label: 'Amiri (Naskh)', value: 'Amiri' as FontFamily },
    { label: 'Aref Ruqaa (Calligraphic)', value: 'Aref Ruqaa' as FontFamily },
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

const SettingsPanel: React.FC<{
    options: DownloadDesignConfig,
    setOptions: React.Dispatch<React.SetStateAction<DownloadDesignConfig>>,
    onSaveDesign: (options: DownloadDesignConfig) => void,
    resetToDefaults: () => void,
}> = ({ options, setOptions, onSaveDesign, resetToDefaults }) => {
    // ... (Implementation remains identical to original file, omitted for brevity)
    // Please assume full implementation of SettingsPanel here from the provided file content
    const [activeTab, setActiveTab] = useState<'page' | 'header' | 'table' | 'footer'>('page');

    const handleValueChange = (path: string, value: any) => {
        setOptions(prev => {
            const newOptions = JSON.parse(JSON.stringify(prev)); 
            const keys = path.split('.');
            let current: any = newOptions;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newOptions;
        });
    };

    // ... Controls (NumberControl, SelectControl, etc.) definitions ...
    const NumberControl = ({ label, path, value, min = 0, max = 100, step = 1 }: any) => (
        <div className="flex flex-col justify-between bg-white p-1 rounded border border-gray-200 shadow-sm h-full min-h-[34px]">
            <div className="flex justify-between items-start mb-0.5">
                <label className="text-[9px] font-extrabold text-gray-600 uppercase tracking-tight leading-none break-words w-full truncate" title={label}>{label}</label>
            </div>
            <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-0 overflow-hidden h-5 w-full">
                <button onClick={() => handleValueChange(path, Math.max(min, parseFloat((value - step).toFixed(2))))} className="w-4 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 text-[9px] font-bold h-full border-r border-gray-200">-</button>
                <input type="number" value={value} onChange={(e) => { let val = parseFloat(e.target.value); if (isNaN(val)) val = min; handleValueChange(path, Math.min(max, Math.max(min, val))); }} className="flex-grow w-0 text-center text-[10px] font-bold text-gray-800 bg-transparent outline-none p-0 appearance-none m-0 leading-none" />
                <button onClick={() => handleValueChange(path, Math.min(max, parseFloat((value + step).toFixed(2))))} className="w-4 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 text-[9px] font-bold h-full border-l border-gray-200">+</button>
            </div>
        </div>
    );
    const SelectControl = ({ label, path, value, options: opts }: any) => {
        const isFont = path.toLowerCase().includes('font');
        return (
            <div className="flex flex-col justify-between bg-white p-1 rounded border border-gray-200 shadow-sm h-full min-h-[34px]">
                 <label className="text-[9px] font-extrabold text-gray-600 uppercase tracking-tight leading-none mb-0.5 break-words w-full truncate" title={label}>{label}</label>
                 <div className="relative w-full">
                     <select value={value} onChange={e => handleValueChange(path, e.target.value)} className={`w-full h-5 bg-gray-50 border border-gray-200 rounded text-[10px] font-medium px-0.5 py-0 focus:ring-1 focus:ring-teal-500 outline-none leading-none ${isFont ? 'cursor-pointer' : ''}`} style={isFont ? { fontFamily: value } : {}}>
                        {opts.map((o: any) => (<option key={o.value} value={o.value} style={isFont ? { fontFamily: o.value, fontSize: '12px' } : {}}>{o.label}</option>))}
                     </select>
                 </div>
            </div>
        );
    };
    const TextControl = ({ label, path, value }: any) => ( <div className="flex flex-col justify-between bg-white p-1 rounded border border-gray-200 shadow-sm h-full min-h-[34px]"> <div className="flex justify-between items-start mb-0.5"> <label className="text-[9px] font-extrabold text-gray-600 uppercase tracking-tight leading-none break-words w-full truncate" title={label}>{label}</label> </div> <input type="text" value={value} onChange={(e) => handleValueChange(path, e.target.value)} className="w-full h-5 bg-gray-50 border border-gray-200 rounded text-[10px] font-medium px-1 py-0 focus:ring-1 focus:ring-teal-500 outline-none leading-none" /> </div> );
    const ColorControl = ({ label, path, value }: any) => ( <div className="flex flex-col justify-between bg-white p-1 rounded border border-gray-200 shadow-sm h-full min-h-[34px]"> <label className="text-[9px] font-extrabold text-gray-600 uppercase tracking-tight leading-none mb-0.5 break-words w-full truncate" title={label}>{label}</label> <div className="relative w-full h-5 rounded border border-gray-300 overflow-hidden"> <div className="absolute inset-0" style={{ backgroundColor: value }}></div> <input type="color" value={value} onChange={e => handleValueChange(path, e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" /> </div> </div> );
    const ToggleControl = ({ label, path, value }: any) => ( <div className="flex flex-col justify-between bg-white p-1 rounded border border-gray-200 shadow-sm h-full min-h-[34px]"> <label htmlFor={path} className="text-[9px] font-extrabold text-gray-600 uppercase tracking-tight leading-none mb-0.5 break-words cursor-pointer w-full truncate" title={label}>{label}</label> <div className="relative w-full h-5 flex items-center justify-between"> <div className="relative inline-block w-6 h-3.5 align-middle select-none transition duration-200 ease-in"> <input type="checkbox" name={path} id={path} checked={value} onChange={e => handleValueChange(path, e.target.checked)} className="toggle-checkbox absolute block w-3.5 h-3.5 rounded-full bg-white border border-gray-300 appearance-none cursor-pointer checked:right-0 right-2.5 checked:border-teal-500"/> <label htmlFor={path} className={`toggle-label block overflow-hidden h-3.5 rounded-full cursor-pointer ${value ? 'bg-teal-500' : 'bg-gray-300'}`}></label> </div> <span className="text-[8px] font-bold text-gray-500">{value ? 'ON' : 'OFF'}</span> </div> </div> );

    const tabs = [ { id: 'page', label: 'Layout' }, { id: 'header', label: 'Header' }, { id: 'table', label: 'Table' }, { id: 'footer', label: 'Footer' }, ];
    const sectionHeaderClass = "col-span-full font-black text-[9px] text-gray-400 uppercase mt-1 mb-0.5 tracking-widest border-b border-gray-200 pb-0.5";

    return (
        <div className="bg-gray-100 text-gray-800 border-b border-gray-300 shadow-sm flex flex-col w-full max-h-[50vh] sm:max-h-[60vh]">
            <div className="flex border-b border-gray-300 bg-white overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-2 px-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}>{tab.label}</button>
                ))}
            </div>
            <div className="p-2 pb-16 overflow-y-auto custom-scrollbar flex-grow min-h-0 bg-gray-50">
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                    {activeTab === 'page' && ( <> <div className={sectionHeaderClass}>General</div> <NumberControl label="Rows" path="rowsPerPage" value={options.rowsPerPage} min={5} max={100} /> <SelectControl label="Mode" path="colorMode" value={options.colorMode} options={[{value: 'color', label: 'Color'}, {value: 'bw', label: 'B&W'}]} /> <div className={sectionHeaderClass}>Paper</div> <SelectControl label="Size" path="page.size" value={options.page.size} options={[{value: 'a4', label: 'A4'}, {value: 'letter', label: 'Letter'}, {value: 'legal', label: 'Legal'}]} /> <SelectControl label="Orient" path="page.orientation" value={options.page.orientation} options={[{value: 'portrait', label: 'Port'}, {value: 'landscape', label: 'Land'}]} /> <NumberControl label="Watermark" path="page.watermarkOpacity" value={options.page.watermarkOpacity} min={0} max={1} step={0.05} /> <div className={sectionHeaderClass}>Margins</div> <NumberControl label="Top" path="page.margins.top" value={options.page.margins.top} min={0} max={50} /> <NumberControl label="Bottom" path="page.margins.bottom" value={options.page.margins.bottom} min={0} max={50} /> <NumberControl label="Left" path="page.margins.left" value={options.page.margins.left} min={0} max={50} /> <NumberControl label="Right" path="page.margins.right" value={options.page.margins.right} min={0} max={50} /> </> )}
                    {activeTab === 'header' && ( <> <div className={sectionHeaderClass}>Name</div> <SelectControl label="Font" path="header.schoolName.fontFamily" value={options.header.schoolName.fontFamily} options={fontOptions} /> <NumberControl label="Size" path="header.schoolName.fontSize" value={options.header.schoolName.fontSize} min={10} max={60} /> <SelectControl label="Align" path="header.schoolName.align" value={options.header.schoolName.align} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} /> <ColorControl label="Color" path="header.schoolName.color" value={options.header.schoolName.color} /> <div className={sectionHeaderClass}>Details</div> <SelectControl label="Font" path="header.details.fontFamily" value={options.header.details.fontFamily} options={fontOptions} /> <NumberControl label="Size" path="header.details.fontSize" value={options.header.details.fontSize} min={8} max={24} /> <ColorControl label="Bg" path="header.bgColor" value={options.header.bgColor} /> <div className={sectionHeaderClass}>Logo</div> <ToggleControl label="Show" path="header.showLogo" value={options.header.showLogo} /> <NumberControl label="Size" path="header.logoSize" value={options.header.logoSize} min={20} max={200} /> <SelectControl label="Pos" path="header.logoPosition" value={options.header.logoPosition} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} /> <div className={sectionHeaderClass}>Title</div> <ToggleControl label="Show" path="header.showTitle" value={options.header.showTitle} /> <NumberControl label="Size" path="header.title.fontSize" value={options.header.title.fontSize} min={10} max={40} /> <ToggleControl label="Line" path="header.divider" value={options.header.divider} /> </> )}
                    {activeTab === 'table' && ( <> <div className={sectionHeaderClass}>Content</div> <SelectControl label="Font" path="table.fontFamily" value={options.table.fontFamily} options={fontOptions} /> <NumberControl label="Size" path="table.fontSize" value={options.table.fontSize} min={8} max={24} /> <NumberControl label="Pad" path="table.cellPadding" value={options.table.cellPadding} min={0} max={20} /> <ColorControl label="Border" path="table.borderColor" value={options.table.borderColor} /> <div className={sectionHeaderClass}>Colors</div> <ColorControl label="Head BG" path="table.headerBgColor" value={options.table.headerBgColor} /> <ColorControl label="Head Txt" path="table.headerColor" value={options.table.headerColor} /> <ColorControl label="Body BG" path="table.bodyBgColor" value={options.table.bodyBgColor} /> <ColorControl label="Body Txt" path="table.bodyColor" value={options.table.bodyColor || '#000000'} /> <ColorControl label="Stripe" path="table.altRowColor" value={options.table.altRowColor} /> <div className={sectionHeaderClass}>Columns</div> <NumberControl label="P.Width" path="table.periodColumnWidth" value={options.table.periodColumnWidth} min={20} max={100} /> <ColorControl label="P.BG" path="table.periodColumnBgColor" value={options.table.periodColumnBgColor} /> <div className={sectionHeaderClass}>Advanced</div> <NumberControl label="Head Size" path="table.headerFontSize" value={options.table.headerFontSize || options.table.fontSize} min={8} max={24} /> <TextControl label="Sys Font" path="table.fontFamily" value={options.table.fontFamily} /> </> )}
                    {activeTab === 'footer' && ( <> <div className={sectionHeaderClass}>Setup</div> <ToggleControl label="Show" path="footer.show" value={options.footer.show} /> <ToggleControl label="Page #" path="footer.includePageNumber" value={options.footer.includePageNumber} /> <SelectControl label="Align" path="footer.align" value={options.footer.align} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} /> <div className={sectionHeaderClass}>Style</div> <SelectControl label="Font" path="footer.fontFamily" value={options.footer.fontFamily} options={fontOptions} /> <NumberControl label="Size" path="footer.fontSize" value={options.footer.fontSize} min={8} max={20} /> <ColorControl label="Color" path="footer.color" value={options.footer.color} /> </> )}
                </div>
            </div>
            <div className="p-2 border-t border-gray-300 bg-gray-100 flex justify-end gap-2 flex-shrink-0 z-20 relative">
                 <button onClick={resetToDefaults} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition shadow-sm"><ResetIcon /> Reset</button>
                 <button onClick={() => onSaveDesign(options)} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white bg-teal-600 rounded hover:bg-teal-700 transition shadow-sm">Save</button>
            </div>
        </div>
    );
};

const PrintPreview: React.FC<PrintPreviewProps> = ({ t, isOpen, onClose, title, generateHtml, onGenerateExcel, fileNameBase, children, designConfig, onSaveDesign }) => {
  // ... (PrintPreview component logic remains largely the same, update handleShareImage styles) ...
  const [lang, setLang] = useState<DownloadLanguage>('en');
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [options, setOptions] = useState<DownloadDesignConfig>(designConfig);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeColumn, setActiveColumn] = useState<{ tableIndex: number, colIndex: number } | null>(null);
  const [activeCell, setActiveCell] = useState<HTMLElement | null>(null);
  const [customFont, setCustomFont] = useState<{name: string, data: string} | null>(null);

  useEffect(() => {
      const storedFont = localStorage.getItem('mrtimetable_customFontData');
      if (storedFont) { try { const parsed = JSON.parse(storedFont); setCustomFont(parsed); } catch(e) {} }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOptions(designConfig);
      setLang('en');
      setCurrentPage(0);
      setActiveColumn(null);
      setActiveCell(null);
      const isPortrait = designConfig.page?.orientation === 'portrait';
      const pageWidth = isPortrait ? 794 : 1123; 
      const screenWidth = window.innerWidth;
      const availableWidth = screenWidth - 32; 
      let fitZoom = 100;
      if (availableWidth < pageWidth) { fitZoom = Math.floor((availableWidth / pageWidth) * 100); fitZoom = Math.max(35, fitZoom); }
      setZoomLevel(fitZoom);
    }
  }, [isOpen, designConfig]);

  const saveCurrentPageEdits = () => { if (contentRef.current && pages[currentPage] !== undefined) { const prevActive = contentRef.current.querySelector('[data-selected-cell="true"]'); if(prevActive) prevActive.removeAttribute('data-selected-cell'); const newContent = contentRef.current.innerHTML; setPages(prev => { const newPages = [...prev]; newPages[currentPage] = newContent; return newPages; }); } };

  useEffect(() => { if (isOpen) { const content = generateHtml(lang, options); const generatedPages = Array.isArray(content) ? content : (content ? [content] : []); setPages(generatedPages); setCurrentPage(p => Math.min(p, Math.max(0, generatedPages.length - 1))); } }, [isOpen, lang, options, generateHtml]);

  const handlePageChange = (newPage: number) => { saveCurrentPageEdits(); setCurrentPage(newPage); setActiveColumn(null); setActiveCell(null); };
  
  const handleContentClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('th, td') as HTMLTableCellElement;
      if (contentRef.current) { const prevActive = contentRef.current.querySelector('[data-selected-cell="true"]'); if(prevActive) prevActive.removeAttribute('data-selected-cell'); }
      if (!cell) { setActiveCell(null); setActiveColumn(null); return; }
      cell.setAttribute('data-selected-cell', 'true');
      setActiveCell(cell);
      const table = cell.closest('table') as HTMLTableElement;
      if (!table) return;
      const tables = contentRef.current?.querySelectorAll('table');
      const tableIndex = Array.from(tables || []).indexOf(table);
      const colIndex = cell.cellIndex;
      setActiveColumn({ tableIndex, colIndex });
      if (target.closest('th')) { handleSort(table, colIndex, cell); }
  };

  const handleSort = (table: HTMLTableElement, colIndex: number, th: HTMLElement) => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const hasRowSpans = Array.from(tbody.querySelectorAll('td')).some(td => td.rowSpan > 1);
      if (hasRowSpans) { alert("Sorting is disabled for tables with merged cells (rowspans)."); return; }
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const isAsc = th.dataset.sortOrder === 'asc';
      const multiplier = isAsc ? 1 : -1;
      rows.sort((rowA, rowB) => {
          const cellA = rowA.cells[colIndex]?.innerText?.trim() || '';
          const cellB = rowB.cells[colIndex]?.innerText?.trim() || '';
          const numA = parseFloat(cellA.replace(/[^0-9.-]+/g,""));
          const numB = parseFloat(cellB.replace(/[^0-9.-]+/g,""));
          if (!isNaN(numA) && !isNaN(numB) && cellA !== '' && cellB !== '') { return (numA - numB) * multiplier; }
          return cellA.localeCompare(cellB) * multiplier;
      });
      const allThs = table.querySelectorAll('th');
      allThs.forEach(h => { if (h !== th) { h.removeAttribute('data-sort-order'); h.innerText = h.innerText.replace(/ [↑↓]/, ''); } });
      th.dataset.sortOrder = isAsc ? 'desc' : 'asc';
      if (!th.innerText.includes('↑') && !th.innerText.includes('↓')) { th.innerText += isAsc ? ' ↑' : ' ↓'; } else { th.innerText = th.innerText.replace(/ [↑↓]/, isAsc ? ' ↑' : ' ↓'); }
      rows.forEach(row => tbody.appendChild(row));
      saveCurrentPageEdits();
  };

  const applyStyleToColumn = (styleProp: string, value: string) => {
      if (!activeColumn || !contentRef.current) return;
      const applyRecursively = (el: HTMLElement) => {
          el.style[styleProp as any] = value;
          if (styleProp === 'color' || styleProp === 'fontWeight' || styleProp === 'fontStyle' || styleProp === 'textAlign') {
              const children = el.querySelectorAll('*');
              children.forEach((child: any) => { if (child.style) child.style[styleProp as any] = value; });
          }
      };
      if (activeCell) { applyRecursively(activeCell); }
      const tables = contentRef.current.querySelectorAll('table');
      const table = tables[activeColumn.tableIndex];
      if (!table) return;
      const thead = table.querySelector('thead');
      if(thead) { const ths = thead.querySelectorAll('th'); if(ths[activeColumn.colIndex]) { applyRecursively(ths[activeColumn.colIndex] as HTMLElement); } }
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => { const cell = row.cells[activeColumn.colIndex]; if (cell && cell !== activeCell) { applyRecursively(cell); } });
  };

  if (!isOpen) return null;

  const handlePrint = () => { saveCurrentPageEdits(); if (pages.length === 0) return; setTimeout(() => { const printWindow = window.open('', '_blank'); if (printWindow) { const content = pages.join(''); const grayscaleStyle = options.colorMode === 'bw' ? '<style>@media print { body { -webkit-print-color-adjust: exact; filter: grayscale(100%); } }</style>' : ''; const printCss = '<style>@media print { body { margin: 0; padding: 0; } .print-container { page-break-after: always; } .print-container:last-child { page-break-after: auto; } }</style>'; printWindow.document.write(grayscaleStyle + printCss + content); printWindow.document.close(); printWindow.onload = function() { printWindow.focus(); printWindow.print(); }; } }, 50); };

  const handleDownloadPdf = async () => { /* ... implementation identical ... */ 
    saveCurrentPageEdits();
    if (pages.length === 0) return;
    setIsGenerating(true);
    try {
        const { jsPDF } = jspdf;
        const orientation = options.page?.orientation || 'landscape';
        const format = options.page?.size || 'a4';
        
        const pdf = new jsPDF({ orientation, unit: 'mm', format });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        let containerWidth = '1123px';
        let containerHeight = '794px';

        if (format === 'a4') {
             containerWidth = orientation === 'portrait' ? '794px' : '1123px';
             containerHeight = orientation === 'portrait' ? '1123px' : '794px';
        } else if (format === 'letter') {
             containerWidth = orientation === 'portrait' ? '816px' : '1056px';
             containerHeight = orientation === 'portrait' ? '1056px' : '816px';
        } else if (format === 'legal') {
             containerWidth = orientation === 'portrait' ? '816px' : '1344px';
             containerHeight = orientation === 'portrait' ? '1344px' : '816px';
        }

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = containerWidth;
        tempContainer.style.height = containerHeight;
        tempContainer.style.overflow = 'hidden';

        if (options.colorMode === 'bw') {
            tempContainer.style.filter = 'grayscale(100%)';
        }
        document.body.appendChild(tempContainer);

        for (let i = 0; i < pages.length; i++) {
            tempContainer.innerHTML = pages[i];
            const pageElement = tempContainer.children[0] as HTMLElement;
            if (!pageElement) continue;
            
            pageElement.style.width = '100%';
            pageElement.style.height = '100%';
            pageElement.style.boxSizing = 'border-box';
            pageElement.style.margin = '0';
            pageElement.style.backgroundColor = '#ffffff';

            window.scrollTo(0, 0);

            const canvas = await html2canvas(tempContainer, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                width: parseFloat(containerWidth),
                height: parseFloat(containerHeight),
                windowWidth: parseFloat(containerWidth),
                windowHeight: parseFloat(containerHeight),
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            
            if (i > 0) pdf.addPage(format, orientation);
            
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            
            let finalW = pdfWidth;
            let finalH = pdfWidth / ratio;
            
            if (finalH > pdfHeight) {
               finalH = pdfHeight;
               finalW = pdfHeight * ratio;
            }

            pdf.addImage(imgData, 'JPEG', 0, 0, finalW, finalH, undefined, 'FAST');
        }
        document.body.removeChild(tempContainer);
        pdf.save(`${fileNameBase}_${lang}.pdf`);
    } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleShareImage = async () => {
      const prevActive = contentRef.current?.querySelector('[data-selected-cell="true"]');
      if(prevActive) prevActive.removeAttribute('data-selected-cell');

      const contentToCapture = contentRef.current ? contentRef.current.innerHTML : pages[currentPage];
      if (!contentToCapture) return;
      
      setIsGenerating(true);
      
      try {
          const orientation = options.page?.orientation || 'portrait';
          const format = options.page?.size || 'a4';
          
          let widthPx = 794;
          let heightPx = 1123;

          if (format === 'a4') {
               widthPx = orientation === 'portrait' ? 794 : 1123;
               heightPx = orientation === 'portrait' ? 1123 : 794;
          } else if (format === 'letter') {
               widthPx = orientation === 'portrait' ? 816 : 1056;
               heightPx = orientation === 'portrait' ? 1056 : 816;
          } else if (format === 'legal') {
               widthPx = orientation === 'portrait' ? 816 : 1344;
               heightPx = orientation === 'portrait' ? 1344 : 816;
          }

          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'fixed';
          tempContainer.style.left = '0';
          tempContainer.style.top = '0';
          tempContainer.style.zIndex = '-9999';
          tempContainer.style.width = `${widthPx}px`;
          tempContainer.style.height = `${heightPx}px`;
          tempContainer.style.backgroundColor = '#ffffff';
          tempContainer.style.visibility = 'hidden'; 

          if (options.colorMode === 'bw') {
              tempContainer.style.filter = 'grayscale(100%)';
          }
          
          document.body.appendChild(tempContainer);
          tempContainer.innerHTML = contentToCapture;
          
          const printContainer = tempContainer.querySelector('.print-container') as HTMLElement;
          if (printContainer) {
              printContainer.style.width = '100%';
              printContainer.style.height = '100%';
          }

          await new Promise(resolve => setTimeout(resolve, 200));

          const scale = 3; 

          const canvas = await html2canvas(tempContainer, {
              scale: scale,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              width: widthPx,
              height: heightPx,
              windowWidth: widthPx,
              windowHeight: heightPx,
              x: 0,
              y: 0,
              scrollX: 0,
              scrollY: 0,
              logging: false,
              onclone: (clonedDoc: Document) => {
                  const clonedBody = clonedDoc.body;
                  const clonedContainer = clonedBody.querySelector('div[style*="z-index: -9999"]');
                  if (clonedContainer) {
                      (clonedContainer as HTMLElement).style.visibility = 'visible';
                  }
                  
                  const style = clonedDoc.createElement('style');
                  // Updated Import for new Google Fonts
                  const importsLatin = `@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Gulzar&family=Noto+Nastaliq+Urdu:wght@400;700&family=Anton&family=Antonio:wght@400;700&family=Bebas+Neue&family=Bodoni+Moda:opsz,wght@6..96,400..900&family=Bungee+Spice&family=Fjalla+One&family=Instrument+Serif:ital@0;1&family=Lato:wght@400;700&family=Merriweather:wght@400;700;900&family=Monoton&family=Montserrat:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Orbitron:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Playwrite+CU:wght@100..400&family=Roboto:wght@400;500;700&family=Rubik+Mono+One&display=swap');`;

                  // UPDATED: Urdu Font Stack prioritizing Gulzar
                  const URDU_FONT_STACK = "'Gulzar', 'Noto Nastaliq Urdu', serif";

                  style.innerHTML = `
                    * { 
                        -webkit-font-smoothing: antialiased !important; 
                        -moz-osx-font-smoothing: grayscale !important; 
                        text-rendering: geometricPrecision !important;
                    }
                    ${importsLatin}
                    
                    /* Important: Force layout and font for capture, overriding global styles */
                    .print-container { 
                        font-family: '${options.table.fontFamily}', sans-serif; 
                        box-sizing: border-box;
                    }
                    
                    .print-container div,
                    .print-container span,
                    .print-container p,
                    .print-container td,
                    .print-container th {
                        font-family: '${options.table.fontFamily}', sans-serif;
                    }
                    
                    /* Urdu text wrappers - STRICT OVERRIDE */
                    .print-container .font-urdu, 
                    .print-container .font-urdu * {
                        font-family: ${URDU_FONT_STACK} !important;
                        line-height: 1.8;
                        padding-top: 2px;
                        direction: rtl;
                        font-synthesis: none;
                        font-weight: normal; /* Force normal weight for Gulzar/Nastaliq */
                    }
                    
                    ${customFont ? `
                        @font-face {
                            font-family: 'CustomAppFont';
                            src: url('${customFont.data}') format('truetype');
                        }
                    ` : ''}

                    .page {
                        overflow: visible !important;
                        min-height: ${heightPx}px !important;
                        height: auto !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .content-wrapper {
                        flex-grow: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .footer {
                        margin-top: auto !important;
                    }
                  `;
                  clonedDoc.head.appendChild(style);
              }
          });

          document.body.removeChild(tempContainer);

          canvas.toBlob(async (blob: Blob | null) => {
              if (blob) {
                  const file = new File([blob], `${fileNameBase}.png`, { type: blob.type });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      try {
                          await navigator.share({
                              files: [file],
                              title: title,
                          });
                      } catch (error: any) {
                          if (error.name !== 'AbortError') console.error(error);
                      }
                  } else {
                      const link = document.createElement('a');
                      link.download = `${fileNameBase}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                  }
              }
          }, 'image/png', 1.0);
          
      } catch (err) {
          console.error("Image capture failed", err);
          alert("Could not generate image.");
      } finally {
          setIsGenerating(false);
      }
  };
  
  const handleZoom = (amount: number) => { setZoomLevel(prev => Math.max(10, Math.min(200, prev + amount))); };
  const resetToDefaults = () => { setOptions(designConfig); };

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] p-0 animate-scale-in no-print" onClick={onClose}>
        <div className="bg-gray-800 rounded-lg shadow-2xl w-full h-full flex flex-col relative" onClick={e => e.stopPropagation()}>
            {/* Unified Toolbar */}
            <header className="flex-shrink-0 p-3 bg-gray-900 border-b border-gray-700 shadow-md flex flex-col sm:flex-row items-center justify-between gap-y-3 gap-x-4 text-white z-30">
                <div className="flex-grow flex items-center gap-x-4 overflow-hidden w-full sm:w-auto">
                    <h3 className="text-lg font-bold truncate text-gray-100">{title}</h3>
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">{children}</div>
                </div>
                <div className="flex items-center justify-end gap-x-3 flex-wrap w-full sm:w-auto">
                    {/* Formatting Group */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-800 border border-gray-700 shadow-inner">
                        <button onClick={() => applyStyleToColumn('fontWeight', 'bold')} disabled={!activeCell} title="Bold" className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white transition"><BoldIcon /></button>
                        <button onClick={() => applyStyleToColumn('fontStyle', 'italic')} disabled={!activeCell} title="Italic" className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white transition"><ItalicIcon /></button>
                        <div className="w-px h-5 bg-gray-700 mx-0.5"></div>
                        <div className="relative group p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 cursor-pointer">
                            <div className="w-4 h-4 rounded-full border border-gray-500 bg-gradient-to-br from-red-500 to-blue-500"></div>
                            <input type="color" disabled={!activeCell} onChange={(e) => applyStyleToColumn('color', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full" title="Text Color" />
                        </div>
                        <div className="relative group p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 cursor-pointer">
                            <div className="w-4 h-4 rounded-sm border border-gray-500 bg-white"></div>
                            <input type="color" disabled={!activeCell} onChange={(e) => applyStyleToColumn('backgroundColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full" title="Background Color" />
                        </div>
                        <div className="w-px h-5 bg-gray-700 mx-0.5"></div>
                        <button onClick={() => applyStyleToColumn('textAlign', 'left')} disabled={!activeCell} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white"><AlignLeftIcon /></button>
                        <button onClick={() => applyStyleToColumn('textAlign', 'center')} disabled={!activeCell} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white"><AlignCenterIcon /></button>
                        <button onClick={() => applyStyleToColumn('textAlign', 'right')} disabled={!activeCell} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300 hover:text-white"><AlignRightIcon /></button>
                        <div className="w-px h-5 bg-gray-700 mx-0.5"></div>
                        <button onClick={() => applyStyleToColumn('fontWeight', 'normal')} disabled={!activeCell} title="Reset Style" className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-400 hover:text-white text-xs font-mono">R</button>
                    </div>
                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>
                    {/* Action Group */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                            <button onClick={() => handleZoom(-10)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white"><ZoomOutIcon /></button>
                            <span className="text-[10px] w-8 text-center font-mono text-gray-400">{zoomLevel}%</span>
                            <button onClick={() => handleZoom(10)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white"><ZoomInIcon /></button>
                        </div>
                        <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                            {(['en', 'ur', 'both'] as const).map((l) => (
                                <button key={l} onClick={() => setLang(l)} className={`px-2 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all leading-none ${lang === l ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}>{l === 'en' ? 'ENG' : l === 'ur' ? 'اردو' : 'ALL'}</button>
                            ))}
                        </div>
                        <button onClick={() => setIsSettingsOpen(prev => !prev)} title="Toggle Settings" className={`p-2 rounded-lg transition-all border ${isSettingsOpen ? 'bg-teal-600 border-teal-500 text-white shadow-inner' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'}`}><SettingsIcon /></button>
                    </div>
                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>
                    {/* Exports */}
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition" title={t.print}><PrintIcon /></button>
                        <button onClick={handleDownloadPdf} disabled={isGenerating} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:opacity-50 transition" title={t.downloadPdf}><PdfIcon /></button>
                        <button onClick={handleShareImage} disabled={isGenerating} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:opacity-50 transition" title={t.shareAsImage}><ImageIcon /></button>
                        {onGenerateExcel && (<button onClick={() => onGenerateExcel(lang, options)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition" title={t.downloadExcel}><ExcelIcon /></button>)}
                    </div>
                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block"></div>
                    {/* Exit */}
                    <button onClick={onClose} title={t.close} className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 hover:border-red-500 transition-all"><CloseIcon /></button>
                </div>
                <div className="flex sm:hidden items-center gap-2 flex-wrap justify-center w-full pb-1">{children}</div>
            </header>
            <div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${isSettingsOpen ? 'opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-gray-50 border-b border-gray-200 shadow-inner`}>
                {isSettingsOpen && <SettingsPanel options={options} setOptions={setOptions} onSaveDesign={onSaveDesign} resetToDefaults={resetToDefaults} />}
            </div>
            <main ref={previewRef} className="flex-grow bg-gray-600 p-4 overflow-auto flex flex-col items-center custom-scrollbar">
                {pages.length > 1 && (<div className="flex-shrink-0 flex items-center gap-4 mb-4 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-md sticky top-2 z-10"><button onClick={() => handlePageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="px-4 py-1.5 rounded-full disabled:opacity-50 text-sm font-semibold text-gray-700 hover:bg-gray-200/50 transition">&lt;</button><span className="text-sm font-medium text-gray-800">Page {currentPage + 1} of {pages.length}</span><button onClick={() => handlePageChange(Math.min(pages.length - 1, currentPage + 1))} disabled={currentPage === pages.length - 1} className="px-4 py-1.5 rounded-full disabled:opacity-50 text-sm font-semibold text-gray-700 hover:bg-gray-200/50 transition">&gt;</button></div>)}
                <div className="py-4 transition-transform duration-150" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center top' }}>
                    <div 
                        ref={contentRef}
                        onClick={handleContentClick}
                        className="w-fit mx-auto shadow-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 cursor-text" 
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }} 
                        style={{ 
                            filter: options.colorMode === 'bw' ? 'grayscale(100%)' : 'none',
                        }}
                    />
                    <style>{`
                        th, td { cursor: pointer; position: relative; }
                        th:hover, td:hover { background-color: rgba(0,0,0,0.03); }
                        [data-selected-cell="true"] { 
                            outline: 2px dashed #2563eb !important; 
                            outline-offset: -2px; 
                            background-color: rgba(37, 99, 235, 0.1) !important;
                        }
                    `}</style>
                </div>
            </main>
        </div>
    </div>
  );
};

export default PrintPreview;