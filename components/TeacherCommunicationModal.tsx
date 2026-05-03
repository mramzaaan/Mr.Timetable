
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { saveAndShareFile, downloadFileNative, openUrlBrowser } from './capacitorHelpers';
import type { Teacher, Subject, SchoolClass, SchoolConfig, TimetableGridData, Period, CardStyle, TriangleCorner } from '../types';
import { allDays } from '../types';
import { translations } from '../i18n';



import { PositionSettingsModal } from './PositionSettingsModal';

interface TeacherCommunicationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  selectedTeacher: Teacher;
  teacherTimetableData: TimetableGridData;
  subjects: Subject[];
  classes: SchoolClass[];
  schoolConfig: SchoolConfig;
  subjectColorMap: Map<string, string>;
  appFont?: string;
}

const teacherColorNames = [
  'subject-sky', 'subject-green', 'subject-yellow', 'subject-red',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue', 'subject-indigo'
];

const cardStyles: { label: string; value: CardStyle }[] = [
    { label: 'Full Color', value: 'full' },
    { label: 'Outline', value: 'outline' },
    { label: 'Text Only', value: 'text' },
    { label: 'Triangle', value: 'triangle' },
    { label: 'Glass', value: 'glass' },
    { label: 'Gradient', value: 'gradient' },
    { label: 'Minimal', value: 'minimal-left' },
    { label: 'Smooth', value: 'smooth' },
    { label: 'Badge', value: 'badge' }
];

const smoothDirections: { label: string; value: 'left' | 'right' | 'top' | 'bottom' }[] = [
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
    { label: 'Up', value: 'top' },
    { label: 'Down', value: 'bottom' }
];

const triangleCorners: { label: string; value: TriangleCorner }[] = [
    { label: 'Bottom Left', value: 'bottom-left' },
    { label: 'Bottom Right', value: 'bottom-right' },
    { label: 'Top Left', value: 'top-left' },
    { label: 'Top Right', value: 'top-right' }
];

const COLOR_HEX_MAP: Record<string, string> = {
    'subject-red': '#fee2e2', 'subject-sky': '#e0f2fe', 'subject-green': '#dcfce7', 'subject-yellow': '#fef9c3',
    'subject-purple': '#f3e8ff', 'subject-pink': '#fce7f3', 'subject-indigo': '#e0e7ff', 'subject-teal': '#ccfbf1',
    'subject-orange': '#ffedd5', 'subject-lime': '#ecfccb', 'subject-cyan': '#cffafe', 'subject-emerald': '#d1fae5',
    'subject-fuchsia': '#fae8ff', 'subject-rose': '#ffe4e6', 'subject-amber': '#fef3c7', 'subject-blue': '#dbeafe',
    'subject-default': '#f3f4f6'
};

const TEXT_HEX_MAP: Record<string, string> = {
    'subject-red': '#991b1b', 'subject-sky': '#0369a1', 'subject-green': '#166534', 'subject-yellow': '#854d0e',
    'subject-purple': '#6b21a8', 'subject-pink': '#9d174d', 'subject-indigo': '#3730a3', 'subject-teal': '#134e4a',
    'subject-orange': '#9a3412', 'subject-lime': '#4d7c0f', 'subject-cyan': '#0e7490', 'subject-emerald': '#065f46',
    'subject-fuchsia': '#86198f', 'subject-rose': '#9f1239', 'subject-amber': '#92400e', 'subject-blue': '#1e40af',
    'subject-default': '#374151'
};

const abbreviateName = (name: string | undefined) => {
    if (!name) return '';
    const cleanName = name.replace(/[()]/g, '').trim();
    if (cleanName.length <= 15) return cleanName;
    const parts = cleanName.split(/[\s-]+/);
    if (parts.length > 1) {
        return parts.map(p => p[0].toUpperCase()).join('');
    }
    return cleanName.substring(0, 6) + '.';
};

const formatTime12 = (time24: string | undefined) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')}`;
};

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 2c-5.506 0-9.987 4.479-9.987 9.986 0 1.763.459 3.474 1.33 4.988L2 22l5.176-1.359c1.465.799 3.111 1.22 4.805 1.22 5.506 0 9.986-4.479 9.986-9.986 0-5.507-4.48-9.986-9.986-9.986zm0 18.291c-1.52 0-3.003-.399-4.307-1.155l-.31-.182-3.2.839.855-3.12-.2-.319a8.21 8.21 0 01-1.258-4.358c0-4.542 3.696-8.238 8.22-8.238 4.524 0 8.221 3.696 8.221 8.238s-3.697 8.238-8.221 8.238zM15.93 13.061c-.34-.17-2.012-.993-2.324-1.107-.311-.113-.538-.17-.766.17s-.878 1.107-1.076 1.333c-.199.227-.397.255-.737.085s-1.436-.529-2.735-1.687c-1.01-.9-1.691-2.013-1.89-2.353-.198-.34-.022-.523.149-.691s.34-.397.51-.595c.171-.198.227-.34.34-.567s.057-.425-.028-.595c-.085-.171-.766-1.841-1.049-2.523-.277-.666-.559-.574-.766-.585-.199-.01-.425-.011-.652-.011s-.595.085-.907.425c-.312.339-1.191 1.164-1.191 2.836 0 1.673 1.219 3.284 1.389 3.511.171.227 2.399 3.663 5.811 5.137.812.35 1.445.559 1.94.716.815.259 1.558.222 2.145.135.654-.097 2.012-.823 2.296-1.616s.284-1.472.199-1.616c-.085-.144-.312-.227-.652-.397z"/>
  </svg>
);

export const TeacherCommunicationModal: React.FC<TeacherCommunicationModalProps> = ({
  t,
  isOpen,
  onClose,
  selectedTeacher,
  teacherTimetableData,
  subjects,
  classes,
  schoolConfig,
  subjectColorMap,
  appFont
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergePatterns, setMergePatterns] = useState(false);
  const [showStartTimes, setShowStartTimes] = useState(true);
  const [selectedCardStyle, setSelectedCardStyle] = useState<CardStyle>('minimal-left');
  const [selectedTriangleCorner, setSelectedTriangleCorner] = useState<TriangleCorner>(schoolConfig.downloadDesigns.teacher.table.triangleCorner || 'bottom-left');
  const [badgeTarget, setBadgeTarget] = useState<'subject' | 'class'>('subject');
  const [headerTextScale, setHeaderTextScale] = useState(1);
  const [footerTextScale, setFooterTextScale] = useState(1);
  const [classTextScale, setClassTextScale] = useState(1);
  const [subjectTextScale, setSubjectTextScale] = useState(1);
  const [isClassBold, setIsClassBold] = useState(true);
  const [isSubjectBold, setIsSubjectBold] = useState(true);
  const [periodTextScale, setPeriodTextScale] = useState(1);
  const [slotPadding, setSlotPadding] = useState(0);
  const [outlineInset, setOutlineInset] = useState(0);
  const [showCardBorder, setShowCardBorder] = useState(false);
  const [smoothDirection, setSmoothDirection] = useState<'left' | 'right' | 'top' | 'bottom'>('left');
  const [isUrdu, setIsUrdu] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [classPos, setClassPos] = useState({x: 0, y: 0});
  const [subjectPos, setSubjectPos] = useState({x: 4, y: 4});

  const [isTextSettingsOpen, setIsTextSettingsOpen] = useState(false);
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false);
  const [isPosSettingsOpen, setIsPosSettingsOpen] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const themeColors = useMemo(() => {
    if (typeof window === 'undefined') return { accent: '#6366f1', bg: '#ffffff', text: '#0f172a' };
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--accent-primary').trim() || '#6366f1',
      bg: style.getPropertyValue('--bg-secondary').trim() || '#ffffff',
      text: style.getPropertyValue('--text-primary').trim() || '#0f172a'
    };
  }, [isOpen]);

  const activeDays = useMemo(() => 
    allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true), 
    [schoolConfig.daysConfig]
  );

  const generateTimetableImageHtml = () => {
      const totalPeriods = activeDays.reduce((acc, day) => {
         const slots = teacherTimetableData[day] || [];
         return acc + slots.filter(s => s && s.length > 0).length;
      }, 0);

      const allColorClasses = [...teacherColorNames, 'subject-default'];
      const cardStyle = selectedCardStyle;
      const triangleCorner = selectedTriangleCorner;
      const outlineWidth = 2;
      
      const size = 1200;
      const width = size;
      const height = size;

      let triangleStyles = '';
      const triangleSize = 24; 
      if (triangleCorner === 'top-left') {
          triangleStyles = `top: 0; left: 0; border-top: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
      } else if (triangleCorner === 'top-right') {
          triangleStyles = `top: 0; right: 0; border-top: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
      } else if (triangleCorner === 'bottom-right') {
          triangleStyles = `bottom: 0; right: 0; border-bottom: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
      } else { 
          triangleStyles = `bottom: 0; left: 0; border-bottom: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
      }

      const schoolName = isUrdu && schoolConfig.schoolNameUr ? schoolConfig.schoolNameUr : schoolConfig.schoolNameEn;
      const teacherName = isUrdu && selectedTeacher.nameUr ? selectedTeacher.nameUr : selectedTeacher.nameEn;

      let cardStyleCss = '';
      let separatorHtml = '';

      if (cardStyle === 'full') {
          cardStyleCss = '';
      } else if (cardStyle === 'outline') {
          cardStyleCss = `background-color: #ffffff !important; border: none !important; border-radius: 8px !important; color: inherit !important; margin: 2px;`;
      } else if (cardStyle === 'text' || cardStyle === 'triangle') {
          cardStyleCss = 'background-color: #ffffff !important; border: 1px solid transparent !important; color: inherit !important;';
      } else if (cardStyle === 'glass') {
          cardStyleCss = 'background: rgba(255, 255, 255, 0.5) !important; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.3) !important; margin: 1px;';
      } else if (cardStyle === 'gradient') {
          cardStyleCss = 'background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%) !important;';
      } else if (cardStyle === 'minimal-left') {
          cardStyleCss = 'background-color: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; position: relative !important; box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;';
          // Updated Minimal Design: Rounded line and larger circles
          separatorHtml = `
            <div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.5; transform: translateY(-50%);">
                <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                <div style="height: 2px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 8px;"></div>
                <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
            </div>
          `;
      } else if (cardStyle === 'smooth') {
          cardStyleCss = 'border: none !important; border-radius: 24px !important; margin: 4px !important; overflow: hidden !important; box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;';
      } else if (cardStyle === 'badge') {
          cardStyleCss = 'background-color: transparent !important; border: none !important; box-shadow: none !important;';
      }

      // Header Style Logic
      let headerStyleCss = '';
      if (cardStyle === 'full') {
          headerStyleCss = `background-color: ${themeColors.accent}; color: #ffffff; border-radius: 12px; padding: 10px 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);`;
      } else if (cardStyle === 'outline') {
          headerStyleCss = `border: 3px solid ${themeColors.accent}; color: ${themeColors.accent}; border-radius: 12px; padding: 10px 30px; background: #fff;`;
      } else if (cardStyle === 'glass') {
          headerStyleCss = `background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); color: ${themeColors.text}; border-radius: 12px; padding: 10px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);`;
      } else if (cardStyle === 'gradient') {
          headerStyleCss = `background: linear-gradient(135deg, ${themeColors.accent} 0%, ${themeColors.accent}dd 100%); color: #ffffff; border-radius: 12px; padding: 10px 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);`;
      } else if (cardStyle === 'minimal-left') {
          headerStyleCss = `border-left: 10px solid ${themeColors.accent}; background-color: #f1f5f9; color: ${themeColors.text}; padding: 10px 30px; border-radius: 4px;`;
      } else if (cardStyle === 'smooth') {
          headerStyleCss = `border-${smoothDirection}: 16px solid ${themeColors.accent}; background-color: ${themeColors.accent}15; color: ${themeColors.text}; padding: 10px 30px; border-radius: 12px;`;
      } else if (cardStyle === 'badge') {
          headerStyleCss = `background-color: ${themeColors.accent}; color: #ffffff; border-radius: 999px; padding: 10px 40px;`;
      } else {
           headerStyleCss = `color: ${themeColors.text}; padding: 10px 0;`;
      }

      const styles = `
        <style>
          * { 
            box-sizing: border-box !important; 
            -webkit-text-size-adjust: none !important; 
            text-size-adjust: none !important; 
            text-rendering: geometricPrecision !important;
            font-variant-ligatures: none !important;
          }
          body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
          .timetable-image-container {
            background: #ffffff;
            padding: 20px;
            width: ${width}px;
            height: ${height}px;
            color: #000000;
            box-sizing: border-box;
            border: 2px solid ${themeColors.accent};
            position: relative;
            display: flex;
            flex-direction: column;
            font-family: ${appFont ? `'${appFont}', ` : schoolConfig.appFontFamily ? `'${schoolConfig.appFontFamily}', ` : ''}"Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          
          .timetable-image-container::before {
            content: '';
            position: absolute;
            top: -10%;
            left: -10%;
            width: 45%;
            height: 45%;
            background: radial-gradient(circle, ${themeColors.accent}15 0%, transparent 70%);
            z-index: 0;
            pointer-events: none;
          }
          .timetable-image-container::after {
            content: '';
            position: absolute;
            bottom: -5%;
            right: -5%;
            width: 35%;
            height: 35%;
            background: radial-gradient(circle, ${themeColors.accent}10 0%, transparent 70%);
            z-index: 0;
            pointer-events: none;
          }

          .font-urdu { font-family: ${appFont ? `'${appFont}', ` : schoolConfig.appFontFamily ? `'${schoolConfig.appFontFamily}', ` : ''}sans-serif !important; }
          
          .img-header {
            flex-shrink: 0;
            margin-bottom: 10px;
            border-bottom: 3px solid ${themeColors.accent};
            padding-bottom: 10px;
          }

          .img-school-name { 
            font-family: ${appFont ? `'${appFont}', ` : schoolConfig.appFontFamily ? `'${schoolConfig.appFontFamily}', ` : ''}"Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; 
            font-weight: 900;
            font-size: ${isUrdu ? 44 * 1.3 * headerTextScale : 44 * headerTextScale}px; 
            color: ${themeColors.accent}; 
            text-align: center;
            display: flex;
            justify-content: center;
            align-items: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            line-height: ${isUrdu ? 1.5 : 1.2};
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: visible;
            width: 100%;
          }
          
          .header-info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 10px;
            margin-top: 5px;
          }
          
          .info-teacher-name { 
            font-size: ${36 * headerTextScale}px; 
            font-weight: 900; 
            text-transform: uppercase; 
            line-height: ${isUrdu ? 1.5 : 1.2};
            ${headerStyleCss}
          }
          
          .info-stats-side { 
            font-size: ${22 * headerTextScale}px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            min-width: 150px;
            padding-bottom: 5px;
          }

          .compact-val { color: #1e293b; font-weight: 900; font-size: ${24 * headerTextScale}px; }

          .img-table-wrapper {
            width: 100%;
            border: 2px solid ${themeColors.accent};
            margin-bottom: 10px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .img-table { 
            width: 100%; 
            height: 100%;
            border-collapse: collapse; 
            table-layout: fixed; 
          }
          
          .img-table th { 
            background-color: transparent;
            color: ${themeColors.accent}; 
            font-weight: 900; 
            text-transform: uppercase;
            padding: 8px 4px;
            font-size: 24px;
            line-height: 1.2;
            letter-spacing: 0.025em;
            border: 1px solid ${themeColors.accent}; 
            height: auto;
            min-height: 40px;
          }
          .img-table th:first-child { width: 45px; background: #ffffff; }
          
          .period-label { 
            background-color: #f8fafc; 
            color: ${themeColors.accent}; 
            font-weight: 900; 
            font-size: 40px;
            text-align: center;
            vertical-align: middle;
            line-height: 1.2;
            border: 1px solid ${themeColors.accent};
            position: relative; 
            height: 1px;
            padding: 0;
          }

          .period-time-label {
             display: block;
             font-size: ${14 * periodTextScale}px;
             font-weight: 800;
             color: #000000;
             margin-bottom: 4px;
             line-height: 1.2;
             white-space: pre;
          }
          
          .slot-cell { 
            padding: 0; 
            margin: 0;
            background-color: transparent; 
            border: 1px solid ${themeColors.accent}; 
            vertical-align: top;
            height: 1px;
            position: relative;
          }
          
          .card-wrapper {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            padding: ${slotPadding}px;
            box-sizing: border-box;
          }

          .period-card-img { 
            width: 100%;
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
            overflow: ${isUrdu ? 'visible' : 'hidden'};
            ${cardStyleCss}
            position: relative;
            padding: 0;
            border-bottom: 1px solid ${themeColors.accent};
            box-sizing: border-box;
            gap: ${isUrdu ? '4px' : '2px'};
          }
          .period-card-img:last-child { border-bottom: none; }

          .period-subject { 
            /* Holds Class Name now based on data mapping below */
            display: block;
            font-weight: ${isClassBold ? '900' : '500'}; 
            font-size: ${isUrdu ? 20 * 1.1 * classTextScale : 20 * 1.3 * classTextScale}px;
            text-transform: none; 
            line-height: normal;
            text-align: center;
            margin: 0 !important;
            color: inherit;
            white-space: nowrap;
            overflow: ${isUrdu ? 'visible' : 'hidden'};
            text-overflow: ${isUrdu ? 'clip' : 'ellipsis'};
            padding: 2px 4px;
            z-index: 10;
          }
          .period-class { 
            /* Holds Subject Name now based on data mapping below */
            display: block;
            font-weight: ${isSubjectBold ? '800' : '500'}; 
            opacity: 0.95; 
            font-size: ${isUrdu ? 20 * 1.0 * subjectTextScale : 20 * subjectTextScale}px;
            line-height: normal;
            text-align: center;
            margin: 0 !important;
            color: inherit;
            white-space: nowrap;
            overflow: ${isUrdu ? 'visible' : 'hidden'};
            text-overflow: ${isUrdu ? 'clip' : 'ellipsis'};
            max-width: 100%;
            padding: 2px 4px;
            z-index: 10;
          }

          .card-triangle {
              position: absolute;
              width: 0;
              height: 0;
              border-style: solid;
              ${triangleStyles}
              z-index: 5;
          }

          .logo-overlay {
             display: flex;
             justify-content: center;
             align-items: center;
             width: 100%;
             height: 100%;
             opacity: 0.15;
             pointer-events: none;
          }
          .logo-overlay img {
             max-width: 80%;
             max-height: 80%;
             object-fit: contain;
             filter: grayscale(100%);
          }
          
          ${allColorClasses.map(name => {
              const baseColor = COLOR_HEX_MAP[name] || '#f3f4f6';
              const textColor = TEXT_HEX_MAP[name];
              const isSmooth = cardStyle === 'smooth';
              const sidePadding = isSmooth ? `border-${smoothDirection}: 8px solid ${textColor} !important;` : '';

              return `
                .${name} { 
                    ${cardStyle === 'full' ? `background-color: ${textColor}; color: #ffffff;` : 
                      isSmooth ? `background-color: ${baseColor} !important; color: ${textColor}; ${sidePadding} padding-${smoothDirection}: 12px !important;` :
                      cardStyle === 'outline' ? `background-color: #ffffff; color: ${textColor}; outline: 2px solid ${textColor}; outline-offset: -${outlineInset + 2}px;` :
                      cardStyle === 'badge' ? `background-color: #ffffff; color: ${textColor}; border: 1px solid ${baseColor};` :
                      `background-color: ${baseColor} !important; color: ${textColor};`}
                }
                ${showCardBorder ? `
                .${name}::after {
                    content: '';
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    right: 3px;
                    bottom: 3px;
                    border: 1px solid ${textColor}50;
                    border-radius: 8px;
                    pointer-events: none;
                }` : ''}
                .${name} .period-subject, .${name} .period-class { 
                    color: ${cardStyle === 'full' ? '#ffffff' : textColor} !important; 
                    text-transform: uppercase !important;
                    font-weight: 800 !important;
                    letter-spacing: -0.01em !important;
                }
                .${name} .card-triangle { 
                    color: ${cardStyle === 'full' ? '#ffffff' : textColor} !important;
                    opacity: ${cardStyle === 'full' ? 0.3 : 1.0};
                }
                ${cardStyle === 'badge' ? `
                    .${name} .period-subject { ${badgeTarget === 'class' ? `background-color: ${textColor}; color: #fff !important; padding: 4px 12px; border-radius: 16px; display: block; width: calc(100% - 16px); text-align: left; box-sizing: border-box; margin: 8px auto 4px auto;` : ''} }
                    .${name} .period-class { ${badgeTarget === 'subject' ? `background-color: ${textColor}; color: #fff !important; padding: 4px 16px; border-radius: 999px; display: block; width: 100%; text-align: right; box-sizing: border-box; margin-bottom: 0; margin-top: auto;` : ''} ${badgeTarget === 'class' ? `padding: 4px 12px 8px 12px; text-align: right; width: 100%; box-sizing: border-box; margin-top: auto;` : ''} }
                ` : ''}
              `;
          }).join('\n')}

          .footer-watermark {
             position: relative;
             margin-top: auto;
             display: flex;
             justify-content: space-between;
             align-items: center;
             font-size: ${12 * footerTextScale}px; 
             color: #000000; 
             font-weight: 700; 
             text-transform: uppercase;
             border-top: 1px solid ${themeColors.accent};
             padding-top: 5px;
          }
        </style>
      `;
      
      const maxPeriods = Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));

      const grid: (null | { html: string, key: string })[][] = Array.from({ length: maxPeriods }, () => Array(activeDays.length).fill(null));
      
      for (let r = 0; r < maxPeriods; r++) {
          for (let c = 0; c < activeDays.length; c++) {
              const day = activeDays[c];
              // @ts-ignore
              const slot = teacherTimetableData[day]?.[r] || [];
              if (Array.isArray(slot) && slot.length > 0) {
                  // Sort to ensure consistent order
                  const sortedPeriods = [...slot].sort((a, b) => {
                      const subA = subjects.find(s => s.id === a.subjectId);
                      const subB = subjects.find(s => s.id === b.subjectId);
                      return (subA?.nameEn || '').localeCompare(subB?.nameEn || '');
                  });

                  const key = sortedPeriods.map(p => `${p.subjectId}:${p.classId}`).join('|');
                  
                  // Aggregate data for merged card
                  const isGroupPeriod = sortedPeriods.length > 1;
                  const subjectNames = sortedPeriods.map(p => {
                      const sub = subjects.find(s => s.id === p.subjectId);
                      const name = isUrdu && sub?.nameUr ? sub.nameUr : sub?.nameEn;
                      const practicalLabel = p.isPractical ? ` <span style="font-size: 0.5em; background: #0d9488; color: white; padding: 2px 4px; border-radius: 4px; vertical-align: middle; line-height: 1; margin-left: 2px;">PRC</span>` : '';
                      return name ? name + practicalLabel : practicalLabel;
                  }).filter(Boolean).join(' / ');

                  const classNames = sortedPeriods.map(p => {
                      const cls = classes.find(c => c.id === p.classId);
                      return isUrdu && cls?.nameUr ? cls.nameUr : cls?.nameEn;
                  }).filter(Boolean).join(', ');

                  const firstPeriod = sortedPeriods[0];
                  // Use combination key for color
                  const colorKey = firstPeriod.jointPeriodId ? String(firstPeriod.jointPeriodId) : String(firstPeriod.subjectId);
                  const colorName = subjectColorMap.get(colorKey) || 'subject-default';

                  const triangleHtml = (cardStyle === 'triangle' || cardStyle === 'full') ? `<div class="card-triangle"></div>` : '';
                  
                  let separatorHtml = '';
                  if (cardStyle === 'minimal-left') {
                      separatorHtml = `<div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.5; transform: translateY(-50%);">
                          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                          <div style="height: 2px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 8px;"></div>
                          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                      </div>`;
                  }

                  let classBadgeStyle = isGroupPeriod ? `font-size: ${isUrdu ? 20 * 1.3 * 1.2 * 0.8 * classTextScale : 20 * 1.3 * 0.8 * classTextScale}px;` : '';
                  let subjectBadgeStyle = isGroupPeriod ? `font-size: ${isUrdu ? 20 * 1.2 * 0.8 * subjectTextScale : 20 * 0.8 * subjectTextScale}px;` : '';
                  if (cardStyle === 'badge') {
                      // Badge style: Capsule
                      if (badgeTarget === 'class') {
                         classBadgeStyle += ` background-color: ${TEXT_HEX_MAP[colorName] || '#000'}; color: #fff !important; padding: 4px 16px; border-radius: 16px; display: block; width: calc(100% - 16px); text-align: left; box-sizing: border-box; margin: 8px auto 4px auto;`;
                         subjectBadgeStyle += ` padding: 4px 16px 8px 16px; text-align: right; width: 100%; box-sizing: border-box; margin-top: auto;`;
                      } else {
                         subjectBadgeStyle += ` background-color: ${TEXT_HEX_MAP[colorName] || '#000'}; color: #fff !important; padding: 4px 16px; border-radius: 999px; display: block; width: 100%; text-align: right; box-sizing: border-box; margin-bottom: 0; margin-top: auto;`;
                      }
                  } else {
                      classBadgeStyle += ` position: absolute; left: ${classPos.x * 25}%; top: ${classPos.y * 25}%; transform: translate(-${classPos.x * 25}%, -${classPos.y * 25}%); ${classPos.x === 0 ? 'margin-left: 4px;' : classPos.x === 4 ? 'margin-left: -4px;' : ''} ${classPos.y === 0 ? 'margin-top: 4px;' : classPos.y === 4 ? 'margin-top: -4px;' : ''} z-index: 10;`;
                      subjectBadgeStyle += ` position: absolute; left: ${subjectPos.x * 25}%; top: ${subjectPos.y * 25}%; transform: translate(-${subjectPos.x * 25}%, -${subjectPos.y * 25}%); ${subjectPos.x === 0 ? 'margin-left: 4px;' : subjectPos.x === 4 ? 'margin-left: -4px;' : ''} ${subjectPos.y === 0 ? 'margin-top: 4px;' : subjectPos.y === 4 ? 'margin-top: -4px;' : ''} z-index: 10;`;
                  }
                  
                  // In Teacher View:
                  // .period-subject holds Class Name (Top Left, Large)
                  // .period-class holds Subject Name (Bottom Right, Small)
                  const cardsContent = `
                      <div class="period-card-img ${colorName}">
                          ${triangleHtml}
                          ${separatorHtml}
                          <p class="period-subject" style="${classBadgeStyle}">${classNames}</p>
                          <p class="period-class" style="${subjectBadgeStyle}">${subjectNames}</p>
                      </div>
                  `;
                  
                  grid[r][c] = { html: `<div class="card-wrapper">${cardsContent}</div>`, key };
              }
          }
      }

      let tableRows = '';
      const visited = Array.from({ length: maxPeriods }, () => Array(activeDays.length).fill(false));

      for (let r = 0; r < maxPeriods; r++) {
          const startTime = showStartTimes && schoolConfig.periodTimings?.default?.[r]?.start 
              ? formatTime12(schoolConfig.periodTimings.default[r].start) 
              : '';

          let rowHtml = `<td class="period-label">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                ${startTime ? `<span class="period-time-label">${startTime}</span>` : ''}
                <span>${r + 1}</span>
              </div>
          </td>`;

          for (let c = 0; c < activeDays.length; c++) {
              const dayName = activeDays[c];
              const dayLimit = schoolConfig.daysConfig?.[dayName]?.periodCount ?? 8;
              
              if (visited[r][c]) continue;

              if (r === dayLimit && maxPeriods > dayLimit) {
                 const span = maxPeriods - dayLimit;
                 for (let k = 0; k < span; k++) {
                     if (r + k < maxPeriods) visited[r + k][c] = true;
                 }
                 const logoHtml = schoolConfig.schoolLogoBase64 
                    ? `<div class="logo-overlay"><img src="${schoolConfig.schoolLogoBase64}" /></div>` 
                    : '';
                 rowHtml += `<td class="slot-cell" rowspan="${span}" style="background-color: #ffffff;">${logoHtml}</td>`;
                 continue;
              }

              if (r >= dayLimit) {
                  rowHtml += '<td class="slot-cell" style="background: #f8fafc;"></td>';
                  visited[r][c] = true;
                  continue;
              }
              
              const current = grid[r][c];

              if (!current) {
                  rowHtml += '<td class="slot-cell"></td>';
                  visited[r][c] = true;
                  continue;
              }
              
              let rowspan = 1;
              let colspan = 1;

              if (mergePatterns) {
                  while (c + colspan < activeDays.length && grid[r][c + colspan] && grid[r][c + colspan]!.key === current.key && !visited[r][c + colspan]) {
                      const dayLimitNext = schoolConfig.daysConfig?.[activeDays[c + colspan]]?.periodCount ?? 8;
                      if (r >= dayLimitNext) break;
                      colspan++;
                  }
                  
                  let canExtendVertical = true;
                  while (r + rowspan < maxPeriods && canExtendVertical) {
                      for (let j = 0; j < colspan; j++) {
                          const next = grid[r + rowspan][c + j];
                          const dayLimitAt = schoolConfig.daysConfig?.[activeDays[c + j]]?.periodCount ?? 8;
                          if (r + rowspan >= dayLimitAt || !next || next.key !== current.key || visited[r + rowspan][c + j]) {
                              canExtendVertical = false;
                              break;
                          }
                      }
                      if (canExtendVertical) rowspan++;
                  }
              }

              for (let i = 0; i < rowspan; i++) {
                  for (let j = 0; j < colspan; j++) {
                      visited[r + i][c + j] = true;
                  }
              }

              rowHtml += `<td class="slot-cell" ${rowspan > 1 ? `rowspan="${rowspan}"` : ''} ${colspan > 1 ? `colspan="${colspan}"` : ''}>${current.html}</td>`;
          }
          tableRows += `<tr style="height: calc((100% - 40px) / ${maxPeriods});">${rowHtml}</tr>`;
      }

      const currentTimestamp = new Date().toLocaleString(isUrdu ? 'ur-PK' : 'en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      return `
        <div class="timetable-image-container ${isUrdu ? 'font-urdu' : ''}" dir="${isUrdu ? 'rtl' : 'ltr'}">
          ${styles}
          <div class="img-header">
            <div class="img-school-name">${schoolName}</div>
            <div class="header-info-row">
                <div class="info-stats-side" style="text-align: ${isUrdu ? 'right' : 'left'};">
                    ${isUrdu ? 'سیریل نمبر:' : '#'} <span class="compact-val">${selectedTeacher.serialNumber || '-'}</span>
                </div>
                <div class="info-teacher-name">${teacherName}</div>
                <div class="info-stats-side" style="text-align: ${isUrdu ? 'left' : 'right'};">
                    ${isUrdu ? 'کل پیریڈز:' : 'WORKLOAD:'} <span class="compact-val">${totalPeriods}</span>
                </div>
            </div>
          </div>
          <div class="img-table-wrapper">
            <table class="img-table">
                <thead>
                <tr>
                    <th style="width: 45px"></th>
                    ${activeDays.map(day => `<th>${isUrdu ? (translations.ur as any)[day.toLowerCase()] : t[day.toLowerCase()].substring(0,3)}</th>`).join('')}
                </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
          </div>
          <div class="footer-watermark">
            <span>${isUrdu ? 'آفیشل ٹیچر ٹائم ٹیبل' : 'OFFICIAL TEACHER SCHEDULE'}</span>
            <span style="font-weight: 900; color: ${themeColors.accent}; font-size: ${14 * footerTextScale}px;">Mr. 🇵🇰</span>
            <span>${currentTimestamp}</span>
          </div>
        </div>
      `;
  };

  useEffect(() => {
    if (isOpen) {
        const html = generateTimetableImageHtml();
        setPreviewHtml(html);
    }
  }, [isOpen, selectedCardStyle, selectedTriangleCorner, badgeTarget, mergePatterns, showStartTimes, selectedTeacher, themeColors, isUrdu, headerTextScale, footerTextScale, classTextScale, subjectTextScale, isClassBold, isSubjectBold, periodTextScale, showCardBorder, smoothDirection, slotPadding, classPos, subjectPos, subjectColorMap, teacherTimetableData]);

  useEffect(() => {
    if (previewContainerRef.current) {
        const updateScale = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.offsetWidth;
                const scale = (containerWidth - 16) / 1200; 
                setPreviewScale(scale);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen, previewHtml]);

  const generateAndGetBlob = async (): Promise<Blob | null> => {
    const size = 1200;
    const width = size;
    const height = size;

    const tempContainer = document.createElement('div');
    Object.assign(tempContainer.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: `${width}px`,
        backgroundColor: '#ffffff',
        zIndex: '-9999',
    });
    tempContainer.innerHTML = generateTimetableImageHtml();
    document.body.appendChild(tempContainer);
    
    try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 800));

        const targetElement = tempContainer.children[0] as HTMLElement;
        const blob = await toBlob(targetElement, { 
            pixelRatio: 3, 
            backgroundColor: '#ffffff',
            width: width,
            height: height,
            type: 'image/jpeg',
            quality: 0.85, 
            style: {
                margin: '0',
                padding: '30px'
            }
        });
        
        if (!blob) return null;
        
        // Final compression: if size is too large, we could convert to JPEG here, 
        // but toBlob generally produces a decent PNG.
        // Let's ensure it's as high quality as possible.
        return blob;
    } catch (error) {
        console.error("Canvas generation failed", error);
        return null;
    } finally {
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
    }
  };

  const handleSendImageAsPicture = async () => {
    window.focus(); 
    setIsGenerating(true);

    const blob = await generateAndGetBlob();
    if (!blob) {
        alert("Failed to generate image.");
        setIsGenerating(false);
        return;
    }

    // Try native sharing first if available in browser
    const fileName = `timetable_${selectedTeacher.nameEn.replace(/\s/g, '_')}.jpg`;
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
        try {
            await navigator.share({
                files: [new File([blob], fileName, { type: blob.type })],
                title: 'Timetable',
                text: `Timetable for ${selectedTeacher.nameEn}`
            });
            setIsGenerating(false);
            return;
        } catch (shareError) {
            console.error("Web Share API failed", shareError);
        }
    }

    const shared = await saveAndShareFile(blob, fileName, 'Timetable');
    
    if (!shared) {
        const dataUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(dataUrl);
    }
    
    setIsGenerating(false);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedTeacher?.contactNumber) {
        alert("Teacher's contact number not found.");
        return;
    }

    setIsGenerating(true);
    const blob = await generateAndGetBlob();

    if (blob) {
        let phoneNumber = selectedTeacher.contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
        
        const fileName = `timetable_${selectedTeacher.nameEn.replace(/\s/g, '_')}.jpg`;
        let copied = false;
        try {
            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                 await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
                 copied = true;
            }
        } catch (clipboardError) {
            console.warn("Clipboard write failed", clipboardError);
        }

        if (copied) {
            const url = `https://wa.me/${phoneNumber}`;
            setTimeout(() => { openUrlBrowser(url); }, 500);
        } else {
            // Try native sharing fallback
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
                try {
                    await navigator.share({
                        files: [new File([blob], fileName, { type: blob.type })],
                        title: 'Timetable',
                        text: `Timetable for ${selectedTeacher.nameEn}`
                    });
                    const url = `https://wa.me/${phoneNumber}`;
                    setTimeout(() => { openUrlBrowser(url); }, 500);
                    setIsGenerating(false);
                    return;
                } catch (shareError) {
                    console.error("WhatsApp share fallback failed", shareError);
                }
            }

            const shared = await saveAndShareFile(blob, fileName, 'Timetable', 'Please share this with ' + selectedTeacher.nameEn);
            
            if (!shared) {
                 const dataUrl = URL.createObjectURL(blob);
                 const link = document.createElement('a');
                 link.href = dataUrl;
                 link.download = fileName;
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 URL.revokeObjectURL(dataUrl);
                 alert("Could not copy to clipboard. Image downloaded. Please attach manually in WhatsApp.");
                 const url = `https://wa.me/${phoneNumber}`;
                 setTimeout(() => { openUrlBrowser(url); }, 500);
            }
        }
    } else {
        alert("Failed to generate image.");
    }

    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black/60 flex items-center justify-center z-[200] p-2 sm:p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-[40px] border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] overflow-hidden transition-all relative" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 sm:p-5 border-b border-white/10 bg-transparent flex-shrink-0 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
            <div className="flex flex-col">
                <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">
                   Teacher <span className="text-[var(--accent-primary)]">Timetable</span>
                </h3>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{selectedTeacher.nameEn}</span>
            </div>
            
            <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-rose-500 hover:text-white transition-all rounded-full text-[var(--text-secondary)]"
            >
                <XIcon />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-3 sm:p-6 scrollbar-hide bg-transparent">

            <div className="flex flex-col items-center w-full mb-6" ref={previewContainerRef}>
                <div className="mb-3 px-3 py-1 bg-[#0f172a] rounded-full hidden">
                     <span className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest">Preview Mode</span>
                </div>
                <div 
                    className="relative  rounded-[1.25rem] overflow-hidden bg-white border border-gray-700/50 mx-auto transition-all duration-300 ease-out" 
                    style={{ 
                        width: `${1200 * previewScale}px`, 
                        height: `${1200 * previewScale}px` 
                    }}
                >
                    <div 
                        dangerouslySetInnerHTML={{ __html: previewHtml }} 
                        style={{ 
                            transform: `scale(${previewScale})`, 
                            transformOrigin: 'top left', 
                            width: '1200px', 
                            height: '1200px',
                            pointerEvents: 'none' 
                        }} 
                    />
                </div>
            </div>

            {/* Controls Section - Moved below Preview */}
            <div className="max-w-2xl mx-auto space-y-3 pb-2 w-full">
                
                <div className="grid grid-cols-[0.7fr_0.7fr_1.6fr] gap-2">
                    {/* Folder 1: Design Settings */}
                    <div className="overflow-hidden transition-all duration-300 border border-white/10 rounded-[1.2rem] bg-[#0f172a]/40 backdrop-blur-md h-fit">
                        <button 
                            onClick={() => setIsTextSettingsOpen(!isTextSettingsOpen)}
                            className="w-full px-2 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[0.55rem] font-black uppercase tracking-wider">Design</span>
                            </div>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-3 w-3 transition-transform duration-300 ${isTextSettingsOpen ? 'rotate-180' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        {isTextSettingsOpen && (
                            <div className="p-2 border-t border-white/5 animate-scale-in space-y-2">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-1">
                                        <label className="text-[0.5rem] font-bold uppercase tracking-tight text-blue-300">Header</label>
                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-full border border-white/10 p-0.5">
                                            <button onClick={() => setHeaderTextScale(s => Math.max(0.5, s - 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">-</button>
                                            <div className="w-8 text-center text-white text-[0.55rem] font-bold">{Math.round(headerTextScale * 100)}%</div>
                                            <button onClick={() => setHeaderTextScale(s => Math.min(2.0, s + 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1">
                                        <label className="text-[0.5rem] font-bold uppercase tracking-tight text-blue-300">Footer</label>
                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-full border border-white/10 p-0.5">
                                            <button onClick={() => setFooterTextScale(s => Math.max(0.5, s - 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">-</button>
                                            <div className="w-8 text-center text-white text-[0.55rem] font-bold">{Math.round(footerTextScale * 100)}%</div>
                                            <button onClick={() => setFooterTextScale(s => Math.min(2.0, s + 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1">
                                        <label className="text-[0.5rem] font-bold uppercase tracking-tight text-blue-300">Time</label>
                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-full border border-white/10 p-0.5">
                                            <button onClick={() => setPeriodTextScale(s => Math.max(0.5, s - 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">-</button>
                                            <div className="w-8 text-center text-white text-[0.55rem] font-bold">{Math.round(periodTextScale * 100)}%</div>
                                            <button onClick={() => setPeriodTextScale(s => Math.min(2.0, s + 0.1))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">+</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1">
                                        <label className="text-[0.5rem] font-bold uppercase tracking-tight text-blue-300">Pad</label>
                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-full border border-white/10 p-0.5">
                                            <button onClick={() => setSlotPadding(s => Math.max(0, s - 2))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">-</button>
                                            <div className="w-8 text-center text-white text-[0.55rem] font-bold">{slotPadding}px</div>
                                            <button onClick={() => setSlotPadding(s => Math.min(24, s + 2))} className="w-4 h-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white font-bold text-[9px]">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Folder 2: Card Style Settings */}
                    <div className="overflow-hidden transition-all duration-300 border border-white/10 rounded-[1.2rem] bg-[#0f172a]/40 backdrop-blur-md h-fit">
                        <button 
                            onClick={() => setIsStyleSettingsOpen(!isStyleSettingsOpen)}
                            className="w-full px-2 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                <span className="text-[0.55rem] font-black uppercase tracking-wider">Style</span>
                            </div>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-3 w-3 transition-transform duration-300 ${isStyleSettingsOpen ? 'rotate-180' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        {isStyleSettingsOpen && (
                            <div className="p-2 border-t border-white/5 animate-scale-in space-y-2">
                                <select 
                                    value={selectedCardStyle} 
                                    onChange={(e) => setSelectedCardStyle(e.target.value as CardStyle)}
                                    className="w-full bg-black/40 text-white text-[0.5rem] font-black rounded-lg border border-white/10 px-1 py-1.5 focus:outline-none appearance-none"
                                >
                                    {cardStyles.map(s => <option key={s.value} value={s.value} className="bg-[#0f172a]">{s.label}</option>)}
                                </select>

                                {/* Conditional Settings inside the dedicated Styles folder */}
                                {(selectedCardStyle === 'minimal-left' || selectedCardStyle === 'badge') && (
                                    <div className="space-y-1">
                                        <div className="flex bg-black/40 rounded-full border border-white/10 p-0.5">
                                            <button 
                                                onClick={() => setBadgeTarget('subject')}
                                                className={`flex-1 py-1 rounded-full text-[0.45rem] font-black transition-all ${badgeTarget === 'subject' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500'}`}
                                            >
                                                SUB
                                            </button>
                                            <button 
                                                onClick={() => setBadgeTarget('class')}
                                                className={`flex-1 py-1 rounded-full text-[0.45rem] font-black transition-all ${badgeTarget === 'class' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500'}`}
                                            >
                                                CLS
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedCardStyle === 'triangle' && (
                                    <select 
                                        value={selectedTriangleCorner} 
                                        onChange={(e) => setSelectedTriangleCorner(e.target.value as TriangleCorner)}
                                        className="w-full bg-black/40 text-white text-[0.5rem] font-black rounded-lg border border-white/10 px-1 py-1.5 focus:outline-none appearance-none"
                                    >
                                        {triangleCorners.map(c => <option key={c.value} value={c.value} className="bg-[#0f172a]">{c.label}</option>)}
                                    </select>
                                )}

                                {selectedCardStyle === 'smooth' && (
                                    <div className="grid grid-cols-2 gap-1">
                                        {smoothDirections.map(d => (
                                            <button
                                                key={d.value}
                                                onClick={() => setSmoothDirection(d.value)}
                                                className={`py-1 rounded-lg text-[0.4rem] font-black border transition-all ${smoothDirection === d.value ? 'bg-purple-500 border-purple-400 text-white shadow-sm' : 'bg-black/20 border-white/5 text-gray-500'}`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Folder 3: Position Settings */}
                    <div className="overflow-hidden transition-all duration-300 border border-white/10 rounded-[1.2rem] bg-[#0f172a]/40 backdrop-blur-md h-fit">
                        <button 
                            onClick={() => setIsPosSettingsOpen(!isPosSettingsOpen)}
                            className="w-full px-3 py-3 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.53 4.47a1 1 0 10-1.41 1.41 6.705 6.705 0 014.27 1.94c.19.19.51.19.7 0a6.705 6.705 0 014.27-1.94 1 1 0 00-1.41-1.41 4.705 4.705 0 00-3.21 1.45 4.705 4.705 0 00-3.21-1.45z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[0.55rem] font-black uppercase tracking-wider">POS Layout</span>
                            </div>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-3 w-3 transition-transform duration-300 ${isPosSettingsOpen ? 'rotate-180' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {isPosSettingsOpen && (
                            <div className="p-2 border-t border-white/5 animate-scale-in">
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                                    {/* Class Section */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 w-full justify-between">
                                            <span className="text-[0.45rem] font-black tracking-widest text-emerald-400 uppercase">Class</span>
                                            <button 
                                                onClick={() => setIsClassBold(!isClassBold)} 
                                                className={`w-5 h-5 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 rounded-full font-black text-[10px] border ${isClassBold ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-gray-800/50 text-gray-400 border-white/5 hover:bg-gray-700'}`}
                                            >
                                                B
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-5 gap-0.5 w-[4rem]">
                                            {Array.from({ length: 5 }).map((_, y) => (
                                                Array.from({ length: 5 }).map((_, x) => {
                                                    const isSelected = classPos.x === x && classPos.y === y;
                                                    return (
                                                        <button
                                                            key={`c-${x}-${y}`}
                                                            onClick={(e) => { e.stopPropagation(); setClassPos({x, y}); }}
                                                            className={`w-2.5 h-2.5 rounded-full mx-auto transition-all ${isSelected ? 'bg-emerald-500 scale-125 shadow-md shadow-emerald-500/40' : 'bg-gray-700 hover:bg-gray-600'}`}
                                                        />
                                                    );
                                                })
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/10">
                                            <button onClick={() => setClassTextScale(s => Math.max(0.5, s - 0.1))} className="text-white hover:text-emerald-400 transition-colors px-1 font-bold text-[12px]">-</button>
                                            <div className="w-px h-3 bg-white/10"></div>
                                            <button onClick={() => setClassTextScale(s => Math.min(2.0, s + 0.1))} className="text-white hover:text-emerald-400 transition-colors px-1 font-bold text-[12px]">+</button>
                                        </div>
                                    </div>
                                    
                                    <div className="w-px h-24 bg-white/10"></div>

                                    {/* Subject Section */}
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 w-full justify-between">
                                            <button 
                                                onClick={() => setIsSubjectBold(!isSubjectBold)} 
                                                className={`w-5 h-5 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 rounded-full font-black text-[10px] border ${isSubjectBold ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20' : 'bg-gray-800/50 text-gray-400 border-white/5 hover:bg-gray-700'}`}
                                            >
                                                B
                                            </button>
                                            <span className="text-[0.45rem] font-black tracking-widest text-sky-400 uppercase">Subj</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-0.5 w-[4rem]">
                                            {Array.from({ length: 5 }).map((_, y) => (
                                                Array.from({ length: 5 }).map((_, x) => {
                                                    const isSelected = subjectPos.x === x && subjectPos.y === y;
                                                    return (
                                                        <button
                                                            key={`s-${x}-${y}`}
                                                            onClick={(e) => { e.stopPropagation(); setSubjectPos({x, y}); }}
                                                            className={`w-2.5 h-2.5 rounded-full mx-auto transition-all ${isSelected ? 'bg-sky-500 scale-125 shadow-md shadow-sky-500/40' : 'bg-gray-700 hover:bg-gray-600'}`}
                                                        />
                                                    );
                                                })
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/10">
                                            <button onClick={() => setSubjectTextScale(s => Math.max(0.5, s - 0.1))} className="text-white hover:text-sky-400 transition-colors px-1 font-bold text-[12px]">-</button>
                                            <div className="w-px h-3 bg-white/10"></div>
                                            <button onClick={() => setSubjectTextScale(s => Math.min(2.0, s + 0.1))} className="text-white hover:text-sky-400 transition-colors px-1 font-bold text-[12px]">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Final Action Bar with Combined Buttons */}
                <div className="flex items-center gap-2 pt-2 transition-all">
                    {/* Share Button as Icon */}
                    <button 
                        onClick={handleSendImageAsPicture} 
                        disabled={isGenerating} 
                        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[var(--accent-primary)] text-white rounded-2xl hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-all transform active:scale-95 shadow-lg group relative"
                        title="Share Image"
                    >
                        {isGenerating ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <ShareIcon />
                        )}
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Share Image</span>
                    </button>

                    {/* WhatsApp Button as Icon */}
                    <button 
                        onClick={handleSendWhatsApp} 
                        disabled={isGenerating} 
                        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#128C7E] text-white rounded-2xl hover:bg-[#075e54] disabled:opacity-50 transition-all transform active:scale-95 shadow-lg group relative"
                        title="Direct WhatsApp"
                    >
                        <WhatsAppIcon />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">WhatsApp</span>
                    </button>

                    {/* Compact Grid for Mode Toggles */}
                    <div className="flex-grow grid grid-cols-4 gap-1.5 h-12 bg-[#0f172a]/20 backdrop-blur-sm rounded-2xl p-1 border border-white/5">
                        <button 
                            onClick={() => setIsUrdu(!isUrdu)}
                            className={`flex flex-col items-center justify-center rounded-xl transition-all border ${isUrdu ? 'bg-[var(--accent-primary)] border-white/20 text-white shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="text-[0.65rem] font-bold uppercase tracking-tight">Urdu</span>
                            <div className={`w-3 h-0.5 rounded-full mt-0.5 ${isUrdu ? 'bg-white' : 'bg-gray-700'}`} />
                        </button>
                        <button 
                            onClick={() => setMergePatterns(!mergePatterns)}
                            className={`flex flex-col items-center justify-center rounded-xl transition-all border ${mergePatterns ? 'bg-[var(--accent-primary)] border-white/20 text-white shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="text-[0.65rem] font-bold uppercase tracking-tight">Merge</span>
                            <div className={`w-3 h-0.5 rounded-full mt-0.5 ${mergePatterns ? 'bg-white' : 'bg-gray-700'}`} />
                        </button>
                        <button 
                            onClick={() => setShowCardBorder(!showCardBorder)}
                            className={`flex flex-col items-center justify-center rounded-xl transition-all border ${showCardBorder ? 'bg-[var(--accent-primary)] border-white/20 text-white shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="text-[0.65rem] font-bold uppercase tracking-tight">Border</span>
                            <div className={`w-3 h-0.5 rounded-full mt-0.5 ${showCardBorder ? 'bg-white' : 'bg-gray-700'}`} />
                        </button>
                        <button 
                            onClick={() => setShowStartTimes(!showStartTimes)}
                            className={`flex flex-col items-center justify-center rounded-xl transition-all border ${showStartTimes ? 'bg-[var(--accent-primary)] border-white/20 text-white shadow-md' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="text-[0.65rem] font-bold uppercase tracking-tight">Time</span>
                            <div className={`w-3 h-0.5 rounded-full mt-0.5 ${showStartTimes ? 'bg-white' : 'bg-gray-700'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
