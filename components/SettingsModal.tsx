
import React, { useRef, useState, useEffect } from 'react';
import realtimeService from '../services/realtimeService';
import { User, Role, AppSettings } from '../types';

const CategoryManager: React.FC = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [newEmoji, setNewEmoji] = useState('📦');
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const unsub = realtimeService.subscribe('categories', setCategories);
        return () => unsub();
    }, []);

    const handleAdd = () => {
        if (!newName.trim()) return;
        const newCategory = `${newEmoji} ${newName.trim()}`;
        if (categories.includes(newCategory)) {
            alert('Esta categoria já existe!');
            return;
        }
        const updated = [...categories, newCategory].sort((a, b) => a.localeCompare(b));
        realtimeService.saveCategories(updated);
        setNewName(''); setNewEmoji('📦'); setIsAdding(false);
    };

    const handleRemove = (cat: string) => {
        if (window.confirm(`Tem certeza que deseja remover a categoria "${cat}"?`)) {
            const updated = categories.filter(c => c !== cat);
            realtimeService.saveCategories(updated);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-black tracking-tight text-text-primary dark:text-dark-text-primary">Categorias</h3>
                {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline">+ Adicionar</button>
                )}
            </div>
            {isAdding && (
                <div className="bg-surface-light dark:bg-dark-surface-light p-4 rounded-2xl border border-primary/20 dark:border-primary/10 flex flex-col gap-3 animate-fade-in">
                    <div className="flex gap-2">
                        <input type="text" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-12 p-2 bg-surface dark:bg-dark-surface border-2 border-border-color dark:border-dark-border-color rounded-xl text-center text-text-primary dark:text-dark-text-primary" />
                        <input type="text" placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 p-2 bg-surface dark:bg-dark-surface border-2 border-border-color dark:border-dark-border-color rounded-xl text-sm font-bold text-text-primary dark:text-dark-text-primary" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted">Cancelar</button>
                        <button onClick={handleAdd} className="flex-1 py-2 text-[10px] font-black uppercase bg-primary text-white rounded-xl shadow-lg shadow-primary/20">Salvar</button>
                    </div>
                </div>
            )}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                    <div key={idx} className="group flex items-center gap-2 px-3 py-1.5 bg-surface-light dark:bg-dark-surface-light rounded-xl border border-border-color dark:border-dark-border-color transition-all hover:border-danger/30">
                        <span className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary">{cat}</span>
                        <button onClick={() => handleRemove(cat)} className="opacity-0 group-hover:opacity-100 text-danger transition-opacity">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};



const WhatsappSettings: React.FC = () => {
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [link, setLink] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const settings = realtimeService.getSettings();
        setWhatsappEnabled(!!settings?.whatsappEnabled);
        setLink(settings?.whatsappGroupLink || '');
        
        const unsub = realtimeService.subscribe('settings', (s) => {
            setWhatsappEnabled(!!s?.whatsappEnabled);
            // Only update link if not currently editing? 
            // Actually, let's just keep it simple.
            if (!isSaving) setLink(s?.whatsappGroupLink || '');
        });
        return () => unsub();
    }, [isSaving]);

    const handleSave = async () => {
        setIsSaving(true);
        const settings = realtimeService.getSettings();
        await realtimeService.updateSettings({ ...settings, whatsappGroupLink: link });
        setIsSaving(false);
        alert('Link do grupo salvo com sucesso!');
    };

    const toggleEnabled = () => {
        const settings = realtimeService.getSettings();
        realtimeService.updateSettings({ ...settings, whatsappEnabled: !whatsappEnabled });
    };

    return (
        <div className="flex flex-col gap-4 p-5 bg-success/5 dark:bg-success/10 rounded-[2rem] border-2 border-success/10 dark:border-success/20 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h3 className="text-sm font-black text-success dark:text-success uppercase tracking-tight">Notificações WhatsApp</h3>
                    <span className="text-[10px] text-success/70 dark:text-success/60 font-medium">Abrir WhatsApp ao pagar conta</span>
                </div>
                <button 
                    onClick={toggleEnabled} 
                    className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors ${whatsappEnabled ? 'bg-success' : 'bg-surface-light dark:bg-dark-surface-light'}`}
                >
                    <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            {whatsappEnabled && (
                <div className="space-y-3 animate-fade-in pt-2 border-t border-success/10 dark:border-success/20">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-success/80 dark:text-success/70 tracking-widest ml-1">Link do Grupo (Opcional)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="https://chat.whatsapp.com/..." 
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="flex-1 p-3 bg-surface dark:bg-dark-surface border-2 border-success/10 dark:border-success/20 rounded-xl text-xs font-bold text-text-primary dark:text-dark-text-primary outline-none focus:ring-2 ring-success/20 transition-all"
                            />
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 bg-success text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-success/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? '...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                    <p className="text-[9px] text-success/60 dark:text-success/40 italic px-1">
                        Se preenchido, o app facilitará o envio direto para este grupo.
                    </p>
                </div>
            )}
        </div>
    );
};



interface SettingsModalProps {
    isOpen: boolean; onClose: () => void; theme: 'light' | 'dark'; toggleTheme: () => void;
    onExportData: () => void; onImportData: (file: File) => void; onExportToCsv: () => void; onExportToExcel: () => void; currentUser: User | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, theme, toggleTheme, onExportData, onImportData, onExportToCsv, onExportToExcel, currentUser }) => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
    const isAdmin = true;

    useEffect(() => {
        if (!isOpen) return;
        const settings = realtimeService.getSettings();
        setLogoUrl(settings?.logoUrl);
        setWhatsappEnabled(!!settings?.whatsappEnabled);
        setWhatsappGroupLink(settings?.whatsappGroupLink || '');
        
        return realtimeService.subscribe('settings', (s) => {
            setLogoUrl(s?.logoUrl);
            setWhatsappEnabled(!!s?.whatsappEnabled);
            setWhatsappGroupLink(s?.whatsappGroupLink || '');
        });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            realtimeService.updateSettings({ ...realtimeService.getSettings(), logoUrl: event.target?.result as string });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-surface dark:bg-dark-surface rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border-color dark:border-dark-border-color">
                <div className="flex justify-between items-center mb-8 border-b border-border-color dark:border-dark-border-color pb-4">
                    <h2 className="text-3xl font-black tracking-tighter text-text-primary dark:text-dark-text-primary">Configurações</h2>
                    <button onClick={onClose} className="text-3xl text-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary transition-colors">&times;</button>
                </div>
                <div className="space-y-8 pb-4">
                    {isAdmin && (
                        <>
                            <div className="space-y-4">
                                <h3 className="text-lg font-black tracking-tight text-text-primary dark:text-dark-text-primary">Identidade Visual</h3>
                                <div className="flex items-center gap-6 p-6 bg-surface-light dark:bg-dark-surface-light rounded-3xl border-2 border-dashed border-primary/20">
                                    <div className="w-20 h-20 rounded-2xl bg-surface dark:bg-dark-surface overflow-hidden flex items-center justify-center shadow-lg">
                                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" /> : <span className="text-3xl">🦔</span>}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <button onClick={() => logoInputRef.current?.click()} className="text-[10px] font-black uppercase py-2.5 px-4 bg-primary text-white rounded-xl w-full shadow-md">Mudar Logo</button>
                                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <CategoryManager />
                    <WhatsappSettings />
                    <div className="flex items-center justify-between p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl">
                        <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">Modo Escuro</span>
                        <button onClick={toggleTheme} className={`relative inline-flex items-center h-7 rounded-full w-12 ${theme === 'dark' ? 'bg-primary' : 'bg-border-color dark:bg-dark-border-color'}`}>
                            <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <button onClick={onExportData} className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                            <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">Exportar Backup (JSON)</span>
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json';
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) onImportData(file);
                            };
                            input.click();
                        }} className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl hover:bg-success/5 dark:hover:bg-success/10 transition-colors">
                            <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">Importar Backup (JSON)</span>
                            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={onExportToCsv} className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors">
                            <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">Exportar Relatório (CSV)</span>
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={onExportToExcel} className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl hover:bg-success/5 dark:hover:bg-success/10 transition-colors">
                            <span className="text-sm font-bold text-text-primary dark:text-dark-text-primary">Exportar Excel (por Categoria)</span>
                            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                </div>
                <div className="flex justify-center pt-4">
                    <button onClick={onClose} className="px-10 py-3 text-xs font-black uppercase rounded-2xl bg-surface-light dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
