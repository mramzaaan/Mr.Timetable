
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { DownloadLanguage, DownloadDesignConfig, FontFamily, CardStyle, TriangleCorner } from '../types';

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

interface HistoryState {
    options: DownloadDesignConfig;
    pages: string[];
}

// --- Icons ---
const Icons = {
  Print: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2v4h10z" /></svg>,
  Pdf: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>,
  Excel: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1-1H3a1 1 0 01-1-1V3zm2 2v2h3V5H4zm0 3v2h3V8H4zm0 3v2h3v-2H4zm4 2v-2h3v2H8zm0-3v-2h3v2H8zm0-3V5h3v3H8zm4 5v-2h3v2h-3zm0-3v-2h3v2h-3zm0-3V5h3v3h-3z" /></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  Layout: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
  Header: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>, 
  Table: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7-4h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" /></svg>,
  Footer: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, 
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
  Reset: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  TextSize: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>,
  Bold: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-1v1h1a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm5 6h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-3v4zm0 8h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-3v4z"/></svg>,
  Italic: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>,
  AlignLeft: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 15h12v2H3v-2zm0-5h18v2H3v-2zm0-5h12v2H3V9z"/></svg>,
  AlignCenter: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm2 15h14v2H5v-2zm-2-5h18v2H3v-2zm2-5h14v2H5V9z"/></svg>,
  AlignRight: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 15h12v2H9v-2zm-6-5h18v2H3v-2zm6-5h12v2H9V9z"/></svg>,
  Color: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" /></svg>,
  BgColor: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
  Settings: ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Edit: ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Eraser: ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const FullscreenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;

const fontOptions: { label: string, value: FontFamily }[] = [
    { label: 'System Default', value: 'sans-serif' as FontFamily },
    { label: 'Serif', value: 'serif' as FontFamily },
    { label: 'Monospace', value: 'monospace' as FontFamily },
];

const cardStyleOptions: { label: string, value: CardStyle }[] = [
    { label: 'Full Color', value: 'full' },
    { label: 'Outline', value: 'outline' },
    { label: 'Text Only', value: 'text' },
    { label: 'Triangle', value: 'triangle' },
    { label: 'Glass', value: 'glass' },
    { label: 'Gradient', value: 'gradient' },
    { label: 'Minimal', value: 'minimal-left' },
    { label: 'Badge', value: 'badge' },
];

const triangleCornerOptions: { label: string, value: TriangleCorner }[] = [
    { label: 'Top Left', value: 'top-left' },
    { label: 'Top Right', value: 'top-right' },
    { label: 'Bottom Left', value: 'bottom-left' },
    { label: 'Bottom Right', value: 'bottom-right' },
];

const SettingsSidebar: React.FC<{
    options: DownloadDesignConfig,
    onUpdate: (options: DownloadDesignConfig) => void,
    onSaveDesign: (options: DownloadDesignConfig) => void,
    resetToDefaults: () => void,
    activeElement: HTMLElement | null,
    activeElementStyles: { fontSize: string, fontFamily: string, color: string, backgroundColor: string, textAlign: string },
    onApplyStyle: (property: string, value: string) => void,
    onExecCmd: (cmd: string, val?: string) => void,
}> = ({ options, onUpdate, onSaveDesign, resetToDefaults, activeElement, activeElementStyles, onApplyStyle, onExecCmd }) => {
    const [activeSection, setActiveSection] = useState<'page' | 'header' | 'table' | 'footer' | 'edit' | 'visibility' | 'presets' | null>('page');
    const [isSaving, setIsSaving] = useState(false);

    const handleValueChange = (path: string, value: any) => {
        const newOptions = JSON.parse(JSON.stringify(options)); 
        const keys = path.split('.');
        let current: any = newOptions;
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        onUpdate(newOptions);
    };

    const handleSave = () => {
        setIsSaving(true);
        onSaveDesign(options);
        setTimeout(() => setIsSaving(false), 2000);
    };

    const SectionButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveSection(activeSection === id ? null : id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeSection === id 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
            <Icon />
            <span>{label}</span>
        </button>
    );

    const ControlGroup = ({ label, children, defaultOpen = false }: any) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        return (
            <div className="mb-4 bg-[#1a1d21] rounded-lg overflow-hidden border border-gray-800 shadow-sm">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 text-xs font-bold text-gray-400 uppercase tracking-widest hover:bg-gray-800/50 transition-colors"
                >
                    {label}
                    <div className={`transform transition-transform text-teal-500 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                    </div>
                </button>
                {isOpen && (
                    <div className="p-4 pt-0 space-y-4">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const NumberInput = ({ label, path, value, min, max, step = 1, showPercent = false }: any) => (
        <div className="flex items-center justify-between bg-[#22252a] p-3 rounded-lg">
            <label className="text-xs text-gray-300 font-medium">{label}</label>
            <div className="flex items-center bg-[#1a1d21] rounded border border-gray-700 w-24">
                <button onClick={() => handleValueChange(path, Math.max(min, Number((value - step).toFixed(2))))} className="px-2 text-teal-500 hover:text-teal-400 font-bold">-</button>
                <input 
                    type="text" 
                    value={showPercent ? `${Math.round(value * 100)}%` : value} 
                    onChange={(e) => {
                        if (showPercent) return;
                        handleValueChange(path, Number(e.target.value));
                    }} 
                    readOnly={showPercent}
                    className="w-full bg-transparent text-center text-xs font-bold text-white outline-none py-1 appearance-none"
                />
                <button onClick={() => handleValueChange(path, Math.min(max, Number((value + step).toFixed(2))))} className="px-2 text-teal-500 hover:text-teal-400 font-bold">+</button>
            </div>
        </div>
    );

    const SelectInput = ({ label, path, value, options: opts }: any) => (
        <div className="bg-[#22252a] p-3 rounded-lg space-y-2 flex-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select 
                    value={value} 
                    onChange={(e) => handleValueChange(path, e.target.value)} 
                    className="w-full bg-transparent text-white text-sm outline-none appearance-none cursor-pointer"
                >
                    {opts.map((o: any) => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500">
                    <ChevronDownIcon />
                </div>
            </div>
        </div>
    );

    const MarginInput = () => (
        <div className="grid grid-cols-4 gap-2">
            {['top', 'right', 'bottom', 'left'].map(side => (
                <div key={side} className="bg-[#22252a] p-2 rounded-lg flex flex-col items-center justify-center gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{side}</label>
                    <input 
                        type="number" 
                        value={options.page.margins[side as keyof typeof options.page.margins]} 
                        onChange={(e) => handleValueChange(`page.margins.${side}`, Number(e.target.value))}
                        className="w-full bg-transparent text-center text-sm font-bold text-teal-500 outline-none appearance-none"
                    />
                </div>
            ))}
        </div>
    );

    const ToggleInput = ({ label, path, value }: any) => (
        <div className="flex items-center justify-between cursor-pointer" onClick={() => handleValueChange(path, !value)}>
            <label className="text-sm text-gray-300 font-medium cursor-pointer">{label}</label>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-teal-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value ? 'left-5.5' : 'left-0.5'}`}></div>
            </div>
        </div>
    );

    const TextInput = ({ label, path, value, icon: Icon }: any) => (
        <div className="flex items-center bg-[#22252a] p-3 rounded-lg gap-3">
            {Icon && <Icon className="text-gray-500 w-5 h-5" />}
            <input 
                type="text" 
                value={value || ''} 
                onChange={(e) => handleValueChange(path, e.target.value)} 
                placeholder={label}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
            />
            <Icons.Edit className="text-teal-500 w-4 h-4" />
        </div>
    );

    const ColorInput = ({ label, path, value }: any) => (
        <div className="flex items-center justify-between bg-[#22252a] p-3 rounded-lg">
            <label className="text-xs text-gray-300 font-medium">{label}</label>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-gray-600 overflow-hidden relative cursor-pointer">
                    <div className="absolute inset-0" style={{ backgroundColor: value }}></div>
                    <input type="color" value={value} onChange={(e) => handleValueChange(path, e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
                </div>
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => handleValueChange(path, e.target.value)} 
                    className="w-16 bg-[#1a1d21] border border-gray-700 text-white text-xs rounded px-1 py-1 outline-none text-center font-mono uppercase"
                    maxLength={7}
                />
            </div>
        </div>
    );

    // Edit Section Handlers
    const ManualColorInput = ({ label, value, onChange }: any) => (
        <div className="flex items-center justify-between bg-[#22252a] p-3 rounded-lg">
            <label className="text-xs text-gray-300 font-medium">{label}</label>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-gray-600 overflow-hidden relative cursor-pointer">
                    <div className="absolute inset-0" style={{ backgroundColor: value }}></div>
                    <input type="color" onChange={(e) => onChange(e.target.value)} disabled={!activeElement} className="opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed" />
                </div>
            </div>
        </div>
    );

    const [presets, setPresets] = useState<{name: string, config: DownloadDesignConfig}[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('print_presets') || '[]');
        } catch { return []; }
    });
    const [newPresetName, setNewPresetName] = useState('');

    const savePreset = () => {
        if (!newPresetName) return;
        const newPresets = [...presets, { name: newPresetName, config: options }];
        setPresets(newPresets);
        localStorage.setItem('print_presets', JSON.stringify(newPresets));
        setNewPresetName('');
    };

    const loadPreset = (config: DownloadDesignConfig) => {
        onUpdate(config);
    };

    const deletePreset = (index: number) => {
        const newPresets = presets.filter((_, i) => i !== index);
        setPresets(newPresets);
        localStorage.setItem('print_presets', JSON.stringify(newPresets));
    };

    return (
        <div className="w-full md:w-80 bg-[#111315] border-r border-gray-800 flex flex-col h-full shadow-xl z-20">
            <div className="p-4 border-b border-gray-800 bg-[#1a1d21] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icons.Settings className="text-teal-500 w-5 h-5" />
                    <h3 className="text-lg font-bold text-teal-500">Print config.</h3>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-teal-500 hover:text-teal-400 transition-colors" title="Print">
                        <Icons.Print />
                    </button>
                    <button className="text-teal-500 hover:text-teal-400 transition-colors" title="Share">
                        <Icons.Share />
                    </button>
                </div>
            </div>
            
            <div className="flex overflow-x-auto border-b border-gray-800 bg-[#1a1d21] no-scrollbar">
                <SectionButton id="page" label="Layout" icon={Icons.Layout} />
                <SectionButton id="header" label="Header" icon={Icons.Header} />
                <SectionButton id="table" label="Table" icon={Icons.Table} />
                <SectionButton id="footer" label="Footer" icon={Icons.Footer} />
                <SectionButton id="visibility" label="Visibility" icon={Icons.Check} />
                <SectionButton id="presets" label="Presets" icon={Icons.Share} />
                <SectionButton id="edit" label="Edit Text" icon={Icons.Edit} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {activeSection === 'page' && (
                    <>
                        <ControlGroup label="Scaling & Dimension">
                            <NumberInput label="Content Scale" path="contentScale" value={options.contentScale || 1} min={0.5} max={2.0} step={0.05} showPercent={true} />
                            <div className="flex gap-3">
                                <SelectInput label="Paper Size" path="page.size" value={options.page.size} options={[{value: 'a4', label: 'A4 (Standard)'}, {value: 'letter', label: 'Letter'}, {value: 'legal', label: 'Legal'}]} />
                                <SelectInput label="Orientation" path="page.orientation" value={options.page.orientation} options={[{value: 'portrait', label: 'Portrait'}, {value: 'landscape', label: 'Landscape'}]} />
                            </div>
                        </ControlGroup>
                        <ControlGroup label="Margin Controls">
                            <MarginInput />
                        </ControlGroup>
                        <ControlGroup label="Watermark">
                            <div className="flex items-center justify-between cursor-pointer mb-3" onClick={() => handleValueChange('page.watermarkOpacity', options.page.watermarkOpacity > 0 ? 0 : 0.1)}>
                                <label className="text-sm text-gray-300 font-medium cursor-pointer">Enable Watermark</label>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${options.page.watermarkOpacity > 0 ? 'bg-teal-500' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${options.page.watermarkOpacity > 0 ? 'left-5.5' : 'left-0.5'}`}></div>
                                </div>
                            </div>
                            {options.page.watermarkOpacity > 0 && (
                                <>
                                    <TextInput label="Watermark Text" path="watermarkText" value={options.watermarkText} icon={Icons.Edit} />
                                    <div className="mt-3">
                                        <NumberInput label="Transparency" path="page.watermarkOpacity" value={options.page.watermarkOpacity} min={0.05} max={1.0} step={0.05} />
                                    </div>
                                </>
                            )}
                        </ControlGroup>
                        <ControlGroup label="Other Settings" defaultOpen={false}>
                            <NumberInput label="Rows (All Pages)" path="rowsPerPage" value={options.rowsPerPage} min={5} max={100} />
                            <NumberInput label="Rows (1st Page)" path="rowsPerFirstPage" value={options.rowsPerFirstPage || options.rowsPerPage} min={5} max={100} />
                            <SelectInput label="Color Mode" path="colorMode" value={options.colorMode} options={[{value: 'color', label: 'Color'}, {value: 'bw', label: 'Black & White'}]} />
                        </ControlGroup>
                    </>
                )}

                {activeSection === 'visibility' && (
                    <ControlGroup label="Show/Hide Elements">
                        <ToggleInput label="Teacher Name" path="visibleElements.teacherName" value={options.visibleElements?.teacherName ?? true} />
                        <ToggleInput label="Subject Name" path="visibleElements.subjectName" value={options.visibleElements?.subjectName ?? true} />
                        <ToggleInput label="Room Number" path="visibleElements.roomNumber" value={options.visibleElements?.roomNumber ?? true} />
                    </ControlGroup>
                )}

                {activeSection === 'presets' && (
                    <ControlGroup label="Saved Presets">
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newPresetName} 
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="Preset Name"
                                className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-teal-500"
                            />
                            <button onClick={savePreset} disabled={!newPresetName} className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-50">Save</button>
                        </div>
                        <div className="space-y-2">
                            {presets.map((preset, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                                    <span className="text-xs text-gray-300 font-medium">{preset.name}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => loadPreset(preset.config)} className="p-1 text-teal-400 hover:text-teal-300" title="Load"><Icons.Check /></button>
                                        <button onClick={() => deletePreset(idx)} className="p-1 text-red-400 hover:text-red-300" title="Delete"><Icons.Close /></button>
                                    </div>
                                </div>
                            ))}
                            {presets.length === 0 && <p className="text-xs text-gray-500 text-center italic">No saved presets</p>}
                        </div>
                    </ControlGroup>
                )}

                {activeSection === 'header' && (
                    <>
                        <ControlGroup label="School Name">
                            <SelectInput label="Font" path="header.schoolName.fontFamily" value={options.header.schoolName.fontFamily} options={fontOptions} />
                            <NumberInput label="Size" path="header.schoolName.fontSize" value={options.header.schoolName.fontSize} min={10} max={80} />
                            <SelectInput label="Align" path="header.schoolName.align" value={options.header.schoolName.align} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} />
                            <ColorInput label="Color" path="header.schoolName.color" value={options.header.schoolName.color} />
                        </ControlGroup>
                        <ControlGroup label="Header Features">
                            <ToggleInput label="Show Logo" path="header.showLogo" value={options.header.showLogo} />
                            <NumberInput label="Logo Size" path="header.logoSize" value={options.header.logoSize} min={20} max={200} />
                            <ToggleInput label="Show Title" path="header.showTitle" value={options.header.showTitle} />
                            {options.header.showTitle && (
                                <>
                                    <NumberInput label="Title Size" path="header.title.fontSize" value={options.header.title?.fontSize || 18} min={10} max={80} />
                                    <ColorInput label="Title Color" path="header.title.color" value={options.header.title?.color || '#000000'} />
                                </>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Details (Name, Room, etc.)</h5>
                                <div className="space-y-3">
                                    <NumberInput label="Size" path="header.details.fontSize" value={options.header.details?.fontSize || 14} min={8} max={40} />
                                    <ColorInput label="Color" path="header.details.color" value={options.header.details?.color || '#000000'} />
                                </div>
                            </div>
                            <ToggleInput label="Show Date" path="header.showDate" value={options.header.showDate} />
                            <TextInput label="Subtitle" path="header.subtitle" value={options.header.subtitle} />
                            <ToggleInput label="Show Divider" path="header.divider" value={options.header.divider} />
                            <ColorInput label="Background" path="header.bgColor" value={options.header.bgColor} />
                        </ControlGroup>
                    </>
                )}

                {activeSection === 'table' && (
                    <>
                        <ControlGroup label="Dimensions & Layout">
                            <NumberInput label="Column Width" path="table.periodColumnWidth" value={options.table.periodColumnWidth} min={20} max={100} />
                            <NumberInput label="Border Width" path="table.borderWidth" value={options.table.borderWidth} min={0} max={10} step={0.5} />
                            <SelectInput label="Grid Style" path="table.gridStyle" value={options.table.gridStyle} options={[{value:'solid', label:'Solid'}, {value:'dashed', label:'Dashed'}, {value:'dotted', label:'Dotted'}]} />
                            <SelectInput label="Vertical Align" path="table.verticalAlign" value={options.table.verticalAlign} options={[{value:'top', label:'Top'}, {value:'middle', label:'Middle'}, {value:'bottom', label:'Bottom'}]} />
                            <ToggleInput label="Merge Identical" path="table.mergeIdenticalPeriods" value={options.table.mergeIdenticalPeriods ?? true} />
                        </ControlGroup>

                        <ControlGroup label="Typography & Style">
                            <SelectInput label="Card Design" path="table.cardStyle" value={options.table.cardStyle || 'full'} options={cardStyleOptions} />
                            
                            {options.table.cardStyle === 'outline' && (
                                <NumberInput label="Outline Width" path="table.outlineWidth" value={options.table.outlineWidth || 2} min={0.5} max={10} step={0.5} />
                            )}
                            {options.table.cardStyle === 'triangle' && (
                                <SelectInput label="Corner" path="table.triangleCorner" value={options.table.triangleCorner || 'bottom-left'} options={triangleCornerOptions} />
                            )}
                            {options.table.cardStyle === 'badge' && (
                                <SelectInput label="Badge Target" path="table.badgeTarget" value={options.table.badgeTarget || 'subject'} options={[{value:'subject', label:'Subject'}, {value:'teacher', label:'Teacher'}, {value:'class', label:'Class'}]} />
                            )}

                            <SelectInput label="Font Family" path="table.fontFamily" value={options.table.fontFamily} options={fontOptions} />
                            <NumberInput label="Body Size" path="table.fontSize" value={options.table.fontSize} min={8} max={32} />
                            <NumberInput label="Header Size" path="table.headerFontSize" value={options.table.headerFontSize || options.table.fontSize} min={8} max={40} />
                            <NumberInput label="Line Height" path="table.lineHeight" value={options.table.lineHeight || 1.1} min={0.8} max={3.0} step={0.1} />
                            <NumberInput label="Cell Padding" path="table.cellPadding" value={options.table.cellPadding} min={0} max={30} />
                        </ControlGroup>

                        <ControlGroup label="Colors">
                            <ColorInput label="Header BG" path="table.headerBgColor" value={options.table.headerBgColor} />
                            <ColorInput label="Header Text" path="table.headerColor" value={options.table.headerColor} />
                            <ColorInput label="Body Text" path="table.bodyColor" value={options.table.bodyColor || '#000000'} />
                            <ColorInput label="Period Col BG" path="table.periodColumnBgColor" value={options.table.periodColumnBgColor} />
                            <ColorInput label="Period Col Text" path="table.periodColumnColor" value={options.table.periodColumnColor} />
                            <ColorInput label="Alt Row" path="table.altRowColor" value={options.table.altRowColor} />
                            <ColorInput label="Borders" path="table.borderColor" value={options.table.borderColor} />
                        </ControlGroup>
                    </>
                )}

                {activeSection === 'footer' && (
                    <>
                        <ControlGroup label="Footer Settings">
                            <ToggleInput label="Show Footer" path="footer.show" value={options.footer.show} />
                            {options.footer.show && (
                                <>
                                    <TextInput label="App Name" path="footer.text" value={options.footer.text} />
                                    <SelectInput label="App Name Pos" path="footer.appNamePlacement" value={options.footer.appNamePlacement || 'center'} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}, {value: 'hidden', label: 'Hidden'}]} />
                                    
                                    <ToggleInput label="Show Date" path="footer.includeDate" value={options.footer.includeDate} />
                                    <SelectInput label="Date Pos" path="footer.datePlacement" value={options.footer.datePlacement || 'hidden'} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}, {value: 'hidden', label: 'Hidden'}]} />
                                    
                                    <ToggleInput label="Page Numbers" path="footer.includePageNumber" value={options.footer.includePageNumber} />
                                    <SelectInput label="Page Num Pos" path="footer.pageNumberPlacement" value={options.footer.pageNumberPlacement || 'right'} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}, {value: 'hidden', label: 'Hidden'}]} />
                                    
                                    <NumberInput label="Font Size" path="footer.fontSize" value={options.footer.fontSize} min={6} max={20} />
                                    <ColorInput label="Color" path="footer.color" value={options.footer.color} />
                                </>
                            )}
                        </ControlGroup>
                    </>
                )}

                {activeSection === 'edit' && (
                    <>
                        <div className="bg-[#1a1d21] p-3 rounded-lg border border-gray-800 mb-4 shadow-sm">
                            <p className="text-[10px] text-gray-400">Click on any text element in the preview to edit its style.</p>
                            {!activeElement && <p className="text-xs text-yellow-500 mt-2 font-bold">No element selected</p>}
                        </div>
                        
                        <ControlGroup label="Typography">
                            <div className="bg-[#22252a] p-3 rounded-lg space-y-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Font Family</label>
                                <div className="relative">
                                    <select 
                                        value={activeElementStyles.fontFamily.replace(/['"]/g, '')}
                                        onChange={(e) => onApplyStyle('fontFamily', e.target.value)}
                                        disabled={!activeElement}
                                        className="w-full bg-transparent text-white text-sm outline-none appearance-none cursor-pointer disabled:opacity-50"
                                    >
                                        {fontOptions.map(f => <option key={f.value} value={f.value} className="bg-gray-900">{f.label}</option>)}
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-teal-500">
                                        <ChevronDownIcon />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-[#22252a] p-3 rounded-lg mt-3">
                                <label className="text-xs text-gray-300 font-medium">Font Size</label>
                                <div className="flex items-center bg-[#1a1d21] rounded border border-gray-700 w-24">
                                    <button onClick={() => { if(activeElement) { const size = parseInt(activeElementStyles.fontSize) || 12; onApplyStyle('fontSize', `${size - 1}px`); } }} disabled={!activeElement} className="px-2 text-teal-500 hover:text-teal-400 font-bold disabled:opacity-50">-</button>
                                    <span className="w-full bg-transparent text-center text-xs font-bold text-white py-1">{parseInt(activeElementStyles.fontSize) || '--'}</span>
                                    <button onClick={() => { if(activeElement) { const size = parseInt(activeElementStyles.fontSize) || 12; onApplyStyle('fontSize', `${size + 1}px`); } }} disabled={!activeElement} className="px-2 text-teal-500 hover:text-teal-400 font-bold disabled:opacity-50">+</button>
                                </div>
                            </div>
                        </ControlGroup>

                        <ControlGroup label="Formatting">
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => onExecCmd('bold')} disabled={!activeElement} className="flex-1 py-2 bg-[#22252a] border border-gray-700 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 flex justify-center"><Icons.Bold /></button>
                                <button onClick={() => onExecCmd('italic')} disabled={!activeElement} className="flex-1 py-2 bg-[#22252a] border border-gray-700 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 flex justify-center"><Icons.Italic /></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onApplyStyle('textAlign', 'left')} disabled={!activeElement} className="flex-1 py-2 bg-[#22252a] border border-gray-700 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 flex justify-center"><Icons.AlignLeft /></button>
                                <button onClick={() => onApplyStyle('textAlign', 'center')} disabled={!activeElement} className="flex-1 py-2 bg-[#22252a] border border-gray-700 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 flex justify-center"><Icons.AlignCenter /></button>
                                <button onClick={() => onApplyStyle('textAlign', 'right')} disabled={!activeElement} className="flex-1 py-2 bg-[#22252a] border border-gray-700 rounded text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50 flex justify-center"><Icons.AlignRight /></button>
                            </div>
                        </ControlGroup>

                        <ControlGroup label="Colors">
                            <ManualColorInput label="Text Color" value={activeElementStyles.color} onChange={(val: string) => onExecCmd('foreColor', val)} />
                            <ManualColorInput label="Background" value={activeElementStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ? activeElementStyles.backgroundColor : '#ffffff'} onChange={(val: string) => onExecCmd('hiliteColor', val)} />
                        </ControlGroup>

                        <button onClick={() => onExecCmd('removeFormat')} disabled={!activeElement} className="w-full py-2 bg-red-900/30 border border-red-900/50 text-red-400 rounded hover:bg-red-900/50 flex items-center justify-center gap-2 disabled:opacity-50 text-xs font-bold mt-4">
                            <Icons.Eraser /> Clear Formatting
                        </button>
                    </>
                )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#1a1d21] flex gap-2">
                 <button onClick={resetToDefaults} className="flex-1 py-2 text-xs font-bold text-gray-400 bg-[#22252a] border border-gray-700 rounded hover:bg-gray-700 hover:text-white transition">
                     <div className="flex items-center justify-center gap-1"><Icons.Reset /> Reset</div>
                 </button>
                 <button onClick={handleSave} className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 rounded hover:bg-teal-700 transition shadow-lg">
                     <div className="flex items-center justify-center gap-1">{isSaving ? <Icons.Check /> : null} {isSaving ? 'Saved' : 'Save'}</div>
                 </button>
            </div>
        </div>
    );
};

const PrintPreview: React.FC<PrintPreviewProps> = ({ t, isOpen, onClose, title, generateHtml, onGenerateExcel, fileNameBase, children, designConfig, onSaveDesign }) => {
  const [lang, setLang] = useState<DownloadLanguage>('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(70); // Default 70%
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [activeElementStyles, setActiveElementStyles] = useState({
      fontSize: '', fontFamily: '', color: '', backgroundColor: '', textAlign: ''
  });
  
  // State for collapsible panels - Default closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ref for the persistent print iframe
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Cleanup print iframe on unmount
  useEffect(() => {
      return () => {
          if (printIframeRef.current) {
              document.body.removeChild(printIframeRef.current);
              printIframeRef.current = null;
          }
      };
  }, []);

  const themeColors = useMemo(() => {
    if (typeof window === 'undefined') return { accent: '#6366f1' };
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--accent-primary').trim() || '#6366f1'
    };
  }, [isOpen]);

  // Initial Load
  useEffect(() => {
    if (isOpen) {
      const themedDesign = JSON.parse(JSON.stringify(designConfig));
      
      const initialHtml = generateHtml(lang, themedDesign);
      const initialPages = Array.isArray(initialHtml) ? initialHtml : [initialHtml];
      const initialState = { options: themedDesign, pages: initialPages };
      
      setHistory([initialState]);
      setHistoryIndex(0);
      setCurrentPage(0);
      setActiveElement(null);
      setLang('en');
      
      setZoomLevel(70); // Force 70% on open
    }
  }, [isOpen]); 

  // Re-generate on Lang change
  useEffect(() => {
    if (isOpen && history[historyIndex]) {
        const currentOptions = history[historyIndex].options;
        const newHtml = generateHtml(lang, currentOptions);
        const newPages = Array.isArray(newHtml) ? newHtml : [newHtml];
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ options: currentOptions, pages: newPages });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setCurrentPage(0);
    }
  }, [lang]);

  const pushToHistory = useCallback((newOptions: DownloadDesignConfig, newPages: string[]) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ options: newOptions, pages: newPages });
          return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleDesignUpdate = (newOptions: DownloadDesignConfig, overrideLang?: DownloadLanguage) => {
      const effectiveLang = overrideLang !== undefined ? overrideLang : lang;
      const newContent = generateHtml(effectiveLang, newOptions);
      const newPages = Array.isArray(newContent) ? newContent : [newContent];
      pushToHistory(newOptions, newPages);
  };

  const handleUndo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setActiveElement(null); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setActiveElement(null); } };
  const handlePageChange = (newPage: number) => { saveManualEdit(); setCurrentPage(newPage); setActiveElement(null); };

  const saveManualEdit = () => {
      if (!contentRef.current) return;
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      // Remove selection marker before saving
      const selected = clone.querySelector('[data-selected="true"]');
      if (selected) selected.removeAttribute('data-selected');
      
      const currentHtml = clone.innerHTML;
      const currentPages = [...history[historyIndex].pages];
      currentPages[currentPage] = currentHtml;
      
      const updatedHistory = [...history];
      updatedHistory[historyIndex] = { ...updatedHistory[historyIndex], pages: currentPages };
      setHistory(updatedHistory);
  };

  const handleContentClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const editable = target.closest('td, th, h1, h2, span, p, div') as HTMLElement;
      
      // Cleanup previous selection
      if (activeElement) activeElement.removeAttribute('data-selected');
      
      if (editable && editable !== contentRef.current && !editable.classList.contains('page')) {
          editable.setAttribute('data-selected', 'true');
          setActiveElement(editable);
          
          const computed = window.getComputedStyle(editable);
          setActiveElementStyles({
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              textAlign: computed.textAlign
          });
          e.stopPropagation();
      } else {
          setActiveElement(null);
      }
  };

  // Text Styling Handlers
  const applyStyle = (property: string, value: string) => {
      if (activeElement) {
          activeElement.style[property as any] = value;
          setActiveElementStyles(prev => ({ ...prev, [property]: value }));
          saveManualEdit();
      }
  };
  
  const execCmd = (cmd: string, val?: string) => {
      document.execCommand(cmd, false, val);
      // For colors, update state
      if (cmd === 'foreColor' && val) setActiveElementStyles(prev => ({...prev, color: val}));
      if (cmd === 'hiliteColor' && val) setActiveElementStyles(prev => ({...prev, backgroundColor: val}));
      saveManualEdit();
  };

  const resetToDefaults = () => { handleDesignUpdate(designConfig); };

  const handleShare = async () => {
      if (!contentRef.current) return;
      setIsGenerating(true);
      try {
          // Remove selection before capture
          if (activeElement) activeElement.removeAttribute('data-selected');

          const canvas = await html2canvas(contentRef.current, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              onclone: (clonedDoc) => {
                  const style = clonedDoc.createElement('style');
                  style.innerHTML = `
                      * {
                          text-rendering: geometricPrecision !important;
                          -webkit-font-smoothing: antialiased !important;
                          -moz-osx-font-smoothing: grayscale !important;
                          line-height: 1.2 !important;
                      }
                      /* Visibility Styles */
                      ${options.visibleElements?.teacherName === false ? '.period-teacher, .teacher-text { display: none !important; }' : ''}
                      ${options.visibleElements?.subjectName === false ? '.period-subject, .subject-text { display: none !important; }' : ''}
                      ${options.visibleElements?.roomNumber === false ? '.header-details > div > div:nth-child(3) { display: none !important; }' : ''}
                      /* Scale */
                      .page { zoom: ${options.contentScale || 1}; }
                  `;
                  clonedDoc.head.appendChild(style);
              }
          });
          
          // Restore selection if needed (optional)
          if (activeElement) activeElement.setAttribute('data-selected', 'true');

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
              const file = new File([blob], `${fileNameBase}.png`, { type: 'image/png' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                      files: [file],
                      // Removed 'title' and 'text' to ensure only file is shared (prevents text+link sharing issues)
                  });
              } else {
                  // Fallback download
                  const link = document.createElement('a');
                  link.href = canvas.toDataURL('image/png');
                  link.download = `${fileNameBase}.png`;
                  link.click();
              }
          }
      } catch (e: any) {
          if (e.name !== 'AbortError') {
              console.error("Share failed", e);
              alert("Failed to share.");
          }
      } finally {
          setIsGenerating(false);
      }
  };

  const handleDownloadPdf = async () => {
      setIsGenerating(true);
      const jsPDF = jspdf.jsPDF;
      const orientation = options.page.orientation || 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: options.page.size || 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const widthPx = orientation === 'portrait' ? '794px' : '1123px';
      const heightPx = orientation === 'portrait' ? '1123px' : '794px';

      const tempContainer = document.createElement('div');
      Object.assign(tempContainer.style, {
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: widthPx,
          height: heightPx,
          overflow: 'hidden',
          backgroundColor: '#ffffff'
      });
      document.body.appendChild(tempContainer);

      try {
          const currentRender = history[historyIndex] || { options: designConfig, pages: [] };
          const pagesToRender = currentRender.pages;

          for (let i = 0; i < pagesToRender.length; i++) {
              tempContainer.innerHTML = pagesToRender[i];
              const pageContent = tempContainer.children[0] as HTMLElement;
              
              if (pageContent) {
                  pageContent.style.width = '100%';
                  pageContent.style.height = '100%';
                  pageContent.style.margin = '0';
              }
              
              // Ensure fonts are loaded
              await document.fonts.ready;
              await new Promise(r => setTimeout(r, 200));

              const canvas = await html2canvas(tempContainer, {
                  scale: 1.5,
                  backgroundColor: '#ffffff',
                  width: parseFloat(widthPx),
                  height: parseFloat(heightPx),
                  windowWidth: parseFloat(widthPx),
                  windowHeight: parseFloat(heightPx),
                  scrollX: 0,
                  scrollY: 0,
                  x: 0,
                  y: 0,
                  useCORS: true,
                  onclone: (clonedDoc) => {
                      const style = clonedDoc.createElement('style');
                      style.innerHTML = `
                          * {
                              text-rendering: geometricPrecision !important;
                              -webkit-font-smoothing: antialiased !important;
                              -moz-osx-font-smoothing: grayscale !important;
                              line-height: 1.2 !important;
                          }
                          /* Visibility Styles */
                          ${options.visibleElements?.teacherName === false ? '.period-teacher, .teacher-text { display: none !important; }' : ''}
                          ${options.visibleElements?.subjectName === false ? '.period-subject, .subject-text { display: none !important; }' : ''}
                          ${options.visibleElements?.roomNumber === false ? '.header-details > div > div:nth-child(3) { display: none !important; }' : ''}
                          /* Scale */
                          .page { zoom: ${options.contentScale || 1}; }
                      `;
                      clonedDoc.head.appendChild(style);
                  }
              });

              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              if (i > 0) pdf.addPage(undefined, orientation);
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          }
          pdf.save(`${fileNameBase}.pdf`);
      } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Failed to generate PDF.");
      } finally {
          document.body.removeChild(tempContainer);
          setIsGenerating(false);
      }
  };

  const handlePrint = useCallback(() => {
      // Clean up any existing iframe first
      if (printIframeRef.current) {
          document.body.removeChild(printIframeRef.current);
          printIframeRef.current = null;
      }

      // Remove selection highlighting for print
      const wasSelected = activeElement;
      if (wasSelected) wasSelected.removeAttribute('data-selected');

      const iframe = document.createElement('iframe');
      // Set to fixed size to prevent layout shifts during print preview resizing
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.style.zIndex = '-1';
      
      document.body.appendChild(iframe);
      printIframeRef.current = iframe;

      const currentRender = history[historyIndex] || { options: designConfig, pages: [] };
      const allPagesHtml = currentRender.pages.join('<div style="page-break-after: always; height: 0;"></div>');

      const doc = iframe.contentWindow?.document;
      if (doc) {
          doc.open();
          doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                  <title>${title}</title>
                  <style>
                      /* Force white background and reset margins for print */
                      @media print {
                          @page { margin: 0; size: auto; }
                          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
                          .page-break { page-break-after: always; }
                          .print-container { width: 100% !important; height: auto !important; }
                          .page { width: 100% !important; height: 100% !important; margin: 0 !important; box-shadow: none !important; }
                      }
                      /* Ensure iframe content is visible when printing */
                      html, body { height: 100%; width: 100%; background: #ffffff; }

                      /* Visibility Styles */
                      ${options.visibleElements?.teacherName === false ? '.period-teacher, .teacher-text { display: none !important; }' : ''}
                      ${options.visibleElements?.subjectName === false ? '.period-subject, .subject-text { display: none !important; }' : ''}
                      ${options.visibleElements?.roomNumber === false ? '.header-details > div > div:nth-child(3) { display: none !important; }' : ''}

                      /* Scale */
                      .page {
                          zoom: ${options.contentScale || 1};
                      }
                  </style>
              </head>
              <body>
                  ${allPagesHtml}
                  <script>
                      // Wait for fonts to load
                      document.fonts.ready.then(() => {
                          setTimeout(() => {
                              window.focus();
                              window.print();
                          }, 500);
                      });
                  </script>
              </body>
              </html>
          `);
          doc.close();

          // Restore selection highlighting if needed
          if (wasSelected) wasSelected.setAttribute('data-selected', 'true');
      }
  }, [title, activeElement, history, historyIndex]);

  const currentRenderState = history[historyIndex] || { options: designConfig, pages: [] };
  const { options, pages } = currentRenderState;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[110] flex overflow-hidden animate-scale-in">
        
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
            <div 
                className="md:hidden fixed inset-0 bg-black/50 z-40" 
                onClick={() => setIsSidebarOpen(false)}
            />
        )}

        {/* Left Sidebar */}
        <div className={`transition-all duration-300 absolute md:relative z-50 bg-gray-900 border-r border-gray-800 flex flex-col h-full ${isSidebarOpen ? 'w-80 md:w-80 translate-x-0' : 'w-80 md:w-0 -translate-x-full md:translate-x-0'}`}>
            <div className="absolute -right-6 top-4 z-50 hidden md:block">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="bg-gray-800 p-1.5 rounded-r-lg border-y border-r border-gray-700 shadow-lg text-gray-400 hover:text-white transition-colors"
                    title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    {isSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </button>
            </div>
            
            <div className={`overflow-hidden flex flex-col h-full ${!isSidebarOpen && 'md:invisible'}`}>
                <SettingsSidebar 
                    options={options} 
                    onUpdate={handleDesignUpdate} 
                    onSaveDesign={onSaveDesign} 
                    resetToDefaults={resetToDefaults}
                    activeElement={activeElement}
                    activeElementStyles={activeElementStyles}
                    onApplyStyle={applyStyle}
                    onExecCmd={execCmd}
                />
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-800 relative">
            {/* Mobile Sidebar Toggle */}
            <div className="md:hidden absolute top-3 left-3 z-50">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className={`p-2 rounded-lg border shadow-lg transition-colors ${
                        isSidebarOpen 
                        ? 'bg-red-900/20 border-red-800 text-red-500 hover:text-red-400' 
                        : 'bg-gray-800 border-gray-700 text-teal-500 hover:text-teal-400'
                    }`}
                >
                    <Icons.Settings className="w-5 h-5" />
                </button>
            </div>
            
            {/* Top Bar: Header & Toolbar */}
            <div className="flex flex-col bg-white border-b border-gray-200 z-40 relative shadow-md">
                
                {/* Header Row (Title & Main Actions) */}
                <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-2 sm:px-4 text-white">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Modified margin to clear sidebar toggle and smaller text size */}
                        <span className="font-black text-xs uppercase tracking-wider text-gray-300 ml-14 sm:ml-12 whitespace-nowrap truncate max-w-[60px] sm:max-w-[200px]" title={title}>{title}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pl-2">
                        {/* Language Selector */}
                        <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-0.5 mr-1 flex-shrink-0">
                            <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${lang === 'en' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>En</button>
                            <button onClick={() => setLang('ur')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${lang === 'ur' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>Ur</button>
                            <button onClick={() => setLang('both')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${lang === 'both' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>Both</button>
                        </div>

                        <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1 gap-1 flex-shrink-0">
                            <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Toggle Fullscreen"><FullscreenIcon /></button>
                        </div>

                        <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1 gap-1 flex-shrink-0">
                            <button onClick={() => setZoomLevel(z => Math.max(20, z - 10))} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Zoom Out"><ZoomOutIcon /></button>
                            <span className="text-xs font-bold text-gray-400 w-8 text-center">{zoomLevel}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Zoom In"><ZoomInIcon /></button>
                            <button onClick={() => setZoomLevel(70)} className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Fit to Screen">Fit</button>
                        </div>

                        <div className="w-px h-6 bg-gray-700 mx-1 flex-shrink-0"></div>

                        {/* Action Buttons */}
                        <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-1 gap-1 flex-shrink-0">
                            <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30 text-gray-400 hover:text-white" title="Undo"><UndoIcon /></button>
                            <div className="w-px h-4 bg-gray-700"></div>
                            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30 text-gray-400 hover:text-white" title="Redo"><RedoIcon /></button>
                        </div>

                        <button 
                            onClick={handleDownloadPdf}
                            disabled={isGenerating}
                            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            title="Download PDF"
                        >
                            <Icons.Download />
                            <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Download PDF</span>
                        </button>

                        <button 
                            onClick={handleShare} 
                            disabled={isGenerating}
                            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.Share />}
                            <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Share</span>
                        </button>

                        {onGenerateExcel && (
                            <button 
                                onClick={() => onGenerateExcel(lang, options)} 
                                className="flex-shrink-0 p-2 text-green-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition shadow-sm" 
                                title="Export Excel"
                            >
                                <Icons.Excel />
                            </button>
                        )}
                        
                        <button 
                            onClick={handlePrint} 
                            className="flex-shrink-0 p-2 text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition shadow-sm" 
                            title="Print"
                        >
                            <Icons.Print />
                        </button>

                        <div className="w-px h-6 bg-gray-700 mx-1 flex-shrink-0"></div>

                        <button onClick={onClose} className="flex-shrink-0 p-2 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors">
                            <Icons.Close />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto p-8 relative flex flex-col items-center bg-gray-900/50 custom-scrollbar" ref={previewRef}>
                {pages.length > 1 && (
                    <div className="sticky top-0 z-20 mb-4 bg-white/90 backdrop-blur shadow-sm rounded-full px-4 py-2 flex items-center gap-4 text-sm font-bold text-gray-600 border border-gray-200">
                        <button onClick={() => handlePageChange(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="hover:text-teal-600 disabled:opacity-30">&larr;</button>
                        <span>Page {currentPage + 1} of {pages.length}</span>
                        <button onClick={() => handlePageChange(Math.min(pages.length - 1, currentPage + 1))} disabled={currentPage === pages.length - 1} className="hover:text-teal-600 disabled:opacity-30">&rarr;</button>
                    </div>
                )}

                <div 
                    ref={contentRef}
                    onClick={handleContentClick}
                    className="bg-white shadow-2xl transition-transform duration-200 origin-top"
                    style={{ 
                        transform: `scale(${zoomLevel / 100})`, 
                        filter: options.colorMode === 'bw' ? 'grayscale(100%)' : 'none'
                    }}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }}
                />

                <style>{`
                    [data-selected="true"] {
                        outline: 2px solid #3b82f6 !important;
                        outline-offset: -2px;
                        cursor: text;
                    }
                    /* Hide scrollbars in preview but keep scroll capability */
                    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }

                    /* Visibility Styles */
                    ${options.visibleElements?.teacherName === false ? '.period-teacher, .teacher-text { display: none !important; }' : ''}
                    ${options.visibleElements?.subjectName === false ? '.period-subject, .subject-text { display: none !important; }' : ''}
                    ${options.visibleElements?.roomNumber === false ? '.header-details > div > div:nth-child(3) { display: none !important; }' : ''}

                    /* Scale */
                    .page {
                        zoom: ${options.contentScale || 1};
                    }
                `}</style>
            </div>
        </div>
    </div>
  );
};

export default PrintPreview;
