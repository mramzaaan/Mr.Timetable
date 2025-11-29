
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
  showLabels?: boolean;
}

// Icon components
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
  showLabels: boolean;
}> = ({ label, icon, isActive, onClick, design, shape, showLabels }) => {
  const labelParts = label.split(' ');
  
  // Refined Shape Classes
  const isCircle = shape === 'circle';
  const isPill = shape === 'pill';
  
  let buttonBaseClasses = 'flex items-center justify-center transition-all duration-300 ease-in-out relative ';
  let textClasses = 'text-[9px] sm:text-[10px] font-medium leading-none text-center transition-opacity duration-200 ';
  let contentWrapperClasses = 'flex flex-col items-center justify-center w-full h-full';

  // Shape handling
  if (isCircle) {
      buttonBaseClasses += 'rounded-full aspect-square w-12 h-12 sm:w-14 sm:h-14 mx-auto ';
      textClasses = 'hidden'; 
  } else if (isPill) {
      buttonBaseClasses += 'rounded-full w-full max-w-[80px] h-10 sm:h-12 ';
      textClasses += 'mt-0.5 ';
  } else if (shape === 'leaf') {
      buttonBaseClasses += 'rounded-tr-2xl rounded-bl-2xl w-full h-full p-1 ';
      textClasses += 'mt-1 ';
  } else if (shape === 'rounded') {
      buttonBaseClasses += 'rounded-xl w-full h-full p-1 ';
      textClasses += 'mt-1 ';
  } else {
      // Square
      buttonBaseClasses += 'rounded-none w-full h-full p-1 ';
      textClasses += 'mt-1 ';
  }

  // Design Logic
  if (design === 'classic') {
      if (isActive) {
          buttonBaseClasses += 'bg-[var(--accent-secondary)] text-[var(--accent-primary)] shadow-sm ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] ';
      }
  } else if (design === 'modern') {
      if (isActive) {
          buttonBaseClasses += 'bg-[var(--accent-primary)] text-white shadow-lg scale-110 -translate-y-1 ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] ';
      }
  } else if (design === 'minimal') {
      buttonBaseClasses += isCircle ? '' : 'rounded-none ';
      if (isActive) {
          buttonBaseClasses += isCircle 
            ? 'bg-[var(--bg-tertiary)] text-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ' 
            : 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)] ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] ';
      }
  } else if (design === '3d') {
      if (isActive) {
          buttonBaseClasses += 'bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white shadow-[0_4px_0_var(--accent-primary-hover)] translate-y-[-2px] ';
      } else {
          buttonBaseClasses += 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] shadow-[0_4px_0_var(--border-secondary)] active:shadow-none active:translate-y-[4px] hover:bg-[var(--border-secondary)] ';
      }
  } else if (design === 'neon') {
      if (isActive) {
          buttonBaseClasses += 'text-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary),inset_0_0_5px_var(--accent-primary)] border border-[var(--accent-primary)] ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:text-white hover:shadow-[0_0_5px_var(--text-secondary)] ';
      }
  } else if (design === 'glass') {
      if (isActive) {
          buttonBaseClasses += 'bg-white/30 backdrop-blur-md border border-white/50 text-[var(--accent-primary)] shadow-lg ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:bg-white/10 ';
      }
  } else if (design === 'gradient') {
      if (isActive) {
          buttonBaseClasses += 'bg-gradient-to-tr from-[var(--accent-primary)] via-purple-500 to-pink-500 text-white shadow-md ';
      } else {
          buttonBaseClasses += 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] ';
      }
  } else if (design === 'outline') {
      buttonBaseClasses += 'border-2 ';
      if (isActive) {
          buttonBaseClasses += 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ';
      } else {
          buttonBaseClasses += 'border-transparent text-[var(--text-secondary)] hover:border-[var(--text-placeholder)] ';
      }
  }

  // Adjust content alignment if labels are hidden
  // If labels are hidden, centered content is just the icon.
  // If labels are shown, icon usually has margin bottom.
  const iconClass = `transition-transform ${isActive && design === 'modern' ? 'animate-bounce-short' : ''} ${showLabels ? 'mb-0.5' : ''}`;

  if (isCircle) {
      return (
          <div className="flex flex-col items-center gap-1 w-full">
              <button onClick={onClick} className={buttonBaseClasses}>
                  <div className={isActive ? 'animate-pulse-slow' : ''}>{icon}</div>
              </button>
              {showLabels && (
                <span className={`text-[9px] font-bold text-center leading-none transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {labelParts[0]}
                </span>
              )}
          </div>
      );
  }

  return (
    <button onClick={onClick} className={buttonBaseClasses}>
        <div className={contentWrapperClasses}>
            <div className={iconClass}>{icon}</div>
            {showLabels && (
                <span className={textClasses}>
                    {labelParts[0]}
                    {/* For pill/rounded, show full label if space allows, otherwise wrap */}
                    {!isPill && labelParts.length > 1 && <><br/>{labelParts.slice(1).join(' ')}</>}
                </span>
            )}
        </div>
    </button>
  );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, currentPage, setCurrentPage, position, design, shape, showLabels = true }) => {
  const navItems: { page: Page; labelKey: string; icon: React.ReactNode }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon /> },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon /> },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon /> },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon /> },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon /> },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon /> },
  ];

  // Container styling based on design
  let navContainerClasses = `xl:hidden fixed left-0 right-0 z-50 flex items-center justify-around no-print transition-all duration-300 `;
  let innerContainerClasses = `w-full h-full flex items-center justify-around px-2 `;

  if (position === 'top') {
      navContainerClasses += 'top-0 ';
  } else {
      navContainerClasses += 'bottom-0 pb-[env(safe-area-inset-bottom)] ';
  }

  // Design-specific container modifications
  if (design === 'modern' || design === 'glass' || design === '3d') {
      // Floating island style
      navContainerClasses += 'p-4 pointer-events-none '; // Allow clicks through the padding areas
      innerContainerClasses = 'pointer-events-auto w-full max-w-lg mx-auto h-16 rounded-2xl shadow-xl flex items-center justify-around px-1 ';
      
      if (design === 'modern') {
          innerContainerClasses += 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] ';
      } else if (design === 'glass') {
          innerContainerClasses += 'bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/20 shadow-2xl ';
      } else if (design === '3d') {
          innerContainerClasses += 'bg-[var(--bg-secondary)] border-b-4 border-r-4 border-[var(--border-secondary)] rounded-3xl ';
      }
  } else if (design === 'neon') {
      navContainerClasses += 'bg-black border-t border-[var(--accent-primary)] shadow-[0_0_20px_rgba(0,0,0,0.8)] h-20 ';
      innerContainerClasses += ' ';
  } else if (design === 'gradient') {
      navContainerClasses += 'bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-tertiary)] to-[var(--bg-secondary)] border-t border-[var(--border-primary)] h-20 ';
  } else {
      // Classic & Outline & Minimal
      navContainerClasses += 'bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] h-20 ';
  }

  return (
    <nav className={navContainerClasses}>
      <div className={innerContainerClasses}>
        {navItems.map(item => (
            <NavButton
            key={item.page}
            label={t[item.labelKey]}
            icon={item.icon}
            isActive={currentPage === item.page}
            onClick={() => setCurrentPage(item.page)}
            design={design}
            shape={shape}
            showLabels={showLabels}
            />
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;
