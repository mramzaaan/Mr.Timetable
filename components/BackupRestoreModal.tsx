
import React, { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Database, Settings, Users, BookOpen, Layers, Type } from 'lucide-react';
import type { UserData, TimetableSession, SchoolConfig, Subject, Teacher, SchoolClass, CustomFont } from '../types';
import { get, set } from 'idb-keyval';

interface BackupRestoreModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  userData: UserData;
  onRestore: (data: UserData, fontData?: Record<string, string>) => void;
}

interface BackupData extends UserData {
    backupVersion: number;
    backupDate: string;
    fontsData?: Record<string, string>;
}

const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ t, isOpen, onClose, userData, onRestore }) => {
  const [importing, setImporting] = useState<BackupData | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [selectedItems, setSelectedItems] = useState<{
      schoolConfig: boolean;
      sessions: string[];
      fonts: boolean;
  }>({
      schoolConfig: true,
      sessions: [],
      fonts: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
        const fontsData = await get<Record<string, string>>('mrtimetable_customFontsData') || {};
        const backup: BackupData = {
            ...userData,
            backupVersion: 1,
            backupDate: new Date().toISOString(),
            fontsData
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mr-timetable-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setStatus({ type: 'success', message: 'Backup exported successfully!' });
    } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to export backup.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result as string;
            if (!result) throw new Error("Empty file.");
            
            const rawData = JSON.parse(result);
            if (!rawData || typeof rawData !== 'object') throw new Error("Invalid JSON data.");

            let data: BackupData;

            // Robust Detection: Handle Single Session Import vs Full Backup
            const isSingleSession = (rawData.id && typeof rawData.id === 'string') && 
                                  (rawData.classes && Array.isArray(rawData.classes)) &&
                                  (rawData.teachers && Array.isArray(rawData.teachers));

            const isFullBackup = (rawData.timetableSessions && Array.isArray(rawData.timetableSessions)) && 
                                (rawData.schoolConfig && typeof rawData.schoolConfig === 'object');

            if (isSingleSession) {
                // This looks like a single TimetableSession
                data = {
                    timetableSessions: [rawData as TimetableSession],
                    schoolConfig: userData.schoolConfig, // Use current config
                    backupVersion: 1,
                    backupDate: new Date().toISOString()
                };
            } else if (isFullBackup) {
                // This looks like a full UserData backup
                data = {
                    ...rawData,
                    backupVersion: rawData.backupVersion || 1,
                    backupDate: rawData.backupDate || new Date().toISOString()
                };
            } else {
                throw new Error("Unrecognized file structure. Not a valid session or backup.");
            }

            setImporting(data);
            setSelectedItems({
                schoolConfig: isFullBackup && !!rawData.schoolConfig,
                sessions: data.timetableSessions.map(s => s.id),
                fonts: !!(data.schoolConfig?.customFonts?.length || 0)
            });
            setStatus({ type: null, message: '' });
        } catch (err) {
            console.error('Import Error:', err);
            setStatus({ 
                type: 'error', 
                message: err instanceof Error ? err.message : 'Invalid backup file.' 
            });
        }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!importing) return;

    try {
        const restoredData: UserData = {
            schoolConfig: selectedItems.schoolConfig ? importing.schoolConfig : userData.schoolConfig,
            timetableSessions: userData.timetableSessions
        };

        // Merge sessions
        if (selectedItems.sessions.length > 0) {
            const sessionsToImport = importing.timetableSessions.filter(s => selectedItems.sessions.includes(s.id));
            
            // For now, let's just replace if they exist, or add if new
            const newSessions = [...userData.timetableSessions];
            
            sessionsToImport.forEach(importedSession => {
                const index = newSessions.findIndex(s => s.id === importedSession.id);
                if (index !== -1) {
                    newSessions[index] = importedSession;
                } else {
                    newSessions.push(importedSession);
                }
            });
            
            restoredData.timetableSessions = newSessions;
        }

        onRestore(restoredData, selectedItems.fonts ? importing.fontsData : undefined);
        setStatus({ type: 'success', message: 'Data restored successfully!' });
        setTimeout(() => {
            onClose();
            setImporting(null);
        }, 1500);
    } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to restore data.' });
    }
  };

  const toggleSession = (id: string) => {
      setSelectedItems(prev => ({
          ...prev,
          sessions: prev.sessions.includes(id) 
            ? prev.sessions.filter(sid => sid !== id) 
            : [...prev.sessions, id]
      }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={onClose}>
      <div 
        className="bg-white/95 dark:bg-black/40 backdrop-blur-[40px] border border-white/50 dark:border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.25)] max-w-3xl w-full p-8 sm:p-10 animate-scale-in flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
                    <Database className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">BACKUP & RESTORE</h3>
                    <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest opacity-60">Full Application Data Management</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-secondary)]">
                <X className="h-6 w-6" />
            </button>
        </div>

        {status.type && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span className="font-bold">{status.message}</span>
            </div>
        )}

        {!importing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                {/* Export Column */}
                <div className="p-8 rounded-[2rem] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600 mb-6 border border-indigo-500/20 shadow-inner">
                        <Download className="h-10 w-10" />
                    </div>
                    <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">Create Backup</h4>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-8">Save all your timetables, teachers, subjects, and school settings into a secure JSON file.</p>
                    <button 
                        onClick={handleExport}
                        className="mt-auto w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all"
                    >
                        Export Data
                    </button>
                </div>

                {/* Import Column */}
                <div className="p-8 rounded-[2rem] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mb-6 border border-emerald-500/20 shadow-inner">
                        <Upload className="h-10 w-10" />
                    </div>
                    <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">Restore Backup</h4>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-8">Upload a previously exported JSON file to restore your data and configurations.</p>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-auto w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all"
                    >
                        Import File
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                </div>
            </div>
        ) : (
            <div className="flex flex-col flex-grow overflow-hidden">
                <div className="mb-6 pb-4 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-black text-[var(--accent-primary)] uppercase tracking-tighter">SELECT DATA TO RESTORE</h4>
                        <p className="text-[var(--text-secondary)] text-xs font-bold uppercase opacity-60">Choose which components you want to import</p>
                    </div>
                    <button 
                        onClick={() => setImporting(null)}
                        className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline"
                    >
                        Cancel Import
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-6 pb-6">
                    {/* School Config Section */}
                    <div className="p-5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={selectedItems.schoolConfig}
                                onChange={(e) => setSelectedItems(prev => ({ ...prev, schoolConfig: e.target.checked }))}
                                className="w-6 h-6 rounded-lg accent-indigo-600"
                            />
                            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="font-bold text-[var(--text-primary)]">School Configuration</h5>
                                <p className="text-xs text-[var(--text-secondary)] font-medium">Includes name, logo, bell schedule, breaks, and design settings</p>
                            </div>
                        </label>
                    </div>

                    {/* Sessions Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2 px-2">
                             <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
                             <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">Timetable Sessions</span>
                        </div>
                        {importing.timetableSessions.map(session => (
                            <div key={session.id} className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] hover:border-emerald-500/30 transition-colors">
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedItems.sessions.includes(session.id)}
                                        onChange={() => toggleSession(session.id)}
                                        className="w-5 h-5 rounded-lg accent-emerald-600"
                                    />
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-bold text-[var(--text-primary)]">{session.name}</h5>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">{session.classes.length} Classes</span>
                                        </div>
                                        <div className="flex gap-4 mt-1">
                                            <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-bold">
                                                <Users className="h-3 w-3" /> {session.teachers.length} Teachers
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-bold">
                                                <BookOpen className="h-3 w-3" /> {session.subjects.length} Subjects
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Fonts Section */}
                    {importing.schoolConfig.customFonts && importing.schoolConfig.customFonts.length > 0 && (
                        <div className="p-5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
                            <label className="flex items-center gap-4 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={selectedItems.fonts}
                                    onChange={(e) => setSelectedItems(prev => ({ ...prev, fonts: e.target.checked }))}
                                    className="w-6 h-6 rounded-lg accent-purple-600"
                                />
                                <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
                                    <Type className="h-5 w-5" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-[var(--text-primary)]">Custom Fonts</h5>
                                    <p className="text-xs text-[var(--text-secondary)] font-medium">Restore {importing.schoolConfig.customFonts.length} uploaded font files</p>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                <div className="pt-6 mt-2 border-t border-white/20 dark:border-white/5">
                    <button 
                        disabled={!selectedItems.schoolConfig && selectedItems.sessions.length === 0 && !selectedItems.fonts}
                        onClick={handleRestore}
                        className="w-full py-5 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                        Run Restore Sequence
                    </button>
                    <p className="text-center text-[10px] text-[var(--text-secondary)] mt-4 font-bold uppercase tracking-widest opacity-40">
                        Warning: This may overwrite existing sessions with the same ID.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default BackupRestoreModal;
