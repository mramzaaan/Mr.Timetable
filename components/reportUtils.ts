
import type { SchoolClass, Adjustment, TimetableGridData, DownloadLanguage, DownloadDesignConfig, Teacher, SchoolConfig, Subject, PeriodTime, Break, Period, LeaveDetails, AttendanceData, TriangleCorner } from '../types';
import { translations } from '../i18n';
import { allDays } from '../types';

export interface WorkloadStats {
  dailyCounts: { [key: string]: number };
  weeklyPeriods: number;
  jointPeriodsCount: number;
  substitutionsTaken: number;
  leavesTaken: number;
  totalWorkload: number;
  // New properties for Range Calculation
  daysInRange?: number;
  scheduledInRange?: number;
  rangeLeaves?: number;
  rangeSubs?: number;
  netLoad?: number;
  possiblePeriodsInRange?: number;
}

// Updated Robust Urdu Font Stack using System Fonts
const URDU_FONT_STACK = "sans-serif";

const teacherColorNames = [
  'subject-sky', 'subject-green', 'subject-yellow', 'subject-red',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue', 'subject-indigo'
];

const renderText = (lang: DownloadLanguage, en: string, ur: string) => {
    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; display: inline-block; padding-top: 2px; font-weight: normal;`;
    const urduSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`;
    
    if (lang === 'en') return en;
    if (lang === 'ur') return urduSpan;
    return `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; line-height:1.1;"><span>${en}</span><span style="${urduStyle} font-size: 0.85em;">${ur}</span></div>`;
};

// --- CSV Helper Functions ---
const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const addExcelHeaderFooter = (
    rows: (string | number)[][],
    schoolConfig: SchoolConfig,
    design: DownloadDesignConfig | undefined,
    title: string,
    lang: DownloadLanguage,
    dateStr?: string
) => {
    const isUrdu = lang === 'ur';
    const schoolName = isUrdu ? schoolConfig?.schoolNameUr : schoolConfig?.schoolNameEn;
    
    // Find max columns
    let maxCols = 0;
    rows.forEach(row => {
        if (row.length > maxCols) maxCols = row.length;
    });
    
    const padRow = (row: (string | number)[]) => {
        const padded = [...row];
        while (padded.length < maxCols) {
            padded.push('');
        }
        return padded;
    };
    
    const headerRows: (string | number)[][] = [];
    if (design?.header?.showSchoolName !== false) {
        headerRows.push(padRow([schoolName || '']));
    }
    if (design?.header?.showTitle !== false) {
        headerRows.push(padRow([title]));
    }
    if (design?.header?.showDate !== false && dateStr) {
        headerRows.push(padRow([dateStr]));
    }
    if (design?.header?.details?.text) {
        headerRows.push(padRow([design.header.details.text]));
    }
    headerRows.push(padRow([])); // Empty row
    
    const footerRows: (string | number)[][] = [];
    footerRows.push(padRow([])); // Empty row
    if (design?.footer?.text) {
        footerRows.push(padRow([design.footer.text]));
    }
    
    return [...headerRows, ...rows, ...footerRows];
};

const toCsvRow = (cells: any[]) => cells.map(c => {
    const str = String(c === undefined || c === null ? '' : c);
    if (str.search(/("|,|\n|\r)/g) >= 0) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}).join(',');

const isDateInVacation = (dateStr: string, session?: any) => {
    if (!session || !session.vacations) return false;
    const d = new Date(dateStr);
    return session.vacations.some((v: any) => {
        const start = new Date(v.startDate);
        const end = new Date(v.endDate);
        return d >= start && d <= end;
    });
};

const calculateRangeWorkload = (
    teacherId: string, 
    startDate: string, 
    endDate: string, 
    classes: SchoolClass[], 
    adjustments: Record<string, Adjustment[]>,
    leaveDetails: Record<string, Record<string, LeaveDetails>> = {},
    schoolConfig: SchoolConfig,
    sessionData?: any // Pass full session data to check vacations
): WorkloadStats => {
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let scheduledInRange = 0;
    let rangeLeaves = 0; 
    let rangeSubs = 0;   
    let daysInRange = 0;
    let possiblePeriodsInRange = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Skip vacations
        if (isDateInVacation(dateStr, sessionData)) continue;

        const dayIndex = d.getDay();
        const dayName = dayMap[dayIndex] as keyof TimetableGridData;
        
        // @ts-ignore
        const dayConfig = schoolConfig.daysConfig[dayName];
        if (!dayConfig || !dayConfig.active) continue;
        
        daysInRange++;
        possiblePeriodsInRange += dayConfig.periodCount;
        
        const teacherLeave = leaveDetails[dateStr]?.[teacherId];
        const isOnDuty = teacherLeave?.reason === 'On Duty';
        
        const dayAdjustments = adjustments[dateStr] || [];

        for (let pIndex = 0; pIndex < 12; pIndex++) {
            const periodsInSlot: Period[] = [];
            classes.forEach(c => {
                c.timetable[dayName]?.[pIndex]?.forEach(p => {
                    if (p.teacherId === teacherId) periodsInSlot.push(p);
                });
            });

            if (periodsInSlot.length > 0) {
                 const processedJointIds = new Set<string>();
                 periodsInSlot.forEach(p => {
                     let isLoadUnit = false;
                     if (p.jointPeriodId) {
                         if (!processedJointIds.has(p.jointPeriodId)) {
                             isLoadUnit = true;
                             processedJointIds.add(p.jointPeriodId);
                         }
                     } else {
                         isLoadUnit = true;
                     }

                     if (isLoadUnit) {
                         scheduledInRange++;
                         let missed = false;

                         if (!isOnDuty) {
                             if (teacherLeave) {
                                 if (teacherLeave.leaveType === 'full') {
                                     missed = true;
                                 } else if (teacherLeave.leaveType === 'half') {
                                     if (teacherLeave.periods && teacherLeave.periods.length > 0) {
                                         missed = teacherLeave.periods.includes(pIndex + 1);
                                     } else if ((pIndex + 1) >= teacherLeave.startPeriod) {
                                         missed = true;
                                     }
                                 }
                             }

                             if (!missed) {
                                 const subOut = dayAdjustments.some(adj => 
                                     adj.originalTeacherId === teacherId &&
                                     adj.periodIndex === pIndex &&
                                     adj.classId === p.classId
                                 );
                                 if (subOut) missed = true;
                             }
                         }

                         if (missed) {
                             rangeLeaves++;
                         }
                     }
                 });
            }

            const subsIn = dayAdjustments.filter(adj => adj.periodIndex === pIndex && adj.substituteTeacherId === teacherId);
            if (subsIn.length > 0) {
                rangeSubs++; 
            }
        }
    }

    const netLoad = (scheduledInRange - rangeLeaves) + rangeSubs;

    return {
        dailyCounts: {},
        weeklyPeriods: 0,
        jointPeriodsCount: 0,
        substitutionsTaken: 0,
        leavesTaken: 0,
        totalWorkload: 0,
        daysInRange,
        scheduledInRange,
        rangeLeaves,
        rangeSubs,
        netLoad,
        possiblePeriodsInRange
    };
};

export const calculateWorkloadStats = (
    teacherId: string, 
    classes: SchoolClass[], 
    adjustments: Record<string, Adjustment[]> = {},
    leaveDetails: Record<string, Record<string, LeaveDetails>> = {},
    startDate?: string,
    endDate?: string,
    schoolConfig?: SchoolConfig,
    sessionData?: any
): WorkloadStats => {
    const dailyCounts: { [key: string]: number } = {};
    allDays.forEach(day => dailyCounts[day.toLowerCase()] = 0);
    
    let weeklyPeriods = 0;
    let jointPeriodsCount = 0;

    allDays.forEach(day => {
        const dayKey = day as keyof TimetableGridData;
        
        if (schoolConfig && schoolConfig.daysConfig && !schoolConfig.daysConfig[dayKey]?.active) {
            return; 
        }

        for (let i = 0; i < 12; i++) {
            const periodsInSlot: Period[] = [];
            
            classes.forEach(c => {
                const slot = c.timetable[dayKey]?.[i];
                if (slot) {
                    slot.forEach(p => {
                        if (p.teacherId === teacherId) {
                            periodsInSlot.push(p);
                        }
                    });
                }
            });

            if (periodsInSlot.length > 0) {
                const processedJointIds = new Set<string>();
                
                periodsInSlot.forEach(p => {
                    if (p.jointPeriodId) {
                        if (!processedJointIds.has(p.jointPeriodId)) {
                            dailyCounts[day.toLowerCase()]++;
                            weeklyPeriods++;
                            jointPeriodsCount++; 
                            processedJointIds.add(p.jointPeriodId);
                        }
                    } else {
                        dailyCounts[day.toLowerCase()]++;
                        weeklyPeriods++;
                    }
                });
            }
        }
    });

    const datesToCheck: string[] = [];
    if (startDate && endDate) {
        let curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            if (!isDateInVacation(dStr, sessionData)) {
                datesToCheck.push(dStr);
            }
            curr.setDate(curr.getDate() + 1);
        }
    } else {
        const keys = new Set([...Object.keys(adjustments), ...Object.keys(leaveDetails)]);
        Array.from(keys).forEach(dStr => {
             if (!isDateInVacation(dStr, sessionData)) {
                datesToCheck.push(dStr);
            }
        });
    }

    let substitutionsTaken = 0;
    let leavesTaken = 0;

    datesToCheck.forEach(date => {
        const d = new Date(date);
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIndex = d.getDay();
        const dayName = dayMap[dayIndex] as keyof TimetableGridData;
        
        if (!allDays.includes(dayName)) return;
        
        if (schoolConfig && schoolConfig.daysConfig && !schoolConfig.daysConfig[dayName]?.active) {
            return;
        }

        const dayAdjustments = adjustments[date] || [];
        const teacherLeave = leaveDetails[date]?.[teacherId];
        const isOnDuty = teacherLeave?.reason === 'On Duty';

        const subSlots = new Set<number>();
        dayAdjustments.forEach(adj => {
            if (adj.substituteTeacherId === teacherId) {
                subSlots.add(adj.periodIndex);
            }
        });
        substitutionsTaken += subSlots.size;

        if (isOnDuty) return;

        for (let i = 0; i < 12; i++) {
             const periodsInSlot: Period[] = [];
             classes.forEach(c => {
                 c.timetable[dayName]?.[i]?.forEach(p => {
                     if (p.teacherId === teacherId) periodsInSlot.push(p);
                 });
             });

             if (periodsInSlot.length === 0) continue;

             const processedJointIds = new Set<string>();
             
             periodsInSlot.forEach(p => {
                 let isLoadUnit = false;
                 if (p.jointPeriodId) {
                     if (!processedJointIds.has(p.jointPeriodId)) {
                         isLoadUnit = true;
                         processedJointIds.add(p.jointPeriodId);
                     }
                 } else {
                     isLoadUnit = true;
                 }

                 if (isLoadUnit) {
                     let isMissed = false;
                     
                     if (teacherLeave) {
                         if (teacherLeave.leaveType === 'full') {
                             isMissed = true;
                         } else if (teacherLeave.leaveType === 'half') {
                             if (teacherLeave.periods && teacherLeave.periods.length > 0) {
                                 isMissed = teacherLeave.periods.includes(i + 1);
                             } else if ((i + 1) >= teacherLeave.startPeriod) {
                                 isMissed = true;
                             }
                         }
                     }

                     if (!isMissed) {
                         const subOut = dayAdjustments.some(adj => 
                             adj.originalTeacherId === teacherId &&
                             adj.periodIndex === i &&
                             adj.classId === p.classId
                         );
                         if (subOut) isMissed = true;
                     }

                     if (isMissed) {
                         leavesTaken++;
                     }
                 }
             });
        }
    });

    const totalWorkload = weeklyPeriods + substitutionsTaken - leavesTaken;

    return {
        dailyCounts,
        weeklyPeriods,
        jointPeriodsCount,
        substitutionsTaken,
        leavesTaken,
        totalWorkload
    };
};

export const getPrintStyles = (design: DownloadDesignConfig) => {
    const page = design?.page || { size: 'a4', orientation: 'portrait', margins: { top: 10, right: 10, bottom: 10, left: 10 }, watermarkOpacity: 0.1 };
    const table = design?.table || { cardStyle: 'full', triangleCorner: 'bottom-left', fontFamily: 'sans-serif', fontSize: 14, cellPadding: 8, borderColor: '#000000', borderWidth: 1, gridStyle: 'solid', headerBgColor: '#f3f4f6', headerColor: '#000000', bodyBgColor: '#ffffff', bodyColor: '#000000', altRowColor: '#f9fafb', periodColumnWidth: 50, periodColumnBgColor: '#f3f4f6', periodColumnColor: '#000000', outlineWidth: 2 };
    const header = design?.header || { divider: true, bgColor: 'transparent' };
    const footer = design?.footer || { fontFamily: 'sans-serif', fontSize: 10, color: '#000000' };

    const getWidth = () => {
        if (page.orientation === 'portrait') {
            if (page.size === 'legal') return '816px';
            if (page.size === 'exec') return '696px';
            return '794px'; // A4/Letter approx
        } else {
            if (page.size === 'legal') return '1344px';
            if (page.size === 'exec') return '1008px';
            return '1123px';
        }
    };
    
    const getHeight = () => {
        if (page.orientation === 'portrait') {
            if (page.size === 'legal') return '1344px';
            if (page.size === 'exec') return '1008px';
            return '1123px';
        } else {
            if (page.size === 'legal') return '816px';
            if (page.size === 'exec') return '696px';
            return '794px';
        }
    };

    const width = getWidth();
    const height = getHeight();

    const importsLatin = ``;

    const vAlign = (table.verticalAlign as string) === 'center' ? 'middle' : (table.verticalAlign || 'top'); 

    const cardStyle = table.cardStyle || 'full';
    const triangleCorner = table.triangleCorner || 'bottom-left';
    const outlineWidth = table.outlineWidth || 2;
    
    let triangleStyles = '';
    const triangleSize = 24; 
    if (triangleCorner === 'top-left') {
        triangleStyles = `top: 0; left: 0; border-top: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
    } else if (triangleCorner === 'top-right') {
        triangleStyles = `top: 0; right: 0; border-top: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
    } else if (triangleCorner === 'bottom-right') {
        triangleStyles = `bottom: 0; right: 0; border-bottom: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
    } else { // bottom-left default
        triangleStyles = `bottom: 0; left: 0; border-bottom: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
    }

    let cardSpecificStyles = '';
    if (cardStyle === 'outline') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background-color: #ffffff !important; border-width: ${outlineWidth}px !important; border-style: solid !important; box-shadow: none !important; border-color: inherit !important; color: inherit !important; }
            .subject-text, .teacher-text, .class-list, .subject-name { color: inherit !important; text-shadow: none !important; }
        `;
    } else if (cardStyle === 'text') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background-color: #ffffff !important; border-color: transparent !important; box-shadow: none !important; color: inherit !important; }
            .subject-text, .teacher-text, .class-list, .subject-name { color: inherit !important; text-shadow: none !important; }
        `;
    } else if (cardStyle === 'triangle') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background-color: #ffffff !important; border-color: transparent !important; box-shadow: none !important; position: relative; overflow: hidden; color: inherit !important; }
            .card-triangle { position: absolute; width: 0; height: 0; border-style: solid; ${triangleStyles} z-index: 5; }
            .subject-text, .teacher-text, .class-list, .subject-name { color: inherit !important; text-shadow: none !important; position: relative; z-index: 10; }
        `;
    } else if (cardStyle === 'glass') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background: rgba(255, 255, 255, 0.5) !important; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.3) !important; box-shadow: 0 4px 6px rgba(0,0,0,0.05) !important; }
            .subject-text, .subject-name { color: inherit !important; text-shadow: none !important; font-weight: 900 !important; }
        `;
    } else if (cardStyle === 'gradient') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; border: none !important; }
            .subject-text, .subject-name { text-shadow: 1px 1px 2px rgba(0,0,0,0.1) !important; }
        `;
    } else if (cardStyle === 'minimal-left') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background-color: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; position: relative !important; box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important; }
        `;
    } else if (cardStyle === 'badge') {
        cardSpecificStyles = `
            .glossy-box, .teacher-card { background-color: transparent !important; border: none !important; box-shadow: none !important; }
            .subject-text, .subject-name { background-color: currentColor; color: #fff !important; padding: 1px 6px; border-radius: 10px; display: inline-block; font-size: 0.9em !important; width: fit-content; margin-bottom: 2px; }
        `;
    } else {
        // Full color base
        cardSpecificStyles = `
            .glossy-box, .teacher-card { position: relative; overflow: hidden; }
            .card-triangle { position: absolute; width: 0; height: 0; border-style: solid; ${triangleStyles} z-index: 5; opacity: 0.4; }
        `;
    }

    return `
    ${importsLatin}
    
    .print-container {
      background-color: white;
      color: inherit;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: sans-serif; 
    }

    .print-container .font-urdu, 
    .print-container .font-urdu * {
        font-family: ${URDU_FONT_STACK} !important;
        line-height: 1.8;
        padding-top: 2px;
        direction: rtl;
        font-synthesis: none;
        font-weight: normal; 
    }
    
    .page { 
        width: ${width}; 
        height: ${height}; 
        padding: ${page.margins.top}mm ${page.margins.right}mm ${page.margins.bottom}mm ${page.margins.left}mm; 
        display: flex; 
        flex-direction: column; 
        position: relative; 
        box-sizing: border-box; 
        background: white; 
        overflow: hidden; 
    }
    
    .content-wrapper { position: relative; z-index: 10; display: flex; flex-direction: column; flex-grow: 1; height: 100%; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; height: 60%; object-fit: contain; opacity: ${page.watermarkOpacity}; z-index: 0; pointer-events: none; }
    
    .header-container { 
        display: flex; 
        align-items: center; 
        gap: 15px; 
        margin-bottom: 10px; 
        padding-bottom: 8px;
        border-bottom: ${header.divider ? '3px double #000' : 'none'};
        background-color: ${header.bgColor};
        flex-shrink: 0;
    }
    .header-logo { object-fit: contain; }
    .header-text { flex-grow: 1; }
    .header-school-name { margin: 0; line-height: 1.2; text-transform: uppercase; white-space: nowrap; }
    .header-title { margin-top: 4px; letter-spacing: 0.5px; }
    .header-details { margin-top: 4px; display: flex; justify-content: space-between; }

    .main-content { flex-grow: 1; display: flex; flex-direction: column; font-size: ${table.fontSize}px; overflow: hidden; }

    .footer { 
        margin-top: auto; 
        padding-top: 5px; 
        border-top: 1px solid #000; 
        display: flex; 
        align-items: flex-end; 
        font-family: sans-serif;
        font-size: ${footer.fontSize}px; 
        color: ${footer.color};
        flex-shrink: 0;
    }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; border: ${table.borderWidth || 1}px ${table.gridStyle || 'solid'} ${table.borderColor}; }
    th, td { 
        border: ${table.borderWidth || 1}px ${table.gridStyle || 'solid'} ${table.borderColor}; 
        padding: ${table.cellPadding}px; 
        vertical-align: ${vAlign} !important; 
        text-align: center; 
        font-size: ${table.fontSize}px;
        color: ${table.bodyColor || '#000000'};
        font-family: sans-serif;
        line-height: 1.1; /* Tighter line height for better canvas centering */
        box-sizing: border-box;
        overflow: visible !important;
        position: relative;
        z-index: 1;
        background-clip: padding-box;
        letter-spacing: normal;
    }
    th { 
        background-color: ${table.headerBgColor}; 
        color: ${table.headerColor};
        font-weight: bold; 
        font-size: ${table.headerFontSize || table.fontSize}px;
    }
    tr:nth-child(even) { background-color: ${table.altRowColor}; }
    .period-col {
        width: ${table.periodColumnWidth}px;
        background-color: ${table.periodColumnBgColor};
        color: ${table.periodColumnColor};
        font-weight: bold;
        font-size: 1.2em;
    }

    ${cardSpecificStyles}

    /* Theme color mapping for triangles */
    ${teacherColorNames.map(name => `
        .${name} { background-color: var(--${name}-bg); color: var(--${name}-text); border-color: var(--${name}-text) !important; }
        .${name} .subject-text, .${name} .teacher-text, .${name} .subject-name, .${name} .class-list { color: var(--${name}-text) !important; }
        .${name} .card-triangle { 
            color: var(--${name}-text) !important;
        }
    `).join('')}
    `;
};

const generateReportHTML = (
    schoolConfig: SchoolConfig,
    design: DownloadDesignConfig,
    title: string,
    lang: DownloadLanguage,
    content: string,
    details?: string,
    pageNumber?: number,
    totalPages?: number,
    reportDate?: string
): string => {
    const styles = getPrintStyles(design);
    const logoHtml = design.header.showLogo && schoolConfig.schoolLogoBase64
        ? `<img src="${schoolConfig.schoolLogoBase64}" class="header-logo" style="height: ${design.header.logoSize}px" />`
        : '';
    
    const showPageNum = design.footer.includePageNumber && pageNumber !== undefined && totalPages !== undefined;
    const pageNumHtml = showPageNum ? `<span>Page ${pageNumber} of ${totalPages}</span>` : '';
    
    const dateToUse = reportDate ? new Date(reportDate) : new Date();
    const dateHtml = design.footer.includeDate ? `<span style="font-size: ${design.footer.dateFontSize || 10}px;">${dateToUse.toLocaleDateString(lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>` : '';
    const timeHtml = design.footer.includeTimestamp ? `<span style="font-size: ${design.footer.timeFontSize || 10}px;">${new Date().toLocaleTimeString()}</span>` : '';

    const leftItems: string[] = [];
    const centerItems: string[] = [];
    const rightItems: string[] = [];

    if (design.footer.text && design.footer.appNamePlacement === 'left') leftItems.push(design.footer.text);
    if (design.footer.text && design.footer.appNamePlacement === 'center') centerItems.push(design.footer.text);
    if (design.footer.text && design.footer.appNamePlacement === 'right') rightItems.push(design.footer.text);

    if (dateHtml && design.footer.datePlacement === 'left') leftItems.push(dateHtml);
    if (dateHtml && design.footer.datePlacement === 'center') centerItems.push(dateHtml);
    if (dateHtml && design.footer.datePlacement === 'right') rightItems.push(dateHtml);

    if (timeHtml && design.footer.datePlacement === 'left') leftItems.push(timeHtml);
    if (timeHtml && design.footer.datePlacement === 'center') centerItems.push(timeHtml);
    if (timeHtml && design.footer.datePlacement === 'right') rightItems.push(timeHtml);

    if (pageNumHtml && design.footer.pageNumberPlacement === 'left') leftItems.push(pageNumHtml);
    if (pageNumHtml && design.footer.pageNumberPlacement === 'center') centerItems.push(pageNumHtml);
    if (pageNumHtml && design.footer.pageNumberPlacement === 'right') rightItems.push(pageNumHtml);

    const watermarkHtml = design.watermarkText 
        ? `<div class="watermark-text" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: ${design.watermarkColor || '#cbd5e1'}; opacity: ${design.page.watermarkOpacity}; pointer-events: none; white-space: nowrap; z-index: 0;">${design.watermarkText}</div>`
        : (schoolConfig.schoolLogoBase64 && design.page.watermarkOpacity > 0 ? `<img src="${schoolConfig.schoolLogoBase64}" class="watermark" style="opacity: ${design.page.watermarkOpacity};" />` : '');

    return `
        <div class="print-container" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
            <style>${styles}</style>
            <div class="page">
                ${watermarkHtml}
                <div class="content-wrapper">
                    <header class="header-container" style="justify-content: ${design.header.logoPosition === 'center' ? 'center' : design.header.logoPosition === 'right' ? 'flex-end' : 'flex-start'}">
                        ${design.header.logoPosition === 'left' ? logoHtml : ''}
                        <div class="header-text" style="text-align: ${design.header.schoolName.align}">
                            <h1 class="header-school-name" style="font-family: sans-serif; font-size: ${design.header.schoolName.fontSize}px; font-weight: ${design.header.schoolName.fontWeight}; color: ${design.header.schoolName.color}">
                                ${lang === 'ur' ? schoolConfig.schoolNameUr : schoolConfig.schoolNameEn}
                            </h1>
                            ${design.header.showTitle ? `<h2 class="header-title" style="font-family: sans-serif; font-size: ${design.header.title.fontSize}px; font-weight: ${design.header.title.fontWeight}; color: ${design.header.title.color}; text-align: ${design.header.title.align}">${title}</h2>` : ''}
                            ${design.header.showDate ? `<div class="header-date" style="font-family: sans-serif; font-size: ${design.header.dateFontSize || 12}px; font-weight: normal; color: #666; text-align: ${design.header.title.align}; margin-top: 4px;">${dateToUse.toLocaleDateString(lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}
                            ${details ? `<div class="header-details" style="font-family: sans-serif; font-size: ${design.header.details.fontSize}px; font-weight: ${design.header.details.fontWeight}; color: ${design.header.details.color}; text-align: ${design.header.details.align}">${details}</div>` : ''}
                        </div>
                        ${design.header.logoPosition === 'right' ? logoHtml : ''}
                    </header>
                    <main class="main-content">
                        ${content}
                    </main>
                    ${design.footer.show ? `
                    <footer class="footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="flex: 1; text-align: left; display: flex; gap: 10px;">${leftItems.join(' | ')}</div>
                        <div style="flex: 1; text-align: center; display: flex; justify-content: center; gap: 10px;">${centerItems.join(' | ')}</div>
                        <div style="flex: 1; text-align: right; display: flex; justify-content: flex-end; gap: 10px;">${rightItems.join(' | ')}</div>
                    </footer>` : ''}
                </div>
            </div>
        </div>
    `;
};

const formatCompressedClassNames = (classIds: string[], classes: SchoolClass[], lang: DownloadLanguage): string => {
    const getClass = (id: string) => classes.find(c => c.id === id);
    const sortedIds = [...classIds].sort((a, b) => {
        const cA = getClass(a); const cB = getClass(b); if (!cA || !cB) return 0;
        if (cA.serialNumber !== undefined && cB.serialNumber !== undefined) return cA.serialNumber - cB.serialNumber;
        return cA.nameEn.localeCompare(cA.nameEn, undefined, { numeric: true });
    });
    const items = sortedIds.map(id => { const c = getClass(id); if (!c) return null; const name = lang === 'ur' ? c.nameUr : c.nameEn; const lastSpaceIndex = name.lastIndexOf(' '); if (lastSpaceIndex !== -1) { return { prefix: name.substring(0, lastSpaceIndex), suffix: name.substring(lastSpaceIndex + 1) }; } return { prefix: name, suffix: '' }; }).filter(Boolean) as { prefix: string, suffix: string }[];
    const grouped = new Map<string, string[]>();
    items.forEach(({ prefix, suffix }) => { if (!grouped.has(prefix)) grouped.set(prefix, []); if (suffix && !grouped.get(prefix)!.includes(suffix)) { grouped.get(prefix)!.push(suffix); } });
    const parts: string[] = []; for (const [prefix, suffixes] of grouped) { if (suffixes.length > 0) { const separator = lang === 'ur' ? '، ' : ', '; parts.push(`${prefix} ${suffixes.join(separator)}`); } else { parts.push(prefix); } }
    return parts.join('-');
};

export const generateSchoolTimingsExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig) => {
    const { en: enT, ur: urT } = translations;
    const trLocal = (en: string, ur: string) => lang === 'ur' ? ur : en;
    const isUrdu = lang === 'ur';
    const minText = isUrdu ? 'منٹ' : 'Min';
    
    const header = [trLocal('Regular Days', 'عام ایام'), '', '', trLocal('Jummah Mubarak', 'جمعہ المبارک'), '', ''];
    const subHeader = [trLocal('Period', 'پیریڈ'), trLocal('Time', 'وقت'), trLocal('Duration', 'دورانیہ'), trLocal('Period', 'پیریڈ'), trLocal('Time', 'وقت'), trLocal('Duration', 'دورانیہ')];
    const rows: (string | number)[][] = [header, subHeader];
    
    const getDuration = (start: string, end: string) => { if (!start || !end) return 0; const [h1, m1] = start.split(':').map(Number); const [h2, m2] = end.split(':').map(Number); const d1 = new Date(2000, 0, 1, h1, m1); const d2 = new Date(2000, 0, 1, h2, m2); return Math.round((d2.getTime() - d1.getTime()) / 60000); };
    
    const getMaxPeriods = (type: 'default' | 'friday') => {
        const daysToCheck = type === 'friday' ? ['Friday'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
        let max = 0;
        daysToCheck.forEach(d => {
            // @ts-ignore
            const cfg = schoolConfig.daysConfig[d];
            if (cfg && cfg.active) {
                max = Math.max(max, cfg.periodCount);
            }
        });
        return max > 0 ? max : 8;
    };

    const getScheduleItems = (type: 'default' | 'friday') => { 
        const periods = schoolConfig.periodTimings[type]; 
        const breaks = schoolConfig.breaks[type]; 
        const assembly = schoolConfig.assembly[type]; 
        const maxPeriods = getMaxPeriods(type);

        const items: { type: 'assembly'|'period'|'break', name: string, time: string, duration: number, sortIndex: number }[] = []; 
        if (assembly) items.push({ type: 'assembly', name: trLocal('Assembly', 'اسمبلی'), time: `${assembly.start} - ${assembly.end}`, duration: getDuration(assembly.start, assembly.end), sortIndex: 0 }); 
        periods.forEach((p, i) => { if (i < maxPeriods) { const pName = p.name || (i + 1).toString(); items.push({ type: 'period', name: pName, time: `${p.start} - ${p.end}`, duration: getDuration(p.start, p.end), sortIndex: (i + 1) * 2 }); } }); 
        breaks.forEach(b => { if (b.beforePeriod <= maxPeriods + 1) { let name = b.name; if (b.name === 'Recess') name = trLocal('Recess', 'تفریح'); else if (b.name === 'Lunch') name = trLocal('Lunch', 'کھانے کا وقفہ'); else if (b.name === 'Jummah') name = trLocal('Jummah', 'جمعہ'); else name = trLocal(b.name, b.name); items.push({ type: 'break', name: name, time: `${b.startTime} - ${b.endTime}`, duration: getDuration(b.startTime, b.endTime), sortIndex: (b.beforePeriod * 2) - 1 }); } }); 
        return items.sort((a, b) => a.sortIndex - b.sortIndex); 
    };
    
    const isFridayActive = (schoolConfig.daysConfig['Friday'] as any)?.active !== false;
    const colA_Items = getScheduleItems('default'); 
    const colB_Items = isFridayActive ? getScheduleItems('friday') : []; 
    
    const maxRows = Math.max(colA_Items.length, colB_Items.length);
    for (let i = 0; i < maxRows; i++) {
        const itemA = colA_Items[i];
        const itemB = colB_Items[i];
        const row = [];
        
        if (itemA) {
            row.push(itemA.name, itemA.time, `${itemA.duration} ${minText}`);
        } else {
            row.push('', '', '');
        }
        
        if (isFridayActive) {
            if (itemB) {
                row.push(itemB.name, itemB.time, `${itemB.duration} ${minText}`);
            } else {
                row.push('', '', '');
            }
        }
        
        rows.push(row);
    }
    
    const finalRows = addExcelHeaderFooter(rows, schoolConfig, design, trLocal('Timetable', 'ٹائم ٹیبل'), lang);
    downloadCsv(finalRows.map(toCsvRow).join('\n'), 'School_Timings.csv');
};

export const generateSchoolTimingsHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig): string => {
    const customDesign = JSON.parse(JSON.stringify(design));
    customDesign.footer.includePageNumber = false; 
    customDesign.header.showTitle = true;

    if (lang === 'ur') {
        customDesign.header.title.align = 'right';
        customDesign.header.schoolName.align = 'right';
    }

    const isUrdu = lang === 'ur';
    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; font-weight: normal;`;
    const alignMap: Record<string, string> = { 'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end', 'center': 'center' };
    const flexAlign = alignMap[customDesign.table.verticalAlign || 'middle'] || 'center';
    const trLocal = (en: string, ur: string) => { const urSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`; if (lang === 'en') return en; if (lang === 'ur') return urSpan; return `${en} / ${urSpan}`; };
    const num = (n: string | number) => n.toString();
    const timeStr = (t: PeriodTime) => { if (!t.start || !t.end) return ''; return `${t.start} - ${t.end}`; };
    const getDuration = (start: string, end: string) => { if (!start || !end) return 0; const [h1, m1] = start.split(':').map(Number); const [h2, m2] = end.split(':').map(Number); const d1 = new Date(2000, 0, 1, h1, m1); const d2 = new Date(2000, 0, 1, h2, m2); return Math.round((d2.getTime() - d1.getTime()) / 60000); };
    
    const getMaxPeriods = (type: 'default' | 'friday') => {
        const daysToCheck = type === 'friday' ? ['Friday'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
        let max = 0;
        daysToCheck.forEach(d => {
            // @ts-ignore
            const cfg = schoolConfig.daysConfig[d];
            if (cfg && cfg.active) {
                max = Math.max(max, cfg.periodCount);
            }
        });
        return max > 0 ? max : 8;
    };

    const getScheduleItems = (type: 'default' | 'friday') => { 
        const periods = schoolConfig.periodTimings[type]; 
        const breaks = schoolConfig.breaks[type]; 
        const assembly = schoolConfig.assembly[type]; 
        const maxPeriods = getMaxPeriods(type);

        const items: { type: 'assembly'|'period'|'break', name: string, time: string, duration: number, sortIndex: number }[] = []; 
        if (assembly) items.push({ type: 'assembly', name: trLocal('Assembly', 'اسمبلی'), time: timeStr(assembly), duration: getDuration(assembly.start, assembly.end), sortIndex: 0 }); 
        periods.forEach((p, i) => { if (i < maxPeriods) { const pName = p.name || num(i + 1); items.push({ type: 'period', name: pName, time: timeStr(p), duration: getDuration(p.start, p.end), sortIndex: (i + 1) * 2 }); } }); 
        breaks.forEach(b => { if (b.beforePeriod <= maxPeriods + 1) { let name = b.name; if (b.name === 'Recess') name = trLocal('Recess', 'تفریح'); else if (b.name === 'Lunch') name = trLocal('Lunch', 'کھانے کا وقفہ'); else if (b.name === 'Jummah') name = trLocal('Jummah', 'جمعہ'); else name = trLocal(b.name, b.name); items.push({ type: 'break', name: name, time: `${b.startTime} - ${b.endTime}`, duration: getDuration(b.startTime, b.endTime), sortIndex: (b.beforePeriod * 2) - 1 }); } }); 
        return items.sort((a, b) => a.sortIndex - b.sortIndex); 
    };
    
    const isFridayActive = (schoolConfig.daysConfig['Friday'] as any)?.active !== false;
    const regItems = getScheduleItems('default'); const friItems = isFridayActive ? getScheduleItems('friday') : []; const colA_Items = regItems; const colB_Items = friItems; const colA_Title = trLocal('Regular Days', 'عام ایام'); const colB_Title = trLocal('Jummah Mubarak', 'جمعہ المبارک');
    const durationAlign = isUrdu ? 'left' : 'right'; const periodNameFontSize = isUrdu ? '1.3em' : '1.0em'; const specialNameFontSize = isUrdu ? '1.0em' : '0.85em'; const durationFontSize = isUrdu ? '0.8em' : '0.6em'; const timeFontSize = isUrdu ? '1.2em' : '1.0em';
    const mainHeaderFontSize = isUrdu ? 70 : 35; const subHeaderFontSize = isUrdu ? (customDesign.table.fontSize + 20) : (customDesign.table.fontSize + 5);
    const minText = isUrdu ? 'منٹ' : 'Min';

    const maxRows = isFridayActive ? Math.max(colA_Items.length, colB_Items.length) : colA_Items.length; let tableRows = ''; let colBMergeStarted = false; const signatureText = trLocal('Principal Signature', 'دستخط پرنسپل');
    for (let i = 0; i < maxRows; i++) { const itemA = colA_Items[i]; const itemB = colB_Items[i]; let rowHtml = ''; if (itemA) { const isPeriod = itemA.type === 'period'; const bgClass = isPeriod ? 'bg-white' : 'bg-green'; const textClass = 'text-black'; const nameFontSize = isPeriod ? periodNameFontSize : specialNameFontSize; rowHtml += `<td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${nameFontSize} !important; vertical-align: middle;">${itemA.name}</td><td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${timeFontSize} !important; vertical-align: top;"><div style="display: flex; flex-direction: column; align-items: center; justify-content: ${flexAlign}; height: 100%; line-height: 1.1;">${itemA.duration > 0 ? `<div style="font-size: ${durationFontSize} !important; width: 100%; text-align: center; font-weight: normal; margin-bottom: 2px; color: #666;">${itemA.duration} ${minText}</div>` : ''}<div style="unicode-bidi: embed;">${itemA.time}</div></div></td>`; } else { rowHtml += '<td></td><td></td>'; } if (isFridayActive) { if (itemB) { const isPeriod = itemB.type === 'period'; const bgClass = itemB.type === 'period' ? 'bg-white' : 'bg-green'; const textClass = 'text-black'; const nameFontSize = isPeriod ? periodNameFontSize : specialNameFontSize; rowHtml += `<td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${nameFontSize} !important; vertical-align: middle;">${itemB.name}</td><td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${timeFontSize} !important; vertical-align: top;"><div style="display: flex; flex-direction: column; align-items: center; justify-content: ${flexAlign}; height: 100%; line-height: 1.1;">${itemB.duration > 0 ? `<div style="font-size: ${durationFontSize} !important; width: 100%; text-align: center; font-weight: normal; margin-bottom: 2px; color: #666;">${itemB.duration} ${minText}</div>` : ''}<div style="unicode-bidi: embed;">${itemB.time}</div></div></td>`; } else { if (!colBMergeStarted) { const rowSpan = maxRows - i; rowHtml += `<td colspan="2" rowspan="${rowSpan}" style="border: ${customDesign.table.borderWidth || 3}px solid ${customDesign.table.borderColor}; vertical-align: bottom; text-align: center; padding-bottom: 5px;"><div style="display: inline-block; border-top: 1px solid ${customDesign.table.borderColor}; padding-top: 5px; min-width: 180px; font-size: 1.1em; font-weight: bold; text-align: center; margin-bottom: 5px;">${signatureText}</div></td>`; colBMergeStarted = true; } } } tableRows += `<tr>${rowHtml}</tr>`; }
    const customStyles = `<style> .school-timings-table { width: 100%; border-collapse: collapse; text-align: center; font-size: ${customDesign.table.fontSize}px; } .school-timings-table th, .school-timings-table td { border: ${customDesign.table.borderWidth || 3}px solid ${customDesign.table.borderColor}; padding: ${customDesign.table.cellPadding}px; color: ${customDesign.table.bodyColor || '#000000'}; } .main-header { background-color: ${customDesign.table.headerBgColor}; color: ${customDesign.table.headerColor} !important; font-size: ${mainHeaderFontSize}px !important; font-weight: 900; padding: 12px; text-transform: uppercase; } .sub-header { background-color: #E9D5FF; color: #000000; font-weight: bold; font-size: ${subHeaderFontSize}px !important; } .bg-green { background-color: ${customDesign.table.periodColumnBgColor !== '#F3F4F6' ? customDesign.table.periodColumnBgColor : '#86efac'}; } .bg-white { background-color: ${customDesign.table.bodyBgColor}; } .text-black { color: ${customDesign.table.bodyColor || '#000000'}; } </style>`;
    const subHeaderRow = isFridayActive ? `<tr><th class="sub-header" style="width: 12%">${trLocal('Period', 'پیریڈ')}</th><th class="sub-header" style="width: 38%">${trLocal('Time', 'وقت')}</th><th class="sub-header" style="width: 12%">${trLocal('Period', 'پیریڈ')}</th><th class="sub-header" style="width: 38%">${trLocal('Time', 'وقت')}</th></tr>` : `<tr><th class="sub-header" style="width: 25%">${trLocal('Period', 'پیریڈ')}</th><th class="sub-header" style="width: 75%">${trLocal('Time', 'وقت')}</th></tr>`;
    const tableHtml = isFridayActive ? `${customStyles}<table class="school-timings-table"><thead><tr><th colspan="2" class="main-header">${colA_Title}</th><th colspan="2" class="main-header">${colB_Title}</th></tr>${subHeaderRow}</thead><tbody>${tableRows}</tbody></table>` : `${customStyles}<table class="school-timings-table"><thead>${subHeaderRow}</thead><tbody>${tableRows}</tbody></table>`;
    const reportTitle = trLocal('Timetable', 'ٹائم ٹیبل'); 
    return generateReportHTML(schoolConfig, customDesign, reportTitle, lang, tableHtml);
};

export const generateClassTimetableHtml = (classItem: SchoolClass, lang: DownloadLanguage, design: DownloadDesignConfig, teachers: Teacher[], subjects: Subject[], schoolConfig: SchoolConfig): string | string[] => {
    const { en: enT, ur: urT } = translations;
    
    // Clone design to avoid mutating the original object and to apply language-specific overrides
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const inChargeTeacher = teachers.find(t => t.id === classItem.inCharge);
    const tLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key]; 
    const alignMap: Record<string, string> = { 'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end', 'center': 'center' };
    const flexAlign = alignMap[customDesign.table.verticalAlign || 'top'] || 'flex-start';
    const daysPerPage = customDesign.daysPerPage || 7;
    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const pages: string[] = [];
    const totalDays = activeDays.length;
    let currentDayIndex = 0;
    const totalPages = Math.ceil(totalDays / daysPerPage);

    const colorMap = new Map<string, string>();
    teachers.forEach((teacher, index) => { colorMap.set(teacher.id, teacherColorNames[index % teacherColorNames.length]); });

    const cardStyle = customDesign.table.cardStyle || 'full';
    const triangleCorner = customDesign.table.triangleCorner || 'bottom-left';
    const outlineWidth = customDesign.table.outlineWidth || 2;
    const mergePatterns = customDesign.table.mergeIdenticalPeriods ?? true;

    let triangleStyles = '';
    const triangleSize = 24; 
    if (triangleCorner === 'top-left') {
        triangleStyles = `top: 0; left: 0; border-top: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
    } else if (triangleCorner === 'top-right') {
        triangleStyles = `top: 0; right: 0; border-top: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
    } else if (triangleCorner === 'bottom-right') {
        triangleStyles = `bottom: 0; right: 0; border-bottom: ${triangleSize}px solid currentColor; border-left: ${triangleSize}px solid transparent;`;
    } else { // bottom-left
        triangleStyles = `bottom: 0; left: 0; border-bottom: ${triangleSize}px solid currentColor; border-right: ${triangleSize}px solid transparent;`;
    }

    for (let i = 0; i < totalPages; i++) {
        const chunkDays = activeDays.slice(currentDayIndex, currentDayIndex + daysPerPage);
        currentDayIndex += daysPerPage;
        const maxPeriods = Math.max(...chunkDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));
        const cssColors = `--subject-red-bg: #fee2e2; --subject-red-text: #991b1b; --subject-sky-bg: #e0f2fe; --subject-sky-text: #0369a1; --subject-green-bg: #dcfce7; --subject-green-text: #166534; --subject-yellow-bg: #fef9c3; --subject-yellow-text: #854d0e; --subject-purple-bg: #f3e8ff; --subject-purple-text: #6b21a8; --subject-pink-bg: #fce7f3; --subject-pink-text: #9d174d; --subject-indigo-bg: #e0e7ff; --subject-indigo-text: #3730a3; --subject-teal-bg: #ccfbf1; --subject-teal-text: #134e4a; --subject-orange-bg: #ffedd5; --subject-orange-text: #9a3412; --subject-lime-bg: #ecfccb; --subject-lime-text: #4d7c0f; --subject-cyan-bg: #cffafe; --subject-cyan-text: #0e7490; --subject-emerald-bg: #d1fae5; --subject-emerald-text: #065f46; --subject-fuchsia-bg: #fae8ff; --subject-fuchsia-text: #86198f; --subject-rose-bg: #ffe4e6; --subject-rose-text: #9f1239; --subject-amber-bg: #fef3c7; --subject-amber-text: #92400e; --subject-blue-bg: #dbeafe; --subject-blue-text: #1e40af; --subject-default-bg: #f3f4f6; --subject-default-text: #374151;`;
        
        let cardStyleCss = '';
        if (cardStyle === 'full') {
            cardStyleCss = `background-image: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%); box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.08);`;
        } else if (cardStyle === 'outline') {
            cardStyleCss = `background-color: #ffffff !important; border: ${outlineWidth}px solid inherit; box-shadow: none !important;`;
        } else if (cardStyle === 'glass') {
            cardStyleCss = `background: rgba(255, 255, 255, 0.4) !important; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.02) !important;`;
        } else if (cardStyle === 'gradient') {
            cardStyleCss = `background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.05) 100%) !important; border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;`;
        } else if (cardStyle === 'minimal-left') {
            cardStyleCss = `background-color: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; position: relative !important; box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;`;
        } else if (cardStyle === 'badge') {
            cardStyleCss = `background-color: transparent !important; border: none !important; box-shadow: none !important;`;
        }

        const customStyles = `<style>:root { ${cssColors} } .cell-wrapper { display: flex; flex-direction: column; gap: 2px; width: 100%; height: 100%; box-sizing: border-box; } .period-card-img { flex: 1; min-width: 0; border-radius: 4px; align-self: stretch; height: 100%; display: flex; flex-direction: column; ${cardStyleCss} position: relative; overflow: hidden; box-sizing: border-box; } .period-content-spread { display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%; padding: 4px 6px; box-sizing: border-box; position: relative; z-index: 10; } .period-subject { text-align: left; font-weight: 900; font-size: 1.1em; line-height: ${customDesign.table.lineHeight || 1.1}; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .period-teacher { text-align: right; font-size: 0.85em; font-weight: 700; opacity: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: ${customDesign.table.lineHeight || 1.1}; } .card-triangle { position: absolute; width: 0; height: 0; border-style: solid; ${triangleStyles} z-index: 5; } ${teacherColorNames.map(name => `.${name} { background-color: var(--${name}-bg); color: var(--${name}-text); border-color: var(--${name}-text) !important; } .${name} .period-subject, .${name} .period-teacher { color: var(--${name}-text) !important; } .${name} .card-triangle { color: var(--${name}-text) !important; }`).join('')} td { padding: ${customDesign.table.cellPadding}px !important; height: auto !important; min-height: 62px; border-color: ${customDesign.table.borderColor} !important; vertical-align: top !important; } table { table-layout: fixed; width: 100%; border-color: ${customDesign.table.borderColor} !important; } .disabled-cell { background-color: #e5e7eb; }</style>`;
        const align1 = lang === 'ur' ? 'right' : 'left'; const align2 = 'center'; const align3 = lang === 'ur' ? 'left' : 'right';
        const detailsHtml = `<div style="width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;"><div style="text-align: ${align1}; flex: 1;">${renderText(lang, classItem.nameEn, classItem.nameUr)}</div><div style="text-align: ${align2}; flex: 1;">${inChargeTeacher ? renderText(lang, inChargeTeacher.nameEn, inChargeTeacher.nameUr) : '-'}</div><div style="text-align: ${align3}; flex: 1;">${classItem.roomNumber}</div></div>`;
        const dayHeaders = chunkDays.map(day => { const dayKey = day.toLowerCase(); return `<th>${renderText(lang, (enT as any)[dayKey], (urT as any)[dayKey])}</th>`; }).join('');

        const grid: (null | { html: string, key: string })[][] = Array.from({ length: maxPeriods }, () => Array(chunkDays.length).fill(null));
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            chunkDays.forEach((day, dIdx) => {
                const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                if (pIdx >= periodLimit) return;
                const periods = classItem.timetable[day as keyof TimetableGridData]?.[pIdx] || [];
                if (periods.length === 0) return;

                const sortedPeriods = [...periods].sort((a, b) => a.subjectId.localeCompare(b.subjectId));
                const key = sortedPeriods.map(p => `${p.subjectId}-${p.teacherId}`).join('|');
                
                const subjectsList = sortedPeriods.map(p => {
                    const sub = subjects.find(s => s.id === p.subjectId);
                    return sub ? renderText(lang, sub.nameEn, sub.nameUr) : '';
                }).filter(Boolean).join(' / ');

                const teachersList = sortedPeriods.map(p => {
                    const tea = teachers.find(t => t.id === p.teacherId);
                    return tea ? renderText(lang, tea.nameEn, tea.nameUr) : '';
                }).filter(Boolean).join(' / ');

                const firstPeriod = sortedPeriods[0];
                const colorClass = colorMap.get(firstPeriod.teacherId) || 'subject-default';
                const triangleHtml = (cardStyle === 'triangle' || cardStyle === 'full') ? `<div class="card-triangle"></div>` : '';
                
                let separatorHtml = '';
                if (cardStyle === 'minimal-left') {
                    separatorHtml = `<div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.5; transform: translateY(-50%); pointer-events: none;"><div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div><div style="height: 2px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 8px;"></div><div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div></div>`;
                }

                let subjectBadgeStyle = '';
                if (cardStyle === 'badge') {
                    subjectBadgeStyle = `background-color: var(--${colorClass}-text); color: #fff !important; padding: 4px 12px; border-radius: 999px; display: inline-block; width: fit-content; max-width: 100%; text-align: center; box-sizing: border-box; margin-bottom: 2px;`;
                }
                
                const content = `<div class="period-card-img ${colorClass}">${triangleHtml}${separatorHtml}<div class="period-content-spread"><div class="period-subject" style="${subjectBadgeStyle}" title="${subjectsList.replace(/<[^>]*>/g, '')}">${subjectsList}</div><div class="period-teacher" title="${teachersList.replace(/<[^>]*>/g, '')}">${teachersList}</div></div></div>`;
                grid[pIdx][dIdx] = { html: `<div class="cell-wrapper">${content}</div>`, key };
            });
        }

        let tableRows = '';
        const visited = Array.from({ length: maxPeriods }, () => Array(chunkDays.length).fill(false));
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            const startTime = schoolConfig.periodTimings?.default?.[pIdx]?.start || '';
            const showTime = customDesign.table.showPeriodTime;
            const timePos = customDesign.table.periodTimePosition || 'below';
            const periodNumFontSize = customDesign.table.periodFontSize ? `${customDesign.table.periodFontSize}px` : 'inherit';
            let periodContent = `<div style="font-size: ${periodNumFontSize};">${pIdx + 1}</div>`;
            if (showTime && startTime) {
                let rotationStyle = '';
                const rot = customDesign.table.periodTimeRotation || '0';
                if (rot === '90') rotationStyle = `writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; margin: 2px 0;`;
                else if (rot === '180') rotationStyle = `transform: rotate(180deg); display: inline-block; margin: 2px 0;`;
                else if (rot === '270') rotationStyle = `writing-mode: vertical-rl; display: inline-block; margin: 2px 0;`;
                else rotationStyle = `margin: 2px 0;`;
                
                const fontSize = customDesign.table.periodTimeFontSize ? `${customDesign.table.periodTimeFontSize}px` : '0.6em';
                const timeColor = customDesign.table.periodTimeColor || '#666666';
                const timeHtml = `<div style="font-size: ${fontSize}; font-weight: normal; color: ${timeColor}; ${rotationStyle}">${startTime}</div>`;
                const numHtml = `<div style="font-size: ${periodNumFontSize};">${pIdx + 1}</div>`;
                
                if (timePos === 'above') {
                    periodContent = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">${timeHtml}${numHtml}</div>`;
                } else if (timePos === 'left') {
                    periodContent = `<div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;">${timeHtml}${numHtml}</div>`;
                } else if (timePos === 'right') {
                    periodContent = `<div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;">${numHtml}${timeHtml}</div>`;
                } else {
                    periodContent = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">${numHtml}${timeHtml}</div>`;
                }
            }
            let rowHtml = `<td class="period-col" style="text-align: center; vertical-align: middle;">${periodContent}</td>`;
            for (let dIdx = 0; dIdx < chunkDays.length; dIdx++) {
                if (visited[pIdx][dIdx]) continue;
                const current = grid[pIdx][dIdx];
                const day = chunkDays[dIdx];
                const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                if (pIdx >= periodLimit) {
                    rowHtml += `<td class="disabled-cell"></td>`;
                    visited[pIdx][dIdx] = true;
                    continue;
                }
                if (!current) {
                    rowHtml += `<td></td>`;
                    visited[pIdx][dIdx] = true;
                    continue;
                }

                let colspan = 1;
                if (mergePatterns) {
                    while (dIdx + colspan < chunkDays.length) {
                        const nextDay = chunkDays[dIdx + colspan];
                        const nextDayLimit = schoolConfig.daysConfig?.[nextDay]?.periodCount ?? 8;
                        if (pIdx < nextDayLimit) {
                            const next = grid[pIdx][dIdx + colspan];
                            if (next && next.key === current.key) {
                                colspan++;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }
                for (let c = 0; c < colspan; c++) visited[pIdx][dIdx + c] = true;
                rowHtml += `<td ${colspan > 1 ? `colspan="${colspan}"` : ''} >${current.html}</td>`;
            }
            tableRows += `<tr>${rowHtml}</tr>`;
        }

        const colGroupHtml = `<colgroup><col style="width: ${customDesign.table.periodColumnWidth || 50}px">${chunkDays.map(() => '<col style="width: auto">').join('')}</colgroup>`;
        const tableHtml = `${customStyles}<table>${colGroupHtml}<thead><tr><th class="period-col" colspan="1"></th>${dayHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;
        pages.push(generateReportHTML(schoolConfig, customDesign, `${tLocal('classTimetable')}`, lang, tableHtml, detailsHtml, i + 1, totalPages));
    }
    return pages.length === 1 ? pages[0] : pages; 
};

export const generateTeacherTimetableHtml = (teacher: Teacher, lang: DownloadLanguage, design: DownloadDesignConfig, classes: SchoolClass[], subjects: Subject[], schoolConfig: SchoolConfig, adjustments: Record<string, Adjustment[]>, teachers: Teacher[]): string | string[] => {
    const { en: enT, ur: urT } = translations;

    // Clone design to avoid mutating the original object and to apply language-specific overrides
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const tLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];
    const alignMap: Record<string, string> = { 'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end', 'center': 'center' };
    const flexAlign = alignMap[customDesign.table.verticalAlign || 'top'] || 'flex-start';
    const daysPerPage = customDesign.daysPerPage || 7;
    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const pages: string[] = [];
    const totalDays = activeDays.length;
    let currentDayIndex = 0;
    const totalPages = Math.ceil(totalDays / daysPerPage);

    const cardStyle = customDesign.table.cardStyle || 'full';
    const triangleCorner = customDesign.table.triangleCorner || 'bottom-left';
    const outlineWidth = customDesign.table.outlineWidth || 2;
    const mergePatterns = customDesign.table.mergeIdenticalPeriods ?? true;

    let triangleStyles = '';
    const triangleSize = 24;
    if (triangleCorner === 'top-left') {
        triangleStyles = `top: 0; left: 0; border-width: ${triangleSize}px ${triangleSize}px 0 0; border-color: currentColor transparent transparent transparent;`;
    } else if (triangleCorner === 'top-right') {
        triangleStyles = `top: 0; right: 0; border-width: 0 ${triangleSize}px ${triangleSize}px 0; border-color: transparent currentColor transparent transparent;`;
    } else if (triangleCorner === 'bottom-right') {
        triangleStyles = `bottom: 0; right: 0; border-width: 0 0 ${triangleSize}px ${triangleSize}px; border-color: transparent transparent currentColor transparent;`;
    } else { // bottom-left
        triangleStyles = `bottom: 0; left: 0; border-width: ${triangleSize}px 0 0 ${triangleSize}px; border-color: transparent transparent transparent currentColor;`;
    }

    const getCombinationColor = (p: Period) => { const key = `${p.classId}-${p.subjectId}-${p.jointPeriodId || ''}`; let hash = 0; for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash); return teacherColorNames[Math.abs(hash) % teacherColorNames.length]; };

    for (let i = 0; i < totalPages; i++) {
        const chunkDays = activeDays.slice(currentDayIndex, currentDayIndex + daysPerPage);
        currentDayIndex += daysPerPage;
        const maxPeriods = Math.max(...chunkDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));
        const stats = calculateWorkloadStats(teacher.id, classes, adjustments, {}, undefined, undefined, schoolConfig);
        const workloadLabel = `${stats.weeklyPeriods} ${stats.weeklyPeriods === 1 ? tLocal('period') : tLocal('periods')}`;
        const cssColors = `--subject-red-bg: #fee2e2; --subject-red-text: #991b1b; --subject-sky-bg: #e0f2fe; --subject-sky-text: #0369a1; --subject-green-bg: #dcfce7; --subject-green-text: #166534; --subject-yellow-bg: #fef9c3; --subject-yellow-text: #854d0e; --subject-purple-bg: #f3e8ff; --subject-purple-text: #6b21a8; --subject-pink-bg: #fce7f3; --subject-pink-text: #9d174d; --subject-indigo-bg: #e0e7ff; --subject-indigo-text: #3730a3; --subject-teal-bg: #ccfbf1; --subject-teal-text: #134e4a; --subject-orange-bg: #ffedd5; --subject-orange-text: #9a3412; --subject-lime-bg: #ecfccb; --subject-lime-text: #4d7c0f; --subject-cyan-bg: #cffafe; --subject-cyan-text: #0e7490; --subject-emerald-bg: #d1fae5; --subject-emerald-text: #065f46; --subject-fuchsia-bg: #fae8ff; --subject-fuchsia-text: #86198f; --subject-rose-bg: #ffe4e6; --subject-rose-text: #9f1239; --subject-amber-bg: #fef3c7; --subject-amber-text: #92400e; --subject-blue-bg: #dbeafe; --subject-blue-text: #1e40af; --subject-default-bg: #f3f4f6; --subject-default-text: #374151;`;
        
        let cardStyleCss = '';
        if (cardStyle === 'full') {
            cardStyleCss = `border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 2px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 10px rgba(255,255,255,0.2); background-image: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.02) 100%);`;
        } else if (cardStyle === 'outline') {
            cardStyleCss = `background-color: #ffffff !important; border: ${outlineWidth}px solid inherit; box-shadow: none !important;`;
        } else if (cardStyle === 'glass') {
            cardStyleCss = `background: rgba(255, 255, 255, 0.4) !important; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.02) !important;`;
        } else if (cardStyle === 'gradient') {
            cardStyleCss = `background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.05) 100%) !important; border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;`;
        } else if (cardStyle === 'minimal-left') {
            cardStyleCss = `background-color: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; position: relative !important; box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;`;
        } else if (cardStyle === 'badge') {
            cardStyleCss = `background-color: transparent !important; border: none !important; box-shadow: none !important;`;
        }

        const customStyles = `<style>:root { ${cssColors} } .cell-content { display: flex; flex-direction: column; height: 100%; width: 100%; justify-content: center; gap: 2px; box-sizing: border-box; } .period-card-img { flex: 1; width: 100%; border-radius: 8px; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; ${cardStyleCss} position: relative; height: 100%; } .period-content-spread { display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%; padding: 4px 6px; box-sizing: border-box; position: relative; z-index: 10; } .period-card-img::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 45%; background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0)); pointer-events: none; z-index: 0; } .period-subject { font-weight: 900; font-size: 1.1em; text-align: left; line-height: ${customDesign.table.lineHeight || 1.1}; margin-top: 2px; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,0.5); z-index: 1; position: relative; } .period-class { font-size: 0.9em; text-align: right; line-height: ${customDesign.table.lineHeight || 1.1}; font-weight: 700; margin-bottom: 2px; text-shadow: 0 1px 0 rgba(255,255,255,0.5); z-index: 1; position: relative; } .card-triangle { position: absolute; width: 0; height: 0; border-style: solid; ${triangleStyles} z-index: 5; } ${teacherColorNames.map(name => `.${name} { background-color: var(--${name}-bg); color: var(--${name}-text); border-color: var(--${name}-text) !important; } .${name} .period-subject, .${name} .period-class { color: var(--${name}-text) !important; } .${name} .card-triangle { color: var(--${name}-text) !important; }`).join('')} td { padding: ${customDesign.table.cellPadding}px !important; height: auto !important; min-height: 60px; border-color: ${customDesign.table.borderColor} !important; vertical-align: top !important; } table { table-layout: fixed; width: 100%; border-spacing: 0; border-color: ${customDesign.table.borderColor} !important; } .disabled-cell { background-color: #e5e7eb; }</style>`;
        const align1 = lang === 'ur' ? 'right' : 'left'; const align2 = 'center'; const align3 = lang === 'ur' ? 'left' : 'right';
        const detailsHtml = `<div style="width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;"><div style="text-align: ${align1}; flex: 1;"># ${teacher.serialNumber ?? '-'}</div><div style="text-align: ${align2}; flex: 1;">${renderText(lang, teacher.nameEn, teacher.nameUr)}</div><div style="text-align: ${align3}; flex: 1;">${workloadLabel}</div></div>`;
        const dayHeaders = chunkDays.map(day => `<th>${renderText(lang, (enT as any)[day.toLowerCase()], (urT as any)[day.toLowerCase()])}</th>`).join('');

        const grid: (null | { html: string, key: string })[][] = Array.from({ length: maxPeriods }, () => Array(chunkDays.length).fill(null));
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            chunkDays.forEach((day, dIdx) => {
                const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                if (pIdx >= periodLimit) return;
                const periods: any[] = [];
                classes.forEach(c => {
                    c.timetable[day as keyof TimetableGridData]?.[pIdx]?.forEach(p => {
                        if (p.teacherId === teacher.id) periods.push({ ...p, classNameEn: c.nameEn, classNameUr: c.nameUr });
                    });
                });
                if (periods.length === 0) return;

                const grouped = new Map<string, { subjectId: string, classId: string, jointPeriodId: string, classNames: Set<string>, firstPeriod: Period }>();
                periods.forEach(p => {
                    const groupKey = `${p.subjectId}-${p.classId}-${p.jointPeriodId || ''}`;
                    if (!grouped.has(groupKey)) grouped.set(groupKey, { subjectId: p.subjectId, classId: p.classId, jointPeriodId: p.jointPeriodId || '', classNames: new Set(), firstPeriod: p });
                    grouped.get(groupKey)!.classNames.add(renderText(lang, p.classNameEn, p.classNameUr));
                });
                const sortedGroupKeys = Array.from(grouped.keys()).sort();
                const key = sortedGroupKeys.map(k => { const g = grouped.get(k)!; return `${k}-${Array.from(g.classNames).sort().join(',')}`; }).join('|');

                const allClassNames = new Set<string>();
                const allSubjectNames = new Set<string>();
                let firstPeriod: Period | null = null;

                sortedGroupKeys.forEach(gk => {
                    const group = grouped.get(gk)!;
                    if (!firstPeriod) firstPeriod = group.firstPeriod;
                    group.classNames.forEach(n => allClassNames.add(n));
                    const sub = subjects.find(s => s.id === group.subjectId);
                    if (sub) allSubjectNames.add(renderText(lang, sub.nameEn, sub.nameUr));
                });

                const classList = Array.from(allClassNames).join(' / ');
                const subjectName = Array.from(allSubjectNames).join(' / ');
                const colorClass = firstPeriod ? getCombinationColor(firstPeriod) : 'subject-default';
                const triangleHtml = (cardStyle === 'triangle' || cardStyle === 'full') ? `<div class="card-triangle"></div>` : '';
                
                let separatorHtml = '';
                if (cardStyle === 'minimal-left') {
                    separatorHtml = `<div style="position: absolute; top: 50%; left: 15%; right: 15%; display: flex; align-items: center; justify-content: center; opacity: 0.5; transform: translateY(-50%); pointer-events: none;"><div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div><div style="height: 2px; flex-grow: 1; border-radius: 99px; background-color: currentColor; margin: 0 8px;"></div><div style="width: 6px; height: 6px; border-radius: 50%; background-color: currentColor; flex-shrink: 0;"></div></div>`;
                }
                
                let subjectBadgeStyle = '';
                if (cardStyle === 'badge') {
                    subjectBadgeStyle = `background-color: var(--${colorClass}-text); color: #fff !important; padding: 4px 12px; border-radius: 999px; display: inline-block; width: fit-content; max-width: 100%; text-align: center; box-sizing: border-box; margin-bottom: 2px;`;
                }

                const cards = `<div class="period-card-img ${colorClass}">${triangleHtml}${separatorHtml}<div class="period-content-spread"><div class="period-subject" style="${subjectBadgeStyle}">${classList}</div><div class="period-class">${subjectName}</div></div></div>`;
                grid[pIdx][dIdx] = { html: `<div class="cell-content">${cards}</div>`, key };
            });
        }

        let tableRows = '';
        const visited = Array.from({ length: maxPeriods }, () => Array(chunkDays.length).fill(false));
        for (let pIdx = 0; pIdx < maxPeriods; pIdx++) {
            const startTime = schoolConfig.periodTimings?.default?.[pIdx]?.start || '';
            const showTime = customDesign.table.showPeriodTime;
            const timePos = customDesign.table.periodTimePosition || 'below';
            const periodNumFontSize = customDesign.table.periodFontSize ? `${customDesign.table.periodFontSize}px` : 'inherit';
            let periodContent = `<div style="font-size: ${periodNumFontSize};">${pIdx + 1}</div>`;
            if (showTime && startTime) {
                let rotationStyle = '';
                const rot = customDesign.table.periodTimeRotation || '0';
                if (rot === '90') rotationStyle = `writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; margin: 2px 0;`;
                else if (rot === '180') rotationStyle = `transform: rotate(180deg); display: inline-block; margin: 2px 0;`;
                else if (rot === '270') rotationStyle = `writing-mode: vertical-rl; display: inline-block; margin: 2px 0;`;
                else rotationStyle = `margin: 2px 0;`;
                
                const fontSize = customDesign.table.periodTimeFontSize ? `${customDesign.table.periodTimeFontSize}px` : '0.6em';
                const timeColor = customDesign.table.periodTimeColor || '#666666';
                const timeHtml = `<div style="font-size: ${fontSize}; font-weight: normal; color: ${timeColor}; ${rotationStyle}">${startTime}</div>`;
                const numHtml = `<div style="font-size: ${periodNumFontSize};">${pIdx + 1}</div>`;
                
                if (timePos === 'above') {
                    periodContent = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">${timeHtml}${numHtml}</div>`;
                } else if (timePos === 'left') {
                    periodContent = `<div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;">${timeHtml}${numHtml}</div>`;
                } else if (timePos === 'right') {
                    periodContent = `<div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;">${numHtml}${timeHtml}</div>`;
                } else {
                    periodContent = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">${numHtml}${timeHtml}</div>`;
                }
            }
            let rowHtml = `<td class="period-col" style="text-align: center; vertical-align: middle;">${periodContent}</td>`;
            for (let dIdx = 0; dIdx < chunkDays.length; dIdx++) {
                if (visited[pIdx][dIdx]) continue;
                const current = grid[pIdx][dIdx];
                const day = chunkDays[dIdx];
                const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
                if (pIdx >= periodLimit) {
                    rowHtml += `<td class="disabled-cell"></td>`;
                    visited[pIdx][dIdx] = true;
                    continue;
                }
                if (!current) {
                    rowHtml += `<td></td>`;
                    visited[pIdx][dIdx] = true;
                    continue;
                }

                let colspan = 1;
                if (mergePatterns) {
                    while (dIdx + colspan < chunkDays.length) {
                        const nextDay = chunkDays[dIdx + colspan];
                        const nextDayLimit = schoolConfig.daysConfig?.[nextDay]?.periodCount ?? 8;
                        if (pIdx < nextDayLimit) {
                            const next = grid[pIdx][dIdx + colspan];
                            if (next && next.key === current.key) {
                                colspan++;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }
                for (let c = 0; c < colspan; c++) visited[pIdx][dIdx + c] = true;
                rowHtml += `<td ${colspan > 1 ? `colspan="${colspan}"` : ''} >${current.html}</td>`;
            }
            tableRows += `<tr>${rowHtml}</tr>`;
        }

        const colGroupHtml = `<colgroup><col style="width: ${customDesign.table.periodColumnWidth || 50}px">${chunkDays.map(() => '<col style="width: auto">').join('')}</colgroup>`;
        const tableHtml = `${customStyles}<table>${colGroupHtml}<thead><tr><th class="period-col" colspan="1"></th>${dayHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;
        pages.push(generateReportHTML(schoolConfig, customDesign, `${tLocal('teacherTimetable')}`, lang, tableHtml, detailsHtml, i + 1, totalPages));
    }
    return pages.length === 1 ? pages[0] : pages;
};

export const generateAdjustmentsReportHtml = (
    t: any, 
    lang: DownloadLanguage, 
    design: DownloadDesignConfig, 
    adjustments: Adjustment[],
    teachers: Teacher[],
    classes: SchoolClass[],
    subjects: Subject[],
    schoolConfig: SchoolConfig,
    date: string,
    absentTeacherIds: string[] = [],
    signature?: string 
): string[] => {
    const { en: enT, ur: urT } = translations;
    const trLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];
    const dateObj = new Date(date);
    const locale = lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB';
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = dateObj.toLocaleDateString(locale, dateOptions);
    const title = `${trLocal('substitution')}`;
    const subtitle = design.header.subtitle || '';

    const sortedAdjustments = [...adjustments].sort((a, b) => { const teacherA = teachers.find(t => t.id === a.originalTeacherId)?.nameEn || ''; const teacherB = teachers.find(t => t.id === b.originalTeacherId)?.nameEn || ''; return teacherA.localeCompare(teacherB) || a.periodIndex - b.periodIndex; });
    const onLeaveTeachers = [...new Set([...sortedAdjustments.map(adj => adj.originalTeacherId), ...absentTeacherIds])].map(id => teachers.find(t => t.id === id)).filter(Boolean) as Teacher[];
    const onLeaveText = onLeaveTeachers.map(t => { const en = t.nameEn.toUpperCase(); return renderText(lang, en, t.nameUr); }).join(', ');
    const adjustmentsByTeacher = new Map<string, Adjustment[]>(); sortedAdjustments.forEach(adj => { if (!adjustmentsByTeacher.has(adj.originalTeacherId)) adjustmentsByTeacher.set(adj.originalTeacherId, []); adjustmentsByTeacher.get(adj.originalTeacherId)!.push(adj); });
    const mergedRows: { originalTeacherId: string, teacher: Teacher | undefined, periodIndex: number, classIds: string[], subjectId: string, substituteTeacherId: string, conflictDetails?: Adjustment['conflictDetails'] }[] = [];
    for (const [teacherId, teacherAdjustments] of adjustmentsByTeacher) { const teacher = teachers.find(t => t.id === teacherId); const groupMap = new Map<string, { classIds: string[], conflictDetails?: Adjustment['conflictDetails'], firstAdj: Adjustment }>(); teacherAdjustments.forEach(adj => { const key = `${adj.periodIndex}_${adj.subjectId}_${adj.substituteTeacherId}`; if (!groupMap.has(key)) groupMap.set(key, { classIds: [adj.classId], conflictDetails: adj.conflictDetails, firstAdj: adj }); else { const entry = groupMap.get(key)!; if (!entry.classIds.includes(adj.classId)) entry.classIds.push(adj.classId); if (adj.conflictDetails && !entry.conflictDetails) entry.conflictDetails = adj.conflictDetails; } }); const sortedGroups = Array.from(groupMap.values()).sort((a, b) => a.firstAdj.periodIndex - b.firstAdj.periodIndex); sortedGroups.forEach(g => { mergedRows.push({ originalTeacherId: teacherId, teacher: teacher, periodIndex: g.firstAdj.periodIndex, classIds: g.classIds, subjectId: g.firstAdj.subjectId, substituteTeacherId: g.firstAdj.substituteTeacherId, conflictDetails: g.conflictDetails }); }); }
    const rowsPerPage = design.rowsPerPage || 25; const rowsPerFirstPage = design.rowsPerFirstPage || rowsPerPage; const totalItems = mergedRows.length; let totalPages = 1; if (totalItems > rowsPerFirstPage) totalPages = 1 + Math.ceil((totalItems - rowsPerFirstPage) / rowsPerPage);
    const pages: string[] = []; let currentIndex = 0; 
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const alignMap: Record<string, string> = { 'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end', 'center': 'center' };
    const flexAlign = alignMap[customDesign.table.verticalAlign || 'middle'] || 'center';
    const customStyles = `<style> table td { padding: ${customDesign.table.cellPadding}px !important; } .adj-cell-wrapper { display: flex; flex-direction: column; justify-content: ${flexAlign}; align-items: center; width: 100%; height: 100%; min-height: 1.2em; box-sizing: border-box; line-height: 1.1; } .rowspan-wrapper { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; line-height: 1.1; } </style>`;
    const wrap = (content: string) => `<div class="adj-cell-wrapper">${content}</div>`;
    for (let i = 0; i < totalPages; i++) {
      const limit = i === 0 ? rowsPerFirstPage : rowsPerPage; const pageRows = mergedRows.slice(currentIndex, currentIndex + limit); currentIndex += limit;
      const teacherCountsOnPage = new Map<string, number>(); pageRows.forEach(r => { const tid = r.originalTeacherId; teacherCountsOnPage.set(tid, (teacherCountsOnPage.get(tid) || 0) + 1); });
      const renderedTeacherIdsOnPage = new Set<string>();
      let tableRowsHtml = '';
      pageRows.forEach(row => {
          const tid = row.originalTeacherId; const isFirst = !renderedTeacherIdsOnPage.has(tid);
          const sub = teachers.find(t => t.id === row.substituteTeacherId); const sbj = subjects.find(s => s.id === row.subjectId);
          const classNames = formatCompressedClassNames(row.classIds, classes, lang);
          tableRowsHtml += '<tr>';
          if (isFirst) {
              const span = teacherCountsOnPage.get(tid)!; const teacherName = row.teacher ? renderText(lang, row.teacher.nameEn, row.teacher.nameUr) : '';
              tableRowsHtml += `<td rowspan="${span}" style="background-color: ${customDesign.table.bodyBgColor || '#ffffff'}; position: relative; z-index: 10;"><div class="rowspan-wrapper">${teacherName}</div></td>`;
              renderedTeacherIdsOnPage.add(tid);
          }
          const conflictClassName = row.conflictDetails ? (lang === 'ur' ? row.conflictDetails.classNameUr : row.conflictDetails.classNameEn) : '';
          let teacherHtml = '';
          if (sub) {
              if (conflictClassName && lang === 'both') {
                  const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; display: inline-block; padding-top: 2px; font-weight: normal;`;
                  teacherHtml = `<div style="display:flex; flex-direction:row; align-items:center; gap:4px; justify-content:center;"><div style="display:flex; flex-direction:column; justify-content:center; align-items:center; line-height:1.1;"><span>${sub.nameEn}</span><span style="${urduStyle} font-size: 0.9em;">${sub.nameUr}</span></div><span style="color: #dc2626; font-weight: bold; white-space: nowrap;">(${conflictClassName})</span></div>`;
              } else {
                  teacherHtml = renderText(lang, sub.nameEn, sub.nameUr);
                  if (conflictClassName) teacherHtml += ` <span style="color: #dc2626; font-weight: bold;">(${conflictClassName})</span>`;
              }
          }
          tableRowsHtml += `<td>${wrap((row.periodIndex + 1).toString())}</td><td>${wrap(classNames)}</td><td>${wrap(sbj ? renderText(lang, sbj.nameEn, sbj.nameUr) : '')}</td><td>${wrap(teacherHtml)}</td><td></td></tr>`;
      });
      const teachersOnLeaveHtml = `<div style="width: 100%; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; color: #000; font-size: 0.85em;"><strong style="text-transform: uppercase;">${trLocal('absentTeachers')}:</strong> ${onLeaveText}</div>`;
      // Signature Block injection
      const signatureHtml = `<div style="margin-top: 20px; display: flex; justify-content: flex-end;"><div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; width: 200px; position: relative;">${signature ? `<img src="${signature}" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); max-height: 60px; pointer-events: none; filter: grayscale(1) contrast(150%);" />` : ''}<strong>${trLocal('signature')}</strong></div></div>`;
      const tableHtml = `${customStyles} ${teachersOnLeaveHtml}<table><thead><tr><th style="width: 10%;">${trLocal('absent')}</th><th style="width: 35px;">${trLocal('period')}</th><th>${trLocal('class')}</th><th>${trLocal('subject')}</th><th>${trLocal('substituteTeacher')}</th><th style="width: 15%;">${trLocal('signature')}</th></tr></thead><tbody>${tableRowsHtml}</tbody></table>${signatureHtml}`;
      pages.push(generateReportHTML(schoolConfig, customDesign, title, lang, tableHtml, subtitle, i + 1, totalPages, date));
    }
    return pages;
};

export const generateBasicInformationHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, classes: SchoolClass[], teachers: Teacher[], schoolConfig: SchoolConfig, selectedCategories: string[] = ['Primary', 'Middle', 'High', 'Extra Rooms']): string | string[] => {
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; font-weight: normal;`;
    const trLocal = (en: string, ur: string) => { const urSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`; if (lang === 'en') return en; if (lang === 'ur') return urSpan; return `${en} / ${urSpan}`; };
    
    const rowsPerPage = customDesign.rowsPerPage || 50;
    const rowsPerFirstPage = customDesign.rowsPerFirstPage || rowsPerPage;
    
    const includesExtraRooms = selectedCategories.includes('Extra Rooms');
    const filteredClasses = classes.filter(c => {
        if (c.isExtraRoom) return includesExtraRooms;
        const cat = c.category || '';
        return selectedCategories.includes(cat);
    });

    const standardClasses = filteredClasses.filter(c => !c.isExtraRoom);
    const extraRooms = filteredClasses.filter(c => c.isExtraRoom);
    let displayItems = [...standardClasses, ...extraRooms];

    if (includesExtraRooms) {
        displayItems.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' }));
    }

    const totalItems = displayItems.length;
    let totalPagesCount = 1;
    if (totalItems > rowsPerFirstPage) {
        totalPagesCount = 1 + Math.ceil((totalItems - rowsPerFirstPage) / rowsPerPage);
    }

    let headers: string[];
    if (includesExtraRooms) {
        headers = [trLocal('Room No', 'کمرہ نمبر'), trLocal('Class / Room', 'کلاس / کمرہ'), trLocal('In Charge', 'انچارج'), trLocal('Students', 'طلباء'), trLocal('Comments', 'تبصرے')];
    } else {
        headers = [trLocal('#', '#'), trLocal('Class / Room', 'کلاس / کمرہ'), trLocal('In Charge', 'انچارج'), trLocal('Room No', 'کمرہ نمبر'), trLocal('Students', 'طلباء'), trLocal('Comments', 'تبصرے')];
    }
    const pages: string[] = [];
    let highTotal = 0; let middleTotal = 0; let primaryTotal = 0; let grandTotal = 0;

    standardClasses.forEach(c => {
        const count = parseInt(String(c.studentCount), 10) || 0; grandTotal += count;
        const cat = (c.category || '').trim().toLowerCase(); if (cat === 'high') highTotal += count; else if (cat === 'middle') middleTotal += count; else if (cat === 'primary') primaryTotal += count;
    });

    let currentIdx = 0;
    for (let i = 0; i < totalPagesCount; i++) {
        const limit = i === 0 ? rowsPerFirstPage : rowsPerPage;
        const pageItems = displayItems.slice(currentIdx, currentIdx + limit);
        currentIdx += limit;

        let tableRows = '';
        pageItems.forEach((c, idx) => {
            const rowIdx = (i === 0) ? idx : (rowsPerFirstPage + (i - 1) * rowsPerPage + idx);
            const tea = teachers.find(t => t.id === c.inCharge); 
            const inCharge = tea ? renderText(lang, tea.nameEn, tea.nameUr) : '-';
            const name = renderText(lang, c.nameEn, c.nameUr); 
            const serial = c.serialNumber || rowIdx + 1;
            
            if (includesExtraRooms) {
                if (c.isExtraRoom) {
                    tableRows += `<tr><td>${c.roomNumber}</td><td style="text-align: left;">${name}</td><td style="text-align: left;">-</td><td>-</td><td class="comments-col" style="text-align: left;">${c.comments || ''}</td></tr>`;
                } else {
                    const count = parseInt(String(c.studentCount), 10) || 0;
                    tableRows += `<tr><td>${c.roomNumber}</td><td style="text-align: left;">${name}</td><td style="text-align: left;">${inCharge}</td><td>${count}</td><td class="comments-col"></td></tr>`;
                }
            } else {
                if (c.isExtraRoom) {
                    tableRows += `<tr><td>${serial}</td><td style="text-align: left;">${name}</td><td style="text-align: left;">-</td><td>${c.roomNumber}</td><td>-</td><td class="comments-col" style="text-align: left;">${c.comments || ''}</td></tr>`;
                } else {
                    const count = parseInt(String(c.studentCount), 10) || 0;
                    tableRows += `<tr><td>${serial}</td><td style="text-align: left;">${name}</td><td style="text-align: left;">${inCharge}</td><td>${c.roomNumber}</td><td>${count}</td><td class="comments-col"></td></tr>`;
                }
            }
        });

        const isLastPage = i === totalPagesCount - 1;
        let summaryTable = '';
        if (isLastPage) {
            const summaryHeaders = [trLocal('High', 'ہائی'), trLocal('Middle', 'مڈل'), trLocal('Primary', 'پرائمری'), trLocal('Grand Total', 'کل تعداد')];
            const summaryValues = [highTotal, middleTotal, primaryTotal, grandTotal];
            summaryTable = `<div style="margin-top: 20px; break-inside: avoid;"><table style="width: 100%;"><thead><tr>${summaryHeaders.map(h => `<th style="width: 25%;">${h}</th>`).join('')}</tr></thead><tbody><tr>${summaryValues.map(v => `<td style="font-weight: bold; font-size: 1.2em;">${v}</td>`).join('')}</tr></tbody></table></div>`;
        }

        let customStyles = `<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid ${customDesign?.table?.borderColor || '#000000'}; padding: ${customDesign?.table?.cellPadding || 8}px; text-align: center; line-height: 1.1; white-space: nowrap; } th { background-color: ${customDesign?.table?.headerBgColor || '#f3f4f6'}; color: ${customDesign?.table?.headerColor || '#000000'}; font-weight: bold; } tr:nth-child(even) { background-color: ${customDesign?.table?.altRowColor || '#f9fafb'}; } td.comments-col, th.comments-col { white-space: normal; width: 100%; text-align: left; }</style>`;

        const tableHtml = `${customStyles}<table><thead><tr>${headers.map((h, idx) => `<th${(includesExtraRooms && idx === 4) || (!includesExtraRooms && idx === 5) ? ' class="comments-col"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>${summaryTable}`;
        pages.push(generateReportHTML(schoolConfig, customDesign, trLocal('Basic Information', 'بنیادی معلومات'), lang, tableHtml, '', i + 1, totalPagesCount));
    }

    return pages.length === 1 ? pages[0] : pages;
};

export const generateBasicInformationExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig, classes: SchoolClass[], teachers: Teacher[], selectedCategories: string[] = ['Primary', 'Middle', 'High', 'Extra Rooms']) => {
    const { en: enT, ur: urT } = translations;
    const trLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];
    
    const includesExtraRooms = selectedCategories.includes('Extra Rooms');
    
    let header: string[];
    if (includesExtraRooms) {
        header = [trLocal('roomNumber'), 'Class / Room', trLocal('classInCharge'), trLocal('studentCount'), 'Comments'];
    } else {
        header = ['#', 'Class / Room', trLocal('classInCharge'), trLocal('roomNumber'), trLocal('studentCount'), 'Comments'];
    }
    const rows: (string | number)[][] = [header];

    let highTotal = 0; let middleTotal = 0; let primaryTotal = 0; let grandTotal = 0;

    const filteredClasses = classes.filter(c => {
        if (c.isExtraRoom) return includesExtraRooms;
        const cat = c.category || '';
        return selectedCategories.includes(cat);
    });

    const standardClasses = filteredClasses.filter(c => !c.isExtraRoom);
    const extraRooms = filteredClasses.filter(c => c.isExtraRoom);
    let displayItems = [...standardClasses, ...extraRooms];

    if (includesExtraRooms) {
        displayItems.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' }));
    }

    displayItems.forEach((c, idx) => {
        const className = lang === 'ur' ? c.nameUr : c.nameEn;
        const serial = c.serialNumber || idx + 1;

        if (includesExtraRooms) {
            if (c.isExtraRoom) {
                rows.push([c.roomNumber, className, '-', '-', c.comments || '']);
            } else {
                const count = parseInt(String(c.studentCount), 10) || 0;
                grandTotal += count;
                const cat = (c.category || '').trim().toLowerCase();
                if (cat === 'high') highTotal += count;
                else if (cat === 'middle') middleTotal += count;
                else if (cat === 'primary') primaryTotal += count;

                const tea = teachers.find(tea => tea.id === c.inCharge);
                const inCharge = tea ? (lang === 'ur' ? tea.nameUr : tea.nameEn) : '-';

                rows.push([c.roomNumber, className, inCharge, count, '']);
            }
        } else {
            if (c.isExtraRoom) {
                rows.push([serial, className, '-', c.roomNumber, '-', c.comments || '']);
            } else {
                const count = parseInt(String(c.studentCount), 10) || 0;
                grandTotal += count;
                const cat = (c.category || '').trim().toLowerCase();
                if (cat === 'high') highTotal += count;
                else if (cat === 'middle') middleTotal += count;
                else if (cat === 'primary') primaryTotal += count;

                const tea = teachers.find(tea => tea.id === c.inCharge);
                const inCharge = tea ? (lang === 'ur' ? tea.nameUr : tea.nameEn) : '-';

                rows.push([serial, className, inCharge, c.roomNumber, count, '']);
            }
        }
    });

    rows.push([]);
    rows.push([trLocal('high'), trLocal('middle'), trLocal('primary'), trLocal('grandTotal')]);
    rows.push([highTotal, middleTotal, primaryTotal, grandTotal]);

    const finalRows = addExcelHeaderFooter(rows, schoolConfig, design, trLocal('Basic Information') || 'Basic Information', lang);
    downloadCsv(finalRows.map(toCsvRow).join('\n'), 'Basic_Information.csv');
};

export const generateByPeriodExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig | undefined, schoolConfig: SchoolConfig, classes: SchoolClass[], teachers: Teacher[]) => { 
    const { en: enT, ur: urT } = translations; 
    const trLocal = (en: string, ur: string) => lang === 'ur' ? ur : en;
    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true); 
    const sortedTeachers = [...teachers].sort((a, b) => (a.serialNumber ?? 9999) - (b.serialNumber ?? 9999)); 
    
    const header = ['Pd.', ...activeDays.map(day => trLocal(day, (urT as any)[day.toLowerCase()]))];
    const rows: (string | number)[][] = [header]; 
    
    const maxPeriods = Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));
    
    for(let i=0; i<maxPeriods; i++) {
        const row: (string | number)[] = [i + 1];
        activeDays.forEach(day => {
            const count = schoolConfig.daysConfig?.[day as keyof TimetableGridData]?.periodCount ?? 8;
            if (i >= count) {
                row.push('');
            } else {
                const busyIds = new Set<string>(); 
                classes.forEach(c => c.timetable[day as keyof TimetableGridData]?.[i]?.forEach(p => busyIds.add(p.teacherId)));
                const freeTeachers = sortedTeachers.filter(t => !busyIds.has(t.id));
                const freeText = freeTeachers.map(tea => lang === 'ur' ? tea.nameUr : tea.nameEn).join(', ');
                row.push(freeText);
            }
        });
        rows.push(row);
    }
    
    const finalRows = addExcelHeaderFooter(rows, schoolConfig, design, lang === 'ur' ? 'فارغ اساتذہ' : 'Free Teachers', lang);
    downloadCsv(finalRows.map(toCsvRow).join('\n'), 'Free_Teachers_Report.csv'); 
};

export const generateWorkloadSummaryExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, selectedTeachers: Teacher[], schoolConfig: SchoolConfig, classes: SchoolClass[], adjustments: Record<string, Adjustment[]>, leaveDetails: Record<string, Record<string, LeaveDetails>> = {}, startDate?: string, endDate?: string, mode: 'weekly' | 'range' = 'weekly') => { 
    let header = ['Teacher']; 
    if (mode === 'range' && startDate && endDate) {
        header.push('Days in Range', 'Scheduled Periods', 'Missed/Left', 'Substitutions (+)', 'Net Load', 'Percentage (%)');
    } else {
        allDays.forEach(day => header.push(day.substring(0, 3))); 
        header.push('Joint', 'Subs', 'Leave', 'Total', 'Percentage (%)');
    }
    const rows: (string | number)[][] = [header]; 
    const data = selectedTeachers.map(teacher => {
        if (mode === 'range' && startDate && endDate) {
            return { teacher, stats: calculateRangeWorkload(teacher.id, startDate, endDate, classes, adjustments, leaveDetails, schoolConfig) };
        }
        return { teacher, stats: calculateWorkloadStats(teacher.id, classes, adjustments, leaveDetails, startDate, endDate, schoolConfig) };
    });
    
    if (mode === 'range' && startDate && endDate) {
        data.sort((a, b) => (b.stats.netLoad || 0) - (a.stats.netLoad || 0));
    } else {
        data.sort((a, b) => b.stats.totalWorkload - a.stats.totalWorkload);
    }
    
    let weeklyPossible = 0;
    allDays.forEach(day => {
        const config = schoolConfig.daysConfig?.[day as keyof TimetableGridData];
        if (config?.active) weeklyPossible += config.periodCount;
    });

    data.forEach(({ teacher, stats }) => { 
        const name = lang === 'ur' ? teacher.nameUr : teacher.nameEn; 
        if (mode === 'range' && startDate && endDate) {
            const currentPossible = stats.possiblePeriodsInRange || 1;
            const percentage = (((stats.netLoad || 0) / currentPossible) * 100).toFixed(1);
            rows.push([name, stats.daysInRange || 0, stats.scheduledInRange || 0, stats.rangeLeaves || 0, stats.rangeSubs || 0, stats.netLoad || 0, percentage]);
        } else {
            const row: (string | number)[] = [name]; 
            allDays.forEach(d => row.push(stats.dailyCounts[d.toLowerCase()])); 
            
            const currentPossible = weeklyPossible || 1;
            const percentage = ((stats.totalWorkload / currentPossible) * 100).toFixed(1);

            row.push(stats.jointPeriodsCount, stats.substitutionsTaken, -stats.leavesTaken, stats.totalWorkload, percentage); 
            rows.push(row); 
        }
    }); 
    
    const { en: enT, ur: urT } = translations;
    const trLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];
    const title = mode === 'range' ? trLocal('workloadSummary') : trLocal('weeklyWorkloadSummary');
    const finalRows = addExcelHeaderFooter(rows, schoolConfig, design, title, lang);
    downloadCsv(finalRows.map(toCsvRow).join('\n'), 'Workload_Summary.csv'); 
};

export const generateAdjustmentsExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig, adjustments: Adjustment[], teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], date: string) => { 
    const header = ['Absent Teacher', 'Period', 'Class', 'Subject', 'Substitute Teacher', 'Conflict']; 
    const rows: (string | number)[][] = [header]; 
    adjustments.sort((a, b) => a.periodIndex - b.periodIndex).forEach(adj => { 
        const orig = teachers.find(t => t.id === adj.originalTeacherId); 
        const sub = teachers.find(t => t.id === adj.substituteTeacherId); 
        const cls = classes.find(c => c.id === adj.classId); 
        const sbj = subjects.find(s => s.id === adj.subjectId); 
        const conflict = adj.conflictDetails ? `Busy in ${adj.conflictDetails.classNameEn}` : ''; 
        rows.push([orig?.nameEn || '', adj.periodIndex + 1, cls?.nameEn || '', sbj?.nameEn || '', sub?.nameEn || '', conflict]); 
    }); 
    const finalRows = addExcelHeaderFooter(rows, schoolConfig, design, lang === 'ur' ? 'تبدیلیاں' : 'Adjustments', lang, new Date(date).toLocaleDateString(lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    downloadCsv(finalRows.map(toCsvRow).join('\n'), `Adjustments_${date}.csv`); 
};

export const generateByPeriodHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig, classes: SchoolClass[], teachers: Teacher[]): string => {
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; font-weight: normal;`;
    const trLocal = (en: string, ur: string) => { const urSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`; if (lang === 'en') return en; if (lang === 'ur') return urSpan; return `${en} / ${urSpan}`; };
    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const sortedTeachers = [...teachers].sort((a, b) => (a.serialNumber ?? 9999) - (b.serialNumber ?? 9999));
    const headers = ['Pd.', ...activeDays.map(day => trLocal(day, translations['ur'][day.toLowerCase() as keyof typeof translations['ur']]))];
    const maxPeriods = Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));
    let tableRows = '';
    for(let i=0; i<maxPeriods; i++) {
        tableRows += `<tr><td style="font-weight: bold; width: 35px; vertical-align: middle;">${i+1}</td>`;
        activeDays.forEach(day => {
            const count = schoolConfig.daysConfig?.[day as keyof TimetableGridData]?.periodCount ?? 8;
            if (i >= count) tableRows += `<td style="background-color: ${design?.table?.headerBgColor || '#f3f4f6'}20;"></td>`;
            else {
                const busyIds = new Set<string>(); classes.forEach(c => c.timetable[day as keyof TimetableGridData]?.[i]?.forEach(p => busyIds.add(p.teacherId)));
                const freeTeachers = sortedTeachers.filter(t => !busyIds.has(t.id));
                const freeText = freeTeachers.map(tea => renderText(lang, tea.nameEn, tea.nameUr)).join(', ');
                tableRows += `<td style="text-align: left;">${freeText}</td>`;
            }
        });
        tableRows += `</tr>`;
    }
    const customStyles = `<style> table { width: 100%; border-collapse: collapse; table-layout: fixed; } th, td { border: 1px solid ${customDesign?.table?.borderColor || '#000000'}; padding: ${customDesign?.table?.cellPadding || 8}px; text-align: center; word-wrap: break-word; line-height: 1.1; } th { background-color: ${customDesign?.table?.headerBgColor || '#f3f4f6'}; color: ${customDesign?.table?.headerColor || '#000000'}; font-weight: bold; } tr:nth-child(even) { background-color: ${customDesign?.table?.altRowColor || '#f9fafb'}; } </style>`;
    const tableHtml = `${customStyles}<table><thead><tr>${headers.map((h, idx) => `<th ${idx === 0 ? 'style="width: 35px;"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>`;
    return generateReportHTML(schoolConfig, customDesign, trLocal('Available Teachers', 'دستیاب اساتذہ'), lang, tableHtml);
};

export const generateWorkloadSummaryHtml = (
    t: any, 
    lang: DownloadLanguage, 
    design: DownloadDesignConfig, 
    selectedTeachers: Teacher[], 
    schoolConfig: SchoolConfig, 
    classes: SchoolClass[], 
    adjustments: Record<string, Adjustment[]>,
    leaveDetails: Record<string, Record<string, LeaveDetails>> = {},
    startDate?: string,
    endDate?: string,
    mode: 'weekly' | 'range' = 'weekly'
): string | string[] => {
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; font-weight: normal;`;
    const trLocal = (en: string, ur: string) => { const urSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`; if (lang === 'en') return en; if (lang === 'ur') return urSpan; return `${en} / ${urSpan}`; };
    
    const rowsPerPage = customDesign.rowsPerPage || 50;
    const rowsPerFirstPage = customDesign.rowsPerFirstPage || rowsPerPage;
    const totalItems = selectedTeachers.length;
    let totalPagesCount = 1;
    if (totalItems > rowsPerFirstPage) {
        totalPagesCount = 1 + Math.ceil((totalItems - rowsPerFirstPage) / rowsPerPage);
    }

    let baseHeaders = [trLocal('Teacher', 'استاد')]; 
    const formatDate = (dateStr: string | undefined) => { if (!dateStr) return ''; const date = new Date(dateStr); const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }; if (lang === 'ur') return date.toLocaleDateString('ur-PK-u-nu-latn', options); return date.toLocaleDateString('en-GB', options); };
    const formattedStartDate = formatDate(startDate); const formattedEndDate = formatDate(endDate);
    
    let statsData: { teacher: Teacher, stats: WorkloadStats }[] = [];
    if (mode === 'range' && startDate && endDate) {
        baseHeaders.push(trLocal('Days', 'ایام'), trLocal('Scheduled', 'شیڈول'), trLocal('Missed', 'رخصت'), trLocal('Sub (+)', 'متبادل'), trLocal('Net Total', 'کل'), '%');
        statsData = selectedTeachers.map(teacher => ({ teacher, stats: calculateRangeWorkload(teacher.id, startDate, endDate, classes, adjustments, leaveDetails, schoolConfig) }));
        statsData.sort((a, b) => (b.stats.netLoad || 0) - (a.stats.netLoad || 0));
    } else {
        allDays.forEach(day => baseHeaders.push(trLocal(day.substring(0, 3), translations['ur'][day.toLowerCase() as keyof typeof translations['ur']])));
        baseHeaders.push(trLocal('Joint', 'مشترکہ'), trLocal('Subs', 'متبادل'), trLocal('Leave', 'رخصت'), trLocal('Total', 'کل'), '%');
        statsData = selectedTeachers.map(teacher => ({ teacher, stats: calculateWorkloadStats(teacher.id, classes, adjustments, leaveDetails, startDate, endDate, schoolConfig) }));
        statsData.sort((a, b) => b.stats.totalWorkload - a.stats.totalWorkload);
    }

    let weeklyPossible = 0;
    allDays.forEach(day => {
        const config = schoolConfig.daysConfig?.[day as keyof TimetableGridData];
        if (config?.active) weeklyPossible += config.periodCount;
    });

    const pages: string[] = [];
    let currentIdx = 0;
    for (let i = 0; i < totalPagesCount; i++) {
        const limit = i === 0 ? rowsPerFirstPage : rowsPerPage;
        const pageData = statsData.slice(currentIdx, currentIdx + limit);
        currentIdx += limit;

        let tableRows = '';
        pageData.forEach(({ teacher, stats }) => {
            const name = renderText(lang, teacher.nameEn, teacher.nameUr);
            let rowCells = '';
            
            const currentTotal = mode === 'range' ? (stats.netLoad || 0) : stats.totalWorkload;
            const currentPossible = mode === 'range' ? (stats.possiblePeriodsInRange || 1) : weeklyPossible;
            const percentage = ((currentTotal / (currentPossible || 1)) * 100).toFixed(1) + '%';

            if (mode === 'range' && startDate && endDate) {
                rowCells = `<td>${stats.daysInRange}</td><td>${stats.scheduledInRange}</td><td style="color: red;">-${stats.rangeLeaves}</td><td style="color: green;">+${stats.rangeSubs}</td><td style="font-weight: bold; background-color: #f3f4f6;">${stats.netLoad}</td><td style="font-weight: bold;">${percentage}</td>`;
            } else {
                rowCells = `${allDays.map(d => `<td>${stats.dailyCounts[d.toLowerCase()]}</td>`).join('')}<td>${stats.jointPeriodsCount}</td><td style="color: green;">+${stats.substitutionsTaken}</td><td style="color: red;">${stats.leavesTaken > 0 ? -stats.leavesTaken : 0}</td><td style="font-weight: bold; background-color: #f3f4f6;">${stats.totalWorkload}</td><td style="font-weight: bold;">${percentage}</td>`;
            }
            tableRows += `<tr><td style="text-align: left; font-weight: bold;">${name}</td>${rowCells}</tr>`;
        });

        const customStyles = `<style>table { width: 100%; border-collapse: collapse; font-size: ${customDesign?.table?.fontSize || 14}px; } th, td { border: 1px solid ${customDesign?.table?.borderColor || '#000000'}; padding: ${customDesign?.table?.cellPadding || 8}px; text-align: center; line-height: 1.1; } th { background-color: ${customDesign?.table?.headerBgColor || '#f3f4f6'}; color: ${customDesign?.table?.headerColor || '#000000'}; font-weight: bold; } tr:nth-child(even) { background-color: ${customDesign?.table?.altRowColor || '#f9fafb'}; }</style>`;
        const tableHtml = `${customStyles}<table><thead><tr>${baseHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>`;
        const titlePrefix = startDate && endDate ? (lang === 'ur' ? `${formattedStartDate} تا ${formattedEndDate}` : `${formattedStartDate} to ${formattedEndDate}`) : '';
        const reportTitle = `${trLocal('Workload Summary', 'ورک لوڈ کا خلاصہ')} ${titlePrefix ? `(${titlePrefix})` : ''}`;
        pages.push(generateReportHTML(schoolConfig, customDesign, reportTitle, lang, tableHtml, '', i + 1, totalPagesCount));
    }

    return pages.length === 1 ? pages[0] : pages;
};

export const generateAttendanceReportHtml = (
    t: any,
    lang: DownloadLanguage,
    design: DownloadDesignConfig,
    classes: SchoolClass[],
    teachers: Teacher[],
    schoolConfig: SchoolConfig,
    date: string,
    adjustments: Record<string, Adjustment[]>,
    leaveDetails: Record<string, Record<string, LeaveDetails>>,
    attendance: Record<string, Record<string, AttendanceData>> = {}
): string | string[] => {
    const customDesign = JSON.parse(JSON.stringify(design));
    if (lang === 'ur') {
        if (customDesign.header?.schoolName) customDesign.header.schoolName.align = 'right';
        if (customDesign.header?.title) customDesign.header.title.align = 'right';
        if (customDesign.header?.details) customDesign.header.details.align = 'right';
        if (customDesign.footer) customDesign.footer.align = 'right';
    }

    const urduStyle = `font-family: ${URDU_FONT_STACK} !important; direction: rtl; unicode-bidi: embed; line-height: 1.8; font-weight: normal;`;
    const trLocal = (en: string, ur: string) => { const urSpan = `<span class="font-urdu" style="${urduStyle}">${ur}</span>`; if (lang === 'en') return en; if (lang === 'ur') return urSpan; return `${en} / ${urSpan}`; };
    
    const visibleClasses = classes.filter(c => c.id !== 'non-teaching-duties' && !c.isExtraRoom);
    const rowsPerPage = customDesign.rowsPerPage || 50;
    const rowsPerFirstPage = customDesign.rowsPerFirstPage || rowsPerPage;
    const totalItems = visibleClasses.length;
    let totalPagesCount = 1;
    if (totalItems > rowsPerFirstPage) {
        totalPagesCount = 1 + Math.ceil((totalItems - rowsPerFirstPage) / rowsPerPage);
    }

    const dateObj = new Date(date);
    const headers = [
        trLocal('Class', 'کلاس'),
        trLocal('In Charge', 'انچارج'),
        trLocal('Total', 'کل'),
        trLocal('Absent', 'غیر حاضر'),
        trLocal('Sick', 'بیمار'),
        trLocal('Leave', 'رخصت'),
        trLocal('Present', 'حاضر'),
        '%',
        trLocal('Signature', 'دستخط')
    ];

    const stats: Record<string, { total: number, absent: number, sick: number, leave: number, present: number }> = {
        High: { total: 0, absent: 0, sick: 0, leave: 0, present: 0 },
        Middle: { total: 0, absent: 0, sick: 0, leave: 0, present: 0 },
        Primary: { total: 0, absent: 0, sick: 0, leave: 0, present: 0 },
        'Extra Rooms': { total: 0, absent: 0, sick: 0, leave: 0, present: 0 },
        GrandTotal: { total: 0, absent: 0, sick: 0, leave: 0, present: 0 }
    };

    const pages: string[] = [];
    const dayAdjustments = adjustments[date] || [];
    const dayLeaves = leaveDetails[date] || {};
    const dayAttendance = attendance[date] || {};

    let currentIdx = 0;
    for (let i = 0; i < totalPagesCount; i++) {
        const limit = i === 0 ? rowsPerFirstPage : rowsPerPage;
        const pageClasses = visibleClasses.slice(currentIdx, currentIdx + limit);
        currentIdx += limit;

        let tableRows = '';
        pageClasses.forEach(c => {
            const inChargeId = c.inCharge;
            const inCharge = teachers.find(tea => tea.id === inChargeId);
            const leave = dayLeaves[inChargeId];
            const isAbsent = leave?.leaveType === 'full' || (leave?.leaveType === 'half' && (leave.periods ? leave.periods.includes(1) : leave.startPeriod === 1));
            
            let activeInChargeName = '';
            if (isAbsent) {
                const adj = dayAdjustments.find(a => a.classId === c.id && a.periodIndex === 0);
                if (adj) {
                    const sub = teachers.find(tea => tea.id === adj.substituteTeacherId);
                    if (sub) {
                        const subTag = lang === 'ur' ? ' (متبادل)' : ' (Sub)';
                        activeInChargeName = renderText(lang, sub.nameEn + subTag, sub.nameUr + subTag);
                    }
                } else {
                    activeInChargeName = inCharge ? renderText(lang, inCharge.nameEn, inCharge.nameUr) : '-';
                }
            } else {
                activeInChargeName = inCharge ? renderText(lang, inCharge.nameEn, inCharge.nameUr) : '-';
            }

            const data = dayAttendance[c.id];
            const total = parseInt(String(c.studentCount), 10) || 0;
            const abs = data?.absent || 0;
            const sick = data?.sick || 0;
            const leaveCount = data?.leave || 0;
            const present = total > 0 ? total - (abs + sick + leaveCount) : 0;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0.0%';
            const signature = data?.signature || '';

            const cat = c.isExtraRoom ? 'Extra Rooms' : (c.category || 'Primary');
            if (stats[cat]) {
                stats[cat].total += total;
                stats[cat].absent += abs;
                stats[cat].sick += sick;
                stats[cat].leave += leaveCount;
                stats[cat].present += present;
            }
            stats.GrandTotal.total += total;
            stats.GrandTotal.absent += abs;
            stats.GrandTotal.sick += sick;
            stats.GrandTotal.leave += leaveCount;
            stats.GrandTotal.present += present;

            const sigHeight = Math.max(16, (design?.table?.fontSize || 14) * 1.5);

            tableRows += `
                <tr>
                    <td style="text-align: left; font-weight: bold;">${renderText(lang, c.nameEn, c.nameUr)}</td>
                    <td style="text-align: left; white-space: nowrap;">${activeInChargeName}</td>
                    <td style="font-weight: bold;">${total}</td>
                    <td style="color: #dc2626;">${abs}</td>
                    <td style="color: #ea580c;">${sick}</td>
                    <td style="color: #2563eb;">${leaveCount}</td>
                    <td style="background-color: #f0fdf4; font-weight: bold; color: #166534;">${present}</td>
                    <td style="font-weight: bold;">${percentage}</td>
                    <td style="padding: 0 !important; vertical-align: middle !important;">
                        <div style="height: ${sigHeight}px; width: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: visible;">
                            ${signature ? `<img src="${signature}" style="max-height: ${sigHeight + 10}px; position: absolute; top: -4px; filter: grayscale(1) contrast(200%);" />` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        const isLastPage = i === totalPagesCount - 1;
        let summaryTable = '';
        if (isLastPage) {
            const summaryHeaders = [
                trLocal('Category', 'زمرہ'),
                trLocal('Total', 'کل'),
                trLocal('Absent', 'غیر حاضر'),
                trLocal('Sick', 'بیمار'),
                trLocal('Leave', 'رخصت'),
                trLocal('Present', 'حاضر'),
                '%'
            ];
            
            const cats = ['High', 'Middle', 'Primary', 'Extra Rooms'];
            const summaryRows = cats.map(cat => {
                const s = stats[cat];
                if (!s || s.total === 0) return '';
                const p = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) + '%' : '0.0%';
                return `<tr><td style="font-weight: bold;">${trLocal(cat, cat === 'High' ? 'ہائی' : (cat === 'Middle' ? 'مڈل' : (cat === 'Primary' ? 'پرائمری' : 'اضافی کمرے')))}</td><td>${s.total}</td><td>${s.absent}</td><td>${s.sick}</td><td>${s.leave}</td><td>${s.present}</td><td>${p}</td></tr>`;
            }).join('');

            const gt = stats.GrandTotal;
            const gp = gt.total > 0 ? ((gt.present / gt.total) * 100).toFixed(1) + '%' : '0.0%';
            const grandTotalRow = `<tr style="background-color: #e5e7eb; font-weight: 900;"><td>${trLocal('Total', 'کل')}</td><td>${gt.total}</td><td>${gt.absent}</td><td>${gt.sick}</td><td>${gt.leave}</td><td>${gt.present}</td><td>${gp}</td></tr>`;

            summaryTable = `<div style="margin-top: 20px; break-inside: avoid;"><h3 style="font-size: 1.1em; font-weight: bold; margin-bottom: 5px;">${trLocal('Summary', 'خلاصہ')}</h3><table style="width: 100%;"><thead><tr>${summaryHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${summaryRows}${grandTotalRow}</tbody></table></div>`;
        }

        const customStyles = `<style>table { width: 100%; border-collapse: collapse; font-size: ${customDesign?.table?.fontSize || 14}px; } th, td { border: 1px solid ${customDesign?.table?.borderColor || '#000000'}; padding: ${customDesign?.table?.cellPadding || 8}px; text-align: center; line-height: 1.1; } th { background-color: ${customDesign?.table?.headerBgColor || '#f3f4f6'}; color: ${customDesign?.table?.headerColor || '#000000'}; font-weight: bold; } tr:nth-child(even) { background-color: ${customDesign?.table?.altRowColor || '#f9fafb'}; }</style>`;
        const tableHtml = `${customStyles}<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>${summaryTable}`;
        const reportTitle = `${trLocal('Attendance Report', 'رپورٹ حاضری')}`;
        pages.push(generateReportHTML(schoolConfig, customDesign, reportTitle, lang, tableHtml, '', i + 1, totalPagesCount, date));
    }

    return pages.length === 1 ? pages[0] : pages;
};

export const generateAttendanceReportExcel = (
    t: any,
    lang: DownloadLanguage,
    design: DownloadDesignConfig | undefined,
    schoolConfig: SchoolConfig | undefined,
    classes: SchoolClass[],
    teachers: Teacher[],
    date: string,
    adjustments: Record<string, Adjustment[]>,
    leaveDetails: Record<string, Record<string, LeaveDetails>>,
    attendance: Record<string, Record<string, AttendanceData>> = {}
) => {
    const { en: enT, ur: urT } = translations;
    // Updated tr definition to be consistent (1 argument key)
    const trLocal = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];
    
    const visibleClasses = classes.filter(c => c.id !== 'non-teaching-duties' && !c.isExtraRoom);
    const header = [trLocal('class'), trLocal('classInCharge'), trLocal('totalStudents'), trLocal('absent'), trLocal('sick'), trLocal('leave'), trLocal('present'), '%'];
    const rows: (string | number)[][] = [header];

    const dayAdjustments = adjustments[date] || [];
    const dayLeaves = leaveDetails[date] || {};
    const dayAttendance = attendance[date] || {};

    const stats: Record<string, { total: number, absent: number, sick: number, leave: number, present: number }> = {
        GrandTotal: { total: 0, absent: 0, sick: 0, leave: 0, present: 0 }
    };

    visibleClasses.forEach(c => {
        const inChargeId = c.inCharge;
        const inCharge = teachers.find(tea => tea.id === inChargeId);
        const leave = dayLeaves[inChargeId];
        const isAbsent = leave?.leaveType === 'full' || (leave?.leaveType === 'half' && (leave.periods ? leave.periods.includes(1) : leave.startPeriod === 1));
        
        let activeInChargeName = '';
        if (isAbsent) {
            const adj = dayAdjustments.find(a => a.classId === c.id && a.periodIndex === 0);
            if (adj) {
                const sub = teachers.find(tea => tea.id === adj.substituteTeacherId);
                if (sub) {
                    const subTag = lang === 'ur' ? ' (متبادل)' : ' (Sub)';
                    activeInChargeName = lang === 'ur' ? sub.nameUr + subTag : sub.nameEn + subTag;
                }
            } else {
                activeInChargeName = inCharge ? (lang === 'ur' ? inCharge.nameUr : inCharge.nameEn) : '-';
            }
        } else {
            activeInChargeName = inCharge ? (lang === 'ur' ? inCharge.nameUr : inCharge.nameEn) : '-';
        }

        const data = dayAttendance[c.id];
        const total = parseInt(String(c.studentCount), 10) || 0;
        const abs = data?.absent || 0;
        const sick = data?.sick || 0;
        const leaveCount = data?.leave || 0;
        const present = total > 0 ? total - (abs + sick + leaveCount) : 0;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0.0%';

        stats.GrandTotal.total += total;
        stats.GrandTotal.absent += abs;
        stats.GrandTotal.sick += sick;
        stats.GrandTotal.leave += leaveCount;
        stats.GrandTotal.present += present;

        rows.push([lang === 'ur' ? c.nameUr : c.nameEn, activeInChargeName, total, abs, sick, leaveCount, present, percentage]);
    });

    const gt = stats.GrandTotal;
    const gp = gt.total > 0 ? ((gt.present / gt.total) * 100).toFixed(1) + '%' : '0.0%';
    
    rows.push([]);
    rows.push([trLocal('grandTotal'), '', gt.total, gt.absent, gt.sick, gt.leave, gt.present, gp]);

    let finalRows = rows;
    if (schoolConfig && design) {
        finalRows = addExcelHeaderFooter(rows, schoolConfig, design, trLocal('Attendance Report') || 'Attendance Report', lang, new Date(date).toLocaleDateString(lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    }

    downloadCsv(finalRows.map(toCsvRow).join('\n'), `Attendance_Report_${date}.csv`);
};

export const generateTeachersTimetableSummaryHtml = (
    session: TimetableSession,
    schoolConfig: SchoolConfig,
    language: string,
    summaryType: 'allDays' | 'byDays',
    selectedDays: string[],
    design: DownloadDesignConfig
): string | string[] => {
    const isUrdu = language === 'ur';
    const title = "Summary Timetable Of Teachers";

    const allDaysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
    let activeDays = allDaysList.filter(day => schoolConfig.daysConfig?.[day]?.active);
    
    if (summaryType === 'byDays') {
        activeDays = activeDays.filter(day => selectedDays.includes(day));
    }

    const dayPeriods: { day: string, maxPeriods: number }[] = activeDays.map(day => {
        return {
            day,
            maxPeriods: schoolConfig.daysConfig?.[day]?.periodCount || 8
        };
    });

    const tableStyles = `width: 100%; border-collapse: collapse; table-layout: fixed; font-family: ${design.table.fontFamily}; font-size: ${design.table.fontSize}px; line-height: ${design.table.lineHeight};`;
    const thStyles = `border: ${design.table.borderWidth}px ${design.table.gridStyle} ${design.table.borderColor}; padding: ${design.table.cellPadding}px; text-align: center; background-color: ${design.table.headerBgColor}; color: ${design.table.headerColor}; font-size: ${design.table.headerFontSize}px; font-weight: bold;`;
    const tdStyles = `border: ${design.table.borderWidth}px ${design.table.gridStyle} ${design.table.borderColor}; padding: ${design.table.cellPadding}px; text-align: center; color: ${design.table.bodyColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
    const teacherColStyles = `width: ${design.table.periodColumnWidth * 2}px; text-align: left; padding-left: 5px; font-weight: bold;`;

    const rowsPerPage = design.rowsPerPage || (summaryType === 'allDays' ? 25 : 40);
    const rowsPerFirstPage = design.rowsPerFirstPage || rowsPerPage;
    const totalItems = session.teachers.length;
    let totalPagesCount = 1;
    if (totalItems > rowsPerFirstPage) {
        totalPagesCount = 1 + Math.ceil((totalItems - rowsPerFirstPage) / rowsPerPage);
    }

    const pages: string[] = [];

    if (summaryType === 'allDays') {
        let currentIdx = 0;
        for (let i = 0; i < totalPagesCount; i++) {
            const limit = i === 0 ? rowsPerFirstPage : rowsPerPage;
            const pageTeachers = session.teachers.slice(currentIdx, currentIdx + limit);
            currentIdx += limit;

            let tableHtml = `<table style="${tableStyles}">
                <thead>
                    <tr>
                        <th rowspan="2" style="${thStyles} ${teacherColStyles}">Teacher</th>
                        ${dayPeriods.map(dp => `<th colspan="${dp.maxPeriods}" style="${thStyles}">${dp.day}</th>`).join('')}
                    </tr>
                    <tr>
                        ${dayPeriods.map(dp => {
                            let periodsHtml = '';
                            for (let p = 1; p <= dp.maxPeriods; p++) {
                                periodsHtml += `<th style="${thStyles}">${p}</th>`;
                            }
                            return periodsHtml;
                        }).join('')}
                    </tr>
                </thead>
                <tbody>
            `;

            pageTeachers.forEach((teacher, index) => {
                const rowBg = index % 2 === 0 ? 'transparent' : (design.table.altRowColor || 'transparent');
                tableHtml += `<tr style="background-color: ${rowBg}"><td style="${tdStyles} ${teacherColStyles}">${isUrdu ? teacher.nameUr || teacher.nameEn : teacher.nameEn}</td>`;
                
                dayPeriods.forEach(dp => {
                    for (let periodIndex = 0; periodIndex < dp.maxPeriods; periodIndex++) {
                        let assignedClass = '';
                        for (const cls of session.classes) {
                            const dayData = cls.timetable[dp.day as keyof TimetableGridData];
                            if (dayData && dayData[periodIndex]) {
                                const slot = dayData[periodIndex];
                                if (slot.some(p => p.teacherId === teacher.id)) {
                                    assignedClass = isUrdu ? cls.nameUr || cls.nameEn : cls.nameEn;
                                    break;
                                }
                            }
                        }
                        tableHtml += `<td style="${tdStyles}">${assignedClass}</td>`;
                    }
                });
                tableHtml += `</tr>`;
            });

            tableHtml += `
                </tbody>
            </table>`;

            pages.push(generateReportHTML(schoolConfig, design, title, language, tableHtml, '', i + 1, totalPagesCount));
        }
    } else {
        dayPeriods.forEach((dp) => {
            let currentIdx = 0;
            for (let i = 0; i < totalPagesCount; i++) {
                const limit = i === 0 ? rowsPerFirstPage : rowsPerPage;
                const pageTeachers = session.teachers.slice(currentIdx, currentIdx + limit);
                currentIdx += limit;

                let tableHtml = `<table style="${tableStyles}">
                    <thead>
                        <tr>
                            <th style="${thStyles} ${teacherColStyles}">Teacher</th>
                            ${Array.from({length: dp.maxPeriods}, (_, p) => `<th style="${thStyles}">Period ${p + 1}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                `;

                pageTeachers.forEach((teacher, index) => {
                    const rowBg = index % 2 === 0 ? 'transparent' : (design.table.altRowColor || 'transparent');
                    tableHtml += `<tr style="background-color: ${rowBg}"><td style="${tdStyles} ${teacherColStyles}">${isUrdu ? teacher.nameUr || teacher.nameEn : teacher.nameEn}</td>`;
                    for (let periodIndex = 0; periodIndex < dp.maxPeriods; periodIndex++) {
                        let assignedClass = '';
                        for (const cls of session.classes) {
                            const dayData = cls.timetable[dp.day as keyof TimetableGridData];
                            if (dayData && dayData[periodIndex]) {
                                const slot = dayData[periodIndex];
                                if (slot.some(p => p.teacherId === teacher.id)) {
                                    assignedClass = isUrdu ? cls.nameUr || cls.nameEn : cls.nameEn;
                                    break;
                                }
                            }
                        }
                        tableHtml += `<td style="${tdStyles}">${assignedClass}</td>`;
                    }
                    tableHtml += `</tr>`;
                });

                tableHtml += `
                    </tbody>
                </table>`;

                pages.push(generateReportHTML(schoolConfig, design, title, language, tableHtml, dp.day, i + 1, totalPagesCount));
            }
        });
    }

    return pages.length === 1 ? pages[0] : pages;
};
