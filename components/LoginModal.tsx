import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn, AlertCircle, Loader2 } from 'lucide-react';

interface LoginModalProps {
  t: any; // Translation object
  onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ t, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setError("Please check your email for a confirmation link.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#0f172a] shadow-2xl border border-white/20 dark:border-white/5 p-8 rounded-[2.5rem] max-w-md w-full transform transition-all animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[var(--accent-primary)] rounded-[1.5rem] flex items-center justify-center text-white mb-4 shadow-lg shadow-[var(--accent-primary)]/20">
                {isSignUp ? <UserPlus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
            </div>
            <h3 className="text-3xl font-black text-center text-gray-900 dark:text-white uppercase tracking-tight">
                {isSignUp ? "Join Us" : "Welcome Back"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                {isSignUp ? "Create your school account" : "Sign in to your dashboard"}
            </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">
              Email Address
            </label>
            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-[1.25rem] text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    placeholder="name@school.com"
                    required
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest ml-4">
              Password
            </label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-[1.25rem] text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    placeholder="••••••••"
                    required
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[var(--accent-primary)] text-white font-black rounded-[1.25rem] hover:bg-[var(--accent-primary-hover)] transition-all shadow-lg shadow-[var(--accent-primary)]/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? "Sign Up" : "Sign In")}
          </button>
        </form>

        <div className="mt-8 text-center">
            <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-bold text-gray-500 hover:text-[var(--accent-primary)] transition-colors uppercase tracking-widest"
            >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;