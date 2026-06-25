import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import realtimeService from '../services/realtimeService';

const TatuIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 65C20 45 35 35 50 35C65 35 80 45 80 65H20Z" className="fill-slate-800 dark:fill-slate-200" />
    <path d="M32 38C38 36 44 35 50 35C56 35 62 36 68 38L65 65H35L32 38Z" className="fill-slate-700 dark:fill-slate-300" />
    <path d="M40 36V65M50 35V65M60 36V65" className="stroke-slate-600 dark:stroke-slate-400" strokeWidth="1.5" />
    <path d="M15 55C15 50 22 50 25 55V65H15V55Z" className="fill-primary" />
    <circle cx="20" cy="58" r="1.5" fill="#ffffff" />
    <path d="M80 60L88 65H80V60Z" className="fill-primary" />
    <rect x="30" y="65" width="10" height="5" rx="1" className="fill-primary" />
    <rect x="60" y="65" width="10" height="5" rx="1" className="fill-primary" />
  </svg>
);

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onNavigateToRegister: () => void; // Unused but kept in prop definition to avoid type errors
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const settings = realtimeService.getSettings();
    if (settings) setLogoUrl(settings.logoUrl);

    const unsub = realtimeService.subscribe('settings', (newSettings) => {
        if (newSettings) setLogoUrl(newSettings.logoUrl);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Always login with 'jessica' under the hood
    const success = await onLogin('jessica', password);
    if (!success) {
      setError('Senha incorreta. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-gray-100 overflow-hidden font-sans flex items-center justify-center p-6 transition-colors duration-500">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 dark:bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px] p-8 rounded-[2.5rem] bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border-color shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:shadow-none"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-slate-50 dark:bg-dark-surface-light rounded-2xl border border-slate-100 dark:border-dark-border-color flex items-center justify-center mb-6 shadow-xs">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <TatuIcon className="w-10 h-10" />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-1 uppercase text-slate-900 dark:text-white">
            TATU<span className="text-primary">.</span>
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-6">Finanças Pessoais</p>
          
          {/* Jessica Personal Profile Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md mb-3 transform hover:scale-105 transition-transform duration-300">
            J
          </div>
          
          <h2 className="text-xl font-black tracking-tight mb-1 text-slate-900 dark:text-white">Olá, Jéssica!</h2>
          <p className="text-slate-500 dark:text-dark-text-secondary text-xs font-medium">Insira sua senha para gerenciar suas contas.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Sua Senha</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                autoFocus
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-surface-light border border-slate-200 dark:border-dark-border-color focus:border-primary/50 focus:bg-white dark:focus:bg-dark-surface focus:ring-4 focus:ring-primary/5 dark:focus:ring-primary/10 rounded-2xl outline-none transition-all text-sm font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black text-center uppercase tracking-wider"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full py-4 bg-gradient-to-r from-primary via-purple-600 to-primary bg-[length:200%_auto] text-white text-xs font-black uppercase tracking-widest rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 hover:bg-right duration-500 shadow-xl shadow-primary/20 dark:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no Painel
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </button>
        </form>
      </motion.div>

      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-700">
          &copy; {new Date().getFullYear()} Tatu Financeiro
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
