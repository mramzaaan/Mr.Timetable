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
  Settings
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
const SettingsIcon = ({ className = "h-7 w-7" }) => <Settings className={className} strokeWidth={1.5} />;

const SideNavBar: React.FC<SideNavBarProps> = ({ t, currentPage, setCurrentPage, schoolConfig }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const navItems: { page: Page; labelKey: string; icon: React.ReactElement; color: string }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon />, color: '#6366f1' },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon />, color: '#10b981' },
    { page: 'classTimetable', labelKey: 'class', icon: <ClassTimetableIcon />, color: '#4f46e5' },
    { page: 'teacherTimetable', labelKey: 'teacher', icon: <TeacherTimetableIcon />, color: '#8b5cf6' },
    { page: 'attendance', labelKey: 'attendance', icon: <AttendanceIcon />, color: '#14b8a6' },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon />, color: '#f59e0b' },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon />, color: '#64748b' },
  ];

  return (
    <>
      {/* SideNavBar Container */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-4 left-4 bottom-4 z-50 bg-[#8b5cf6] rounded-[2rem] shadow-2xl transition-all duration-300 ease-in-out flex flex-col items-center py-6
          ${isHovered ? 'w-64' : 'w-22'} 
          hidden md:landscape:flex lg:flex
        `}
      >
        {/* Header Section - School Logo moved here */}
        <div className="w-full flex flex-col items-center mb-6 min-h-[4rem] justify-center px-4">
            <div className={`transition-all duration-300 transform ${isHovered ? 'scale-110' : 'scale-100'}`}>
                {schoolConfig.schoolLogoBase64 ? (
                    <img src={schoolConfig.schoolLogoBase64} alt="Logo" className="h-12 w-12 object-contain rounded-full border-2 border-white/20 shadow-inner" />
                ) : (
                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10">MT</div>
                )}
            </div>
            {isHovered && (
                <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-[0.6rem] font-bold text-white/40 tracking-[0.4em] uppercase text-center"
                >
                    {schoolConfig.schoolNameEn || 'MENU'}
                </motion.span>
            )}
        </div>

        {/* Nav Items - Made scrollable for low height screens */}
        <nav className="w-full flex-1 flex flex-col gap-1 relative overflow-y-auto no-scrollbar py-2">
            {navItems.map(item => {
                const isActive = currentPage === item.page;
                
                return (
                    <button
                        key={item.page}
                        onClick={() => setCurrentPage(item.page)}
                        className={`relative flex items-center group w-full transition-all duration-200 focus:outline-none min-h-[4rem] h-16
                            ${isHovered ? 'px-6' : 'justify-center px-0'}
                        `}
                    >
                        {/* The Notch Background - Refined to remove lines/gaps */}
                        {isActive && (
                            <motion.div
                                layoutId="nav-notch"
                                className="absolute -right-[2px] w-[calc(100%-0.75rem)] h-full bg-[var(--bg-primary)] rounded-l-[2rem] z-0"
                                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                            >
                                {/* Top Inverted Corner - Larger coverage to prevent sub-pixel lines */}
                                <div className="absolute -top-6 right-0 w-10 h-6 bg-[var(--bg-primary)]">
                                    <div className="w-full h-full bg-[#8b5cf6] rounded-br-[2rem]" />
                                </div>
                                {/* Bottom Inverted Corner */}
                                <div className="absolute -bottom-6 right-0 w-10 h-6 bg-[var(--bg-primary)]">
                                    <div className="w-full h-full bg-[#8b5cf6] rounded-tr-[2rem]" />
                                </div>
                            </motion.div>
                        )}
                        
                        <div className={`flex items-center z-10 w-full transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-105' : 'scale-100'} ${isHovered ? 'justify-start' : 'justify-center'}`}>
                            <span className={`transition-colors duration-200 p-2.5 rounded-2xl flex-shrink-0
                                ${isActive ? '' : 'text-white/80 group-hover:text-white'}
                            `}
                            style={{ color: isActive ? item.color : undefined }}
                            >
                                {item.icon}
                            </span>
                            
                            <AnimatePresence mode="wait">
                                {isHovered && (
                                    <motion.span 
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -5 }}
                                        transition={{ duration: 0.15 }}
                                        className={`ml-3 text-[0.85rem] font-black whitespace-nowrap tracking-wide uppercase transition-colors duration-200 
                                            ${isActive ? '' : 'text-white/70 group-hover:text-white group-hover:opacity-100'}
                                        `}
                                        style={{ color: isActive ? item.color : undefined }}
                                    >
                                        {t[item.labelKey]}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </button>
                );
            })}
        </nav>

        {/* Footer info - Simple marker */}
        <div className="mt-4 mb-2 h-1 w-8 bg-white/10 rounded-full flex-shrink-0" />
      </aside>
    </>
  );
};

export default SideNavBar;