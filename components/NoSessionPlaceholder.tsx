
import React from 'react';

const NoSessionPlaceholder = ({ t }: { t: any }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 animate-scale-in relative overflow-hidden">
    {/* Background Decorations */}
    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--accent-primary)] rounded-full blur-[100px] animate-pulse pointer-events-none opacity-20 mix-blend-screen" style={{ animationDuration: '4s' }}></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400 rounded-full blur-[100px] animate-pulse pointer-events-none opacity-20 mix-blend-screen" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>

    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl shadow-2xl p-12 max-w-2xl w-full transition-all duration-500">
      
      {/* Card Gloss */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-28 h-28 bg-gradient-to-br from-[var(--accent-primary)] to-cyan-400 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-[var(--accent-primary)]/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-white/20">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        
        <h2 className="text-4xl font-black text-[var(--text-primary)] mb-4 tracking-tight drop-shadow-sm bg-clip-text text-transparent bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-secondary)]">
          {t.noActiveSessionTitle}
        </h2>
        
        <div className="w-16 h-1.5 bg-[var(--accent-primary)] rounded-full mb-6 opacity-80"></div>

        <p className="text-xl text-[var(--text-secondary)] font-medium leading-relaxed max-w-md mx-auto opacity-90">
          {t.createOrUploadMessage}
        </p>
        
        {/* Visual Cue */}
        <div className="mt-12 flex gap-3 opacity-40">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  </div>
);

export default NoSessionPlaceholder;
