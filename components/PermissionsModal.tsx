
import React from 'react';
import { X, Check, Shield, User } from 'lucide-react';
import { TimetableSession, Teacher } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: TimetableSession;
    onTogglePermission: (email: string) => void;
    t: any;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ 
    isOpen, 
    onClose, 
    session, 
    onTogglePermission,
    t 
}) => {
    if (!isOpen) return null;

    const teachersWithEmails = session.teachers?.filter(t => t.email && t.email.includes('@')) || [];
    const allowedEmails = session.allow_edit_emails || [];

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-8 border-b dark:border-gray-800 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl uppercase tracking-tight dark:text-white">Permissions</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-70">
                                    {session.name}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <p className="text-xs font-bold text-gray-500 mb-6 leading-relaxed">
                            Select teachers who are allowed to edit this timetable. These users will see an "Edit" button in their shared tab.
                        </p>

                        <div className="space-y-3">
                            {teachersWithEmails.length === 0 ? (
                                <div className="text-center py-10 opacity-40">
                                    <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No teachers with emails found in this session.</p>
                                </div>
                            ) : (
                                teachersWithEmails.map((teacher) => {
                                    const isAllowed = allowedEmails.includes(teacher.email!.toLowerCase());
                                    return (
                                        <div 
                                            key={teacher.id}
                                            onClick={() => onTogglePermission(teacher.email!)}
                                            className={`group p-4 rounded-[1.5rem] flex items-center justify-between cursor-pointer transition-all border-2 ${
                                                isAllowed 
                                                    ? 'bg-emerald-50 border-emerald-500/30' 
                                                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                                            } dark:bg-gray-800/50`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                                                    isAllowed ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                }`}>
                                                    {teacher.nameEn.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-black text-sm tracking-tight dark:text-white">{teacher.nameEn}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 truncate max-w-[180px]">{teacher.email}</div>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                                                isAllowed 
                                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                    : 'border-gray-200 dark:border-gray-700'
                                            }`}>
                                                {isAllowed && <Check className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="p-8 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                        <button 
                            onClick={onClose}
                            className="px-8 py-4 bg-emerald-500 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
