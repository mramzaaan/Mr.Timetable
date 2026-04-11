
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

// Icon components
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdjustmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const AttendanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

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
    <div className={`xl:hidden fixed bottom-6 left-4 right-4 z-50 transition-transform duration-300 ${isCollapsed ? 'translate-y-[200%]' : 'translate-y-0'}`}>
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
                                {t[item.labelKey].split(' ')[0]}
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
