import React, { useState, useRef, useEffect } from 'react';
import { type User } from '../types';
import { Plus } from 'lucide-react';
import realtimeService from '../services/realtimeService';

const TatuIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Corpo/Casco do Tatu */}
    <path d="M20 65C20 45 35 35 50 35C65 35 80 45 80 65H20Z" fill="#1e293b" />
    <path d="M32 38C38 36 44 35 50 35C56 35 62 36 68 38L65 65H35L32 38Z" fill="#334155" />
    {/* Segmentos do Casco */}
    <path d="M40 36V65M50 35V65M60 36V65" stroke="#475569" strokeWidth="1.5" />
    {/* Cabeça */}
    <path d="M15 55C15 50 22 50 25 55V65H15V55Z" fill="#6366f1" />
    {/* Olho */}
    <circle cx="20" cy="58" r="1.5" fill="#ffffff" />
    {/* Rabo */}
    <path d="M80 60L88 65H80V60Z" fill="#6366f1" />
    {/* Patas */}
    <rect x="30" y="65" width="10" height="5" rx="1" fill="#6366f1" />
    <rect x="60" y="65" width="10" height="5" rx="1" fill="#6366f1" />
  </svg>
);


interface HeaderProps {
  currentUser: User;
  onSettingsClick: () => void;
  onLogout: () => void;
  activeView?: string;
  onViewChange?: (view: any) => void;
  isAdmin?: boolean;
  onAddClick?: () => void;
  mobileStats?: { total: number; paid: number };
}

const Header: React.FC<HeaderProps> = ({ currentUser, onSettingsClick, onLogout, activeView, onViewChange, isAdmin, onAddClick, mobileStats }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const settings = realtimeService.getSettings();
    if (settings) setLogoUrl(settings.logoUrl);

    const unsub = realtimeService.subscribe('settings', (newSettings) => {
        if (newSettings) setLogoUrl(newSettings.logoUrl);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-surface/80 dark:bg-dark-background/80 backdrop-blur-2xl shadow-sm sticky top-0 z-30 border-b border-slate-100 dark:border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-primary/10 shadow-sm border border-primary/20 transform hover:scale-105 transition-transform cursor-pointer">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-7 h-7 flex items-center justify-center bg-primary rounded-lg text-white">
                          <TatuIcon className="w-5 h-5" />
                        </div>
                    )}
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-black text-navy dark:text-gray-100 leading-none tracking-tighter">TATU<span className="text-primary italic">.</span></h1>
                </div>
            </div>
          </div>

          {/* Embedded Nav tabs inside the header */}
          {onViewChange && (
            <nav className="hidden sm:flex items-center bg-slate-50 dark:bg-dark-surface p-1 rounded-full border border-slate-100 dark:border-dark-border-color shadow-sm gap-1">
              <button 
                onClick={() => onViewChange('dashboard')} 
                className={`px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                  activeView === 'dashboard' 
                    ? 'bg-white dark:bg-dark-surface-light text-primary shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-primary'
                }`}
              >
                Início
              </button>
              <button 
                onClick={() => onViewChange('accounts')} 
                className={`px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                  activeView === 'accounts' 
                    ? 'bg-white dark:bg-dark-surface-light text-primary shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-primary'
                }`}
              >
                Contas
              </button>
              <button 
                onClick={() => onViewChange('income')} 
                className={`px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                  activeView === 'income' 
                    ? 'bg-white dark:bg-dark-surface-light text-primary shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-primary'
                }`}
              >
                Entradas
              </button>

            </nav>
          )}

          {/* Mobile Stats Summary */}
          {mobileStats && (
            <div className="flex sm:hidden flex-col items-center justify-center text-[10px] bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border-color px-2.5 py-1 rounded-2xl font-bold leading-normal text-center shadow-sm">
              <div className="text-[7px] uppercase tracking-wider text-text-muted dark:text-dark-text-muted font-black -mb-0.5">Total / Pago</div>
              <div className="flex items-center gap-1 font-mono text-[9px] text-text-primary dark:text-gray-100">
                <span className="text-slate-500 dark:text-slate-400 font-extrabold">{mobileStats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="text-text-muted font-normal">|</span>
                <span className="text-success font-black">{mobileStats.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2.5">
            {onAddClick && (
              <button
                onClick={onAddClick}
                className="hidden sm:flex items-center justify-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-primary dark:bg-primary text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm shadow-primary/25"
                title="Novo Lançamento"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                <span className="hidden sm:inline">Novo</span>
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="group flex items-center gap-2 bg-slate-50 dark:bg-dark-surface p-1 pr-3 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all shadow-sm active:scale-95"
                aria-label="Abrir menu do usuário"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:rotate-6 transition-transform">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[11px] font-black text-text-primary dark:text-white leading-none">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[9px] font-bold text-text-muted dark:text-gray-400 mt-0.5">
                    Painel Pessoal
                  </p>
                </div>
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-surface dark:bg-dark-surface rounded-3xl shadow-2xl py-2 z-40 border border-slate-100 dark:border-white/5 animate-fade-in animate-duration-150">
                  <div className="px-6 py-4 border-b border-border-color/20 dark:border-white/5">
                    <p className="text-sm font-black text-text-primary dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs font-bold text-text-muted truncate">@{currentUser.username}</p>
                  </div>
                  <div className="py-2 px-2 space-y-1">
                    <button
                      onClick={() => { onSettingsClick(); setIsUserMenuOpen(false); }}
                      className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 hover:text-primary dark:hover:text-primary rounded-xl transition-all group"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       <span>Configurações</span>
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/10 rounded-xl transition-all group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 5 0 01-3 3H6a3 3 5 0 01-3-3V7a3 3 5 0 013-3h4a3 3 5 0 013 3v1" /></svg>
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;