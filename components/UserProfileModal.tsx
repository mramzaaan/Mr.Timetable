import React, { useState, useRef } from 'react';
import { X, User, LogOut, Upload, Book, Shield, Plus, Check, Star, Trash2, Cloud, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TimetableSession, UserRole, SchoolConfig } from '../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string | null;
    userRole: UserRole;
    canEditGlobal: boolean;
    sessions: TimetableSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onSetDefaultSession: (id: string) => void;
    onDeleteSessionFromBackend: (session: TimetableSession) => Promise<void>;
    onUploadSession: (file: File) => void;
    onOpenImportExport: () => void;
    onSignOut: () => void;
    onCreateSession: (name: string, startDate: string, endDate: string) => void;
    onSaveToCloud: (session: TimetableSession) => Promise<void>;
    t: any;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
    isOpen, 
    onClose, 
    userEmail, 
    userRole, 
    canEditGlobal,
    sessions, 
    currentSessionId, 
    onSelectSession, 
    onSetDefaultSession,
    onDeleteSessionFromBackend,
    onUploadSession,
    onOpenImportExport,
    onSignOut,
    onCreateSession,
    onSaveToCloud,
    t 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    
    const isAdmin = userRole === 'admin';
    const canManageTimetables = isAdmin || canEditGlobal;

    if (!isOpen) return null;

    const handleCreateManual = () => {
        if (!manualName || !manualStart || !manualEnd) return;
        onCreateSession(manualName, manualStart, manualEnd);
        setIsManualModalOpen(false);
        setManualName('');
        setManualStart('');
        setManualEnd('');
        setIsCreateMenuOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadSession(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative h-32 bg-[var(--accent-primary)] p-6 flex flex-col justify-end">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[var(--accent-primary)] shadow-lg">
                            <User className="w-8 h-8" />
                        </div>
                        <div className="text-white">
                            <h2 className="font-black text-xl tracking-tight leading-none truncate max-w-[200px]">
                                {userEmail?.split('@')[0] || 'User'}
                            </h2>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">
                                {userRole}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {/* User Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">{t.email || 'Email'}</span>
                            <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{userEmail}</span>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800" />

                    {/* Timetable Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                               <Book className="w-4 h-4" /> Timetables
                            </h3>
                        </div>
                        
                        <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                    <Cloud className="w-4 h-4" />
                                </div>
                                <div className="flex-grow">
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">ACCOUNT SYNCHRONIZED</p>
                                    <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 font-medium leading-none">Changes are automatically saved online</p>
                                </div>
                            </div>
                        </div>

                        {/* Create Timetable Action */}
                        {canManageTimetables && (
                            <div className="mb-6 space-y-3">
                                {!isCreateMenuOpen ? (
                                    <button 
                                        onClick={() => setIsCreateMenuOpen(true)}
                                        className="w-full flex items-center justify-center gap-3 p-4 bg-[var(--accent-primary)] text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span>Create Timetable</span>
                                    </button>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Creation Options</p>
                                            <button onClick={() => setIsCreateMenuOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button 
                                                onClick={() => setIsManualModalOpen(true)}
                                                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200"
                                            >
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Plus className="w-4 h-4" /></div>
                                                <div className="text-left">
                                                    <p className="leading-tight">Create Manually</p>
                                                    <p className="text-[10px] font-medium text-gray-400">Start from scratch</p>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200"
                                            >
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><Upload className="w-4 h-4" /></div>
                                                <div className="text-left">
                                                    <p className="leading-tight">Upload JSON</p>
                                                    <p className="text-[10px] font-medium text-gray-400">Import backup file</p>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => { setIsCreateMenuOpen(false); onOpenImportExport(); }}
                                                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200"
                                            >
                                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><FileSpreadsheet className="w-4 h-4" /></div>
                                                <div className="text-left">
                                                    <p className="leading-tight">Import CSV Data</p>
                                                    <p className="text-[10px] font-medium text-gray-400">Upload existing data</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="space-y-6">
                            {/* Own Timetables */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">My Creations</p>
                                {sessions.filter(s => !s.isShared).map((session) => (
                                        <div key={session.id} className="flex gap-2">
                                            <button
                                                onClick={() => onSelectSession(session.id)}
                                                className={`flex-grow flex items-center justify-between p-4 rounded-3xl transition-all ${
                                                    currentSessionId === session.id 
                                                        ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-left">
                                                    <div className="font-bold text-sm tracking-tight">{session.name}</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${currentSessionId === session.id ? 'text-white' : ''}`}>
                                                        {session.startDate} - {session.endDate}
                                                    </div>
                                                </div>
                                                {currentSessionId === session.id && <Check className="w-5 h-5" />}
                                            </button>
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSetDefaultSession(session.id); }}
                                                    className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all flex-1 ${currentSessionId === session.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-[var(--accent-primary)]'}`}
                                                    title="Set as Default"
                                                >
                                                    <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${currentSessionId === session.id ? 'fill-current' : ''}`} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSaveToCloud(session); }}
                                                    className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white`}
                                                    title="Sync to Cloud"
                                                >
                                                    <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                                {session.ownerId && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onDeleteSessionFromBackend(session); }}
                                                        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white`}
                                                        title="Delete from Online"
                                                    >
                                                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                ))}
                            </div>

                            {/* Shared Timetables */}
                            {sessions.some(s => s.isShared) && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-4">Shared with Me</p>
                                    {sessions.filter(s => s.isShared).map((session) => (
                                        <div key={session.id} className="flex gap-2">
                                            <button
                                                onClick={() => onSelectSession(session.id)}
                                                className={`flex-grow flex items-center justify-between p-4 rounded-3xl transition-all border-2 ${
                                                    currentSessionId === session.id 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                                                        : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'
                                                }`}
                                            >
                                                <div className="text-left">
                                                    <div className="font-bold text-sm tracking-tight">{session.name}</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${currentSessionId === session.id ? 'text-white' : ''}`}>
                                                        {session.schoolName}
                                                    </div>
                                                </div>
                                                {currentSessionId === session.id && <Check className="w-5 h-5" />}
                                            </button>
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSetDefaultSession(session.id); }}
                                                    className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all flex-1 ${currentSessionId === session.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-[var(--accent-primary)]'}`}
                                                    title="Set as Default"
                                                >
                                                    <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${currentSessionId === session.id ? 'fill-current' : ''}`} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSaveToCloud(session); }}
                                                    className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white`}
                                                    title="Sync to Cloud"
                                                >
                                                    <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Create Modal */}
                    {isManualModalOpen && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <h4 className="text-lg font-black tracking-tight mb-4">New Timetable</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Session Name</label>
                                        <input 
                                            type="text" 
                                            value={manualName}
                                            onChange={(e) => setManualName(e.target.value)}
                                            placeholder="e.g. Summer 2026"
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Start Date</label>
                                            <input 
                                                type="date" 
                                                value={manualStart}
                                                onChange={(e) => setManualStart(e.target.value)}
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">End Date</label>
                                            <input 
                                                type="date" 
                                                value={manualEnd}
                                                onChange={(e) => setManualEnd(e.target.value)}
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsManualModalOpen(false)}
                                            className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleCreateManual}
                                            className="flex-1 py-4 text-sm font-bold text-white bg-[var(--accent-primary)] rounded-2xl transition-all shadow-md active:scale-95"
                                        >
                                            Create
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin Actions */}
                    {/* Removed duplicated upload button here as it's now in the Create menu */}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-3">
                    <button 
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>{t.signOut || 'Sign Out'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
