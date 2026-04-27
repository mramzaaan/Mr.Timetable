import React, { useMemo } from 'react';
import type { Period, Language, Subject, Teacher, SchoolClass, JointPeriod } from '../types';

interface PeriodCardProps {
  period: Period;
  onDragStart: () => void;
  onDragEnd?: () => void;
  onDeletePeriod?: () => void; // New prop for delete functionality
  isGhost?: boolean;
  colorName?: string;
  language: Language;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods?: JointPeriod[]; // Added prop
  displayContext: 'teacher' | 'class';
  isHighlighted?: boolean;
  isDimmed?: boolean;
  hasConflict?: boolean;
}

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);


const PeriodCard: React.FC<PeriodCardProps> = ({ period, onDragStart, onDragEnd, onDeletePeriod, isGhost, colorName, language, subjects, teachers, classes, jointPeriods, displayContext, isHighlighted, isDimmed, hasConflict }) => {
  const subject = subjects.find(s => s.id === period.subjectId);
  
  // Resolve context entity
  let contextEntity: { nameEn: string, nameUr: string } | undefined;
  
  if (displayContext === 'teacher') {
      if (!period.teacherId) {
          contextEntity = { nameEn: 'No Teacher', nameUr: 'کوئی استاد نہیں' };
      } else {
          contextEntity = teachers.find(t => t.id === period.teacherId);
      }
  } else {
      // displayContext === 'class'
      if (period.classId === 'non-teaching-duties') {
          contextEntity = { nameEn: 'Personal/Duty', nameUr: 'ذاتی/ڈیوٹی' };
      } else {
          contextEntity = classes.find(c => c.id === period.classId);
      }
  }

  const schoolClass = classes.find(c => c.id === period.classId);
  
  const groupInfo = useMemo(() => {
    if (!schoolClass) return null;

    let groupSetId: string | undefined;
    let groupId: string | undefined;

    // Resolve Group Info: Check Joint Period first, then Standard Subject
    if (period.jointPeriodId && jointPeriods) {
        const jp = jointPeriods.find(j => j.id === period.jointPeriodId);
        const assignment = jp?.assignments.find(a => a.classId === period.classId);
        groupSetId = assignment?.groupSetId;
        groupId = assignment?.groupId;
    } else {
        const classSubject = schoolClass.subjects.find(s => s.subjectId === period.subjectId);
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
  }, [schoolClass, period, jointPeriods, classes]);


  const cmykPalette = [
    'subject-cyan', 'subject-fuchsia', 'subject-yellow', 'subject-sky',
    'subject-pink', 'subject-lime', 'subject-red', 'subject-green',
    'subject-blue', 'subject-purple', 'subject-orange', 'subject-teal',
    'subject-emerald', 'subject-rose', 'subject-amber', 'subject-indigo'
  ];

  if (!subject || !contextEntity) return null;

  // Determine color index based on subject index within the class
  let colorIndex = 0;
  if (schoolClass) {
      const subjectIndex = schoolClass.subjects.findIndex(s => s.subjectId === period.subjectId);
      if (subjectIndex !== -1) {
          colorIndex = subjectIndex % cmykPalette.length;
      }
  }

  const finalColorName = colorName || cmykPalette[colorIndex];
  const highlightClasses = 'ring-2 ring-offset-2 ring-[var(--accent-primary)] ring-offset-[var(--bg-secondary)] shadow-lg scale-105 z-10';
  const dimClasses = 'opacity-50 grayscale-[50%]';
  
  const dynamicStyle = {
    backgroundColor: `var(--${finalColorName}-bg)`,
    color: `var(--${finalColorName}-text)`,
    borderColor: `var(--${finalColorName}-border)`,
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', period.id); // Required for Firefox and some other browsers
    e.dataTransfer.effectAllowed = 'move';
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.transform = 'rotate(2deg) scale(1.05)';
    ghost.style.opacity = '1';
    ghost.style.boxShadow = '0 10px 25px -5px rgba(13, 148, 136, 0.3), 0 8px 10px -6px rgba(13, 148, 136, 0.2)';
    ghost.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    ghost.style.height = `${(e.currentTarget as HTMLElement).offsetHeight}px`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, (e.currentTarget as HTMLElement).offsetWidth / 2, (e.currentTarget as HTMLElement).offsetHeight / 2);

    setTimeout(() => {
        document.body.removeChild(ghost);
    }, 0);
    onDragStart();
  };

  // Strict Language Logic
  const subjectName = language === 'ur' ? <span className="font-urdu">{subject.nameUr}</span> : subject.nameEn;
  const contextName = language === 'ur' ? <span className="font-urdu">{contextEntity.nameUr}</span> : contextEntity.nameEn;

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`relative w-full p-1.5 rounded-lg text-xs cursor-grab shadow-sm hover:shadow-md transition-all flex flex-col flex-grow border group ${isGhost ? 'period-ghost' : ''} ${isHighlighted ? highlightClasses : ''} ${isDimmed ? dimClasses : ''} ${hasConflict ? 'period-conflict' : ''}`}
      style={isGhost ? {} : dynamicStyle}
    >
       {/* Joint Period Badge */}
       {period.jointPeriodId && (
        <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-[var(--accent-primary)] text-white rounded-full shadow-sm z-20 border border-[var(--bg-secondary)] flex items-center justify-center p-0.5" title="Joint Period">
            <LinkIcon />
        </div>
       )}

       {groupInfo && (
        <div title={groupInfo.name} className={`absolute top-0.5 left-0.5 px-1.5 py-0.5 rounded-full flex items-center justify-center text-white text-[0.5625rem] font-bold z-10 ${
          groupInfo.index % 2 === 0 ? 'bg-blue-600' : 'bg-green-600'
        }`}>
          <span className="truncate max-w-[3.125rem]">{groupInfo.displayName}</span>
        </div>
      )}
      
      <div className={`flex flex-col justify-between flex-grow ${groupInfo || period.jointPeriodId ? 'pt-3' : ''}`}>
        <div>
            {/* Subject: Larger, Black Font */}
            <p className="font-black text-base leading-tight truncate">
                {subjectName}
                {period.isPractical && (
                  <span className="ml-1 text-[0.45rem] tracking-widest bg-teal-600 text-white font-black px-1 py-0.5 rounded-sm align-middle inline-block transform -translate-y-px">
                      PRC
                  </span>
                )}
            </p>
        </div>
        <div>
            {/* Teacher/Context: Smaller, Bold, Right Aligned */}
            <p className="text-[0.6875rem] font-bold leading-tight truncate opacity-90 w-full text-right">{contextName}</p>
        </div>
      </div>

      {onDeletePeriod && !isGhost && (
          <button 
              onClick={(e) => { e.stopPropagation(); onDeletePeriod(); }}
              className="absolute top-0.5 right-0.5 bg-black/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[0.625rem] font-bold opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-red-600 transition-all duration-200"
              aria-label="Delete period"
              title="Delete period"
          >
              &#x2715;
          </button>
      )}
    </div>
  );
};

export default React.memo(PeriodCard);