
import React, { useState, useRef, useEffect } from 'react';
import type { SchoolClass, AttendanceData } from '../types';

interface AttendanceFormProps {
    t: any; // Translation object
    classItem: SchoolClass;
    currentDate: string;
    attendanceRecord?: AttendanceData;
    onSaveAttendance: (data: AttendanceData) => void;
    submitterName: string; // Name of the person who will submit the form
}

const SignatureModal: React.FC<{
    t: any;
    isOpen: boolean;
    onClose: () => void;
    onFinalSave: (signature: string) => Promise<void>; 
    initialSignature?: string;
}> = ({ t, isOpen, onClose, onFinalSave, initialSignature }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                if (initialSignature) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = initialSignature;
                }
            }
        }
    }, [isOpen, initialSignature]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isSubmitting) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (canvas && !isSubmitting) {
            setIsSubmitting(true);
            try {
                // Trigger the parent submission flow
                await onFinalSave(canvas.toDataURL());
                onClose();
            } catch (err) {
                console.error("Submission failed", err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[var(--bg-secondary)] rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl animate-scale-in border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t.signNow.toUpperCase()}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">Please sign in the box below.</p>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="p-3 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="border-4 border-dashed border-gray-200 rounded-3xl bg-white overflow-hidden touch-none shadow-inner mb-8">
                    <canvas 
                        ref={canvasRef}
                        width={1200}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className={`w-full h-auto bg-white block ${isSubmitting ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                    />
                </div>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="w-full h-16 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-4 text-lg disabled:opacity-70 disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-3">
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <span>SUBMIT</span>
                        )}
                    </button>
                    {!isSubmitting && (
                        <button onClick={handleClear} className="text-sm font-bold uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors">
                            {t.clearSignature}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AttendanceForm: React.FC<AttendanceFormProps> = ({ t, classItem, currentDate, attendanceRecord, onSaveAttendance, submitterName }) => {
    const [absent, setAbsent] = useState(attendanceRecord?.absent || 0);
    const [sick, setSick] = useState(attendanceRecord?.sick || 0);
    const [leave, setLeave] = useState(attendanceRecord?.leave || 0);
    const [signature, setSignature] = useState(attendanceRecord?.signature || '');
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);

    const presentCount = Math.max(0, classItem.studentCount - (absent + sick + leave));

    useEffect(() => {
        setAbsent(attendanceRecord?.absent || 0);
        setSick(attendanceRecord?.sick || 0);
        setLeave(attendanceRecord?.leave || 0);
        setSignature(attendanceRecord?.signature || '');
    }, [attendanceRecord, classItem.id]);

    const handleFinalSubmit = async (sig: string) => {
        // 1. Prepare data objects
        const attendanceData: AttendanceData = { 
            present: presentCount, 
            absent, 
            sick, 
            leave, 
            signature: sig,
            submittedBy: submitterName 
        };

        const fileData = { 
            date: currentDate,
            classId: classItem.id,
            className: classItem.nameEn,
            attendance: attendanceData 
        };
        const jsonString = JSON.stringify(fileData, null, 2);
        
        // Parse YYYY-MM-DD to DD-MM-YYYY for filename
        const [year, month, day] = currentDate.split('-');
        const formattedDate = `${day}-${month}-${year}`;
        const fileName = `${formattedDate} ${classItem.nameEn}.json`;
        
        // Local Save in state
        setSignature(sig);
        onSaveAttendance(attendanceData);

        // Download JSON file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const inputRowClass = "flex flex-col gap-1 w-full min-w-0";
    const labelClass = "text-[9px] sm:text-[11px] font-black uppercase text-[var(--text-placeholder)] px-1 tracking-widest truncate";
    const valueContainerClass = "w-full py-3 sm:py-4 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-xl sm:rounded-2xl text-[var(--text-primary)] font-black text-center text-xl sm:text-2xl shadow-inner transition-all";

    return (
        <div className="max-w-2xl mx-auto bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2.5rem] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500"></div>
            
            <SignatureModal 
                t={t} 
                isOpen={isSignModalOpen} 
                onClose={() => setIsSignModalOpen(false)} 
                onFinalSave={handleFinalSubmit} 
                initialSignature={signature}
            />
            
            <div className="flex flex-col gap-6 mt-4">
                <div className="bg-[var(--bg-tertiary)]/50 p-4 rounded-2xl border border-[var(--border-secondary)]">
                    <span className="text-[10px] font-black uppercase text-[var(--text-placeholder)] block mb-1">Submitted By</span>
                    <div className="text-lg font-bold text-[var(--accent-primary)] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        {submitterName}
                    </div>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className={inputRowClass}>
                        <label className={labelClass}>{t.totalStudents.toUpperCase()}</label>
                        <div className={valueContainerClass}>{classItem.studentCount}</div>
                    </div>

                    <div className={inputRowClass}>
                        <label className={`${labelClass} text-emerald-600`}>{t.present.toUpperCase()}</label>
                        <div className="w-full py-3 sm:py-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl sm:rounded-2xl text-emerald-700 dark:text-emerald-400 font-black text-center text-xl sm:text-2xl">
                            {presentCount}
                        </div>
                    </div>

                    <div className={inputRowClass}>
                        <label className={`${labelClass} text-red-600`}>{t.absent.toUpperCase()}</label>
                        <input 
                            type="number" 
                            value={absent || ''} 
                            onChange={(e) => setAbsent(Math.min(classItem.studentCount, Math.max(0, parseInt(e.target.value) || 0)))} 
                            className="w-full py-3 sm:py-4 bg-[var(--bg-tertiary)] border border-red-100 dark:border-red-900 rounded-xl sm:rounded-2xl text-red-700 dark:text-red-400 font-black text-center text-xl sm:text-2xl outline-none focus:border-red-400 transition-all shadow-inner"
                        />
                    </div>

                    <div className={inputRowClass}>
                        <label className={`${labelClass} text-amber-600`}>{t.sick.toUpperCase()}</label>
                        <input 
                            type="number" 
                            value={sick || ''} 
                            onChange={(e) => setSick(Math.min(classItem.studentCount, Math.max(0, parseInt(e.target.value) || 0)))} 
                            className="w-full py-3 sm:py-4 bg-[var(--bg-tertiary)] border border-amber-100 dark:border-amber-900 rounded-xl sm:rounded-2xl text-amber-700 dark:text-amber-400 font-black text-center text-xl sm:text-2xl outline-none focus:border-amber-400 transition-all shadow-inner"
                        />
                    </div>

                    <div className={inputRowClass}>
                        <label className={`${labelClass} text-blue-600`}>{t.leave.toUpperCase()}</label>
                        <input 
                            type="number" 
                            value={leave || ''} 
                            onChange={(e) => setLeave(Math.min(classItem.studentCount, Math.max(0, parseInt(e.target.value) || 0)))} 
                            className="w-full py-3 sm:py-4 bg-[var(--bg-tertiary)] border border-blue-100 dark:border-blue-900 rounded-xl sm:rounded-2xl text-blue-700 dark:text-blue-400 font-black text-center text-xl sm:text-2xl outline-none focus:border-blue-400 transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <button 
                        onClick={() => setIsSignModalOpen(true)}
                        className={`w-full h-24 rounded-3xl border-4 transition-all duration-500 flex items-center justify-center ${signature ? 'border-emerald-500 bg-emerald-50/50' : 'border-dashed border-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/40 hover:border-emerald-500'}`}
                    >
                        {signature ? (
                            <div className="flex flex-col items-center gap-2">
                                <img src={signature} alt="Sign" className="h-12 object-contain" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t.submitAttendance}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 opacity-40">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-700 dark:text-emerald-400">{t.tapToSign.toUpperCase()}</span>
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{t.submitAttendance.toUpperCase()}</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceForm;
