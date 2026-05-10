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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        if (data.session) {
          onLogin();
        } else {
          setError("Please check your email for a confirmation link.");
        }
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

          {!isSignUp && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-[#0f172a] px-2 text-gray-400 font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                   setLoading(true);
                   setError(null);
                   try {
                     const { error: googleError } = await supabase.auth.signInWithOAuth({
                       provider: 'google',
                       options: {
                         redirectTo: window.location.origin
                       }
                     });
                     if (googleError) throw googleError;
                   } catch (err: any) {
                     setError(err.message || "Google sign-in failed");
                     setLoading(false);
                   }
                }}
                disabled={loading}
                className="w-full py-4 bg-white dark:bg-black/20 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white font-black rounded-[1.25rem] hover:bg-gray-50 dark:hover:bg-black/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </>
          )}
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