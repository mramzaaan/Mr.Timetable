
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { Page } from '../types';
import type { NavPosition, NavDesign, NavShape } from '../types';

interface BottomNavBarProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  position: NavPosition;
  design: NavDesign;
  shape: NavShape;
  alphaSelected?: number;
  alphaUnselected?: number;
  barAlpha?: number;
  barColor?: string;
  navAnimation: boolean;
}

import { 
  Home,
  Database,
  Calendar,
  Users,
  Shuffle,
  UserCheck,
  Settings
} from 'lucide-react';

// Icon components
const HomeIcon = () => <Home className="h-6 w-6" />;
const DataEntryIcon = () => <Database className="h-6 w-6" />;
const ClassTimetableIcon = () => <Calendar className="h-6 w-6" />;
const TeacherTimetableIcon = () => <Users className="h-6 w-6" />;
const AdjustmentsIcon = () => <Shuffle className="h-6 w-6" />;
const AttendanceIcon = () => <UserCheck className="h-6 w-6" />;
const SettingsIcon = () => <Settings className="h-6 w-6" />;

const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, currentPage, setCurrentPage, navAnimation }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (!navAnimation) {
        setIsCollapsed(false);
        return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
          setIsCollapsed(false);
      } else if (currentScrollY > lastScrollY + 5) {
          setIsCollapsed(true);
      } else if (currentScrollY < lastScrollY - 10) {
          setIsCollapsed(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, navAnimation]);

  const navItems: { page: Page; labelKey: string; icon: React.ReactNode; theme: string }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon />, theme: 'blue' },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon />, theme: 'emerald' },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon />, theme: 'indigo' },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon />, theme: 'violet' },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon />, theme: 'orange' },
    { page: 'attendance', labelKey: 'attendance', icon: <AttendanceIcon />, theme: 'teal' },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon />, theme: 'slate' },
  ];

  const themeColors: Record<string, string> = {
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      indigo: 'bg-indigo-500',
      violet: 'bg-violet-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      slate: 'bg-slate-500',
  };
  
  const textColors: Record<string, string> = {
      blue: 'text-blue-500',
      emerald: 'text-emerald-500',
      indigo: 'text-indigo-500',
      violet: 'text-violet-500',
      orange: 'text-orange-500',
      teal: 'text-teal-500',
      slate: 'text-slate-500',
  };

  return (
    <div className={`block md:landscape:hidden lg:hidden fixed bottom-6 left-4 right-4 z-50 transition-transform duration-300 ${isCollapsed ? 'translate-y-[200%]' : 'translate-y-0'}`}>
      <div className="w-full bg-[var(--bg-secondary)]/95 backdrop-blur-md h-16 rounded-full shadow-2xl border border-[var(--border-secondary)] flex items-center justify-between px-2 relative overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {navItems.map((item) => {
            const isActive = item.page === currentPage;
            const activeBg = themeColors[item.theme] || 'bg-[var(--accent-primary)]';
            const inactiveText = textColors[item.theme] || 'text-[var(--text-secondary)]';

            return (
                <button 
                    key={item.page}
                    onClick={() => { setCurrentPage(item.page); setIsCollapsed(false); }}
                    className={`relative flex items-center justify-center h-12 rounded-full transition-all duration-300 focus:outline-none group flex-shrink-0 ${isActive ? 'px-4 sm:px-5' : 'w-10 sm:w-12'}`}
                >
                    {isActive && (
                        <motion.div
                            layoutId="active-indicator"
                            className={`absolute inset-0 ${activeBg} rounded-full -z-10`}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    
                    <div className="flex items-center justify-center z-10 overflow-hidden">
                        <span 
                            className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-white' : `${inactiveText} group-hover:opacity-80`}`}
                        >
                            {React.cloneElement(item.icon as React.ReactElement, { className: "h-6 w-6" })}
                        </span>
                        
                        {isActive && (
                            <motion.span 
                                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                                animate={{ opacity: 1, width: 'auto', marginLeft: 6 }}
                                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                                className="text-xs sm:text-sm font-bold whitespace-nowrap text-white"
                            >
                                { (t[item.labelKey] || item.labelKey).split(' ')[0] }
                            </motion.span>
                        )}
                    </div>
                </button>
            );
        })}
      </div>
    </div>
  );
};

export default BottomNavBar;
