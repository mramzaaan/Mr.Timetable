
import type { SchoolClass, Adjustment, TimetableGridData, DownloadLanguage, DownloadDesignConfig, Teacher, SchoolConfig, Subject, PeriodTime, Break } from '../types';
import { translations } from '../i18n';
import { allDays } from '../types';

const daysOfWeek = allDays; // Use consistent days

export interface WorkloadStats {
  dailyCounts: { [key: string]: number };
  weeklyPeriods: number;
  jointPeriodsCount: number;
  substitutionsTaken: number;
  leavesTaken: number;
  totalWorkload: number;
}

const renderText = (lang: DownloadLanguage, en: string, ur: string) => {
    if (lang === 'en') return en;
    if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
    return `${en} / <span class="font-urdu">${ur}</span>`;
};

const toUrduDigits = (str: string | number) => {
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

export const getPrintStyles = (design: DownloadDesignConfig) => {
    const { page, table, header, footer } = design;
    const width = page.orientation === 'portrait' ? (page.size === 'legal' ? '816px' : '794px') : (page.size === 'legal' ? '1344px' : '1123px');
    const height = page.orientation === 'portrait' ? (page.size === 'legal' ? '1344px' : '1123px') : (page.size === 'legal' ? '816px' : '794px');

    return `
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Amiri:wght@400;700&family=Gulzar&family=Lato:wght@400;700&family=Merriweather:wght@400;700;900&family=Montserrat:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&family=Lateef&family=Times+New+Roman&family=Scheherazade+New:wght@400;700&family=Reem+Kufi:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap');
    
    @font-face {
        font-family: 'Jameel Noori Nastaleeq';
        src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Regular');
    }
    @font-face {
        font-family: 'Jameel Noori Nastaleeq Kasheeda';
        src: local('Jameel Noori Nastaleeq Kasheeda');
    }

    .print-container {
      font-family: '${table.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif;
      background-color: white;
      color: inherit;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    
    /* Explicitly apply font to table elements and .font-urdu to ensure selection sticks */
    .print-container table, 
    .print-container th, 
    .print-container td, 
    .print-container .font-urdu { 
        font-family: '${table.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif !important;
    }

    .print-container .font-urdu {
        line-height: 1.6;
    }
    
    /* Page dimensions */
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
    
    /* Header Styles */
    .header-container { 
        display: flex; 
        align-items: center; 
        gap: 15px; 
        margin-bottom: 10px; 
        padding-bottom: 5px;
        border-bottom: ${header.divider ? '2px solid #000' : 'none'};
        background-color: ${header.bgColor};
        flex-shrink: 0;
    }
    .header-logo { object-fit: contain; }
    .header-text { flex-grow: 1; }
    .header-school-name { margin: 0; line-height: 1.2; text-transform: uppercase; }
    .header-title { margin-top: 2px; }
    .header-details { margin-top: 2px; display: flex; justify-content: space-between; }

    .main-content { flex-grow: 1; display: flex; flex-direction: column; font-size: ${table.fontSize}px; overflow: hidden; }

    /* Footer Styles */
    .footer { 
        margin-top: auto; 
        padding-top: 5px; 
        border-top: 1px solid #000; 
        display: flex; 
        align-items: flex-end; 
        font-family: '${footer.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif;
        font-size: ${footer.fontSize}px; 
        color: ${footer.color};
        flex-shrink: 0;
    }
    
    /* Table Styles */
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; border: ${table.borderWidth || 1}px ${table.gridStyle || 'solid'} ${table.borderColor}; }
    th, td { 
        border: ${table.borderWidth || 1}px ${table.gridStyle || 'solid'} ${table.borderColor}; 
        padding: ${table.cellPadding}px; 
        vertical-align: middle; 
        text-align: center; 
        font-size: ${table.fontSize}px;
        color: ${table.bodyColor || '#000000'};
    }
    th { 
        background-color: ${table.headerBgColor}; 
        color: ${table.headerColor};
        font-weight: bold; 
    }
    tr:nth-child(even) { background-color: ${table.altRowColor}; }
    .period-col {
        width: ${table.periodColumnWidth}px;
        background-color: ${table.periodColumnBgColor};
        color: ${table.periodColumnColor};
        font-weight: bold;
        font-size: 1.2em;
        font-family: 'Times New Roman', sans-serif !important; /* Force English Numbers Font */
    }
    `;
};

export const generateReportHTML = (
    schoolConfig: SchoolConfig,
    design: DownloadDesignConfig,
    title: string,
    lang: DownloadLanguage,
    contentHtml: string,
    detailsHtml: string = '',
    pageNumber: number = 1,
    totalPages: number = 1
) => {
    const { header, footer } = design;
    
    // Header Logic
    const flexDirection = header.logoPosition === 'center' ? 'column' : (header.logoPosition === 'right' ? 'row-reverse' : 'row');
    const textAlign = header.schoolName.align || 'left';
    const centerAlignStyle = header.logoPosition === 'center' ? 'text-align: center;' : '';

    const logoImg = (schoolConfig.schoolLogoBase64 && header.showLogo)
        ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Logo" class="header-logo" style="height: ${header.logoSize}px; width: ${header.logoSize}px;" />` 
        : '';
    
    const schoolNameText = lang === 'ur' ? `<span class="font-urdu">${schoolConfig.schoolNameUr}</span>` : schoolConfig.schoolNameEn;
    
    // Use !important to ensure settings override any defaults
    const headerHtml = `
        <header class="header-container" style="flex-direction: ${flexDirection}; ${centerAlignStyle}">
            ${logoImg}
            <div class="header-text" style="text-align: ${textAlign};">
                <h1 class="header-school-name" style="font-family: '${header.schoolName.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif; font-size: ${header.schoolName.fontSize}px; font-weight: ${header.schoolName.fontWeight}; color: ${header.schoolName.color} !important;">${schoolNameText}</h1>
                ${header.showTitle ? `<div class="header-title" style="font-family: '${header.title.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif; font-size: ${header.title.fontSize}px; font-weight: ${header.title.fontWeight}; color: ${header.title.color} !important;">${title}</div>` : ''}
                ${detailsHtml ? `<div class="header-details" style="font-family: '${header.details.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif; font-size: ${header.details.fontSize}px; font-weight: ${header.details.fontWeight}; color: ${header.details.color} !important;">${detailsHtml}</div>` : ''}
            </div>
        </header>
    `;

    // Footer Logic - Standardized Layout (Name Left, Page Right)
    const pageStr = lang === 'ur' ? `صفحہ ${toUrduDigits(pageNumber)} از ${toUrduDigits(totalPages)}` : `Page ${pageNumber} of ${totalPages}`;
    
    // Ensure correct footer name in documents, even if setting is generic default
    const appName = (footer.text === 'Mr. Timetable' || footer.text === 'Mr. 🇵🇰') ? 'Mr. 🇵🇰' : footer.text;

    const footerHtml = footer.show 
        ? `<footer class="footer" style="justify-content: space-between; color: ${footer.color} !important; direction: ltr; display: flex;">
            <div style="text-align: left;">${appName}</div>
            ${footer.includePageNumber ? `<div style="text-align: right;">${pageStr}</div>` : ''}
           </footer>` 
        : '';

    const watermarkHtml = (schoolConfig.schoolLogoBase64 && design.page.watermarkOpacity > 0)
        ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : '';

    return `
        <div class="print-container">
            <style>${getPrintStyles(design)}</style>
            <div class="page" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
                ${watermarkHtml}
                <div class="content-wrapper">
                    ${headerHtml}
                    <main class="main-content">${contentHtml}</main>
                    ${footerHtml}
                </div>
            </div>
        </div>
    `;
};

// --- Report Generators ---

export const generateSchoolTimingsHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig): string => {
    const isUrdu = lang === 'ur';
    const tr = (en: string, ur: string) => isUrdu ? `<span class="font-urdu">${ur}</span>` : en;
    // Force English Numbers for Periods
    const num = (n: string | number) => n.toString();
    
    const timeStr = (t: PeriodTime) => {
        if (!t.start || !t.end) return '';
        return `${t.start} - ${t.end}`; 
    };

    const getDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const d1 = new Date(2000, 0, 1, h1, m1);
        const d2 = new Date(2000, 0, 1, h2, m2);
        return Math.round((d2.getTime() - d1.getTime()) / 60000);
    };

    const getScheduleItems = (type: 'default' | 'friday') => {
        const periods = schoolConfig.periodTimings[type];
        const breaks = schoolConfig.breaks[type];
        const assembly = schoolConfig.assembly[type];
        
        const items: { type: 'assembly'|'period'|'break', name: string, time: string, duration: number, sortIndex: number }[] = [];
        
        if (assembly) {
            items.push({ type: 'assembly', name: tr('Assembly', 'اسمبلی'), time: timeStr(assembly), duration: getDuration(assembly.start, assembly.end), sortIndex: 0 });
        }
        
        periods.forEach((p, i) => {
            if (p.start && p.end) {
                items.push({ type: 'period', name: num(i + 1), time: timeStr(p), duration: getDuration(p.start, p.end), sortIndex: (i + 1) * 2 });
            }
        });
        
        breaks.forEach(b => {
            let name = b.name;
            if (b.name === 'Recess') name = tr('Recess', 'تفریح');
            else if (b.name === 'Lunch') name = tr('Lunch', 'کھانے کا وقفہ');
            else if (b.name === 'Jummah') name = tr('Jummah', 'جمعہ');
            else name = tr(b.name, b.name);

            items.push({ 
                type: 'break', 
                name: name, 
                time: `${b.startTime} - ${b.endTime}`, 
                duration: getDuration(b.startTime, b.endTime),
                sortIndex: (b.beforePeriod * 2) - 1 
            });
        });
        
        return items.sort((a, b) => a.sortIndex - b.sortIndex);
    };

    const regItems = getScheduleItems('default');
    const friItems = getScheduleItems('friday');

    const colA_Items = regItems;
    const colB_Items = friItems;
    const colA_Title = tr('Regular Days', 'عام ایام');
    const colB_Title = tr('Jummah Mubarak', 'جمعہ المبارک');

    const durationAlign = isUrdu ? 'left' : 'right';
    const periodNameFontSize = '1.6em'; 
    const specialNameFontSize = '1.1em'; 
    const durationFontSize = '0.7em'; 
    const timeFontSize = '1.6em';

    const maxRows = Math.max(colA_Items.length, colB_Items.length);
    let tableRows = '';
    let colBMergeStarted = false;

    const signatureText = tr('Principal Signature', 'دستخط پرنسپل');

    for (let i = 0; i < maxRows; i++) {
        const itemA = colA_Items[i];
        const itemB = colB_Items[i];

        let rowHtml = '';

        if (itemA) {
            const isPeriod = itemA.type === 'period';
            const bgClass = isPeriod ? 'bg-white' : 'bg-green';
            const textClass = 'text-black';
            const nameFontSize = isPeriod ? periodNameFontSize : specialNameFontSize;
            const fontFamily = isPeriod ? "font-family: 'Times New Roman', sans-serif;" : "";
            
            rowHtml += `
                <td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${nameFontSize}; ${fontFamily}">${itemA.name}</td>
                <td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${timeFontSize};">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; line-height: 1.2;">
                        <div style="unicode-bidi: embed;">${itemA.time}</div>
                        ${itemA.duration > 0 ? `<div style="font-size: ${durationFontSize}; width: 100%; text-align: ${durationAlign}; font-weight: normal; margin-top: 2px;">${itemA.duration} min</div>` : ''}
                    </div>
                </td>
            `;
        } else {
            rowHtml += '<td></td><td></td>';
        }

        if (itemB) {
            const isPeriod = itemB.type === 'period';
            const bgClass = isPeriod ? 'bg-white' : 'bg-green';
            const textClass = 'text-black';
            const nameFontSize = isPeriod ? periodNameFontSize : specialNameFontSize;
            const fontFamily = isPeriod ? "font-family: 'Times New Roman', sans-serif;" : "";
            
            rowHtml += `
                <td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${nameFontSize}; ${fontFamily}">${itemB.name}</td>
                <td class="${bgClass} ${textClass}" style="font-weight: bold; font-size: ${timeFontSize};">
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; line-height: 1.2;">
                        <div style="unicode-bidi: embed;">${itemB.time}</div>
                        ${itemB.duration > 0 ? `<div style="font-size: ${durationFontSize}; width: 100%; text-align: ${durationAlign}; font-weight: normal; margin-top: 2px;">${itemB.duration} min</div>` : ''}
                    </div>
                </td>
            `;
        } else {
            if (!colBMergeStarted) {
                const rowSpan = maxRows - i;
                rowHtml += `<td colspan="2" rowspan="${rowSpan}" style="border: 1px solid ${design.table.borderColor}; vertical-align: bottom; text-align: left; padding-bottom: 5px; padding-left: 10px;">
                    <div style="display: inline-block; border-top: 1px solid ${design.table.borderColor}; padding-top: 5px; min-width: 180px; font-size: 1.1em; font-weight: bold; text-align: center; margin-bottom: 5px;">
                        ${signatureText}
                    </div>
                </td>`;
                colBMergeStarted = true;
            }
        }

        tableRows += `<tr>${rowHtml}</tr>`;
    }

    const customStyles = `
        <style>
            .school-timings-table {
                width: 100%;
                border-collapse: collapse;
                font-family: '${design.table.fontFamily}', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif;
                text-align: center;
                font-size: ${design.table.fontSize}px; 
            }
            .school-timings-table th, .school-timings-table td {
                border: 1px solid ${design.table.borderColor};
                padding: ${design.table.cellPadding}px;
                color: ${design.table.bodyColor || '#000000'};
            }
            .main-header {
                background-color: ${design.table.headerBgColor}; 
                color: ${design.table.headerColor} !important;
                font-size: 1.4em;
                padding: 12px;
            }
            .sub-header {
                background-color: ${design.table.bodyBgColor};
                color: ${design.table.bodyColor || '#000000'};
                font-weight: bold;
                font-size: 1.3em;
            }
            .bg-green { background-color: ${design.table.periodColumnBgColor !== '#F3F4F6' ? design.table.periodColumnBgColor : '#86efac'}; } 
            .bg-white { background-color: ${design.table.bodyBgColor}; }
            .text-black { color: ${design.table.bodyColor || '#000000'}; }
        </style>
    `;

    const subHeaderRow = `
        <tr>
            <th class="sub-header" style="width: 12%">${tr('Period', 'پیریڈ')}</th>
            <th class="sub-header" style="width: 38%">${tr('Time', 'وقت')}</th>
            <th class="sub-header" style="width: 12%">${tr('Period', 'پیریڈ')}</th>
            <th class="sub-header" style="width: 38%">${tr('Time', 'وقت')}</th>
        </tr>
    `;

    const tableHtml = `
        ${customStyles}
        <table class="school-timings-table">
            <thead>
                <tr>
                    <th colspan="2" class="main-header">${colA_Title}</th>
                    <th colspan="2" class="main-header">${colB_Title}</th>
                </tr>
                ${subHeaderRow}
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

    return generateReportHTML(schoolConfig, design, 'School Timings', lang, tableHtml);
};

export const generateClassTimetableHtml = (classItem: SchoolClass, lang: DownloadLanguage, design: DownloadDesignConfig, teachers: Teacher[], subjects: Subject[], schoolConfig: SchoolConfig): string => {
    const { en: enT, ur: urT } = translations;
    const inChargeTeacher = teachers.find(t => t.id === classItem.inCharge);
    
    const t = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key]; 

    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const maxPeriods = Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));

    const subjectColorNames = [
        'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
        'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
        'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
        'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
    ];
    const colorMap = new Map<string, string>();
    subjects.forEach((s, i) => colorMap.set(s.id, subjectColorNames[i % subjectColorNames.length]));

    const cssColors = `
        --subject-red-bg: #fee2e2; --subject-red-text: #991b1b;
        --subject-sky-bg: #e0f2fe; --subject-sky-text: #0369a1;
        --subject-green-bg: #dcfce7; --subject-green-text: #166534;
        --subject-yellow-bg: #fef9c3; --subject-yellow-text: #854d0e;
        --subject-purple-bg: #f3e8ff; --subject-purple-text: #6b21a8;
        --subject-pink-bg: #fce7f3; --subject-pink-text: #9d174d;
        --subject-indigo-bg: #e0e7ff; --subject-indigo-text: #3730a3;
        --subject-teal-bg: #ccfbf1; --subject-teal-text: #134e4a;
        --subject-orange-bg: #ffedd5; --subject-orange-text: #9a3412;
        --subject-lime-bg: #ecfccb; --subject-lime-text: #4d7c0f;
        --subject-cyan-bg: #cffafe; --subject-cyan-text: #0e7490;
        --subject-emerald-bg: #d1fae5; --subject-emerald-text: #065f46;
        --subject-fuchsia-bg: #fae8ff; --subject-fuchsia-text: #86198f;
        --subject-rose-bg: #ffe4e6; --subject-rose-text: #9f1239;
        --subject-amber-bg: #fef3c7; --subject-amber-text: #92400e;
        --subject-blue-bg: #dbeafe; --subject-blue-text: #1e40af;
        --subject-default-bg: #f3f4f6; --subject-default-text: #374151;
    `;

    const customStyles = `
        <style>
            :root { ${cssColors} }
            .cell-wrapper {
                display: flex;
                flex-direction: row;
                gap: 2px;
                width: 100%;
                height: 100%;
            }
            .glossy-box {
                flex: 1;
                min-width: 0;
                border-radius: 4px;
                padding: 2px 4px;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                background-image: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%);
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                border: 1px solid rgba(0,0,0,0.08);
                position: relative;
                overflow: hidden;
            }
            .subject-text {
                text-align: left;
                font-weight: 900;
                font-size: 1.2em;
                line-height: 1;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #000000;
            }
            .teacher-text {
                text-align: right;
                font-size: 1em;
                font-weight: 700;
                opacity: 1;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #000000;
            }
            ${subjectColorNames.map(name => `.${name} { background-color: var(--${name}-bg); }`).join('')}
            td { padding: ${design.table.cellPadding}px !important; height: 62px; vertical-align: top; border-color: ${design.table.borderColor} !important; }
            table { table-layout: fixed; width: 100%; border-color: ${design.table.borderColor} !important; }
            .disabled-cell { background-color: #e5e7eb; }
        </style>
    `;

    const detailsHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;">
            <div style="text-align: left; flex: 1;">${renderText(lang, classItem.nameEn, classItem.nameUr)}</div>
            <div style="text-align: center; flex: 1;">${inChargeTeacher ? renderText(lang, inChargeTeacher.nameEn, inChargeTeacher.nameUr) : '-'}</div>
            <div style="text-align: right; flex: 1;">${classItem.roomNumber}</div>
        </div>
    `;

    // Force English Numerals for Periods by using (i+1).toString() instead of toUrduDigits
    const periodLabels = Array.from({length: maxPeriods}, (_, i) => (i + 1).toString());
    
    const colGroupHtml = `<colgroup><col style="width: ${design.table.periodColumnWidth}px"><col style="width: auto"><col style="width: auto"><col style="width: auto"><col style="width: auto"><col style="width: auto"></colgroup>`;

    const dayHeaders = activeDays.map(day => {
        const dayKey = day.toLowerCase();
        return `<th>${renderText(lang, (enT as any)[dayKey], (urT as any)[dayKey])}</th>`;
    }).join('');

    const tableRows = periodLabels.map((label, periodIndex) => {
      const cells = activeDays.map(day => {
        const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
        if (periodIndex >= periodLimit) {
            return `<td class="disabled-cell"></td>`;
        }

        const periods = classItem.timetable[day as keyof TimetableGridData]?.[periodIndex] || [];
        if (periods.length === 0) return `<td></td>`;

        const content = periods.map(p => {
            const sub = subjects.find(s => s.id === p.subjectId);
            const tea = teachers.find(t => t.id === p.teacherId);
            const subName = sub ? renderText(lang, sub.nameEn, sub.nameUr) : '';
            const teaName = tea ? renderText(lang, tea.nameEn, tea.nameUr) : '';
            const colorClass = colorMap.get(p.subjectId) || 'subject-default';
            
            return `
                <div class="glossy-box ${colorClass}">
                    <span class="subject-text" title="${subName.replace(/<[^>]*>/g, '')}">${subName}</span>
                    <span class="teacher-text" title="${teaName.replace(/<[^>]*>/g, '')}">${teaName}</span>
                </div>
            `;
        }).join(''); 

        return `<td><div class="cell-wrapper">${content}</div></td>`;
      }).join('');
      return `<tr><td class="period-col">${label}</td>${cells}</tr>`;
    }).join('');

    const tableHtml = `${customStyles}<table>${colGroupHtml}<thead><tr><th class="period-col"></th>${dayHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;

    return generateReportHTML(schoolConfig, design, `${t('classTimetable')}`, lang, tableHtml, detailsHtml);
};

export const generateTeacherTimetableHtml = (teacher: Teacher, lang: DownloadLanguage, design: DownloadDesignConfig, classes: SchoolClass[], subjects: Subject[], schoolConfig: SchoolConfig, adjustments: Record<string, Adjustment[]>): string => {
    const { en: enT, ur: urT } = translations;
    const t = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];

    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const maxPeriods = Math.max(...activeDays.map(day => schoolConfig.daysConfig?.[day]?.periodCount ?? 8));

    const stats = calculateWorkloadStats(teacher.id, classes, adjustments);
    const workloadLabel = `${stats.weeklyPeriods} ${stats.weeklyPeriods === 1 ? t('period') : t('periods')}`;

    const subjectColorNames = [
        'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
        'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
        'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
        'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
    ];
    const colorMap = new Map<string, string>();
    subjects.forEach((s, i) => colorMap.set(s.id, subjectColorNames[i % subjectColorNames.length]));

    const cssColors = `
        --subject-red-bg: #fee2e2; --subject-red-text: #991b1b;
        --subject-sky-bg: #e0f2fe; --subject-sky-text: #0369a1;
        --subject-green-bg: #dcfce7; --subject-green-text: #166534;
        --subject-yellow-bg: #fef9c3; --subject-yellow-text: #854d0e;
        --subject-purple-bg: #f3e8ff; --subject-purple-text: #6b21a8;
        --subject-pink-bg: #fce7f3; --subject-pink-text: #9d174d;
        --subject-indigo-bg: #e0e7ff; --subject-indigo-text: #3730a3;
        --subject-teal-bg: #ccfbf1; --subject-teal-text: #134e4a;
        --subject-orange-bg: #ffedd5; --subject-orange-text: #9a3412;
        --subject-lime-bg: #ecfccb; --subject-lime-text: #4d7c0f;
        --subject-cyan-bg: #cffafe; --subject-cyan-text: #0e7490;
        --subject-emerald-bg: #d1fae5; --subject-emerald-text: #065f46;
        --subject-fuchsia-bg: #fae8ff; --subject-fuchsia-text: #86198f;
        --subject-rose-bg: #ffe4e6; --subject-rose-text: #9f1239;
        --subject-amber-bg: #fef3c7; --subject-amber-text: #92400e;
        --subject-blue-bg: #dbeafe; --subject-blue-text: #1e40af;
        --subject-default-bg: #f3f4f6; --subject-default-text: #374151;
    `;

    const customStyles = `
        <style>
            :root { ${cssColors} }
            .cell-content {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                justify-content: center;
                gap: 2px;
            }
            .teacher-card {
                flex: 1;
                width: 100%;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.6);
                box-shadow: 0 2px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 10px rgba(255,255,255,0.2);
                background-image: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.02) 100%);
                padding: 4px 6px;
                position: relative;
            }
            .teacher-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 45%;
                background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0));
                pointer-events: none;
                z-index: 0;
            }
            .subject-name {
                font-weight: 900;
                font-size: 1.2em;
                text-align: left;
                line-height: 1;
                margin-top: 2px;
                text-transform: uppercase;
                color: #000000;
                text-shadow: 0 1px 0 rgba(255,255,255,0.5);
                z-index: 1;
                position: relative;
            }
            .class-list {
                font-size: 1.0em;
                text-align: right;
                line-height: 1;
                font-weight: 700;
                margin-bottom: 2px;
                color: #000000;
                text-shadow: 0 1px 0 rgba(255,255,255,0.5);
                z-index: 1;
                position: relative;
            }
            ${subjectColorNames.map(name => `.${name} { background-color: var(--${name}-bg); }`).join('')}
            td { padding: ${design.table.cellPadding}px !important; height: 60px; vertical-align: top; border-color: ${design.table.borderColor} !important; }
            table { table-layout: fixed; width: 100%; border-spacing: 0; border-color: ${design.table.borderColor} !important; }
            .disabled-cell { background-color: #e5e7eb; }
        </style>
    `;

    const detailsHtml = `
        <div style="width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;">
            <div style="text-align: left; flex: 1;"># ${teacher.serialNumber ?? '-'}</div>
            <div style="text-align: center; flex: 1;">${renderText(lang, teacher.nameEn, teacher.nameUr)}</div>
            <div style="text-align: right; flex: 1;">${workloadLabel}</div>
        </div>
    `;

    // Force English Numerals for Periods
    const periodLabels = Array.from({length: maxPeriods}, (_, i) => (i + 1).toString());
    
    const colGroupHtml = `<colgroup><col style="width: ${design.table.periodColumnWidth}px"><col style="width: auto"><col style="width: auto"><col style="width: auto"><col style="width: auto"><col style="width: auto"></colgroup>`;
    const dayHeaders = activeDays.map(day => `<th>${renderText(lang, (enT as any)[day.toLowerCase()], (urT as any)[day.toLowerCase()])}</th>`).join('');

    const tableRows = periodLabels.map((label, periodIndex) => {
      const cells = activeDays.map(day => {
        const periodLimit = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
        if (periodIndex >= periodLimit) return `<td class="disabled-cell"></td>`;

        const periods: any[] = [];
        classes.forEach(c => {
            c.timetable[day as keyof TimetableGridData]?.[periodIndex]?.forEach(p => {
                if (p.teacherId === teacher.id) periods.push({ ...p, classNameEn: c.nameEn, classNameUr: c.nameUr });
            });
        });

        if (periods.length === 0) return `<td></td>`;

        const grouped = new Map<string, { subjectId: string, classNames: Set<string> }>();
        periods.forEach(p => {
            if (!grouped.has(p.subjectId)) grouped.set(p.subjectId, { subjectId: p.subjectId, classNames: new Set() });
            grouped.get(p.subjectId)!.classNames.add(renderText(lang, p.classNameEn, p.classNameUr));
        });

        const cards = Array.from(grouped.values()).map(group => {
            const sub = subjects.find(s => s.id === group.subjectId);
            const subjectName = sub ? renderText(lang, sub.nameEn, sub.nameUr) : '';
            const classList = Array.from(group.classNames).join(', ');
            const colorClass = colorMap.get(group.subjectId) || 'subject-default';

            return `
                <div class="teacher-card ${colorClass}">
                    <div class="subject-name">${subjectName}</div>
                    <div class="class-list">${classList}</div>
                </div>
            `;
        }).join('');

        return `<td><div class="cell-content">${cards}</div></td>`;
      }).join('');
      return `<tr><td class="period-col">${label}</td>${cells}</tr>`;
    }).join('');

    const tableHtml = `${customStyles}<table>${colGroupHtml}<thead><tr><th class="period-col"></th>${dayHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;

    return generateReportHTML(schoolConfig, design, `${t('teacherTimetable')}`, lang, tableHtml, detailsHtml);
};

export const generateWorkloadSummaryHtml = (
    t: any,
    lang: DownloadLanguage,
    design: DownloadDesignConfig,
    selectedItems: Teacher[],
    schoolConfig: SchoolConfig,
    classes: SchoolClass[],
    adjustments: Record<string, Adjustment[]>
): string[] => {
    const { en: enT, ur: urT } = translations;
    const workloadData = selectedItems.map(teacher => ({ teacher, stats: calculateWorkloadStats(teacher.id, classes, adjustments) }));
    workloadData.sort((a, b) => b.stats.totalWorkload - a.stats.totalWorkload);

    const shortEn = { teacher: 'Teacher', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', jointPeriods: 'Joint', substitutionsTaken: 'Subs', leavesTaken: 'Leave', totalWorkload: 'Total' };
    const shortUr = { teacher: 'استاد', monday: 'پیر', tuesday: 'منگل', wednesday: 'بدھ', thursday: 'جمعرات', friday: 'جمعة', saturday: 'ہفتہ', jointPeriods: 'مشترکہ', substitutionsTaken: 'متبادل', leavesTaken: 'چھٹی', totalWorkload: 'کل' };

    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const colHeaders = ['teacher', ...activeDays.map(d => d.toLowerCase()), 'jointPeriods', 'substitutionsTaken', 'leavesTaken', 'totalWorkload'];
    
    const tableHeader = `<thead><tr>${colHeaders.map(k => `<th>${renderText(lang, (shortEn as any)[k], (shortUr as any)[k])}</th>`).join('')}</tr></thead>`;

    const rowsPerPage = design.rowsPerPage || 25;
    const totalPages = Math.max(1, Math.ceil(workloadData.length / rowsPerPage));
    const pages: string[] = [];

    for (let i = 0; i < totalPages; i++) {
        const pageData = workloadData.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
        const tableBody = pageData.map(({ teacher, stats }) => `
            <tr>
                <td style="text-align: left;">${renderText(lang, teacher.nameEn, teacher.nameUr)}</td>
                ${activeDays.map(d => `<td>${stats.dailyCounts[d.toLowerCase()]}</td>`).join('')}
                <td>${stats.jointPeriodsCount}</td>
                <td>${stats.substitutionsTaken}</td><td>${stats.leavesTaken}</td><td><strong>${stats.totalWorkload}</strong></td>
            </tr>
        `).join('');
        
        const tableHtml = `<table>${tableHeader}<tbody>${tableBody}</tbody></table>`;
        pages.push(generateReportHTML(schoolConfig, design, renderText(lang, enT.workloadSummaryReport, urT.workloadSummaryReport), lang, tableHtml, '', i + 1, totalPages));
    }
    return pages;
};

export const calculateWorkloadStats = (teacherId: string | null, classes: SchoolClass[], adjustments: Record<string, Adjustment[]>): WorkloadStats => {
    if (!teacherId) return { dailyCounts: {}, weeklyPeriods: 0, jointPeriodsCount: 0, substitutionsTaken: 0, leavesTaken: 0, totalWorkload: 0 };
    
    const dailyCounts: { [key: string]: number } = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0 };
    let jointPeriodsCount = 0;

    allDays.forEach(day => {
        const key = day.toLowerCase();
        for (let i = 0; i < 12; i++) {
            let isTeachingInThisSlot = false;
            let isJointInThisSlot = false;

            for (const c of classes) {
                const slot = c.timetable[day]?.[i] || [];
                const period = slot.find(p => p.teacherId === teacherId);
                if (period) {
                    isTeachingInThisSlot = true;
                    if (period.jointPeriodId) isJointInThisSlot = true;
                }
            }

            if (isTeachingInThisSlot) {
                dailyCounts[key]++;
                if (isJointInThisSlot) jointPeriodsCount++; 
            }
        }
    });

    const weeklyPeriods = Object.values(dailyCounts).reduce((a, b) => a + b, 0);
    const allAdjustments = Object.values(adjustments).flat();
    const substitutionsTaken = allAdjustments.filter(a => a.substituteTeacherId === teacherId).length;
    const leavesTaken = allAdjustments.filter(a => a.originalTeacherId === teacherId).length;

    return { dailyCounts, weeklyPeriods, jointPeriodsCount, substitutionsTaken, leavesTaken, totalWorkload: weeklyPeriods + substitutionsTaken - leavesTaken };
};

export const generateByPeriodHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig, classes: SchoolClass[], teachers: Teacher[]): string[] => {
    const { en: enT, ur: urT } = translations;
    
    const activeDays = allDays.filter(day => schoolConfig.daysConfig?.[day]?.active ?? true);
    const sortedTeachers = [...teachers].sort((a, b) => (a.serialNumber ?? 9999) - (b.serialNumber ?? 9999));
    
    const dayHeader = renderText(lang, enT.day, urT.day);
    const periodHeader = renderText(lang, enT.period, urT.period);
    const freeTeachersHeader = renderText(lang, 'Free Teachers', 'فارغ اساتذہ');
    
    const tableHeader = `<thead><tr><th style="width: 50px;">${dayHeader}</th><th style="width: 60px;">${periodHeader}</th><th>${freeTeachersHeader}</th></tr></thead>`;
    
    const allRows: { day: string, period: number, free: string, dayRaw: string }[] = [];
    
    activeDays.forEach(day => {
        const numPeriods = schoolConfig.daysConfig?.[day]?.periodCount ?? 8;
        const dayName = renderText(lang, (enT as any)[day.toLowerCase()], (urT as any)[day.toLowerCase()]);
        
        for (let i = 0; i < numPeriods; i++) {
            const busyIds = new Set<string>();
            classes.forEach(c => c.timetable[day as keyof TimetableGridData]?.[i]?.forEach(p => busyIds.add(p.teacherId)));
            const free = sortedTeachers.filter(tea => !busyIds.has(tea.id)).map(tea => renderText(lang, tea.nameEn, tea.nameUr)).join(', ');
            allRows.push({ day: dayName, dayRaw: day, period: i + 1, free });
        }
    });

    const rowsPerPage = design.rowsPerPage || 25;
    const totalPages = Math.max(1, Math.ceil(allRows.length / rowsPerPage));
    const pages: string[] = [];

    for (let i = 0; i < totalPages; i++) {
        const pageRows = allRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
        
        const dayCountsOnPage = new Map<string, number>();
        pageRows.forEach(row => {
            dayCountsOnPage.set(row.dayRaw, (dayCountsOnPage.get(row.dayRaw) || 0) + 1);
        });
        
        const renderedDays = new Set<string>();

        let tbodyHtml = '';
        pageRows.forEach(row => {
            tbodyHtml += '<tr>';
            
            if (!renderedDays.has(row.dayRaw)) {
                const span = dayCountsOnPage.get(row.dayRaw);
                const verticalStyle = `
                    writing-mode: vertical-rl; 
                    transform: rotate(180deg); 
                    text-align: center; 
                    vertical-align: middle; 
                    padding: 5px;
                    font-weight: bold;
                    background-color: ${design.table.headerBgColor || '#f9fafb'};
                    color: ${design.table.headerColor || '#000'};
                `;
                tbodyHtml += `<td rowspan="${span}" style="${verticalStyle}">${row.day}</td>`;
                renderedDays.add(row.dayRaw);
            }
            
            tbodyHtml += `<td>${row.period}</td><td style="text-align: left;">${row.free}</td></tr>`;
        });

        const tableHtml = `<table>${tableHeader}<tbody>${tbodyHtml}</tbody></table>`;
        const reportTitle = renderText(lang, enT.byPeriod, urT.byPeriod);
        pages.push(generateReportHTML(schoolConfig, design, reportTitle, lang, tableHtml, '', i + 1, totalPages));
    }

    return pages;
};

export const generateBasicInformationHtml = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, classes: SchoolClass[], teachers: Teacher[], schoolConfig: SchoolConfig): string[] => {
    const rowsPerPage = design.rowsPerPage || 25;
    const totalPages = Math.max(1, Math.ceil(classes.length / rowsPerPage));
    const pages = [];
    
    const tableHeader = `<thead><tr><th>#</th><th>Class</th><th>In Charge</th><th>Room</th><th>Students</th></tr></thead>`;

    const stats = {
        high: classes.filter(c => c.category === 'High').reduce((sum, c) => sum + c.studentCount, 0),
        middle: classes.filter(c => c.category === 'Middle').reduce((sum, c) => sum + c.studentCount, 0),
        primary: classes.filter(c => c.category === 'Primary').reduce((sum, c) => sum + c.studentCount, 0),
        total: classes.reduce((sum, c) => sum + c.studentCount, 0)
    };

    for(let i=0; i<totalPages; i++) {
        const chunk = classes.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
        const rows = chunk.map((c, idx) => {
            const tea = teachers.find(t => t.id === c.inCharge);
            return `<tr><td>${c.serialNumber || (i * rowsPerPage + idx + 1)}</td><td>${renderText(lang, c.nameEn, c.nameUr)}</td><td>${tea ? renderText(lang, tea.nameEn, tea.nameUr) : '-'}</td><td>${c.roomNumber}</td><td>${c.studentCount}</td></tr>`;
        }).join('');
        
        let pageContent = `<table>${tableHeader}<tbody>${rows}</tbody></table>`;
        
        if (i === totalPages - 1) {
            pageContent += `
                <div style="margin-top: 20px;">
                    <h3 style="margin-bottom: 10px;">Summary</h3>
                    <table style="width: auto; margin-left: auto;">
                        <thead>
                            <tr>
                                <th style="padding: 8px 15px;">High</th>
                                <th style="padding: 8px 15px;">Middle</th>
                                <th style="padding: 8px 15px;">Primary</th>
                                <th style="padding: 8px 15px;">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight: bold;">${stats.high}</td>
                                <td style="font-weight: bold;">${stats.middle}</td>
                                <td style="font-weight: bold;">${stats.primary}</td>
                                <td style="font-weight: bold; background-color: #f3f4f6;">${stats.total}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        pages.push(generateReportHTML(schoolConfig, design, 'Basic Class Information', lang, pageContent, '', i+1, totalPages));
    }
    return pages;
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
    absentTeacherIds: string[] = []
): string[] => {
    const { en: enT, ur: urT } = translations;
    const renderText = (l: string, e: string, u: string) => l === 'en' ? e : l === 'ur' ? `<span class="font-urdu">${u}</span>` : `${e} / <span class="font-urdu">${u}</span>`;
    const tr = (key: string) => lang === 'ur' ? (urT as any)[key] : (enT as any)[key];

    // Format Date: Day Month Year
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const sortedAdjustments = [...adjustments].sort((a, b) => {
      const teacherA = teachers.find(t => t.id === a.originalTeacherId)?.nameEn || '';
      const teacherB = teachers.find(t => t.id === b.originalTeacherId)?.nameEn || '';
      return teacherA.localeCompare(teacherB) || a.periodIndex - b.periodIndex;
    });
    
    const onLeaveTeachers = [...new Set([...sortedAdjustments.map(adj => adj.originalTeacherId), ...absentTeacherIds])].map(id => teachers.find(t => t.id === id)).filter(Boolean) as Teacher[];
    const onLeaveText = onLeaveTeachers.map(t => renderText(lang, t.nameEn, t.nameUr)).join(', ');

    const rowsPerPage = design.rowsPerPage || 25;
    let allRows: { adjustment: Adjustment, teacher: Teacher | undefined }[] = [];
    const groups = new Map<string, Adjustment[]>();
    sortedAdjustments.forEach(adj => {
        if (!groups.has(adj.originalTeacherId)) groups.set(adj.originalTeacherId, []);
        groups.get(adj.originalTeacherId)!.push(adj);
    });
    groups.forEach((adjs, teacherId) => {
        const teacher = teachers.find(t => t.id === teacherId);
        adjs.forEach((adj) => allRows.push({ adjustment: adj, teacher }));
    });

    const totalPages = Math.max(1, Math.ceil(allRows.length / rowsPerPage));
    const pages: string[] = [];
    
    for (let i = 0; i < totalPages; i++) {
      const pageRows = allRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
      const teacherCountsOnPage = new Map<string, number>();
      pageRows.forEach(r => {
          const tid = r.adjustment.originalTeacherId;
          teacherCountsOnPage.set(tid, (teacherCountsOnPage.get(tid) || 0) + 1);
      });
      const renderedTeacherIdsOnPage = new Set<string>();

      let tableRowsHtml = '';
      pageRows.forEach(row => {
          const tid = row.adjustment.originalTeacherId;
          const isFirst = !renderedTeacherIdsOnPage.has(tid);
          const sub = teachers.find(t => t.id === row.adjustment.substituteTeacherId);
          const cls = classes.find(c => c.id === row.adjustment.classId);
          const sbj = subjects.find(s => s.id === row.adjustment.subjectId);

          tableRowsHtml += '<tr>';
          if (isFirst) {
              const span = teacherCountsOnPage.get(tid)!;
              tableRowsHtml += `<td rowspan="${span}" style="vertical-align: middle; text-align: center; background-color: ${design.table.bodyBgColor || '#ffffff'}; position: relative; z-index: 10;">${row.teacher ? renderText(lang, row.teacher.nameEn, row.teacher.nameUr) : ''}</td>`;
              renderedTeacherIdsOnPage.add(tid);
          }
          
          const conflictText = row.adjustment.conflictDetails 
            ? `<br><small style="color:red">(${tr('doubleBookedIn').replace('{className}', lang === 'ur' ? row.adjustment.conflictDetails.classNameUr : row.adjustment.conflictDetails.classNameEn)})</small>` 
            : '';

          tableRowsHtml += `
              <td>${row.adjustment.periodIndex + 1}</td>
              <td>${cls ? renderText(lang, cls.nameEn, cls.nameUr) : ''}</td>
              <td>${sbj ? renderText(lang, sbj.nameEn, sbj.nameUr) : ''}</td>
              <td>${sub ? renderText(lang, sub.nameEn, sub.nameUr) : ''} ${conflictText}</td>
              <td></td>
          </tr>`;
      });

      const tableHtml = `
          <style>
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid black; padding: 2px !important; text-align: center; vertical-align: middle; }
          </style>
          <div style="margin-bottom: 10px; font-size: 0.9em;"><strong>${tr('absentTeachers')}:</strong> ${onLeaveText}</div>
          <table>
              <thead>
                  <tr>
                      <th>${tr('absent')}</th>
                      <th style="width: 60px;">${tr('period')}</th>
                      <th>${tr('class')}</th>
                      <th>${tr('subject')}</th>
                      <th>${tr('substituteTeacher')}</th>
                      <th style="width: 15%;">${tr('signature')}</th>
                  </tr>
              </thead>
              <tbody>${tableRowsHtml}</tbody>
          </table>
          <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
              <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; width: 200px;">
                  <strong>${tr('signature')}</strong>
              </div>
          </div>
      `;
      
      pages.push(generateReportHTML(schoolConfig, design, `${tr('substitution')} - ${dateStr}`, lang, tableHtml, '', i + 1, totalPages));
    }
    return pages;
};

// Helper for Excel exports
export const generateBasicInformationExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, classes: SchoolClass[], teachers: Teacher[]) => { /* ... implementation ... */ };
export const generateByPeriodExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, schoolConfig: SchoolConfig, classes: SchoolClass[], teachers: Teacher[]) => { /* ... implementation ... */ };
export const generateWorkloadSummaryExcel = (t: any, lang: DownloadLanguage, design: DownloadDesignConfig, selectedItems: Teacher[], classes: SchoolClass[], adjustments: Record<string, Adjustment[]>) => { /* ... implementation ... */ };
export const generateAdjustmentsExcel = (t: any, adjustments: Adjustment[], teachers: Teacher[], classes: SchoolClass[], subjects: Subject[], date: string) => { /* ... implementation ... */ };
