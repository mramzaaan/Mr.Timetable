
import React, { useState, useEffect, useMemo } from 'react';
import type { SchoolConfig, DayConfig, PeriodTime, Break, TimetableGridData, TimetableSession, DownloadDesignConfig } from '../types';
import { allDays, generateUniqueId } from '../types';
import PrintPreview from './PrintPreview';
import DownloadModal from './DownloadModal';
import { generateSchoolTimingsHtml } from './reportUtils';

interface TimetableStructureFormProps {
  t: any;
  schoolConfig: SchoolConfig;
  // New props for session-specific updates
  currentTimetableSession?: TimetableSession | null;
  onUpdateTimetableSession?: (updater: (session: TimetableSession) => TimetableSession) => void;
  onUpdateSchoolConfig: (newSchoolConfig: Partial<SchoolConfig>) => void; // Keep for print design saves
}

// Helper type for rendering interleaved schedule
type ScheduleItem = 
    | { type: 'period'; index: number; data: PeriodTime } 
    | { type: 'break'; index: number; data: Break }
    | { type: 'assembly'; data: PeriodTime };

const TimetableStructureForm: React.FC<TimetableStructureFormProps> = ({ t, schoolConfig, onUpdateSchoolConfig, currentTimetableSession, onUpdateTimetableSession }) => {
  // Use session data if available, otherwise fallback to schoolConfig
  const effectiveConfig = currentTimetableSession || schoolConfig;

  const [localDaysConfig, setLocalDaysConfig] = useState<Record<keyof TimetableGridData, DayConfig>>(effectiveConfig.daysConfig || {
      Monday: { active: true, periodCount: 8 },
      Tuesday: { active: true, periodCount: 8 },
      Wednesday: { active: true, periodCount: 8 },
      Thursday: { active: true, periodCount: 8 },
      Friday: { active: true, periodCount: 8 },
      Saturday: { active: false, periodCount: 4 },
  });
  const [localPeriodTimings, setLocalPeriodTimings] = useState<{ default: PeriodTime[], friday: PeriodTime[] }>(effectiveConfig.periodTimings || {
      default: Array.from({ length: 12 }, () => ({ start: '', end: '' })),
      friday: Array.from({ length: 12 }, () => ({ start: '', end: '' })),
  });
  const [localBreaks, setLocalBreaks] = useState<{ default: Break[], friday: Break[] }>(effectiveConfig.breaks || {
      default: [],
      friday: []
  });
  const [localAssembly, setLocalAssembly] = useState<{ default: PeriodTime | null, friday: PeriodTime | null }>(effectiveConfig.assembly || {
      default: null,
      friday: null
  });

  const [activeTimingTab, setActiveTimingTab] = useState<'default' | 'friday'>('default');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // CRITICAL FIX: Watch for changes in the effective configuration (e.g. after import)
  useEffect(() => {
    if (effectiveConfig.daysConfig) setLocalDaysConfig(effectiveConfig.daysConfig);
    if (effectiveConfig.periodTimings) setLocalPeriodTimings(effectiveConfig.periodTimings);
    if (effectiveConfig.breaks) setLocalBreaks(effectiveConfig.breaks);
    if (effectiveConfig.assembly) setLocalAssembly(effectiveConfig.assembly);
  }, [
      // Watch deep properties to trigger re-render when import happens
      JSON.stringify(effectiveConfig.daysConfig),
      JSON.stringify(effectiveConfig.periodTimings),
      JSON.stringify(effectiveConfig.breaks),
      JSON.stringify(effectiveConfig.assembly),
      currentTimetableSession?.id
  ]); 

  const handleDayConfigChange = (day: keyof TimetableGridData, field: keyof DayConfig, value: any) => {
      setLocalDaysConfig(prev => ({
          ...prev,
          [day]: {
              ...prev[day],
              [field]: value
          }
      }));
  };

  // Combine periods and breaks into a single sorted list for the UI
  const sortedSchedule = useMemo(() => {
      // Determine maximum periods active for the current tab
      let currentMaxPeriods = 0;
      const daysToCheck: (keyof TimetableGridData)[] = activeTimingTab === 'friday' 
          ? ['Friday'] 
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

      daysToCheck.forEach(day => {
          const config = localDaysConfig[day];
          if (config && config.active) {
              currentMaxPeriods = Math.max(currentMaxPeriods, config.periodCount);
          }
      });
      
      if (currentMaxPeriods === 0) currentMaxPeriods = 1;

      const periods = localPeriodTimings[activeTimingTab];
      const breaks = localBreaks[activeTimingTab];
      const items: ScheduleItem[] = [];

      if (localAssembly[activeTimingTab]) {
          items.push({ type: 'assembly', data: localAssembly[activeTimingTab]! });
      }

      periods.forEach((p, index) => {
          if (index < currentMaxPeriods) {
              items.push({ type: 'period', index, data: p });
          }
      });

      breaks.forEach((b, index) => {
          if (b.beforePeriod <= currentMaxPeriods + 1) {
              items.push({ type: 'break', index, data: b });
          }
      });

      items.sort((a, b) => {
          const getPos = (item: ScheduleItem) => {
              if (item.type === 'assembly') return -1;
              if (item.type === 'period') return item.index * 2 + 1;
              return (item.data.beforePeriod - 1) * 2; 
          };
          return getPos(a) - getPos(b);
      });

      return items;
  }, [localPeriodTimings, localBreaks, localAssembly, activeTimingTab, localDaysConfig]);

  const updateScheduleTimes = (index: number, field: 'start' | 'end', value: string) => {
      const newPeriods = [...localPeriodTimings[activeTimingTab]];
      const newBreaks = [...localBreaks[activeTimingTab]];
      let newAssembly = localAssembly[activeTimingTab] ? { ...localAssembly[activeTimingTab]! } : null;
      
      const setTime = (itm: ScheduleItem, f: 'start' | 'end', v: string) => {
          if (itm.type === 'period') {
              newPeriods[itm.index] = { ...newPeriods[itm.index], [f]: v };
          } else if (itm.type === 'break') {
              const key = f === 'start' ? 'startTime' : 'endTime';
              newBreaks[itm.index] = { ...newBreaks[itm.index], [key]: v };
          } else if (itm.type === 'assembly' && newAssembly) {
              newAssembly = { ...newAssembly, [f]: v };
          }
      };

      const currentItem = sortedSchedule[index];
      setTime(currentItem, field, value);

      if (field === 'end' && index < sortedSchedule.length - 1) {
          const nextItem = sortedSchedule[index + 1];
          setTime(nextItem, 'start', value);
      }

      setLocalPeriodTimings(prev => ({ ...prev, [activeTimingTab]: newPeriods }));
      setLocalBreaks(prev => ({ ...prev, [activeTimingTab]: newBreaks }));
      setLocalAssembly(prev => ({ ...prev, [activeTimingTab]: newAssembly }));
  };

  const handleAddBreak = () => {
      const newBreak: Break = {
          id: generateUniqueId(),
          name: 'New Break',
          beforePeriod: 4, 
          startTime: '',
          endTime: ''
      };
      setLocalBreaks(prev => ({
          ...prev,
          [activeTimingTab]: [...prev[activeTimingTab], newBreak]
      }));
  };

  const handleRemoveBreak = (breakIndex: number) => {
      setLocalBreaks(prev => ({
          ...prev,
          [activeTimingTab]: prev[activeTimingTab].filter((_, i) => i !== breakIndex)
      }));
  };

  const handleToggleAssembly = () => {
      setLocalAssembly(prev => {
          const current = prev[activeTimingTab];
          if (current) {
              return { ...prev, [activeTimingTab]: null };
          } else {
              return { ...prev, [activeTimingTab]: { start: '08:00', end: '08:15' } };
          }
      });
  };

  const handleBreakConfigChange = (breakIndex: number, field: keyof Break, value: any) => {
      setLocalBreaks(prev => {
          const updated = [...prev[activeTimingTab]];
          updated[breakIndex] = { ...updated[breakIndex], [field]: value };
          return { ...prev, [activeTimingTab]: updated };
      });
  };

  const handleSave = () => {
      // If we have a session updater (Data Entry Page), update the session directly.
      if (onUpdateTimetableSession) {
        onUpdateTimetableSession(s => ({
            ...s,
            daysConfig: localDaysConfig,
            periodTimings: localPeriodTimings,
            breaks: localBreaks,
            assembly: localAssembly
        }));
        alert('Timetable structure saved to current session.');
      } else {
        // Fallback to updating global config (Legacy/Settings Page)
        onUpdateSchoolConfig({
            daysConfig: localDaysConfig,
            periodTimings: localPeriodTimings,
            breaks: localBreaks,
            assembly: localAssembly,
        });
        alert('Timetable structure saved globally.');
      }
  };

  const handleSavePrintDesign = (newDesign: DownloadDesignConfig) => {
    onUpdateSchoolConfig({
      downloadDesigns: { ...schoolConfig.downloadDesigns, schoolTimings: newDesign }
    });
  };

  // Construct a temporary config object reflecting current form state for preview
  const previewConfig: SchoolConfig = {
      ...schoolConfig,
      daysConfig: localDaysConfig,
      periodTimings: localPeriodTimings,
      breaks: localBreaks,
      assembly: localAssembly
  };

  return (
    <div className="p-6 bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] space-y-6">
        <PrintPreview
            t={t}
            isOpen={isPrintPreviewOpen}
            onClose={() => setIsPrintPreviewOpen(false)}
            title="School Timings"
            fileNameBase="School_Timings"
            generateHtml={(lang, options) => generateSchoolTimingsHtml(t, lang, options, previewConfig)}
            designConfig={schoolConfig.downloadDesigns.schoolTimings}
            onSaveDesign={handleSavePrintDesign}
        />
        
        <DownloadModal
            t={t}
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            title="Download Timings"
            fileNameBase="School_Timings"
            generateContentHtml={(lang, design) => generateSchoolTimingsHtml(t, lang, design, previewConfig)}
            designConfig={schoolConfig.downloadDesigns.schoolTimings}
        />

        <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.timetableStructure}</h3>
            <div className="flex gap-3">
                <button onClick={() => setIsDownloadModalOpen(true)} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] border border-[var(--border-secondary)]">
                    {t.download}
                </button>
                <button onClick={() => setIsPrintPreviewOpen(true)} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] border border-[var(--border-secondary)]">
                    {t.printViewAction}
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] transition-colors">
                    {t.save}
                </button>
            </div>
        </div>

        <div className="space-y-3">
            {allDays.map(day => {
                const config = localDaysConfig[day] || { active: true, periodCount: 8 };
                return (
                    <div key={day} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={config.active} 
                                onChange={(e) => handleDayConfigChange(day, 'active', e.target.checked)} 
                                className="form-checkbox h-5 w-5 text-[var(--accent-primary)] rounded cursor-pointer"
                            />
                            <span className={`font-semibold text-[var(--text-primary)] ${!config.active ? 'opacity-50' : ''}`}>
                                {t[day.toLowerCase()]}
                            </span>
                        </div>
                        <div className={`flex items-center gap-3 ${!config.active ? 'opacity-50 pointer-events-none' : ''}`}>
                            <span className="text-sm text-[var(--text-secondary)]">{t.periods}:</span>
                            <button 
                                onClick={() => handleDayConfigChange(day, 'periodCount', Math.max(1, config.periodCount - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--accent-secondary-hover)] rounded-full border border-[var(--border-secondary)] text-[var(--text-primary)] font-bold"
                            >-</button>
                            <span className="w-6 text-center font-bold text-[var(--text-primary)]">{config.periodCount}</span>
                            <button 
                                onClick={() => handleDayConfigChange(day, 'periodCount', Math.min(12, config.periodCount + 1))}
                                className="w-8 h-8 flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--accent-secondary-hover)] rounded-full border border-[var(--border-secondary)] text-[var(--text-primary)] font-bold"
                            >+</button>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="border-t border-[var(--border-primary)] pt-6">
            <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Schedule Timings & Breaks</h4>
            <div className="flex space-x-4 mb-4 border-b border-[var(--border-secondary)]">
                <button 
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTimingTab === 'default' ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
                    onClick={() => setActiveTimingTab('default')}
                >
                    Regular Days (Mon-Thu, Sat)
                </button>
                <button 
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTimingTab === 'friday' ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
                    onClick={() => setActiveTimingTab('friday')}
                >
                    Friday
                </button>
            </div>

            <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-sm text-[var(--text-primary)]">Configuration</h5>
                    <div className="flex gap-2">
                        {!localAssembly[activeTimingTab] && (
                            <button onClick={handleToggleAssembly} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                                + Enable Assembly
                            </button>
                        )}
                        <button onClick={handleAddBreak} className="text-xs bg-[var(--accent-primary)] text-white px-2 py-1 rounded hover:bg-[var(--accent-primary-hover)]">
                            + Add Break
                        </button>
                    </div>
                </div>
                {localBreaks[activeTimingTab].length === 0 && !localAssembly[activeTimingTab] ? (
                    <p className="text-xs text-[var(--text-secondary)] italic">No breaks or assembly configured for this schedule.</p>
                ) : (
                    <div className="space-y-2">
                        {localAssembly[activeTimingTab] && (
                            <div className="flex items-center gap-2 p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                                <span className="flex-1 text-sm font-bold text-indigo-700 dark:text-indigo-300 px-2">Assembly</span>
                                <span className="text-xs text-indigo-500 italic mr-2">Before Period 1</span>
                                <button onClick={handleToggleAssembly} className="text-red-500 hover:text-red-700 font-bold px-2">×</button>
                            </div>
                        )}
                        {localBreaks[activeTimingTab].map((b, idx) => (
                            <div key={b.id} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={b.name} 
                                    onChange={(e) => handleBreakConfigChange(idx, 'name', e.target.value)}
                                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                                    placeholder="Break Name"
                                />
                                <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">before Period</span>
                                <select 
                                    value={b.beforePeriod} 
                                    onChange={(e) => handleBreakConfigChange(idx, 'beforePeriod', parseInt(e.target.value))}
                                    className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                                >
                                    {Array.from({length: 12}, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button onClick={() => handleRemoveBreak(idx)} className="text-red-500 hover:text-red-700 font-bold px-2">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                {sortedSchedule.map((item, flatIndex) => {
                    if (item.type === 'period') {
                        return (
                            <div key={`p-${item.index}`} className="flex items-center gap-3 bg-[var(--bg-secondary)] p-2 rounded-md border border-[var(--border-secondary)]">
                                <span className="text-sm font-semibold w-24 text-[var(--text-primary)]">{t.period} {item.index + 1}</span>
                                <input 
                                    type="time" 
                                    value={item.data.start} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'start', e.target.value)}
                                    className="bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                                />
                                <span className="text-[var(--text-secondary)]">-</span>
                                <input 
                                    type="time" 
                                    value={item.data.end} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'end', e.target.value)}
                                    className="bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                                />
                            </div>
                        );
                    } else if (item.type === 'assembly') {
                        return (
                            <div key="assembly" className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-md border border-indigo-200 dark:border-indigo-800">
                                <span className="text-sm font-bold w-24 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" /></svg>
                                    Assembly
                                </span>
                                <input 
                                    type="time" 
                                    value={item.data.start} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'start', e.target.value)}
                                    className="bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="text-indigo-400">-</span>
                                <input 
                                    type="time" 
                                    value={item.data.end} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'end', e.target.value)}
                                    className="bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        );
                    } else {
                        return (
                            <div key={`b-${item.index}`} className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md border border-orange-200 dark:border-orange-800">
                                <span className="text-sm font-bold w-24 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    {item.data.name}
                                </span>
                                <input 
                                    type="time" 
                                    value={item.data.startTime} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'start', e.target.value)}
                                    className="bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                                <span className="text-orange-400">-</span>
                                <input 
                                    type="time" 
                                    value={item.data.endTime} 
                                    onChange={(e) => updateScheduleTimes(flatIndex, 'end', e.target.value)}
                                    className="bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                        );
                    }
                })}
            </div>
        </div>
    </div>
  );
};

export default TimetableStructureForm;
