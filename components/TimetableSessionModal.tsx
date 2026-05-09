import React, { useState, useEffect, useRef } from 'react';
import type { TimetableSession, SchoolConfig } from '../types';
import { Upload } from 'lucide-react';

interface TimetableSessionModalProps {
  t: any; // Translation object
  isOpen: boolean;
  onClose: () => void;
  session: TimetableSession | null; // Null for creation, object for editing
  onCreate: (name: string, startDate: string, endDate: string, schoolNameEn?: string, schoolNameUr?: string, schoolLogo?: string | null) => void;
  onUpdate: (id: string, name: string, startDate: string, endDate: string) => void;
  setFeedback: (feedback: { message: string; type: 'success' | 'error' | null }) => void;
  schoolConfig?: SchoolConfig;
}

const TimetableSessionModal: React.FC<TimetableSessionModalProps> = ({
  t,
  isOpen,
  onClose,
  session,
  onCreate,
  onUpdate,
  setFeedback,
  schoolConfig
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schoolNameEn, setSchoolNameEn] = useState(schoolConfig?.schoolNameEn || '');
  const [schoolNameUr, setSchoolNameUr] = useState(schoolConfig?.schoolNameUr || '');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(schoolConfig?.schoolLogoBase64 || null);
  
  const defaultSchoolLogo = null;
  const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  useEffect(() => {
    if (isOpen) {
      if (session) {
        setName(session.name);
        setStartDate(session.startDate);
        setEndDate(session.endDate);
      } else {
        setName('');
        setStartDate('');
        setEndDate('');
        setSchoolNameEn(schoolConfig?.schoolNameEn || '');
        setSchoolNameUr(schoolConfig?.schoolNameUr || '');
        setSchoolLogo(schoolConfig?.schoolLogoBase64 || null);
      }
    }
  }, [isOpen, session, schoolConfig]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSchoolLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveLogo = () => {
      setSchoolLogo(defaultSchoolLogo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setFeedback({ message: t.failedToCopyTimetable?.replace('{reason}', 'Please fill all fields.') || 'Please fill all fields.', type: 'error' });
      return;
    }
    
    if (!session && (!schoolNameEn || !schoolNameUr)) {
      setFeedback({ message: 'School Name (English & Urdu) are required.', type: 'error' });
      return;
    }

    if (session) {
      onUpdate(session.id, name, startDate, endDate);
      setFeedback({ message: t.sessionUpdatedSuccessfully?.replace('{name}', name) || 'Session updated successfully', type: 'success' });
    } else {
      onCreate(name, startDate, endDate, schoolNameEn, schoolNameUr, schoolLogo === transparentPixel ? null : schoolLogo);
      setFeedback({ message: t.sessionCreatedSuccessfully?.replace('{name}', name) || 'Session created successfully', type: 'success' });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timetableSessionModalTitle"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-[30px] shadow-2xl border border-white/50 dark:border-white/10 p-6 sm:p-8 rounded-[2rem] max-w-lg w-full transform transition-all max-h-[95vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="timetableSessionModalTitle" className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">
          {session ? t.edit || 'Edit' : t.createTimetableSession || 'Create Session'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!session && (
            <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4 mb-6">
                <h4 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-2">School Information</h4>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                    School Name (English)
                  </label>
                  <input
                    type="text"
                    value={schoolNameEn}
                    onChange={(e) => setSchoolNameEn(e.target.value)}
                    className="block w-full px-4 py-3 bg-[var(--bg-tertiary)] border-none rounded-xl text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                    School Name (Urdu)
                  </label>
                  <input
                    type="text"
                    value={schoolNameUr}
                    onChange={(e) => setSchoolNameUr(e.target.value)}
                    dir="rtl"
                    className="block w-full px-4 py-3 bg-[var(--bg-tertiary)] border-none rounded-xl text-sm font-bold font-urdu text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    required
                  />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                        School Logo
                    </label>
                    <div className="flex items-center gap-4">
                        {schoolLogo && schoolLogo !== transparentPixel ? (
                            <div className="relative">
                                <img src={schoolLogo} alt="School Logo" className="w-16 h-16 object-contain rounded-xl border-2 border-[var(--accent-primary)] shadow-sm bg-white" />
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                <span className="text-gray-400 text-xs text-center px-1">No Logo</span>
                            </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-secondary-hover)] text-sm font-bold text-[var(--text-primary)] rounded-xl cursor-pointer transition-colors shadow-sm">
                            <Upload className="w-4 h-4" />
                            <span>Upload Logo</span>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
          )}

          <div>
            <label htmlFor="session-name" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              {t.timetableSessionName || 'Session Name'}
            </label>
            <input
              type="text"
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-4 py-3 bg-[var(--bg-tertiary)] border-none rounded-xl text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                {t.startDate || 'Start Date'}
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--bg-tertiary)] border-none rounded-xl text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                required
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                {t.endDate || 'End Date'}
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full px-4 py-3 bg-[var(--bg-tertiary)] border-none rounded-xl text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-2xl hover:bg-[var(--accent-secondary-hover)] transition-colors active:scale-95"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-black text-white bg-[var(--accent-primary)] rounded-2xl hover:bg-opacity-90 transition-all shadow-md active:scale-95"
            >
              {session ? t.update || 'Update' : t.create || 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimetableSessionModal;