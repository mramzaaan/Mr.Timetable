import React, { useState } from 'react';
import type { Page, SchoolConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home,
  Database,
  Calendar,
  Users,
  Shuffle,
  UserCheck,
  Settings,
  FileText
} from 'lucide-react';

interface SideNavBarProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  schoolConfig: SchoolConfig;
}

// Icon components with larger default size
const HomeIcon = ({ className = "h-7 w-7" }) => <Home className={className} strokeWidth={1.5} />;
const DataEntryIcon = ({ className = "h-7 w-7" }) => <Database className={className} strokeWidth={1.5} />;
const ClassTimetableIcon = ({ className = "h-7 w-7" }) => <Calendar className={className} strokeWidth={1.5} />;
const TeacherTimetableIcon = ({ className = "h-7 w-7" }) => <Users className={className} strokeWidth={1.5} />;
const AdjustmentsIcon = ({ className = "h-7 w-7" }) => <Shuffle className={className} strokeWidth={1.5} />;
const AttendanceIcon = ({ className = "h-7 w-7" }) => <UserCheck className={className} strokeWidth={1.5} />;
const ReportsIcon = ({ className = "h-7 w-7" }) => <FileText className={className} strokeWidth={1.5} />;
const SettingsIcon = ({ className = "h-7 w-7" }) => <Settings className={className} strokeWidth={1.5} />;

const SideNavBar: React.FC<SideNavBarProps> = ({ t, currentPage, setCurrentPage, schoolConfig }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const navItems: { page: Page; labelKey: string; icon: React.ReactElement; theme: string }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon />, theme: 'blue' },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon />, theme: 'emerald' },
    { page: 'classTimetable', labelKey: 'class', icon: <ClassTimetableIcon />, theme: 'indigo' },
    { page: 'teacherTimetable', labelKey: 'teacher', icon: <TeacherTimetableIcon />, theme: 'violet' },
    { page: 'attendance', labelKey: 'attendance', icon: <AttendanceIcon />, theme: 'teal' },
    { page: 'reports', labelKey: 'reports', icon: <ReportsIcon />, theme: 'rose' },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon />, theme: 'orange' },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon />, theme: 'slate' },
  ];

  const themeColors: Record<string, string> = {
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      indigo: 'bg-indigo-500',
      violet: 'bg-violet-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      rose: 'bg-rose-500',
      slate: 'bg-slate-500',
  };
  
  const textColors: Record<string, string> = {
      blue: 'text-blue-500',
      emerald: 'text-emerald-500',
      indigo: 'text-indigo-500',
      violet: 'text-violet-500',
      orange: 'text-orange-500',
      teal: 'text-teal-500',
      rose: 'text-rose-500',
      slate: 'text-slate-500',
  };

  return (
    <>
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-6 left-6 bottom-6 z-50 bg-[var(--bg-secondary)] backdrop-blur-[30px] border border-[var(--border-primary)] shadow-2xl transition-all duration-500 ease-in-out flex flex-col py-6 overflow-hidden
          ${isHovered ? 'w-64 rounded-[2.5rem]' : 'w-24 rounded-full'} 
          hidden md:landscape:flex lg:flex
        `}
      >
        {/* Header Section */}
        <div className="w-full flex items-center mb-8 px-6 h-12 flex-shrink-0">
            <div className={`transition-all duration-500 flex-shrink-0 flex items-center justify-center ${isHovered ? 'w-12 h-12' : 'w-12 h-12 mx-auto'}`}>
                {schoolConfig.schoolLogoBase64 ? (
                    <img src={schoolConfig.schoolLogoBase64} alt="Logo" className="h-full w-full object-contain rounded-full border border-[var(--border-secondary)] shadow-sm" />
                ) : (
                    <div className="h-full w-full bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center text-[var(--accent-primary)] font-black text-xs">MT</div>
                )}
            </div>
            {isHovered && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-3 flex flex-col min-w-0"
                >
                    <span className="text-[10px] font-black text-[var(--accent-primary)] tracking-[0.2em] uppercase truncate">Management</span>
                    <span className="text-[10px] font-black text-[var(--text-secondary)] tracking-widest uppercase truncate opacity-50">System</span>
                </motion.div>
            )}
        </div>

        {/* Nav Items */}
        <nav className="w-full flex-1 flex flex-col gap-2 px-4 relative overflow-y-auto no-scrollbar">
            {navItems.map(item => {
                const isActive = currentPage === item.page;
                const activeBg = themeColors[item.theme] || 'bg-[var(--accent-primary)]';
                const inactiveText = textColors[item.theme] || 'text-[var(--text-secondary)]';
                
                return (
                    <button
                        key={item.page}
                        onClick={() => setCurrentPage(item.page)}
                        className={`relative flex items-center group w-full transition-all duration-300 focus:outline-none h-14 rounded-full ${isHovered ? 'px-4' : 'justify-center px-0'}`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="nav-notch-side"
                                className={`absolute inset-0 ${activeBg} rounded-full z-0`}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        
                        <div className={`flex items-center z-10 ${isHovered ? 'w-full' : 'justify-center'}`}>
                            <span className={`transition-all duration-300 flex-shrink-0 ${isActive ? 'text-white' : `${inactiveText} group-hover:opacity-100 opacity-70`}`}>
                                {item.icon}
                            </span>
                            
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.span 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className={`ml-3 text-xs font-black whitespace-nowrap tracking-widest uppercase ${isActive ? 'text-white' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        {t[item.labelKey].split(' ')[0]}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </button>
                );
            })}
        </nav>

        {/* Footer info - Status dot */}
        <div className="mt-4 flex items-center justify-center p-4">
            <div className={`h-2 rounded-full bg-[var(--accent-primary)] transition-all duration-500 ${isHovered ? 'w-12 opacity-20' : 'w-2 opacity-40'}`} />
        </div>
      </aside>
    </>
  );
};

export default SideNavBar;