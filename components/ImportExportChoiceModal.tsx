
import React from 'react';
import { X, FileJson, FileSpreadsheet } from 'lucide-react';

interface ImportExportChoiceModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenCsv: () => void;
  onOpenBackup: () => void;
}

const ImportExportChoiceModal: React.FC<ImportExportChoiceModalProps> = ({ t, isOpen, onClose, onOpenCsv, onOpenBackup }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div 
        className="bg-white/90 dark:bg-black/30 backdrop-blur-[40px] border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-lg w-full p-8 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{t.importExport || "Import / Export"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
            <X className="h-6 w-6 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* CSV Option */}
          <button 
            onClick={() => { onOpenCsv(); onClose(); }}
            className="flex items-center gap-6 p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-left group"
          >
            <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-[var(--text-primary)] mb-1">CSV Management</h4>
              <p className="text-[var(--text-secondary)] text-sm font-medium">{t.csvUploadDescription || "Import/Export data using CSV spreadsheets"}</p>
            </div>
          </button>

          {/* Backup & Restore Option */}
          <button 
            onClick={() => { onOpenBackup(); onClose(); }}
            className="flex items-center gap-6 p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-left group"
          >
            <div className="p-4 bg-indigo-500 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
              <FileJson className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-[var(--text-primary)] mb-1">Backup & Restore</h4>
              <p className="text-[var(--text-secondary)] text-sm font-medium">Backup your entire application data into a JSON file and restore it later.</p>
            </div>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/20 dark:border-white/5 text-center">
            <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-[0.2em] opacity-50">
                Data Management Suite
            </p>
        </div>
      </div>
    </div>
  );
};

export default ImportExportChoiceModal;
