import React, { useState, useEffect } from 'react';
import { Shield, User, Settings, Check, X, AlertCircle, Search, Info, Book } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole, TimetableSession, SessionPermissions } from '../types';

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
}

interface AdminPanelProps {
    t: any;
    onClose: () => void;
    currentSession?: TimetableSession | null;
    onUpdateSession?: (updater: (s: TimetableSession) => TimetableSession) => void;
    userEmail?: string | null;
    userId?: string | null;
    userRole?: string | null;
    onDeleteSession?: (session: TimetableSession) => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ t, onClose, currentSession, onUpdateSession, userEmail, userId, userRole, onDeleteSession }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<'system' | 'session'>('system');
    const [selectedSessionUserEmail, setSelectedSessionUserEmail] = useState<string | null>(null);

    const isGlobalAdmin = userRole === 'admin';
    const isSessionOwner = !!(currentSession && userId && currentSession.ownerId === userId);
    const canManageSessionData = !!(currentSession && userEmail && currentSession.userPermissions?.[userEmail.toLowerCase()]?.canManageData);
    const hasSessionControl = isSessionOwner || canManageSessionData;

    // Default tab based on permissions
    useEffect(() => {
        if (!isGlobalAdmin && hasSessionControl) {
            setActiveTab('session');
        }
    }, [isGlobalAdmin, hasSessionControl]);

    const defaultPermissions: SessionPermissions = {
        canEditTimetable: false,
        canManageData: false,
        canTakeAttendance: true,
        canViewReports: true,
        canManageStructure: false
    };

    const handleUpdatePermissions = (email: string, partial: Partial<SessionPermissions>) => {
        if (!onUpdateSession || !currentSession || !hasSessionControl) return;
        
        onUpdateSession(s => {
            const currentPerms = s.userPermissions || {};
            const userPerms = currentPerms[email] || { ...defaultPermissions };
            
            return {
                ...s,
                userPermissions: {
                    ...currentPerms,
                    [email]: { ...userPerms, ...partial }
                }
            };
        });
    };

    const handleUpdateRole = async (userId: string, newRole: UserRole) => {
        // Only Global Admins can do this
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, role: newRole });
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role');
        }
    };

    const toggleSessionAdmin = (email: string) => {
        if (!onUpdateSession || !currentSession) return;
        
        onUpdateSession(s => {
            const currentAdmins = s.admins || [];
            const isSessAdmin = currentAdmins.some(a => a.toLowerCase() === email.toLowerCase());
            
            const newAdmins = isSessAdmin 
                ? currentAdmins.filter(a => a.toLowerCase() !== email.toLowerCase())
                : [...currentAdmins, email.toLowerCase()];
            
            return { ...s, admins: newAdmins };
        });
    };

    const toggleSessionEditor = (email: string) => {
        if (!onUpdateSession || !currentSession || !isSessionOwner) return;
        
        onUpdateSession(s => {
            const currentEditors = s.editors || [];
            const isSessEditor = currentEditors.some(a => a.toLowerCase() === email.toLowerCase());
            
            const newEditors = isSessEditor 
                ? currentEditors.filter(a => a.toLowerCase() !== email.toLowerCase())
                : [...currentEditors, email.toLowerCase()];
            
            return { ...s, editors: newEditors };
        });
    };

    const addManualEditor = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const emailInput = form.elements.namedItem('editorEmail') as HTMLInputElement;
        const email = emailInput.value.trim().toLowerCase();
        
        if (email && onUpdateSession && isSessionOwner) {
            onUpdateSession(s => {
                const currentEditors = s.editors || [];
                const currentAdmins = s.admins || [];
                if (!currentEditors.includes(email) && !currentAdmins.includes(email)) {
                    return { ...s, editors: [...currentEditors, email] };
                }
                return s;
            });
            emailInput.value = '';
        }
    };

    const burnAndDestroy = (type: 'teachers' | 'classes' | 'subjects' | 'all') => {
        if (!onUpdateSession || !confirm('WARNING: THIS ACTION IS PERMANENT. ARE YOU SURE YOU WANT TO BURN AND DESTROY THESE AXES?')) return;
        
        onUpdateSession(s => {
            const newState = { ...s };
            if (type === 'teachers' || type === 'all') newState.teachers = [];
            if (type === 'classes' || type === 'all') newState.classes = [];
            if (type === 'subjects' || type === 'all') newState.subjects = [];
            if (type === 'all') {
                newState.jointPeriods = [];
                newState.adjustments = {};
                newState.leaveDetails = {};
            }
            return newState;
        });
        alert('Axes have been burnt and destroyed.');
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-[var(--accent-primary)]/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Control Center</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-[0.625rem] font-bold uppercase tracking-[0.2em]">{activeTab === 'system' ? 'System Roles' : 'Timetable Access'}</p>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                        {isGlobalAdmin && (
                            <button 
                                onClick={() => setActiveTab('system')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                            >
                                Global
                            </button>
                        )}
                        {hasSessionControl && (
                            <button 
                                onClick={() => setActiveTab('session')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'session' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-500'}`}
                            >
                                Session
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {activeTab === 'system' ? (
                        <>
                            {/* User List Side */}
                            <div className="w-1/2 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-black/20">
                                <div className="p-6 pb-2">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search users..."
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent-primary)] outline-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="font-bold text-xs uppercase tracking-widest">Loading...</span>
                                        </div>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <button 
                                                key={user.id}
                                                onClick={() => setSelectedUser(user)}
                                                className={`w-full text-left p-4 rounded-3xl transition-all flex items-center justify-between group ${
                                                    selectedUser?.id === user.id 
                                                        ? 'bg-white dark:bg-gray-800 shadow-xl border-l-4 border-indigo-500' 
                                                        : 'hover:bg-white dark:hover:bg-gray-800/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.email}</div>
                                                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mt-0.5">{user.role}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Detail Side */}
                            <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f172a]">
                                {selectedUser ? (
                                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl font-black ${selectedUser.role === 'admin' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-100 text-gray-400'}`}>
                                                {(selectedUser.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none mb-1">{(selectedUser.email || '?').split('@')[0]}</h3>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedUser.email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em]">System Role</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => handleUpdateRole(selectedUser.id, 'teacher')}
                                                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedUser.role === 'teacher' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg' : 'border-gray-100 dark:border-gray-800'}`}
                                                >
                                                    <User className="w-6 h-6" />
                                                    <span className="text-xs font-black uppercase">Teacher</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateRole(selectedUser.id, 'admin')}
                                                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${selectedUser.role === 'admin' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-lg' : 'border-gray-100 dark:border-gray-800'}`}
                                                >
                                                    <Shield className="w-6 h-6" />
                                                    <span className="text-xs font-black uppercase">Admin</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                        <User className="w-16 h-16" />
                                        <p className="mt-4 font-black uppercase text-xs">Select a user to manage</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex overflow-hidden">
                            <div className="w-1/2 border-r border-gray-100 dark:border-gray-800 p-8 space-y-6 overflow-y-auto">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Timetable Management</h3>
                                {currentSession ? (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">{(currentSession.name || '?').charAt(0)}</div>
                                                <div>
                                                    <h4 className="font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">{currentSession.name}</h4>
                                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">Active Shared Session</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl text-center">
                                                    <div className="text-lg font-black text-indigo-600">{currentSession.teachers.length}</div>
                                                    <div className="text-[8px] font-bold uppercase text-gray-500">Teachers</div>
                                                </div>
                                                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl text-center">
                                                    <div className="text-lg font-black text-indigo-600">{currentSession.classes.length}</div>
                                                    <div className="text-[8px] font-bold uppercase text-gray-500">Classes</div>
                                                </div>
                                                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl text-center">
                                                    <div className="text-lg font-black text-indigo-600">{currentSession.subjects.length}</div>
                                                    <div className="text-[8px] font-bold uppercase text-gray-500">Subjects</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em]">User Access & Permissions</h4>
                                                <div className="h-[1px] flex-grow bg-gray-100 dark:bg-gray-800"></div>
                                            </div>
                                            <div className="space-y-3">
                                                {/* Group by teachers from the session */}
                                                {currentSession.teachers.filter(t => t.email).map(teacher => {
                                                    const email = teacher.email!.toLowerCase();
                                                    const isAdmin = currentSession.admins?.some(a => a.toLowerCase() === email);
                                                    const isEditor = currentSession.editors?.some(a => a.toLowerCase() === email);
                                                    const perms = currentSession.userPermissions?.[email] || defaultPermissions;
                                                    
                                                    return (
                                                        <div key={teacher.id} className="bg-white dark:bg-gray-900/40 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden">
                                                            <div className="p-5 flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${isAdmin ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                                        {(teacher.name || '?').charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{teacher.name}</div>
                                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{email}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => toggleSessionAdmin(email)}
                                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600'}`}
                                                                    >
                                                                        {isAdmin ? 'Admin' : 'Teacher'}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setSelectedSessionUserEmail(selectedSessionUserEmail === email ? null : email)}
                                                                        className={`p-2 rounded-xl transition-all ${selectedSessionUserEmail === email ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-amber-500'}`}
                                                                    >
                                                                        <Settings className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {selectedSessionUserEmail === email && (
                                                                <div className="p-5 grid grid-cols-2 gap-4 bg-white dark:bg-gray-900/60 border-t border-gray-50 dark:border-gray-800 animate-in slide-in-from-top-4 duration-300">
                                                                    <PermissionToggle 
                                                                        label="Edit Timetable" 
                                                                        active={perms.canEditTimetable} 
                                                                        onClick={() => handleUpdatePermissions(email, { canEditTimetable: !perms.canEditTimetable })} 
                                                                        icon={<Book className="w-4 h-4" />}
                                                                    />
                                                                    <PermissionToggle 
                                                                        label="Manage Data" 
                                                                        active={perms.canManageData} 
                                                                        onClick={() => handleUpdatePermissions(email, { canManageData: !perms.canManageData })} 
                                                                        icon={<User className="w-4 h-4" />}
                                                                    />
                                                                    <PermissionToggle 
                                                                        label="Take Attendance" 
                                                                        active={perms.canTakeAttendance} 
                                                                        onClick={() => handleUpdatePermissions(email, { canTakeAttendance: !perms.canTakeAttendance })} 
                                                                        icon={<Check className="w-4 h-4" />}
                                                                    />
                                                                    <PermissionToggle 
                                                                        label="View Reports" 
                                                                        active={perms.canViewReports} 
                                                                        onClick={() => handleUpdatePermissions(email, { canViewReports: !perms.canViewReports })} 
                                                                        icon={<Info className="w-4 h-4" />}
                                                                    />
                                                                    <PermissionToggle 
                                                                        label="Manage Structure" 
                                                                        active={perms.canManageStructure} 
                                                                        onClick={() => handleUpdatePermissions(email, { canManageStructure: !perms.canManageStructure })} 
                                                                        icon={<Settings className="w-4 h-4" />}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[0.625rem] font-black text-gray-400 uppercase tracking-[0.2em]">Manage Editors (Sharing)</h4>
                                                <div className="h-[1px] flex-grow bg-gray-100 dark:bg-gray-800"></div>
                                            </div>
                                            
                                            {isSessionOwner && (
                                                <form onSubmit={addManualEditor} className="flex gap-2">
                                                    <input 
                                                        name="editorEmail"
                                                        type="email"
                                                        placeholder="Enter email to grant edit access..."
                                                        className="flex-grow px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        required
                                                    />
                                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Grant Edit</button>
                                                </form>
                                            )}

                                            <div className="space-y-2">
                                                {currentSession.editors?.map(email => (
                                                    <div key={email} className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xs">E</div>
                                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{email}</div>
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleSessionEditor(email)}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!currentSession.editors || currentSession.editors.length === 0) && (
                                                    <div className="p-8 text-center bg-gray-50/50 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No additional editors</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center opacity-40 uppercase font-black text-xs tracking-widest">No session active</div>
                                )}
                            </div>
                            {isSessionOwner && (
                                <div className="w-1/2 p-8 space-y-8 bg-red-50/30 dark:bg-red-900/5">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-red-600">
                                            <AlertCircle className="w-5 h-5" />
                                            <h3 className="text-lg font-black uppercase tracking-tight">Danger Zone</h3>
                                        </div>
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Burn and Destroy Axes - Irreversible Actions</p>
                                    </div>

                                    <div className="space-y-4">
                                        <button 
                                            onClick={() => burnAndDestroy('teachers')}
                                            className="w-full group p-6 rounded-[2rem] border-2 border-red-100 dark:border-red-900/20 hover:border-red-500 hover:bg-red-500 transition-all text-left"
                                        >
                                            <div className="font-black text-red-600 group-hover:text-white uppercase tracking-tight">Burn and Destroy Teachers Axes</div>
                                            <div className="text-[10px] font-bold text-red-400 group-hover:text-red-100 uppercase tracking-widest mt-1">Wipes the teacher database for this session</div>
                                        </button>
                                        <button 
                                            onClick={() => burnAndDestroy('classes')}
                                            className="w-full group p-6 rounded-[2rem] border-2 border-red-100 dark:border-red-900/20 hover:border-red-500 hover:bg-red-500 transition-all text-left"
                                        >
                                            <div className="font-black text-red-600 group-hover:text-white uppercase tracking-tight">Burn and Destroy Classes Axes</div>
                                            <div className="text-[10px] font-bold text-red-400 group-hover:text-red-100 uppercase tracking-widest mt-1">Deletes all class schedules and metadata</div>
                                        </button>
                                        <button 
                                            onClick={() => burnAndDestroy('all')}
                                            className="w-full group p-8 rounded-[2.5rem] bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20 transition-all text-center"
                                        >
                                            <div className="font-black text-white text-xl uppercase tracking-tighter">BURN EVERYTHING</div>
                                            <div className="text-[10px] font-black text-red-100 uppercase tracking-[0.2em] mt-1 opacity-80">Wipe everything and burn the axes to the ground</div>
                                        </button>

                                        {onDeleteSession && (
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will delete the entire timetable from the cloud forever.")) {
                                                        onDeleteSession(currentSession!);
                                                        onClose();
                                                    }
                                                }}
                                                className="w-full group p-6 rounded-[2rem] border-2 border-red-300 dark:border-red-900/40 hover:bg-red-900 hover:text-white transition-all text-center mt-8"
                                            >
                                                <div className="font-black text-red-700 dark:text-red-400 group-hover:text-white uppercase tracking-tight">DELETE TIMETABLE FROM CLOUD</div>
                                                <div className="text-[10px] font-bold text-red-400 group-hover:text-red-100 uppercase tracking-widest mt-1">Irreversible Cloud Deletion</div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                        Exit Control Center
                    </button>
                </div>
            </div>
        </div>
    );
};

const PermissionToggle: React.FC<{ label: string, active: boolean, onClick: () => void, icon: React.ReactNode }> = ({ label, active, onClick, icon }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
            active 
                ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]' 
                : 'bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-gray-800 text-gray-400'
        }`}
    >
        <div className={`p-2 rounded-lg ${active ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {icon}
        </div>
        <div>
            <div className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</div>
            <div className={`text-[8px] font-bold uppercase tracking-tight mt-0.5 ${active ? 'text-[var(--accent-primary)]' : 'text-gray-400'}`}>
                {active ? 'Allowed' : 'Restricted'}
            </div>
        </div>
    </button>
);

export default AdminPanel;
