
import React, { useState, useEffect } from 'react';
import type { SchoolConfig } from '../types';

interface SchoolInfoModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newConfig: Partial<SchoolConfig>) => void;
}

const SchoolInfoModal: React.FC<SchoolInfoModalProps> = ({ t, isOpen, onClose, schoolConfig, onUpdateSchoolConfig }) => {
  const [localSchoolNameEn, setLocalSchoolNameEn] = useState(schoolConfig.schoolNameEn);
  const [localSchoolNameUr, setLocalSchoolNameUr] = useState(schoolConfig.schoolNameUr);
  const [localSchoolLogo, setLocalSchoolLogo] = useState<string | null>(schoolConfig.schoolLogoBase64);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  useEffect(() => {
    if (isOpen) {
        setLocalSchoolNameEn(schoolConfig.schoolNameEn);
        setLocalSchoolNameUr(schoolConfig.schoolNameUr);
        setLocalSchoolLogo(schoolConfig.schoolLogoBase64);
    }
  }, [isOpen, schoolConfig]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please select an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSchoolLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
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
    setTimeout(() => {
        setFeedback({ message: '', type: null });
        onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const inputStyleClasses = "mt-1 block w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-2xl w-full max-w-2xl transform transition-all border border-[var(--border-primary)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">School Information</h3>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {feedback.message && (
                    <div className={`p-4 rounded-2xl text-sm font-bold animate-scale-in ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
                        {feedback.message}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 px-1">{t.schoolNameEn}</label>
                            <input type="text" value={localSchoolNameEn} onChange={(e) => setLocalSchoolNameEn(e.target.value)} className={inputStyleClasses} placeholder="Enter School Name in English" />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-2 px-1">{t.schoolNameUr}</label>
                            <input type="text" value={localSchoolNameUr} onChange={(e) => setLocalSchoolNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu text-right text-lg`} dir="rtl" placeholder="سکول کا نام اردو میں درج کریں" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 px-1">School Logo</label>
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[var(--bg-tertiary)]/50 rounded-2xl border border-[var(--border-secondary)]">
                            {localSchoolLogo ? (
                                <div className="relative group flex-shrink-0">
                                    <img src={localSchoolLogo} alt="School Logo" className="h-24 w-24 object-contain rounded-2xl border-2 border-white shadow-md bg-white" />
                                    <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all transform hover:scale-110">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="h-24 w-24 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-secondary)] bg-[var(--bg-tertiary)] text-[var(--text-placeholder)] flex-shrink-0 gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Logo</span>
                                </div>
                            )}
                            <div className="flex-1 w-full">
                                <label htmlFor="logo-upload-modal" className="flex flex-col items-center justify-center w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl cursor-pointer hover:border-indigo-500 transition-colors group">
                                    <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700">Choose File</span>
                                    <input
                                        type="file"
                                        id="logo-upload-modal"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="mt-2 text-[10px] text-[var(--text-secondary)] font-medium text-center">PNG, JPG up to 2MB. Recommended: Square ratio.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 pt-0 flex justify-end gap-4">
                <button onClick={onClose} className="px-8 py-3 text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-2xl transition-all">{t.cancel}</button>
                <button 
                    onClick={handleSettingsSave} 
                    className="px-10 py-3 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-[0.98]"
                >
                    {t.saveSettings}
                </button>
            </div>
        </div>
    </div>
  );
};

export default SchoolInfoModal;
