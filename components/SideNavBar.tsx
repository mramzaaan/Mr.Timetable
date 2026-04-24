import React, { useState, useEffect } from 'react';
import type { Page, SchoolConfig } from '../types';
import { motion } from 'motion/react';

interface SideNavBarProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  schoolConfig: SchoolConfig;
}

// Icon components for clarity
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.147l-2.825.908a.375.375 0 01-.467-.467l.908-2.825a4.5 4.5 0 011.146-1.89l13.158-13.158z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="4" width="18" height="10" rx="1" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 16h20M5 16v5M19 16v5M8 14v-3l4-1 4 1v3" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 10c-1 2-1 4 0 5M18 10c1 2 1 4 0 5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
const AdjustmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.5a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 2.5v1M8.5 9.5v1M5 6.5H4M13 6.5h-1M11 4l-1 1M6 9l-1 1M11 9l-1-1M6 4l-1-1" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 17.5a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 13.5v1M17.5 20.5v1M14 17.5h-1M22 17.5h-1M20 15l-1 1M15 20l-1 1M20 20l-1-1M15 15l-1-1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /></svg>;
const AttendanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4M8 17l2 2 4-4" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  theme: string;
}> = ({ label, icon, isActive, onClick, theme }) => {
  
  const colors: Record<string, { bg: string, text: string, activeText: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-gray-500', activeText: 'text-blue-600' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-gray-500', activeText: 'text-emerald-600' },
      indigo: { bg: 'bg-indigo-500/10', text: 'text-gray-500', activeText: 'text-indigo-600' },
      violet: { bg: 'bg-violet-500/10', text: 'text-gray-500', activeText: 'text-violet-600' },
      orange: { bg: 'bg-orange-500/10', text: 'text-gray-500', activeText: 'text-orange-600' },
      teal: { bg: 'bg-teal-500/10', text: 'text-gray-500', activeText: 'text-teal-600' },
      slate: { bg: 'bg-slate-500/10', text: 'text-gray-500', activeText: 'text-slate-600' },
  };
  const color = colors[theme] || colors.blue;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center w-full h-12 px-6 transition-all duration-300 focus:outline-none group ${isActive ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-[var(--bg-tertiary)]'}`}
      title={label}
    >
      {isActive && (
          <motion.div
              layoutId="side-active-indicator"
              className={`absolute right-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-full`}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
      )}
      
      <div className="flex items-center z-10 w-full">
          <span 
              className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-blue-600' : `${color.text} group-hover:text-[var(--text-primary)]`}`}
          >
              {icon}
          </span>
          
          <span 
              className={`ml-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
          >
              {label}
          </span>
      </div>
    </button>
  );
};

const SideNavBar: React.FC<SideNavBarProps> = ({ t, currentPage, setCurrentPage, schoolConfig }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const navItems: { page: Page; labelKey: string; icon: React.ReactNode; theme: string }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon />, theme: 'blue' },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon />, theme: 'emerald' },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon />, theme: 'indigo' },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon />, theme: 'violet' },
    { page: 'attendance', labelKey: 'attendance', icon: <AttendanceIcon />, theme: 'teal' },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon />, theme: 'orange' },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon />, theme: 'slate' },
  ];

  return (
    <>
      {/* Tablet Landscape Hamburger Toggle */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-[var(--bg-secondary)] rounded-md shadow-md border border-[var(--border-secondary)] hidden md:landscape:flex lg:hidden text-[var(--text-primary)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* SideNavBar Container */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 bg-[#f0f4f8] dark:bg-[var(--bg-secondary)] border-r border-[var(--border-secondary)] shadow-sm transition-all duration-300 ease-in-out flex flex-col
          ${isHovered ? 'w-64' : 'w-[4.5rem]'} 
          hidden lg:flex
        `}
      >
        {/* Logo Section */}
        <div className={`flex items-center px-4 h-24 flex-shrink-0 relative overflow-hidden transition-all duration-300 ${isHovered ? 'gap-3' : 'justify-center gap-0'}`}>
            {schoolConfig.schoolLogoBase64 && (
                <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-8 w-8 min-w-[2rem] object-contain rounded-full shadow-sm" />
            )}
            <h1 className={`text-xl font-black text-blue-700 dark:text-blue-400 tracking-tight whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                {schoolConfig.schoolNameEn || 'Mr. TimeTable'}
            </h1>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 flex flex-col gap-1 w-full">
            {navItems.map(item => {
                const isActive = currentPage === item.page;
                
                const colors: Record<string, { bg: string, text: string, activeText: string }> = {
                    blue: { bg: 'bg-blue-500/10', text: 'text-gray-500', activeText: 'text-blue-600' },
                    emerald: { bg: 'bg-emerald-500/10', text: 'text-gray-500', activeText: 'text-emerald-600' },
                    indigo: { bg: 'bg-indigo-500/10', text: 'text-gray-500', activeText: 'text-indigo-600' },
                    violet: { bg: 'bg-violet-500/10', text: 'text-gray-500', activeText: 'text-violet-600' },
                    orange: { bg: 'bg-orange-500/10', text: 'text-gray-500', activeText: 'text-orange-600' },
                    teal: { bg: 'bg-teal-500/10', text: 'text-gray-500', activeText: 'text-teal-600' },
                    slate: { bg: 'bg-slate-500/10', text: 'text-gray-500', activeText: 'text-slate-600' },
                };
                const color = colors[item.theme] || colors.blue;

                return (
                    <button
                        key={item.page}
                        onClick={() => setCurrentPage(item.page)}
                        className={`relative flex items-center h-12 transition-all duration-300 focus:outline-none group ${isActive ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-[var(--bg-tertiary)]'} ${isHovered ? 'px-6 w-full' : 'px-0 w-[4.5rem] justify-center'}`}
                        title={t[item.labelKey]}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="side-desktop-active-indicator"
                                className={`absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full`}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        
                        <div className={`flex items-center z-10 w-full ${isHovered ? 'justify-start' : 'justify-center'}`}>
                            <span className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-blue-600' : `${color.text} group-hover:text-[var(--text-primary)]`}`}>
                                {item.icon}
                            </span>
                            
                            <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${isActive ? 'text-blue-600' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'} ${isHovered ? 'ml-4 opacity-100 max-w-[12.5rem]' : 'ml-0 opacity-0 max-w-0'}`}>
                                {t[item.labelKey]}
                            </span>
                        </div>
                    </button>
                );
            })}
        </nav>
      </aside>

      {/* Tablet Landscape Over Drawer */}
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isMobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible'} hidden md:landscape:block lg:hidden`} onClick={() => setIsMobileOpen(false)} />
      <aside className={`fixed top-0 left-0 bottom-0 z-50 bg-[#f0f4f8] dark:bg-[var(--bg-secondary)] border-r border-[var(--border-secondary)] shadow-xl w-64 transition-transform duration-300 ease-in-out transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} hidden md:landscape:flex lg:hidden flex-col`}>
        {/* Same content for tablet drawer */}
        <div className="flex items-center gap-3 px-6 h-24 flex-shrink-0 border-b border-[var(--border-secondary)]">
            {schoolConfig.schoolLogoBase64 && (
                <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-8 w-8 object-contain rounded-full shadow-sm" />
            )}
            <h1 className="text-xl font-black text-blue-700 dark:text-blue-400 tracking-tight line-clamp-1">
                {schoolConfig.schoolNameEn || 'Mr. TimeTable'}
            </h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 w-full">
            {navItems.map(item => {
                const isActive = currentPage === item.page;
                const colors: Record<string, { bg: string, text: string, activeText: string }> = {
                    blue: { bg: 'bg-blue-500/10', text: 'text-gray-500', activeText: 'text-blue-600' },
                    emerald: { bg: 'bg-emerald-500/10', text: 'text-gray-500', activeText: 'text-emerald-600' },
                    indigo: { bg: 'bg-indigo-500/10', text: 'text-gray-500', activeText: 'text-indigo-600' },
                    violet: { bg: 'bg-violet-500/10', text: 'text-gray-500', activeText: 'text-violet-600' },
                    orange: { bg: 'bg-orange-500/10', text: 'text-gray-500', activeText: 'text-orange-600' },
                    teal: { bg: 'bg-teal-500/10', text: 'text-gray-500', activeText: 'text-teal-600' },
                    slate: { bg: 'bg-slate-500/10', text: 'text-gray-500', activeText: 'text-slate-600' },
                };
                const color = colors[item.theme] || colors.blue;

                return (
                    <button
                        key={item.page}
                        onClick={() => { setCurrentPage(item.page); setIsMobileOpen(false); }}
                        className={`relative flex items-center h-12 px-6 w-full transition-all duration-300 focus:outline-none group ${isActive ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="side-tablet-active-indicator"
                                className={`absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full`}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <div className="flex items-center z-10 w-full justify-start">
                            <span className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-blue-600' : `${color.text} group-hover:text-[var(--text-primary)]`}`}>
                                {item.icon}
                            </span>
                            <span className={`ml-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                {t[item.labelKey]}
                            </span>
                        </div>
                    </button>
                );
            })}
        </nav>
      </aside>
    </>
  );
};

export default SideNavBar;