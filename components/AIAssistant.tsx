
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { TimetableSession } from '../types';

interface AIAssistantProps {
  currentSession: TimetableSession | null;
}

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AIAssistant: React.FC<AIAssistantProps> = ({ currentSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    if (!currentSession) {
        setMessages(prev => [...prev, { role: 'user', text: input }, { role: 'model', text: 'Please select or create a timetable session first.' }]);
        setInput('');
        return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Serialize context safely
      const contextData = {
        name: currentSession.name,
        startDate: currentSession.startDate,
        endDate: currentSession.endDate,
        teachers: currentSession.teachers.map(t => ({ id: t.id, name: t.nameEn, contact: t.contactNumber })),
        subjects: currentSession.subjects.map(s => ({ id: s.id, name: s.nameEn })),
        classes: currentSession.classes.map(c => ({
            id: c.id,
            name: c.nameEn,
            inCharge: c.inCharge,
            subjects: c.subjects, 
            timetable: c.timetable 
        })),
        adjustments: currentSession.adjustments,
        schoolConfig: {
            name: "School", // simplified
            days: currentSession.daysConfig
        }
      };

      const systemPrompt = `
        You are "Mr. TMS AI", an expert school timetable assistant.
        You have full access to the current timetable session data JSON below.
        
        DATA CONTEXT:
        ${JSON.stringify(contextData)}
        
        YOUR CAPABILITIES:
        1. Analyze teacher workloads and availability.
        2. Identify conflicts or gaps in the schedule.
        3. Suggest substitutions for absent teachers.
        4. Explain specific class schedules.
        
        RULES:
        - Use the provided data to answer accuracy.
        - If the user asks to modify data, explain that you can suggest changes but cannot edit the database directly yet.
        - Be helpful, professional, and concise.
        - Format your response with clear text.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text || "I couldn't generate a thought-out response. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text }]);

    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = "Sorry, I encountered an error.";
      if (error.message?.includes('API key')) errorMessage = "API Key missing or invalid.";
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[90] bottom-24 left-4 xl:bottom-8 xl:left-8 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 ${
          isOpen ? 'bg-red-500 rotate-90 text-white' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
        }`}
        title="AI Assistant (Thinking Mode)"
      >
        {isOpen ? <CloseIcon /> : <SparklesIcon />}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed z-[90] bottom-40 left-4 xl:bottom-24 xl:left-8 w-[90vw] sm:w-96 max-w-[400px] flex flex-col bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] transition-all duration-300 origin-bottom-left overflow-hidden ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-10 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 180px)', height: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
          <div className="flex items-center gap-2">
            <SparklesIcon />
            <div>
                <h3 className="font-bold text-base leading-none">Mr. TMS AI</h3>
                <span className="text-[10px] opacity-90 font-mono">gemini-3-flash</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[var(--bg-tertiary)]/50 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-[var(--text-secondary)] mt-10 px-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">🤔</span>
              </div>
              <p className="text-sm font-medium">Hello! I'm your Mr. TMS assistant.</p>
              <p className="text-xs mt-1 opacity-70">Ask me to analyze workloads, find free teachers, or check for conflicts.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs font-bold text-purple-500 animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the timetable..."
            className="flex-grow px-4 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
};

export default AIAssistant;