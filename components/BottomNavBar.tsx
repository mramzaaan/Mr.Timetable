
import React from 'react';
import type { Page } from '../types';
import type { NavPosition, NavDesign, NavShape } from '../App';

interface BottomNavBarProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  position: NavPosition;
  design: NavDesign;
  shape: NavShape;
}

// Icon components for clarity
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdjustmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  design: NavDesign;
  shape: NavShape;
}> = ({ label, icon, isActive, onClick, design, shape }) => {
  const labelParts = label.split(' ');
  
  let containerClasses = '';
  let iconClasses = '';
  let textClasses = '';
  
  // Base shape classes
  const shapeClasses = {
      square: 'rounded-none',
      rounded: 'rounded-lg',
      pill: 'rounded-full',
      circle: 'rounded-full aspect-square',
      leaf: 'rounded-tr-3xl rounded-bl-3xl',
  }[shape];

  const baseTransition = 'transition-all duration-300 ease-in-out';

  if (design === 'classic') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--accent-primary)] focus:ring-offset-[var(--bg-secondary)] ${
        isActive 
          ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)] shadow-inner scale-95' 
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-md hover:shadow-lg hover:text-[var(--accent-primary)] hover:-translate-y-0.5 active:scale-95'
      }`;
      textClasses = "text-[10px] sm:text-xs text-center leading-tight mt-0.5";
  } else if (design === 'modern') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} ${
          isActive
          ? 'bg-[var(--accent-primary)] text-white shadow-lg -translate-y-2'
          : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
      }`;
      textClasses = "text-[9px] sm:text-[10px] font-bold text-center mt-1";
  } else if (design === 'minimal') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shape === 'pill' ? 'rounded-full' : 'rounded-md'} ${baseTransition} ${
          isActive
          ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
          : 'text-[var(--text-secondary)] opacity-70'
      }`;
      textClasses = "hidden";
      iconClasses = isActive ? "scale-110" : "";
  } else if (design === '3d') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} relative overflow-hidden group ${
          isActive
          ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white shadow-[0_8px_16px_-4px_var(--accent-primary)] -translate-y-2 scale-105'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] shadow-sm hover:shadow-md hover:text-[var(--accent-primary)]'
      }`;
      textClasses = "text-[9px] sm:text-[10px] font-bold text-center mt-1 relative z-10";
      iconClasses = "relative z-10 drop-shadow-sm";
  } else if (design === 'neon') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} border ${
          isActive
          ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-secondary)]/10 shadow-[0_0_15px_var(--accent-primary),inset_0_0_5px_var(--accent-primary)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
      }`;
      textClasses = `text-[9px] sm:text-[10px] font-bold text-center mt-1 ${isActive ? 'drop-shadow-[0_0_2px_var(--accent-primary)]' : ''}`;
      iconClasses = isActive ? "drop-shadow-[0_0_5px_var(--accent-primary)]" : "";
  } else if (design === 'glass') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} backdrop-blur-md border ${
          isActive
          ? 'bg-white/20 border-white/40 text-[var(--accent-primary)] shadow-lg'
          : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10'
      }`;
      textClasses = "text-[9px] sm:text-[10px] font-bold text-center mt-1";
  } else if (design === 'gradient') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} ${
          isActive
          ? 'bg-gradient-to-r from-[var(--accent-primary)] via-purple-500 to-pink-500 text-white shadow-lg scale-105'
          : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
      }`;
      textClasses = "text-[9px] sm:text-[10px] font-bold text-center mt-1";
  } else if (design === 'outline') {
      containerClasses = `flex flex-col items-center justify-center w-full h-full p-1 ${shapeClasses} ${baseTransition} border-2 ${
          isActive
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
          : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
      }`;
      textClasses = "text-[9px] sm:text-[10px] font-bold text-center mt-1";
  }

  return (
    <button onClick={onClick} className={containerClasses}>
      {design === '3d' && isActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50 pointer-events-none"></div>
      )}
      <div className={iconClasses}>{icon}</div>
      <span className={textClasses}>
          {labelParts[0]}
          {labelParts.length > 1 && <br />}
          {labelParts.slice(1).join(' ')}
      </span>
    </button>
  );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, currentPage, setCurrentPage, position, design, shape }) => {
  const navItems: { page: Page; labelKey: string; icon: React.ReactNode }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon /> },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon /> },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon /> },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon /> },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon /> },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon /> },
  ];

  const containerClasses = `xl:hidden fixed left-0 right-0 h-20 bg-[var(--bg-secondary)] border-[var(--border-primary)] z-50 flex items-stretch justify-around p-2 no-print transition-all duration-300 ${
      position === 'top' ? 'top-0 border-b shadow-md' : 'bottom-0 border-t shadow-[0_-2px_5px_rgba(0,0,0,0.05)]'
  } ${design === 'modern' || design === '3d' || design === 'glass' ? 'bg-opacity-95 backdrop-blur-lg' : ''}`;

  return (
    <nav className={containerClasses}>
      {navItems.map(item => (
        <NavButton
          key={item.page}
          label={t[item.labelKey]}
          icon={item.icon}
          isActive={currentPage === item.page}
          onClick={() => setCurrentPage(item.page)}
          design={design}
          shape={shape}
        />
      ))}
    </nav>
  );
};

export default BottomNavBar;