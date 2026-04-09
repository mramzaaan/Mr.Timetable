import React, { useMemo } from 'react';
import type { Period, Language, Subject, Teacher, SchoolClass, JointPeriod } from '../types';

interface PeriodStackProps {
  periods: Period[];
  onDragStart: (periods: Period[]) => void;
  onDragEnd?: () => void;
  onDeleteStack?: () => void;
  onClick?: (periods: Period[]) => void; // New prop
  colorName?: string;
  language: Language;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods?: JointPeriod[];
  displayContext: 'teacher' | 'class' | 'jointPeriod';
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isGhost?: boolean;
  isSelected?: boolean; // New prop
  className?: string;
  showCount?: boolean;
  jointPeriodName?: string;
}

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const PeriodStack: React.FC<PeriodStackProps> = ({ periods, onDragStart, onDragEnd, onDeleteStack, onClick, colorName, language, subjects, teachers, classes, jointPeriods, displayContext, isHighlighted, isDimmed, isGhost, isSelected, className, showCount = true, jointPeriodName }) => {
  if (periods.length === 0) return null;

  const firstPeriod = periods[0];
  const schoolClass = classes.find(c => c.id === firstPeriod.classId);

  const groupInfo = useMemo(() => {
    if (!schoolClass) return null;

    let groupSetId: string | undefined;
    let groupId: string | undefined;

    // Resolve Group Info: Check Joint Period first, then Standard Subject
    if (firstPeriod.jointPeriodId && jointPeriods) {
        const jp = jointPeriods.find(j => j.id === firstPeriod.jointPeriodId);
        const assignment = jp?.assignments.find(a => a.classId === firstPeriod.classId);
        groupSetId = assignment?.groupSetId;
        groupId = assignment?.groupId;
    } else {
        const classSubject = schoolClass.subjects.find(s => s.subjectId === firstPeriod.subjectId);
        groupSetId = classSubject?.groupSetId;
        groupId = classSubject?.groupId;
    }

    if (!groupSetId || !groupId) return null;

    const set = schoolClass.groupSets?.find(s => s.id === groupSetId);
    const group = set?.groups.find(g => g.id === groupId);
    if (!set || !group) return null;
    
    const groupIndex = set.groups.findIndex(g => g.id === groupId);
    
    return {
        name: group.name,
        displayName: group.name.replace(/Group/gi, '').trim(),
        index: groupIndex,
    };
  }, [schoolClass, firstPeriod, jointPeriods, classes]);

  let subjectNameJsx: React.ReactNode;
  let contextNameJsx: React.ReactNode;
  let titleString: string;
  let finalColorName: string;
  let count: number;
  
  const subject = subjects.find(s => s.id === firstPeriod.subjectId);
  if (!subject) return null;
  
  finalColorName = colorName || 'subject-default';
  
  // Strict Language Helpers
  const getTeacherName = (t: Teacher) => language === 'ur' ? <span className="font-urdu">{t.nameUr}</span> : t.nameEn;
  const getSubjectName = (s: Subject) => language === 'ur' ? <span className="font-urdu">{s.nameUr}</span> : s.nameEn;
  const getClassName = (c: SchoolClass) => language === 'ur' ? <span className="font-urdu">{c.nameUr}</span> : c.nameEn;
  
  if(displayContext === 'jointPeriod') {
      const teacher = teachers.find(t => t.id === firstPeriod.teacherId);
      subjectNameJsx = <>{jointPeriodName}</>;
      contextNameJsx = teacher ? getTeacherName(teacher) : (language === 'ur' ? <span className="font-urdu">کوئی استاد نہیں</span> : 'No Teacher');
      titleString = `${jointPeriodName} - ${teacher?.nameEn || 'No Teacher'}`;
      const numClassesInJointPeriod = new Set(periods.map(p => p.classId)).size;
      count = numClassesInJointPeriod > 0 ? periods.length / numClassesInJointPeriod : periods.length;

  } else {
      subjectNameJsx = getSubjectName(subject);
      
      // Normalized counting for Joint Periods in Teacher/Class View
      if (firstPeriod.jointPeriodId) {
          const numClasses = new Set(periods.map(p => p.classId)).size;
          count = numClasses > 0 ? periods.length / numClasses : periods.length;
      } else {
          count = periods.length;
      }

      if (displayContext === 'teacher') {
          const teacher = teachers.find(t => t.id === firstPeriod.teacherId);
          if (teacher) {
              contextNameJsx = getTeacherName(teacher);
              titleString = `${subject.nameEn} - ${teacher.nameEn}`;
          } else {
              contextNameJsx = language === 'ur' ? <span className="font-urdu">کوئی استاد نہیں</span> : 'No Teacher';
              titleString = `${subject.nameEn} - No Teacher`;
          }
      } else { // displayContext === 'class' (Teacher Timetable View: Shows Classes)
          const classIds = [...new Set(periods.map(p => p.classId))];
          const relevantClasses = classes.filter(c => classIds.includes(c.id));
          
          if (relevantClasses.length === 0 && classIds.includes('non-teaching-duties')) {
              contextNameJsx = language === 'ur' ? <span className="font-urdu">ذاتی/ڈیوٹی</span> : 'Personal/Duty';
              titleString = `${subject.nameEn} - Personal/Duty`;
          } else {
              const classNames = relevantClasses.map(c => getClassName(c));
              contextNameJsx = (
                 <>
                    {classNames.reduce((prev, curr, idx) => [prev, idx > 0 && (language === 'ur' ? '، ' : ', '), curr], [] as React.ReactNode[])}
                 </>
              );
              titleString = `${subject.nameEn} - ${relevantClasses.map(c => c.nameEn).join(', ')}`;
          }
      }
  }
  
  const dynamicStyle = {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    borderLeftColor: `var(--${finalColorName}-border)`,
    borderLeftWidth: '4px',
  };

  const highlightClasses = 'ring-2 ring-[var(--accent-primary)] shadow-xl';
  const dimClasses = 'opacity-50 grayscale-[50%]';
  const selectedClasses = 'ring-4 ring-offset-2 ring-[var(--accent-primary)] z-20 transform scale-105 shadow-2xl'; // Selected style
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', periods[0].id); // Required for Firefox and some other browsers
    e.dataTransfer.effectAllowed = 'move';
    const clone = e.currentTarget.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    clone.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    clone.style.transform = 'rotate(2deg)';
    clone.style.opacity = '1';
    clone.style.boxShadow = '0 10px 25px -5px rgba(13, 148, 136, 0.3), 0 8px 10px -6px rgba(13, 148, 136, 0.2)';

    const countBadge = clone.querySelector('.count-badge');
    if (countBadge) {
        countBadge.remove();
    }
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, (e.currentTarget as HTMLElement).offsetWidth / 2, 20);
    setTimeout(() => document.body.removeChild(clone), 0);
    
    // Pass only the periods for a SINGLE instance of the class/joint period
    let periodsToDrag = [firstPeriod];
    if (firstPeriod.jointPeriodId) {
        const numClassesInJointPeriod = new Set(periods.map(p => p.classId)).size;
        if(numClassesInJointPeriod > 0) {
            periodsToDrag = periods.slice(0, numClassesInJointPeriod);
        }
    }
    onDragStart(periodsToDrag);
  };

  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClick) {
          // Same logic as drag start for what to pass
          let periodsToMove = [firstPeriod];
          if (firstPeriod.jointPeriodId) {
              const numClassesInJointPeriod = new Set(periods.map(p => p.classId)).size;
              if(numClassesInJointPeriod > 0) {
                  periodsToMove = periods.slice(0, numClassesInJointPeriod);
              }
          }
          onClick(periodsToMove);
      }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={`relative block p-2.5 rounded-xl text-left cursor-grab shadow-sm hover:shadow-md transition-all border border-[var(--border-secondary)] group flex flex-col flex-grow ${className || 'w-40'} ${isGhost ? 'period-ghost' : ''} ${isHighlighted ? highlightClasses : ''} ${isDimmed ? dimClasses : ''} ${isSelected ? selectedClasses : ''}`}
      style={isGhost ? {} : dynamicStyle}
      title={titleString}
    >
      <div className="flex justify-between items-start relative flex-grow">
         {/* Joint Badge */}
         {firstPeriod.jointPeriodId && (
            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-[var(--accent-primary)] text-white rounded-full shadow-sm z-20 border border-[var(--bg-secondary)] flex items-center justify-center p-0.5" title="Joint Period">
                <LinkIcon />
            </div>
         )}

         {groupInfo && (
            <div title={groupInfo.name} className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold z-10 ${
            groupInfo.index % 2 === 0 ? 'bg-blue-600' : 'bg-green-600'
            }`}>
                <span className="truncate max-w-[60px]">{groupInfo.displayName}</span>
            </div>
        )}
        
        <div className={`flex-1 min-w-0 pr-1 flex flex-col justify-center h-full ${firstPeriod.jointPeriodId || groupInfo ? 'pt-2' : ''}`}>
            {displayContext === 'class' ? (
                <>
                    {/* Class Name (Context): Smaller, Top-Left */}
                    <p className="text-[10px] font-bold uppercase tracking-wider truncate text-left leading-tight opacity-70">{contextNameJsx}</p>
                    {/* Subject Name: Larger, Bottom-Left */}
                    <p className="font-black text-sm truncate text-left leading-tight mt-0.5">{subjectNameJsx}</p>
                </>
            ) : (
                <>
                    {/* Subject Name: Smaller, Top-Left */}
                    <p className="text-[10px] font-bold uppercase tracking-wider truncate text-left leading-tight opacity-70">{subjectNameJsx}</p>
                    {/* Teacher Name: Larger, Bottom-Left */}
                    <p className="font-black text-sm truncate text-left leading-tight mt-0.5">{contextNameJsx}</p>
                </>
            )}
        </div>
        {showCount && count > 1 && (
            <div className="count-badge ml-1 flex-shrink-0 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-[var(--border-secondary)]">
                x{Math.round(count)}
            </div>
        )}
      </div>
       {onDeleteStack && !isGhost && !isSelected && (
          <button 
              onClick={(e) => { e.stopPropagation(); onDeleteStack(); }}
              className="absolute top-0.5 right-0.5 bg-black/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-red-600 transition-all duration-200"
              aria-label="Delete period stack"
              title="Delete period stack"
          >
              &#x2715;
          </button>
      )}
    </div>
  );
};

export default React.memo(PeriodStack);