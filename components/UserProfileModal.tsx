import React, { useState, useRef } from 'react';
import { X, User, LogOut, Upload, Book, Shield, Plus, Check, Star, Trash2, Cloud, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TimetableSession, UserRole, SchoolConfig } from '../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string | null;
    userRole: UserRole;
    userId: string | null;
    canEditGlobal: boolean;
    sessions: TimetableSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onSetDefaultSession: (id: string) => void;
    onDeleteSessionFromBackend: (session: TimetableSession) => Promise<void>;
    onUploadSession: (file: File) => void;
    onOpenImportExport: () => void;
    onOpenCreateModal: () => void;
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
    userId,
    canEditGlobal,
    sessions, 
    currentSessionId, 
    onSelectSession, 
    onSetDefaultSession,
    onDeleteSessionFromBackend,
    onUploadSession,
    onOpenImportExport,
    onOpenCreateModal,
    onSignOut,
    onCreateSession,
    onSaveToCloud,
    t 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    
    const isAdmin = userRole === 'admin';
    const canManageTimetables = isAdmin || canEditGlobal;

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadSession(file);
            setIsCreateMenuOpen(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <input 
                type="file" 
                accept=".json"
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
            />
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
                                                onClick={() => { setIsCreateMenuOpen(false); onOpenCreateModal(); }}
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="space-y-6">
                            {/* Own Timetables */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#888] ml-2">My Creations</p>
                                {sessions.filter(s => !s.isShared).length === 0 && <p className="text-[10px] font-bold text-gray-400 ml-4 italic">No creations yet.</p>}
                                {sessions.filter(s => !s.isShared).map((session) => (
                                    <div key={session.id} className="space-y-4 p-4 rounded-[2rem] bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onSelectSession(session.id)}
                                                className={`flex-grow flex items-center justify-between p-4 rounded-[1.5rem] transition-all ${
                                                    currentSessionId === session.id 
                                                        ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-800'
                                                }`}
                                            >
                                                <div className="text-left overflow-hidden">
                                                    <div className="font-black text-sm tracking-tight truncate">{session.name}</div>
                                                    <div className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${currentSessionId === session.id ? 'text-white' : ''}`}>
                                                        {session.startDate} - {session.endDate}
                                                    </div>
                                                </div>
                                                {currentSessionId === session.id && <Check className="w-4 h-4 shrink-0" />}
                                            </button>
                                            <div className="flex gap-1.5">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSetDefaultSession(session.id); }}
                                                    className={`p-3 rounded-2xl transition-all shadow-sm ${currentSessionId === session.id ? 'bg-[var(--accent-primary)] text-white ring-2 ring-[var(--accent-secondary)]' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-[var(--accent-primary)]'}`}
                                                    title="Set as Default"
                                                >
                                                    <Star className={`w-4 h-4 ${currentSessionId === session.id ? 'fill-current' : ''}`} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onDeleteSessionFromBackend(session); }}
                                                    className={`p-3 rounded-2xl transition-all shadow-sm bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white`}
                                                    title="Delete from Online"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sharing Status</span>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{session.allowEdit ? 'Teachers Can Edit' : 'View Only Mode'}</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={session.allowEdit === true}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.checked;
                                                        const updatedSession = { ...session, allowEdit: newVal };
                                                        await onSaveToCloud(updatedSession);
                                                    }}
                                                />
                                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--accent-primary)] shadow-inner"></div>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Shared Timetables */}
                            {sessions.some(s => s.isShared) && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-2">Shared with Me</p>
                                    {sessions.filter(s => s.isShared).map((session) => (
                                        <div key={session.id} className="flex gap-2 p-2 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-900/20">
                                            <button
                                                onClick={() => onSelectSession(session.id)}
                                                className={`flex-grow flex items-center justify-between p-4 rounded-[1.5rem] transition-all border-2 ${
                                                    currentSessionId === session.id 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                                                        : 'bg-white dark:bg-gray-800/50 text-indigo-700 dark:text-indigo-400 border-indigo-50 dark:border-indigo-900/20 hover:bg-indigo-50'
                                                }`}
                                            >
                                                <div className="text-left overflow-hidden">
                                                    <div className="font-black text-sm tracking-tight truncate">{session.name}</div>
                                                    <div className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${currentSessionId === session.id ? 'text-white' : ''}`}>
                                                        {session.schoolName}
                                                    </div>
                                                </div>
                                                {currentSessionId === session.id && <Check className="w-4 h-4 shrink-0" />}
                                            </button>
                                            <div className="flex gap-1.5">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onSetDefaultSession(session.id); }}
                                                    className={`p-3 rounded-2xl transition-all shadow-sm ${currentSessionId === session.id ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600'}`}
                                                    title="Set as Default"
                                                >
                                                    <Star className={`w-4 h-4 ${currentSessionId === session.id ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

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
