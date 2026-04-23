
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toBlob } from 'html-to-image';
import type { SchoolClass, Teacher, Subject, SchoolConfig, CardStyle, TriangleCorner } from '../types';
import { allDays } from '../types';
import { translations } from '../i18n';



interface ClassCommunicationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  selectedClass: SchoolClass;
  inChargeTeacher: Teacher;
  subjects: Subject[];
  teachers: Teacher[];
  schoolConfig: SchoolConfig;
  subjectColorMap: Map<string, string>;
  appFont?: string;
}

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];

const cardStyles: { label: string; value: CardStyle }[] = [
    { label: 'Full Color', value: 'full' },
    { label: 'Outline', value: 'outline' },
    { label: 'Text Only', value: 'text' },
    { label: 'Triangle', value: 'triangle' },
    { label: 'Glass', value: 'glass' },
    { label: 'Gradient', value: 'gradient' },
    { label: 'Minimal', value: 'minimal-left' },
    { label: 'Smooth Left', value: 'smooth-left' },
    { label: 'Badge', value: 'badge' }
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
    
    // Initials for multi-word names
    const parts = cleanName.split(/[\s-]+/);
    if (parts.length > 1) {
        return parts.map(p => p[0].toUpperCase()).join('');
    }
    // Truncate single long words
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

export const ClassCommunicationModal: React.FC<ClassCommunicationModalProps> = ({
  t,
  isOpen,
  onClose,
  selectedClass,
  inChargeTeacher,
  subjects,
  teachers,
  schoolConfig,
  subjectColorMap,
  appFont
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  // Default merge OFF, time ON
  const [mergePatterns, setMergePatterns] = useState(false);
  const [showStartTimes, setShowStartTimes] = useState(true);
  const [selectedCardStyle, setSelectedCardStyle] = useState<CardStyle>('minimal-left');
  const [selectedTriangleCorner, setSelectedTriangleCorner] = useState<TriangleCorner>(schoolConfig.downloadDesigns.class.table.triangleCorner || 'bottom-left');
  const [badgeTarget, setBadgeTarget] = useState<'subject' | 'teacher'>('subject');
  
  const [headerTextScale, setHeaderTextScale] = useState(1.0);
  const [footerTextScale, setFooterTextScale] = useState(1.0);
  const [subjectTextScale, setSubjectTextScale] = useState(1.0);
  const [periodTextScale, setPeriodTextScale] = useState(1.0);
  const [outlineInset, setOutlineInset] = useState(0);
  const [isUrdu, setIsUrdu] = useState(false);

  // State for preview HTML
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

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
      const allColorClasses = [...subjectColorNames, 'subject-default'];
      const cardStyle = selectedCardStyle;
      const triangleCorner = selectedTriangleCorner;
      const outlineWidth = 2;
      
      const size = 1200;
      const width = size;
      const height = size;

      let triangleStyles = '';
      const triangleSize = 20; 
      if (triangleCorner === 'top-left') {
          triangleStyles = `top: 0; left: 0; border-width: ${triangleSize}px ${triangleSize}px 0 0; border-color: currentColor transparent transparent transparent;`;
      } else if (triangleCorner === 'top-right') {
          triangleStyles = `top: 0; right: 0; border-width: 0 ${triangleSize}px ${triangleSize}px 0; border-color: transparent currentColor transparent transparent;`;
      } else if (triangleCorner === 'bottom-right') {
          triangleStyles = `bottom: 0; right: 0; border-width: 0 0 ${triangleSize}px ${triangleSize}px; border-color: transparent transparent currentColor transparent;`;
      } else { 
          triangleStyles = `bottom: 0; left: 0; border-width: ${triangleSize}px 0 0 ${triangleSize}px; border-color: transparent transparent transparent currentColor;`;
      }

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
            <div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.4; transform: translateY(-50%);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                <div style="height: 1.5px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 4px;"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
            </div>
          `;
      } else if (cardStyle === 'smooth-left') {
          cardStyleCss = 'border-top: none !important; border-right: none !important; border-bottom: none !important; border-radius: 24px !important; margin: 4px !important; overflow: hidden !important;';
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
      } else if (cardStyle === 'smooth-left') {
          headerStyleCss = `border-left: 16px solid ${themeColors.accent}; background-color: ${themeColors.accent}15; color: ${themeColors.text}; padding: 10px 30px; border-radius: 24px;`;
      } else if (cardStyle === 'badge') {
          headerStyleCss = `background-color: ${themeColors.accent}; color: #ffffff; border-radius: 999px; padding: 10px 40px;`;
      } else {
           headerStyleCss = `color: ${themeColors.text}; padding: 10px 0;`;
      }

      const schoolName = isUrdu && schoolConfig.schoolNameUr ? schoolConfig.schoolNameUr : schoolConfig.schoolNameEn;
      const className = isUrdu && selectedClass.nameUr ? selectedClass.nameUr : selectedClass.nameEn;
      const inChargeName = inChargeTeacher ? (isUrdu && inChargeTeacher.nameUr ? inChargeTeacher.nameUr : inChargeTeacher.nameEn) : '-';
      const roomLabel = isUrdu ? 'کمرہ:' : 'Rm:';

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

          .font-urdu { font-family: ${appFont ? `'${appFont}', ` : schoolConfig.appFontFamily ? `'${schoolConfig.appFontFamily}', ` : ''}'Gulzar', 'Noto Nastaliq Urdu', sans-serif !important; }
          
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
          
          .info-class-name { 
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
            padding: 6px 4px;
            font-size: 24px;
            line-height: 1.2;
            letter-spacing: 0.025em;
            border: 1px solid ${themeColors.accent}; 
            height: auto;
            min-height: 30px;
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
             font-size: ${16 * periodTextScale}px;
             font-weight: 800;
             color: #000000;
             margin-bottom: 2px;
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
            gap: ${isUrdu ? '4px' : '6px'};
          }
          .period-card-img:last-child { border-bottom: none; }

          .period-subject { 
            display: block;
            font-weight: 900; 
            font-size: ${isUrdu ? 18 * 1.1 * subjectTextScale : 18 * 1.3 * subjectTextScale}px;
            text-transform: none; 
            line-height: normal;
            text-align: ${isUrdu ? 'right' : 'left'};
            margin: 0;
            color: inherit;
            white-space: nowrap;
            overflow: ${isUrdu ? 'visible' : 'hidden'};
            text-overflow: ${isUrdu ? 'clip' : 'ellipsis'};
            padding: 2px 4px;
            ${!isUrdu ? 'transform: translateY(-2px);' : ''}
          }
          .period-teacher { 
            display: block;
            font-weight: 800; 
            opacity: 0.95; 
            font-size: ${isUrdu ? 18 * 1.0 * subjectTextScale : 18 * subjectTextScale}px;
            line-height: normal;
            text-align: ${isUrdu ? 'left' : 'right'};
            margin: 0;
            color: inherit;
            white-space: nowrap;
            overflow: ${isUrdu ? 'visible' : 'hidden'};
            text-overflow: ${isUrdu ? 'clip' : 'ellipsis'};
            max-width: 100%;
            padding: 2px 4px;
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
          
          ${allColorClasses.map(name => `
              .${name} { 
                  ${cardStyle === 'full' ? `background-color: ${TEXT_HEX_MAP[name]}; color: #ffffff;` : 
                    cardStyle === 'smooth-left' ? `background-color: ${(COLOR_HEX_MAP[name] || '#f3f4f6')}4D !important; color: ${TEXT_HEX_MAP[name]}; border-left: 16px solid ${TEXT_HEX_MAP[name]} !important;` :
                    cardStyle === 'outline' ? `background-color: #ffffff; color: ${TEXT_HEX_MAP[name]}; outline: 2px solid ${TEXT_HEX_MAP[name]}; outline-offset: -${outlineInset + 2}px;` :
                    `background-color: #ffffff; color: ${TEXT_HEX_MAP[name]};`}
              }
              .${name} .period-subject, .${name} .period-teacher { color: ${cardStyle === 'full' ? '#ffffff' : TEXT_HEX_MAP[name]} !important; }
              .${name} .card-triangle { 
                  color: ${cardStyle === 'full' ? '#ffffff' : TEXT_HEX_MAP[name]} !important;
                  opacity: ${cardStyle === 'full' ? 0.3 : 1.0};
              }
              ${cardStyle === 'badge' ? `
                  .${name} .period-subject { ${badgeTarget === 'subject' ? `background-color: ${TEXT_HEX_MAP[name]}; color: #fff !important; padding: 4px 12px; border-radius: 999px; display: inline-block; width: fit-content; max-width: 100%; text-align: center; box-sizing: border-box; margin-bottom: 0;` : ''} }
                  .${name} .period-teacher { ${badgeTarget === 'teacher' ? `background-color: ${TEXT_HEX_MAP[name]}; color: #fff !important; padding: 4px 12px; border-radius: 999px; display: inline-block; width: fit-content; max-width: 100%; text-align: center; box-sizing: border-box; margin-bottom: 0; margin-top: auto;` : ''} }
              ` : ''}
          `).join('\n')}

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
              const slot = selectedClass.timetable[day]?.[r] || [];
              if (Array.isArray(slot) && slot.length > 0) {
                  // Sort to ensure consistent order
                  const sortedPeriods = [...slot].sort((a, b) => {
                      const subA = subjects.find(s => s.id === a.subjectId);
                      const subB = subjects.find(s => s.id === b.subjectId);
                      return (subA?.nameEn || '').localeCompare(subB?.nameEn || '');
                  });

                  const key = sortedPeriods.map(p => `${p.subjectId}:${p.teacherId}`).join('|');
                  
                  // Aggregate data for merged card
                  const subjectNames = sortedPeriods.map(p => {
                      const sub = subjects.find(s => s.id === p.subjectId);
                      return isUrdu && sub?.nameUr ? sub.nameUr : sub?.nameEn;
                  }).join(' / ');

                  const isGroupPeriod = sortedPeriods.length > 1;
                  const teacherNames = sortedPeriods.map(p => {
                      const tea = teachers.find(t => t.id === p.teacherId);
                      return isUrdu && tea?.nameUr ? tea.nameUr : tea?.nameEn;
                  }).filter(Boolean).join(' / ');

                  // Use color of the first period's teacher
                  const firstPeriod = sortedPeriods[0];
                  const colorName = subjectColorMap.get(firstPeriod.teacherId) || 'subject-default';

                  const triangleHtml = (cardStyle === 'triangle' || cardStyle === 'full') ? `<div class="card-triangle"></div>` : '';
                  
                  let separatorHtml = '';
                  if (cardStyle === 'minimal-left') {
                      separatorHtml = `<div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.5; transform: translateY(-50%);">
                          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                          <div style="height: 2px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 8px;"></div>
                          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div>
                      </div>`;
                  }
                  
                  let subjectBadgeStyle = isGroupPeriod ? `font-size: ${isUrdu ? 18 * 1.3 * 1.2 * 0.8 * subjectTextScale : 18 * 1.3 * 0.8 * subjectTextScale}px;` : '';
                  let teacherBadgeStyle = isGroupPeriod ? `font-size: ${isUrdu ? 18 * 1.2 * 0.8 * subjectTextScale : 18 * 0.8 * subjectTextScale}px;` : '';
                  if (cardStyle === 'badge') {
                      const badgeCss = `background-color: ${TEXT_HEX_MAP[colorName] || '#000'}; color: #fff !important; padding: 4px 12px; border-radius: 999px; display: inline-block; width: fit-content; max-width: 100%; text-align: center; box-sizing: border-box; margin-bottom: 2px;`;
                      if (badgeTarget === 'teacher') {
                         teacherBadgeStyle += badgeCss;
                      } else {
                         subjectBadgeStyle += badgeCss;
                      }
                  }
                  
                  const cardsContent = `
                      <div class="period-card-img ${colorName}">
                          ${triangleHtml}
                          ${separatorHtml}
                          <p class="period-subject" style="${subjectBadgeStyle}">${subjectNames}</p>
                          <p class="period-teacher" style="${teacherBadgeStyle}">${teacherNames}</p>
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
                    <span class="compact-val">${inChargeName}</span>
                </div>
                <div class="info-class-name">${className}</div>
                <div class="info-stats-side" style="text-align: ${isUrdu ? 'left' : 'right'};">
                    ${roomLabel} <span class="compact-val">${selectedClass.roomNumber || '-'}</span>
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
            <span>${isUrdu ? 'آفیشل کلاس ٹائم ٹیبل' : 'OFFICIAL CLASS SCHEDULE'}</span>
            <span style="font-weight: 900; color: ${themeColors.accent}; font-size: ${14 * footerTextScale}px;">Mr. 🇵🇰</span>
            <span>${currentTimestamp}</span>
          </div>
        </div>
      `;
  };

  useEffect(() => {
    // Generate HTML for preview whenever relevant props change
    if (isOpen) {
        const html = generateTimetableImageHtml();
        setPreviewHtml(html);
    }
  }, [isOpen, selectedCardStyle, selectedTriangleCorner, badgeTarget, mergePatterns, showStartTimes, selectedClass, themeColors, headerTextScale, footerTextScale, subjectTextScale, periodTextScale, isUrdu]);

  // Adjust scale based on container width
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
            pixelRatio: 2, 
            backgroundColor: '#ffffff',
            width: width,
            height: height,
            style: {
                margin: '0',
                padding: '30px'
            }
        });
        
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

    const file = new File([blob], `timetable_${selectedClass.nameEn.replace(/\s/g, '_')}.png`, { type: 'image/png' });

    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        try {
            await (navigator as any).share({
                files: [file],
                title: 'Timetable',
            });
            setIsGenerating(false);
            return;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setIsGenerating(false);
                return;
            }
            console.log("Share cancelled or failed, falling back to download.");
        }
    }

    const dataUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(dataUrl);
    
    setIsGenerating(false);
  };

  const handleSendWhatsApp = async () => {
    if (!inChargeTeacher?.contactNumber) {
        alert("In-charge teacher's contact number not found.");
        return;
    }

    setIsGenerating(true);
    const blob = await generateAndGetBlob();

    if (blob) {
        let copied = false;
        try {
            if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                 await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
                 copied = true;
            }
        } catch (clipboardError) {
            console.warn("Clipboard write failed", clipboardError);
        }

        if (!copied) {
             const dataUrl = URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = dataUrl;
             link.download = `timetable_${selectedClass.nameEn.replace(/\s/g, '_')}.png`;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             URL.revokeObjectURL(dataUrl);
             alert("Could not copy to clipboard. Image downloaded. Please attach manually in WhatsApp.");
        }

        let phoneNumber = inChargeTeacher.contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
        const url = `https://wa.me/${phoneNumber}`;
        
        setTimeout(() => {
             window.open(url, '_blank');
        }, 500);
    } else {
        alert("Failed to generate image.");
    }

    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[101] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a2333] rounded-xl shadow-2xl w-full max-w-[95vw] md:max-w-2xl lg:max-w-4xl flex flex-col border border-white/10 max-h-[95vh] overflow-hidden transition-all" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-3 px-4 border-b border-white/10 bg-[#252f44] flex-shrink-0 flex justify-between items-center">
            <div className="flex items-baseline gap-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    SEND TO IN-CHARGE
                </h3>
                <span className="text-sm text-gray-400 font-bold">{selectedClass.nameEn}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                    <XIcon />
                </button>
            </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-2 custom-scrollbar bg-[#1a2333]">

            {/* Preview Section - Moved to Top */}
            <div className="flex flex-col items-center w-full mb-4" ref={previewContainerRef}>
                <div 
                    className="relative shadow-2xl rounded-lg overflow-hidden bg-white border border-gray-700/50 mx-auto transition-all duration-300 ease-out" 
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
            <div className="max-w-2xl mx-auto space-y-3 pb-2">
                
                {/* Text Size Section */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                        <label className="text-[0.5rem] font-black uppercase tracking-widest text-gray-400">Header</label>
                        <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg border border-white/10 p-1">
                            <button onClick={() => setHeaderTextScale(s => Math.max(0.5, s - 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">-</button>
                            <div className="flex-1 text-center text-white text-[0.625rem] font-bold">{Math.round(headerTextScale * 100)}%</div>
                            <button onClick={() => setHeaderTextScale(s => Math.min(2.0, s + 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">+</button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.5rem] font-black uppercase tracking-widest text-gray-400">Footer</label>
                        <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg border border-white/10 p-1">
                            <button onClick={() => setFooterTextScale(s => Math.max(0.5, s - 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">-</button>
                            <div className="flex-1 text-center text-white text-[0.625rem] font-bold">{Math.round(footerTextScale * 100)}%</div>
                            <button onClick={() => setFooterTextScale(s => Math.min(2.0, s + 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">+</button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.5rem] font-black uppercase tracking-widest text-gray-400">Sub/Teach</label>
                        <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg border border-white/10 p-1">
                            <button onClick={() => setSubjectTextScale(s => Math.max(0.5, s - 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">-</button>
                            <div className="flex-1 text-center text-white text-[0.625rem] font-bold">{Math.round(subjectTextScale * 100)}%</div>
                            <button onClick={() => setSubjectTextScale(s => Math.min(2.0, s + 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">+</button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.5rem] font-black uppercase tracking-widest text-gray-400">Period Time</label>
                        <div className="flex items-center gap-1 bg-[#0f172a] rounded-lg border border-white/10 p-1">
                            <button onClick={() => setPeriodTextScale(s => Math.max(0.5, s - 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">-</button>
                            <div className="flex-1 text-center text-white text-[0.625rem] font-bold">{Math.round(periodTextScale * 100)}%</div>
                            <button onClick={() => setPeriodTextScale(s => Math.min(2.0, s + 0.1))} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white font-bold text-xs">+</button>
                        </div>
                    </div>
                </div>

                {/* Card Design Section */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Card Design</label>
                        <select 
                            value={selectedCardStyle} 
                            onChange={(e) => setSelectedCardStyle(e.target.value as CardStyle)}
                            className="w-full bg-[#0f172a] text-white text-sm font-bold rounded-lg border border-white/10 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner transition-colors hover:border-white/20"
                        >
                            {cardStyles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    
                    {selectedCardStyle === 'triangle' && (
                    <div className="space-y-1 animate-scale-in">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Triangle Corner</label>
                        <select 
                            value={selectedTriangleCorner} 
                            onChange={(e) => setSelectedTriangleCorner(e.target.value as TriangleCorner)}
                            className="w-full bg-[#0f172a] text-white text-sm font-bold rounded-lg border border-white/10 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner transition-colors hover:border-white/20"
                        >
                            {triangleCorners.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    )}
                    
                    {selectedCardStyle === 'badge' && (
                    <div className="space-y-1 animate-scale-in">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Badge Target</label>
                        <select 
                            value={badgeTarget} 
                            onChange={(e) => setBadgeTarget(e.target.value as any)}
                            className="w-full bg-[#0f172a] text-white text-sm font-bold rounded-lg border border-white/10 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner transition-colors hover:border-white/20"
                        >
                            <option value="subject">Subject</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>
                    )}

                    {selectedCardStyle === 'outline' && (
                    <div className="space-y-1 animate-scale-in">
                        <label className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Outline Inset</label>
                        <input 
                            type="range" 
                            min="0" max="10" step="1"
                            value={outlineInset} 
                            onChange={(e) => setOutlineInset(parseFloat(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                    </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 w-full mt-2 items-center">
                    <div className="flex items-center gap-1 bg-[#1a2333] px-2 py-1.5 rounded-lg border border-white/5 shadow-inner">
                        <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-wider">Urdu</span>
                        <button 
                            onClick={() => setIsUrdu(!isUrdu)}
                            className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isUrdu ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isUrdu ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 bg-[#1a2333] px-2 py-1.5 rounded-lg border border-white/5 shadow-inner">
                        <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-wider">Time</span>
                        <button 
                            onClick={() => setShowStartTimes(!showStartTimes)}
                            className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showStartTimes ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showStartTimes ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-1 bg-[#1a2333] px-2 py-1.5 rounded-lg border border-white/5 shadow-inner">
                        <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-wider">Merge</span>
                        <button 
                            onClick={() => setMergePatterns(!mergePatterns)}
                            className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${mergePatterns ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mergePatterns ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <button onClick={handleSendImageAsPicture} disabled={isGenerating} className="flex-1 h-8 flex items-center justify-center gap-1 px-2 text-[0.625rem] font-black uppercase tracking-wider bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 shadow transition-all transform active:scale-95 hover:-translate-y-0.5">
                        {isGenerating ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                        )}
                    </button>
                    <button onClick={handleSendWhatsApp} disabled={isGenerating} className="flex-1 h-8 flex items-center justify-center gap-1 px-2 text-[0.625rem] font-black uppercase tracking-wider bg-[#128C7E] text-white rounded-md hover:bg-[#075e54] disabled:opacity-50 shadow transition-all transform active:scale-95 hover:-translate-y-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" /></svg>
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
