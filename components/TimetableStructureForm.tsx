
import React, { useState, useEffect, useMemo } from 'react';
import type { SchoolConfig, DayConfig, PeriodTime, Break, TimetableGridData, TimetableSession, DownloadDesignConfig, Vacation } from '../types';
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
  const [localVacations, setLocalVacations] = useState<Vacation[]>(currentTimetableSession?.vacations || []);

  const [activeTimingTab, setActiveTimingTab] = useState<'default' | 'friday'>('default');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAddingVacation, setIsAddingVacation] = useState(false);
  const [newVacation, setNewVacation] = useState<Vacation>({ id: '', name: '', startDate: '', endDate: '' });
  const [isDaysConfigOpen, setIsDaysConfigOpen] = useState(true);

  const isFridayActive = localDaysConfig['Friday']?.active !== false;

  useEffect(() => {
      if (!isFridayActive && activeTimingTab === 'friday') {
          setActiveTimingTab('default');
      }
  }, [isFridayActive, activeTimingTab]);

  useEffect(() => {
    if (effectiveConfig.daysConfig) setLocalDaysConfig(effectiveConfig.daysConfig);
    if (effectiveConfig.periodTimings) setLocalPeriodTimings(effectiveConfig.periodTimings);
    if (effectiveConfig.breaks) setLocalBreaks(effectiveConfig.breaks);
    if (effectiveConfig.assembly) setLocalAssembly(effectiveConfig.assembly);
    if (currentTimetableSession?.vacations) setLocalVacations(currentTimetableSession.vacations);
  }, [
      // Watch deep properties to trigger re-render when import happens
      JSON.stringify(effectiveConfig.daysConfig),
      JSON.stringify(effectiveConfig.periodTimings),
      JSON.stringify(effectiveConfig.breaks),
      JSON.stringify(effectiveConfig.assembly),
      JSON.stringify(currentTimetableSession?.vacations),
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

  const updateScheduleData = (index: number, field: 'start' | 'end' | 'name', value: string) => {
      const newPeriods = [...localPeriodTimings[activeTimingTab]];
      const newBreaks = [...localBreaks[activeTimingTab]];
      let newAssembly = localAssembly[activeTimingTab] ? { ...localAssembly[activeTimingTab]! } : null;
      
      const updateItem = (itm: ScheduleItem, f: 'start' | 'end' | 'name', v: string) => {
          if (itm.type === 'period') {
              newPeriods[itm.index] = { ...newPeriods[itm.index], [f]: v };
          } else if (itm.type === 'break') {
              if (f === 'name') {
                  newBreaks[itm.index] = { ...newBreaks[itm.index], name: v };
              } else {
                  const key = f === 'start' ? 'startTime' : 'endTime';
                  newBreaks[itm.index] = { ...newBreaks[itm.index], [key]: v };
              }
          } else if (itm.type === 'assembly' && newAssembly && f !== 'name') {
              newAssembly = { ...newAssembly, [f]: v };
          }
      };

      const currentItem = sortedSchedule[index];
      updateItem(currentItem, field, value);

      // Auto-update next start time if editing end time
      if (field === 'end' && index < sortedSchedule.length - 1) {
          const nextItem = sortedSchedule[index + 1];
          // Simple logic: update start time of next item to match end time of current
          // Note: Does not apply to 'name'
          updateItem(nextItem, 'start', value);
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
            assembly: localAssembly,
            vacations: localVacations
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

  // Vacation Handlers
  const handleAddVacation = () => {
      setNewVacation({ id: generateUniqueId(), name: '', startDate: '', endDate: '' });
      setIsAddingVacation(true);
  };

  const handleConfirmAddVacation = () => {
      if (newVacation.name && newVacation.startDate && newVacation.endDate) {
          setLocalVacations(prev => [...prev, newVacation]);
          setIsAddingVacation(false);
      } else {
          alert('Please fill all vacation fields');
      }
  };

  const handleDeleteVacation = (id: string) => {
      setLocalVacations(prev => prev.filter(v => v.id !== id));
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

        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-[#115e59] flex items-center gap-2">
                    Days & Timing
                </h3>
            </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-5xl font-black text-blue-600 mb-2 drop-shadow-sm">
                    {allDays.reduce((acc, day) => acc + (localDaysConfig[day]?.active ? localDaysConfig[day].periodCount : 0), 0)}
                </span>
                <span className="text-sm font-bold text-blue-800 tracking-widest uppercase">Weekly Periods</span>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                </div>
                <span className="text-5xl font-black text-rose-600 mb-2 drop-shadow-sm">
                    {(() => {
                        let days = 0;
                        localVacations.forEach(v => {
                            const start = new Date(v.startDate);
                            const end = new Date(v.endDate);
                            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                days += Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            }
                        });
                        return days;
                    })()}
                </span>
                <span className="text-sm font-bold text-rose-800 tracking-widest uppercase">Vacation Days</span>
            </div>
        </div>

        {/* Vacation Management */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-500 tracking-wider uppercase">Scheduled Vacations</h4>
                <button onClick={handleAddVacation} className="text-sm font-bold text-[#005f5f] hover:text-[#004c4c] flex items-center gap-1">
                    + Add New
                </button>
            </div>
            
            {isAddingVacation && (
                <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-scale-in grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.vacationName}</label>
                        <input type="text" value={newVacation.name} onChange={e => setNewVacation({...newVacation, name: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#005f5f] focus:outline-none" placeholder="e.g. Winter Vacation" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.startDate}</label>
                        <input type="date" value={newVacation.startDate} onChange={e => setNewVacation({...newVacation, startDate: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#005f5f] focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.endDate}</label>
                        <input type="date" value={newVacation.endDate} onChange={e => setNewVacation({...newVacation, endDate: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#005f5f] focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleConfirmAddVacation} className="flex-1 py-2 bg-[#005f5f] text-white rounded-lg font-bold text-sm hover:bg-[#004c4c]">Save</button>
                        <button onClick={() => setIsAddingVacation(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold text-sm hover:bg-gray-300">Cancel</button>
                    </div>
                </div>
            )}

            {localVacations.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No vacations scheduled.</p>
            ) : (
                <div className="space-y-3">
                    {localVacations.map(vacation => (
                        <div key={vacation.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">⛄</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{vacation.name}</span>
                                    <span className="text-xs text-gray-500">{vacation.startDate} to {vacation.endDate}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteVacation(vacation.id)} className="text-red-500 hover:text-red-700 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button 
                onClick={() => setIsDaysConfigOpen(!isDaysConfigOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <h4 className="text-sm font-bold text-gray-700 tracking-wider uppercase">Weekly Schedule Configuration</h4>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${isDaysConfigOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isDaysConfigOpen && (
                <div className="p-4 space-y-3 border-t border-gray-200">
                    {allDays.map(day => {
                        const config = localDaysConfig[day] || { active: true, periodCount: 8 };
                        return (
                            <div key={day} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${config.active ? 'bg-white border border-gray-100 shadow-sm' : 'bg-gray-50 border border-dashed border-gray-200'}`}>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => handleDayConfigChange(day, 'active', !config.active)}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${config.active ? 'bg-[#005f5f] border-[#005f5f]' : 'bg-transparent border-gray-300'}`}
                                    >
                                        {config.active && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                    </button>
                                    <span className={`font-bold text-lg ${!config.active ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {t[day.toLowerCase()]}
                                    </span>
                                </div>
                                
                                {config.active ? (
                                    <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                                        <button 
                                            onClick={() => handleDayConfigChange(day, 'periodCount', Math.max(1, config.periodCount - 1))}
                                            className="w-6 h-6 flex items-center justify-center text-[#005f5f] font-bold text-xl hover:bg-gray-200 rounded-full"
                                        >-</button>
                                        <span className="w-8 text-center font-bold text-gray-900">{config.periodCount}</span>
                                        <button 
                                            onClick={() => handleDayConfigChange(day, 'periodCount', Math.min(12, config.periodCount + 1))}
                                            className="w-6 h-6 flex items-center justify-center text-[#005f5f] font-bold text-xl hover:bg-gray-200 rounded-full"
                                        >+</button>
                                        <span className="text-xs font-bold text-gray-500 ml-2 tracking-wide">PERIODS</span>
                                    </div>
                                ) : (
                                    <span className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full tracking-wider">HOLIDAY / OFF</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <div className="pt-6">
            <div className="flex bg-gray-50 p-1 rounded-xl mb-8">
                <button 
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${activeTimingTab === 'default' ? 'bg-white text-[#005f5f] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    onClick={() => setActiveTimingTab('default')}
                >
                    Regular Days
                </button>
                {isFridayActive && (
                    <button 
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${activeTimingTab === 'friday' ? 'bg-white text-[#005f5f] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        onClick={() => setActiveTimingTab('friday')}
                    >
                        Friday
                    </button>
                )}
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-xl text-gray-900">Configuration</h5>
                    <div className="flex gap-2">
                        {!localAssembly[activeTimingTab] && (
                            <button onClick={handleToggleAssembly} className="text-sm font-bold bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-sm">
                                + Enable Assembly
                            </button>
                        )}
                        <button onClick={handleAddBreak} className="text-sm font-bold bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-sm">
                            + Add Break
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mb-6">
                    {localAssembly[activeTimingTab] && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border-l-4 border-[#2563eb] min-w-[150px]">
                            <div className="flex flex-col flex-1">
                                <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Active</span>
                                <span className="text-base font-bold text-gray-900">Assembly</span>
                            </div>
                            <button onClick={handleToggleAssembly} className="text-gray-400 hover:text-red-500 font-bold p-1">×</button>
                        </div>
                    )}
                    {localBreaks[activeTimingTab].map((b, idx) => (
                        <div key={b.id} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border-l-4 border-[#059669] min-w-[200px]">
                            <div className="flex flex-col flex-1">
                                <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Active</span>
                                <input 
                                    type="text" 
                                    value={b.name} 
                                    onChange={(e) => handleBreakConfigChange(idx, 'name', e.target.value)}
                                    className="text-base font-bold text-gray-900 bg-transparent focus:outline-none focus:border-b border-gray-300 w-full"
                                    placeholder="Break Name"
                                />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Before</span>
                                <select 
                                    value={b.beforePeriod} 
                                    onChange={(e) => handleBreakConfigChange(idx, 'beforePeriod', parseInt(e.target.value))}
                                    className="text-sm font-bold text-gray-900 bg-gray-50 rounded px-1 py-0.5 focus:outline-none"
                                >
                                    {Array.from({length: 12}, (_, i) => i + 1).map(p => <option key={p} value={p}>P{p}</option>)}
                                </select>
                            </div>
                            <button onClick={() => handleRemoveBreak(idx)} className="text-gray-400 hover:text-red-500 font-bold p-1">×</button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex justify-between items-center px-4 mb-4">
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Period / Event</span>
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Time Duration</span>
                </div>
                <div className="space-y-3">
                    {sortedSchedule.map((item, flatIndex) => {
                        const calculateDuration = (start: string, end: string) => {
                            if (!start || !end) return '';
                            const [startH, startM] = start.split(':').map(Number);
                            const [endH, endM] = end.split(':').map(Number);
                            const diff = (endH * 60 + endM) - (startH * 60 + startM);
                            return diff > 0 ? `${diff}m` : '';
                        };

                        if (item.type === 'period') {
                            const duration = calculateDuration(item.data.start, item.data.end);
                            return (
                                <div key={`p-${item.index}`} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl shadow-sm border-l-4 border-blue-200 gap-3">
                                    <div className="flex items-center gap-3 pl-2 w-full sm:w-auto">
                                        <input 
                                            type="text" 
                                            value={item.data.name || `Period ${item.index + 1}`} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'name', e.target.value)}
                                            className="text-base font-bold text-gray-900 bg-transparent focus:outline-none w-full sm:w-24"
                                            placeholder={`Period ${item.index + 1}`}
                                        />
                                    </div>
                                    <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 w-full sm:w-auto overflow-x-auto">
                                        {duration && <span className="text-sm font-medium text-gray-600 mr-2 pr-2 border-r border-gray-300 shrink-0">{duration}</span>}
                                        <input 
                                            type="time" 
                                            value={item.data.start} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'start', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none shrink-0"
                                        />
                                        <span className="text-gray-400 mx-1 shrink-0">-</span>
                                        <input 
                                            type="time" 
                                            value={item.data.end} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'end', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none shrink-0"
                                        />
                                    </div>
                                </div>
                            );
                        } else if (item.type === 'assembly') {
                            return (
                                <div key="assembly" className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#eff6ff] p-3 rounded-xl shadow-sm border-l-4 border-[#2563eb] gap-3">
                                    <div className="flex items-center gap-3 pl-2 text-[#2563eb] w-full sm:w-auto">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                                        <span className="text-base font-bold">Assembly</span>
                                    </div>
                                    <div className="flex items-center bg-white rounded-lg px-3 py-1.5 shadow-sm w-full sm:w-auto overflow-x-auto">
                                        <input 
                                            type="time" 
                                            value={item.data.start} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'start', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-[#2563eb] focus:outline-none shrink-0"
                                        />
                                        <span className="text-[#2563eb] mx-1 shrink-0">-</span>
                                        <input 
                                            type="time" 
                                            value={item.data.end} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'end', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-[#2563eb] focus:outline-none shrink-0"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-[#2563eb] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            );
                        } else {
                            // Break
                            const isLunch = item.data.name?.toLowerCase().includes('lunch');
                            const bgColor = isLunch ? 'bg-gray-100' : 'bg-[#ecfdf5]';
                            const borderColor = isLunch ? 'border-gray-500' : 'border-[#059669]';
                            const textColor = isLunch ? 'text-gray-700' : 'text-[#059669]';
                            const icon = isLunch ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"></path><path d="M3 11c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6"></path><path d="M12 15v4"></path><path d="M8 15v4"></path><path d="M16 15v4"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                            );

                            return (
                                <div key={`b-${item.index}`} className={`flex flex-col sm:flex-row sm:items-center justify-between ${bgColor} p-3 rounded-xl shadow-sm border-l-4 ${borderColor} gap-3`}>
                                    <div className={`flex items-center gap-3 pl-2 ${textColor} w-full sm:w-auto`}>
                                        <div className="shrink-0">{icon}</div>
                                        <span className="text-base font-bold">{item.data.name}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center bg-white rounded-lg px-3 py-1.5 shadow-sm w-full sm:w-auto">
                                        <input 
                                            type="time" 
                                            value={item.data.startTime} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'start', e.target.value)}
                                            className={`bg-transparent text-sm font-bold ${textColor} focus:outline-none shrink-0`}
                                        />
                                        <span className={`${textColor} mx-1 shrink-0`}>-</span>
                                        <input 
                                            type="time" 
                                            value={item.data.endTime} 
                                            onChange={(e) => updateScheduleData(flatIndex, 'end', e.target.value)}
                                            className={`bg-transparent text-sm font-bold ${textColor} focus:outline-none shrink-0`}
                                        />
                                        {isLunch ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 ${textColor} shrink-0`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 ${textColor} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    })}
                </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button onClick={() => setIsPrintPreviewOpen(true)} className="px-6 py-2 bg-white border border-[#005f5f] text-[#005f5f] font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print View
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-[#005f5f] text-white font-semibold rounded-lg shadow-md hover:bg-[#004c4c] transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Save
                </button>
            </div>
        </div>
    </div>
  );
};

export default TimetableStructureForm;
