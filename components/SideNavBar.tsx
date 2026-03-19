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
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdjustmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const AttendanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  theme: string;
}> = ({ label, icon, isActive, onClick, theme }) => {
  
  const colors: Record<string, { bg: string, text: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-500' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500' },
      indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500' },
      violet: { bg: 'bg-violet-500', text: 'text-violet-500' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-500' },
      teal: { bg: 'bg-teal-500', text: 'text-teal-500' },
      slate: { bg: 'bg-slate-500', text: 'text-slate-500' },
  };
  const color = colors[theme] || colors.blue;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center w-full h-12 px-4 rounded-xl transition-all duration-300 focus:outline-none group ${isActive ? '' : 'hover:bg-[var(--bg-tertiary)]'}`}
    >
      {isActive && (
          <motion.div
              layoutId="side-active-indicator"
              className={`absolute inset-0 ${color.bg} rounded-xl -z-10`}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
      )}
      
      <div className="flex items-center z-10 w-full">
          <span 
              className={`transition-colors duration-300 flex-shrink-0 ${isActive ? 'text-white' : `${color.text} group-hover:opacity-80`}`}
          >
              {icon}
          </span>
          
          <span 
              className={`ml-4 text-sm font-medium whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-white font-bold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
          >
              {label}
          </span>
      </div>
    </button>
  );
};

const SideNavBar: React.FC<SideNavBarProps> = ({ t, currentPage, setCurrentPage, schoolConfig }) => {
  
  const navItems: { page: Page; labelKey: string; icon: React.ReactNode; theme: string }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon />, theme: 'blue' },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon />, theme: 'emerald' },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon />, theme: 'indigo' },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon />, theme: 'violet' },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon />, theme: 'orange' },
    { page: 'attendance', labelKey: 'attendance', icon: <AttendanceIcon />, theme: 'teal' },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon />, theme: 'slate' },
  ];

  return (
    <aside className="hidden xl:flex flex-col fixed top-0 left-0 bottom-0 w-64 z-40 bg-[var(--bg-secondary)] border-r border-[var(--border-secondary)] shadow-lg">
      {/* Logo Section */}
      <div className="flex items-center gap-3 p-6 border-b border-[var(--border-secondary)]">
          {schoolConfig.schoolLogoBase64 && (
              <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-10 w-10 object-contain rounded-full shadow-sm" />
          )}
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight line-clamp-2">
              {schoolConfig.schoolNameEn || 'Timetable App'}
          </h1>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {navItems.map(item => {
              const isActive = currentPage === item.page;
              return (
              <NavButton
                  key={item.page}
                  label={t[item.labelKey]}
                  icon={item.icon}
                  isActive={isActive}
                  onClick={() => setCurrentPage(item.page)}
                  theme={item.theme}
              />
              );
          })}
      </div>
      
      {/* Footer Section (Optional) */}
      <div className="p-4 border-t border-[var(--border-secondary)]">
        <div className="text-xs text-[var(--text-secondary)] text-center">
            &copy; {new Date().getFullYear()} Timetable App
        </div>
      </div>
    </aside>
  );
};

export default SideNavBar;