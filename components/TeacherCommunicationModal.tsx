import React, { useState, useMemo } from 'react';
import type { Teacher, TimetableGridData, Subject, SchoolClass, SchoolConfig, TimetableGridData as GridData } from '../types';

// Declaring html2canvas
declare const html2canvas: any;

interface TeacherCommunicationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  selectedTeacher: Teacher;
  teacherTimetableData: GridData;
  subjects: Subject[];
  classes: SchoolClass[];
  schoolConfig: SchoolConfig;
  subjectColorMap: Map<string, string>;
}

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];

const days: (keyof GridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TeacherCommunicationModal: React.FC<TeacherCommunicationModalProps> = ({
  t,
  isOpen,
  onClose,
  selectedTeacher,
  teacherTimetableData,
  subjects,
  classes,
  schoolConfig,
  subjectColorMap
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const workload = useMemo(() => {
    let count = 0;
    days.forEach(day => {
      teacherTimetableData[day]?.forEach(slot => {
        if (slot.length > 0) {
          count++;
        }
      });
    });
    return count;
  }, [teacherTimetableData]);

  const timetableMessage = useMemo(() => {
    let message = `*${t.teacherTimetable}: ${selectedTeacher.nameEn} / ${selectedTeacher.nameUr}*\n\n`;

    days.forEach(day => {
      const periodsForDay: { periodIndex: number, text: string }[] = [];
      for (let i = 0; i < 8; i++) {
        const slot = teacherTimetableData[day]?.[i] || [];
        if (slot.length > 0) {
          const slotText = slot.map(period => {
            const subject = subjects.find(s => s.id === period.subjectId);
            const schoolClass = classes.find(c => c.id === period.classId);
            return subject && schoolClass ? `${subject.nameEn} (${schoolClass.nameEn})` : '';
          }).filter(Boolean).join(' / ');
          
          if (slotText) {
            periodsForDay.push({ periodIndex: i, text: slotText });
          }
        }
      }

      if (periodsForDay.length > 0) {
        message += `*${t[day.toLowerCase()]}*\n`;
        periodsForDay.forEach(p => {
          message += `- P${p.periodIndex + 1}: ${p.text}\n`;
        });
        message += '\n';
      }
    });

    return message.trim();
  }, [selectedTeacher, teacherTimetableData, subjects, classes, t]);

  const generateTimetableImageHtml = () => {
      const styles = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
          .timetable-image-container {
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
            
            font-family: 'Roboto', sans-serif;
            background: white;
            padding: 20px;
            width: 900px;
            color: #1f2937;
            box-sizing: border-box;
          }
          .font-urdu { font-family: 'Noto Naskh Arabic', serif; }
          
          .img-school-name { 
            font-size: 32px; 
            font-weight: bold; 
            color: #115e59; 
            text-align: center;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }
          
          /* New Header Layout */
          .header-info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #0d9488;
            padding: 0 15px 10px 15px;
            margin-bottom: 20px;
          }
          
          .info-left { 
            width: 15%; 
            text-align: left; 
            font-size: 28px; 
            font-weight: bold; 
            color: #374151; 
          }
          
          .info-center { 
            width: 70%; 
            text-align: center; 
            font-size: 36px; 
            font-weight: 900; 
            color: #111827; 
            text-transform: uppercase; 
          }
          
          .info-right { 
            width: 15%; 
            text-align: right; 
            font-size: 28px; 
            font-weight: bold; 
            color: #374151; 
          }
          
          .img-table { width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; }
          .img-table th, .img-table td { border: 1px solid #9ca3af; padding: 0; text-align: center; vertical-align: middle; }
          
          /* Header Styling */
          .img-table th { 
            background-color: #0d9488; /* Teal */
            color: white; 
            font-weight: bold; 
            text-transform: uppercase;
            padding: 10px;
            border-color: #0f766e;
            font-size: 16px;
          }
          .img-table th:first-child { width: 60px; }
          
          /* Period Label Styling */
          .period-label { 
            background-color: #115e59; /* Darker Teal */
            color: white; 
            font-weight: bold; 
            font-size: 22px;
            text-align: center;
            border-color: #134e4a;
          }
          
          .slot-cell { height: 85px; }
          
          /* Card Styling - Floating & Rounded */
          .period-card-img { 
            padding: 4px 6px; 
            border-radius: 10px; 
            font-size: 13px; 
            line-height: 1.3; 
            
            height: calc(100% - 10px);
            width: calc(100% - 10px);
            margin: 5px; 
            
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .period-card-img p { margin: 0; white-space: normal; word-break: break-word; }
          .period-subject { font-weight: 800; font-size: 15px; margin-bottom: 3px !important; }
          .period-class { font-weight: 500; opacity: 0.9; font-size: 13px; }
          
          ${subjectColorNames.map(name => `
              .${name} { background-color: var(--${name}-bg); color: var(--${name}-text); border: 1px solid rgba(0,0,0,0.05); }
          `).join('')}
        </style>
      `;
      
      const tableRows = Array.from({ length: 8 }).map((_, periodIndex) => {
          const cells = days.map(day => {
            const periods = teacherTimetableData[day]?.[periodIndex] || [];
            
            if (periods.length === 0) {
                 return '<td class="slot-cell"></td>';
            }

            // Aggregate periods to form a single card
            const uniqueSubjectIds = [...new Set(periods.map(p => p.subjectId))];
            const uniqueClassIds = [...new Set(periods.map(p => p.classId))];
            
            const subjectNames = uniqueSubjectIds.map(id => subjects.find(s => s.id === id)?.nameEn).filter(Boolean).join(' / ');
            const classNames = uniqueClassIds.map(id => classes.find(c => c.id === id)?.nameEn).filter(Boolean).join(', ');

            const colorName = subjectColorMap.get(periods[0].subjectId) || 'subject-default';

            const cellContent = `
                <div class="period-card-img ${colorName}">
                    <p class="period-subject">${subjectNames}</p>
                    <p class="period-class">${classNames}</p>
                </div>
            `;
            
            return `<td class="slot-cell">${cellContent}</td>`;
          }).join('');
          return `<tr><td class="period-label">${periodIndex + 1}</td>${cells}</tr>`;
        }).join('');

        const html = `
        <div class="timetable-image-container">
          ${styles}
          <div class="img-header">
            <div class="img-school-name">${schoolConfig.schoolNameEn}</div>
            <div class="header-info-row">
                <div class="info-left">${selectedTeacher.serialNumber || ''}</div>
                <div class="info-center">${selectedTeacher.nameEn}</div>
                <div class="info-right">${workload}</div>
            </div>
          </div>
          <table class="img-table">
            <thead>
              <tr>
                <th></th>
                ${days.map(day => `<th>${t[day.toLowerCase()]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        `;
        return html;
  };

  const handleSendImageAsWhatsApp = async () => {
    if (!selectedTeacher?.contactNumber) {
        alert("Teacher's contact number not found.");
        return;
    }
    
    setIsGenerating(true);
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.innerHTML = generateTimetableImageHtml();
    document.body.appendChild(tempContainer);
    
    try {
        const canvas = await html2canvas(tempContainer.children[0] as HTMLElement, { scale: 2, useCORS: true });
        
        let imageHandled = false;
        try {
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                 await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
                 imageHandled = true;
                 setCopyFeedback(t.imageCopied);
            }
        } catch (clipboardError) {
            console.warn("Clipboard write failed, attempting download", clipboardError);
        }

        if (!imageHandled) {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `timetable_${selectedTeacher.nameEn.replace(/\s/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setCopyFeedback(t.imageDownloaded);
        }

        let phoneNumber = selectedTeacher.contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
        
        setTimeout(() => {
             const url = `https://wa.me/${phoneNumber}`;
             window.open(url, '_blank');
        }, 1000);
        
    } catch (error) {
        console.error("Error in WhatsApp send flow", error);
        alert("Failed to generate image.");
    } finally {
        document.body.removeChild(tempContainer);
        setIsGenerating(false);
        setTimeout(() => setCopyFeedback(''), 4000);
    }
  };

  const handleSendWhatsApp = () => {
    if (selectedTeacher?.contactNumber) {
        let phoneNumber = selectedTeacher.contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(timetableMessage)}`;
        window.open(url, '_blank');
    } else {
        alert("Teacher's contact number not found.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(timetableMessage).then(() => {
        setCopyFeedback(t.messagesCopied);
        setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[101]" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold p-5 border-b border-[var(--border-primary)] text-[var(--text-primary)]">
          {t.sendToTeacher}: {selectedTeacher.nameEn}
        </h3>
        <div className="flex-grow p-5 overflow-y-auto bg-[var(--bg-tertiary)] max-h-[60vh]">
          <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-sans">
            {timetableMessage}
          </pre>
        </div>
        <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] space-y-3">
            <div className="flex justify-center gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex-grow">{t.close}</button>
                <button onClick={handleCopy} className="px-4 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex-grow">{t.copyMessage}</button>
            </div>
            <button onClick={handleSendImageAsWhatsApp} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                {isGenerating ? (
                    <span>{t.generating}</span>
                ) : (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    <span>{t.sendAsImage}</span>
                    </>
                )}
            </button>
            <button onClick={handleSendWhatsApp} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" /></svg>
                <span>{t.sendViaWhatsApp}</span>
            </button>
            {copyFeedback && <p className="text-xs text-green-600 mt-1 text-center">{copyFeedback}</p>}
        </div>
      </div>
    </div>
  );
};

export default TeacherCommunicationModal;