
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Account, AccountStatus, type Income, type User } from '../types';
import SearchBar from './SearchBar';
import MonthPicker from './MonthPicker';
import FloatingCalculator from './FloatingCalculator';
import { getMonthlyAccounts } from '../utils/accountUtils';
import { getCategoryIcon } from '../utils/categoryIcons';
import { format } from 'date-fns';
import { Tag, Search, Calendar, DollarSign, Repeat, CheckCircle2, Edit2, Trash2, Receipt, Calculator, ArrowRightLeft, MoreVertical, Sparkles } from 'lucide-react';
import * as dataService from '../services/dataService';

interface AccountsViewProps {
  accounts: Account[];
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onToggleStatus: (account: Account) => void;
  onToggleMultipleStatus: (accounts: Account[]) => void;
  onNotifyWhatsApp?: (account: Account) => void;
  whatsappEnabled?: boolean;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onOpenMoveModal: () => void;
  categories: string[];
  activeGroupId?: string;
}

const AccountsView: React.FC<AccountsViewProps> = ({ accounts, onEditAccount, onDeleteAccount, onToggleStatus, onToggleMultipleStatus, onNotifyWhatsApp, whatsappEnabled, selectedDate, setSelectedDate, onOpenMoveModal, categories, activeGroupId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterRecurrent, setFilterRecurrent] = useState(false);
  const [filterInstallment, setFilterInstallment] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Spreadsheet Tabs: 'principal' (main list) vs 'conversa' (assistant chat captured accounts)
  const [activeSpreadsheetTab, setActiveSpreadsheetTab] = useState<'principal' | 'conversa'>('principal');

  const conversationAccounts = useMemo(() => {
    return accounts
      .filter(acc => acc.category?.startsWith("💬 Conversa"))
      .map(acc => {
        let status = AccountStatus.PENDING;
        let paymentMethod: 'dinheiro' | 'credito' | undefined = undefined;

        if (acc.category === "💬 Conversa - Dinheiro") {
          status = AccountStatus.PAID;
          paymentMethod = 'dinheiro';
        } else if (acc.category === "💬 Conversa - Crédito") {
          status = AccountStatus.PAID;
          paymentMethod = 'credito';
        }

        return {
          id: acc.id,
          groupId: acc.groupId,
          name: acc.name,
          value: acc.value,
          category: "📦 Outros",
          status,
          paymentMethod,
          createdAt: acc.paymentDate,
        };
      });
  }, [accounts]);

  const handleDeleteConversationItem = async (id: string) => {
    try {
      await dataService.deleteAccount(id);
    } catch (err) {
      console.error("Erro ao deletar item da conversa:", err);
    }
  };

  const handleCloseConversationTab = async () => {
    if (conversationAccounts.length === 0) {
      alert("Nenhuma conta na lista para fechar!");
      return;
    }

    try {
      let creditTotal = 0;
      let cashTotal = 0;
      const pendingItems: any[] = [];

      conversationAccounts.forEach(item => {
        if (item.status === AccountStatus.PENDING) {
          pendingItems.push(item);
        } else if (item.status === AccountStatus.PAID) {
          if (item.paymentMethod === 'credito') {
            creditTotal += Number(item.value);
          } else if (item.paymentMethod === 'dinheiro') {
            cashTotal += Number(item.value);
          }
        }
      });

      // 1. Add all individual pending items to main accounts
      for (const item of pendingItems) {
        const newAcc: Account = {
          id: `acc-conv-pend-${Date.now()}-${Math.random()}`,
          groupId: activeGroupId || item.groupId || 'jessica-personal',
          name: item.name,
          category: '📦 Outros',
          value: Number(item.value),
          status: AccountStatus.PENDING,
          isRecurrent: false,
          isInstallment: false,
          paymentDate: new Date().toISOString()
        };
        await dataService.addAccount(newAcc);
      }

      // 2. Sum and add to Credit Card ("Cartão")
      if (creditTotal > 0) {
        const existingCard = accounts.find(a => 
          a.name.toLowerCase() === 'cartão' || 
          a.name.toLowerCase().includes('cartão')
        );

        if (existingCard) {
          const updatedAcc = {
            ...existingCard,
            value: Number(existingCard.value) + creditTotal
          };
          await dataService.updateAccount(updatedAcc);
        } else {
          const newAcc: Account = {
            id: `acc-conv-card-${Date.now()}`,
            groupId: activeGroupId || 'jessica-personal',
            name: 'Cartão',
            category: '💳 Cartão',
            value: creditTotal,
            status: AccountStatus.PENDING,
            isRecurrent: false,
            isInstallment: false,
            paymentDate: new Date().toISOString()
          };
          await dataService.addAccount(newAcc);
        }
      }

      // 3. Sum and add to "Gastos Mês" (for cash/à vista paid accounts)
      if (cashTotal > 0) {
        const existingCash = accounts.find(a => 
          a.name.toLowerCase() === 'gastos mês' || 
          a.name.toLowerCase().includes('gastos m')
        );

        if (existingCash) {
          const updatedAcc = {
            ...existingCash,
            value: Number(existingCash.value) + cashTotal
          };
          await dataService.updateAccount(updatedAcc);
        } else {
          const newAcc: Account = {
            id: `acc-conv-cash-${Date.now()}`,
            groupId: activeGroupId || 'jessica-personal',
            name: 'Gastos Mês',
            category: '📦 Outros',
            value: cashTotal,
            status: AccountStatus.PAID,
            isRecurrent: false,
            isInstallment: false,
            paymentDate: new Date().toISOString()
          };
          await dataService.addAccount(newAcc);
        }
      }

      // 4. Delete the temporary conversation accounts from DB!
      for (const item of conversationAccounts) {
        await dataService.deleteAccount(item.id);
      }

      // 5. Navigate back to principal tab
      setActiveSpreadsheetTab('principal');

      alert("Aba fechada com sucesso! As contas de " + (pendingItems.length + (creditTotal > 0 ? 1 : 0) + (cashTotal > 0 ? 1 : 0)) + " transações foram inseridas e consolidadas na planilha!");
    } catch (err) {
      console.error("Erro ao fechar aba de conversas:", err);
      alert("Erro ao consolidar as contas. Tente novamente.");
    }
  };
  
  const safeDate = useMemo(() => {
    return selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();
  }, [selectedDate]);

  const { pendingAccounts, paidAccounts } = useMemo(() => {
    const allForMonth = getMonthlyAccounts(accounts, safeDate);
    
    const filtered = allForMonth.filter(acc => {
        const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || acc.status === filterStatus;
        const matchesCategory = filterCategory === 'ALL' || acc.category === filterCategory;
        const matchesRecurrent = !filterRecurrent || acc.isRecurrent;
        const matchesInstallment = !filterInstallment || acc.isInstallment;
        return matchesSearch && matchesStatus && matchesCategory && matchesRecurrent && matchesInstallment;
    });

    const sortFn = (a: Account, b: Account) => {
        if (filterInstallment) {
            const remainingA = (a.totalInstallments || 0) - (a.currentInstallment || 0);
            const remainingB = (b.totalInstallments || 0) - (b.currentInstallment || 0);
            if (remainingA !== remainingB) {
                return remainingA - remainingB;
            }
        }
        return a.name.localeCompare(b.name);
    };

    return {
        pendingAccounts: filtered.filter(acc => acc.status === AccountStatus.PENDING).sort(sortFn),
        paidAccounts: filtered.filter(acc => acc.status === AccountStatus.PAID).sort(sortFn)
    };
  }, [accounts, safeDate, searchTerm, filterStatus, filterCategory, filterRecurrent, filterInstallment]);

  const toggleSelection = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePaySelected = () => {
    const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));
    if (selectedAccounts.length > 0) {
      onToggleMultipleStatus(selectedAccounts);
      setSelectedAccountIds([]);
    }
  };

  const totalSelectedValue = useMemo(() => {
    return accounts
      .filter(acc => selectedAccountIds.includes(acc.id))
      .reduce((sum, acc) => sum + Number(acc.value), 0);
  }, [accounts, selectedAccountIds]);

  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  const getCategoryStyle = (category: string) => {
    const rawName = (category || '').toUpperCase();
    
    // Default fallback
    let style = {
        bg: 'bg-slate-50 dark:bg-slate-900/30',
        border: 'border-slate-100 dark:border-slate-800',
        text: 'text-slate-600 dark:text-slate-400'
    };

    if (rawName.includes('LAZER') || rawName.includes('FESTA') || rawName.includes('EVENTO') || rawName.includes('PLAY')) {
        style = {
            bg: 'bg-rose-50 dark:bg-rose-950/20',
            border: 'border-rose-100 dark:border-rose-900/30',
            text: 'text-rose-600 dark:text-rose-400'
        };
    } else if (rawName.includes('CARTÃO') || rawName.includes('CRÉDITO') || rawName.includes('CARD') || rawName.includes('BANCO')) {
        style = {
            bg: 'bg-violet-50 dark:bg-violet-950/20',
            border: 'border-violet-100 dark:border-violet-900/30',
            text: 'text-violet-600 dark:text-violet-400'
        };
    } else if (rawName.includes('SAÚDE') || rawName.includes('DR') || rawName.includes('MEDICINA') || rawName.includes('FARMÁCIA') || rawName.includes('MÉDICO')) {
        style = {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            border: 'border-emerald-100 dark:border-emerald-900/30',
            text: 'text-emerald-700 dark:text-emerald-400'
        };
    } else if (rawName.includes('ASSINATURA') || rawName.includes('STREAM') || rawName.includes('TELEFONE') || rawName.includes('INTERNET') || rawName.includes('PROVEDOR')) {
        style = {
            bg: 'bg-cyan-50 dark:bg-cyan-950/20',
            border: 'border-cyan-100 dark:border-cyan-900/30',
            text: 'text-cyan-600 dark:text-cyan-400'
        };
    } else if (rawName.includes('ALIMENTAÇÃO') || rawName.includes('FEIRA') || rawName.includes('MERCADO') || rawName.includes('SUPERMERCADO') || rawName.includes('RESTAURANTE') || rawName.includes('COMPRAS') || rawName.includes('SHOPPING')) {
        style = {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-100 dark:border-amber-900/30',
            text: 'text-amber-700 dark:text-amber-400'
        };
    } else if (rawName.includes('ÁGUA') || rawName.includes('SANEAMENTO') || rawName.includes('COPASA') || rawName.includes('SABESP')) {
        style = {
            bg: 'bg-blue-50 dark:bg-blue-950/20',
            border: 'border-blue-100 dark:border-blue-900/30',
            text: 'text-blue-600 dark:text-blue-400'
        };
    } else if (rawName.includes('LUZ') || rawName.includes('ENERGIA') || rawName.includes('FORÇA') || rawName.includes('CEMIG')) {
        style = {
            bg: 'bg-indigo-50 dark:bg-indigo-950/20',
            border: 'border-indigo-100 dark:border-indigo-900/30',
            text: 'text-indigo-600 dark:text-indigo-400'
        };
    } else if (rawName.includes('PET') || rawName.includes('CACHORRO') || rawName.includes('GATO') || rawName.includes('VET')) {
         style = {
            bg: 'bg-pink-50 dark:bg-pink-950/20',
            border: 'border-pink-100 dark:border-pink-900/30',
            text: 'text-pink-600 dark:text-pink-400'
         };
    }

    return style;
  };

  const renderAccounts = (accountsList: Account[], title: string, colorClass: string) => {
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-4 rounded-full ${colorClass}`} />
                    <h2 className="text-base font-extrabold text-navy dark:text-white uppercase tracking-wider text-[11px]">
                        {title}
                    </h2>
                </div>
                <span className="text-[10px] font-bold text-text-muted bg-surface-light dark:bg-dark-surface-light px-2 py-1 rounded-full border border-border-color dark:border-dark-border-color">
                    {accountsList.length} itens
                </span>
            </div>
            
            {accountsList.length === 0 ? (
                <div className="bg-surface dark:bg-dark-surface rounded-xl p-6 text-center border border-dashed border-border-color dark:border-dark-border-color">
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest italic animate-pulse">Nenhuma conta encontrada</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-1 sm:px-0">
                    <AnimatePresence mode="popLayout">
                        {accountsList.map((acc) => {
                                        const isPaid = acc.status === AccountStatus.PAID;
                                        const catColors = getCategoryStyle(acc.category);
                                        const catName = (acc.category.split(' ')[1] || acc.category).toUpperCase();
                                        
                                        return (
                                            <motion.div 
                                                key={acc.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => toggleSelection(acc.id)}
                                                className={`bg-white dark:bg-dark-surface p-3 rounded-xl border transition-all cursor-pointer group shadow-sm hover:shadow-md flex flex-col gap-2.5 ${
                                                  selectedAccountIds.includes(acc.id) 
                                                    ? 'border-primary ring-2 ring-primary/10 dark:border-primary' 
                                                    : 'border-slate-100 dark:border-dark-border-color'
                                                }`}
                                            >
                                                {/* Header: Category & Installment/Recurrent */}
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[8px] font-black uppercase border px-1.5 py-0.2 rounded tracking-wider ${catColors.bg} ${catColors.border} ${catColors.text}`}>
                                                        {catName}
                                                    </span>
                                                    {acc.isInstallment ? (
                                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-150 px-1 py-0.2 rounded">
                                                            {acc.currentInstallment}/{acc.totalInstallments}
                                                        </span>
                                                    ) : acc.isRecurrent ? (
                                                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-150 p-0.5 rounded flex items-center justify-center">
                                                            <Repeat className="w-2.5 h-2.5" />
                                                        </span>
                                                    ) : acc.paymentDate || (acc as any).dueDate || (acc as any).date ? (
                                                        <span className="text-[8px] font-bold text-slate-400 bg-slate-50 dark:bg-dark-surface-light border border-slate-100 dark:border-dark-border-color px-1 py-0.2 rounded flex items-center gap-0.5">
                                                            <Calendar className="w-2 h-2" />
                                                            {format(new Date(acc.paymentDate || (acc as any).dueDate || (acc as any).date), 'dd/MM')}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* Body: Title & Value */}
                                                <div className="flex flex-col gap-0.5">
                                                    <h3 className={`font-bold text-[11px] sm:text-[12px] leading-tight line-clamp-2 uppercase tracking-tight ${isPaid ? 'text-slate-300 line-through' : 'text-slate-700 dark:text-gray-100'}`}>
                                                        {acc.name}
                                                    </h3>
                                                    <p className={`font-black tracking-tight ${isPaid ? 'text-slate-300 text-xs' : 'text-slate-900 dark:text-white text-[16px]'}`}>
                                                        {formatCurrency(acc.value)}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1.5 mt-auto pt-1.5">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onToggleStatus(acc); }}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all border ${
                                                            isPaid 
                                                                ? 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100' 
                                                                : 'bg-emerald-500/10 border border-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                                        }`}
                                                    >
                                                        {isPaid ? 'DESFAZER' : 'PAGAR'}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onEditAccount(acc); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-100 dark:border-dark-border-color text-slate-300 hover:text-primary hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-dark-surface-light transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Apagar esta conta?')) onDeleteAccount(acc.id); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-100 dark:border-dark-border-color text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    {isPaid && whatsappEnabled && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onNotifyWhatsApp?.(acc); }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-100 text-emerald-400 hover:bg-emerald-50 transition-colors"
                                                            title="Notificar WhatsApp"
                                                        >
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};


  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 sm:space-y-5 max-w-7xl mx-auto py-1 font-sans"
    >
        <header className="flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-3 px-2 sm:px-0">
            <div>
              <p className="text-text-muted dark:text-dark-text-muted font-black text-[9px] uppercase tracking-[0.25em] mb-0.5">Gestão de Pagamentos</p>
              <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary tracking-tight flex items-center gap-4">
                <span>Minhas Contas<span className="text-primary">.</span></span>
                {/* Desktop Stats Summary */}
                <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm mt-1">
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-text-muted dark:text-dark-text-muted font-black">Em Aberto</span>
                        <span className="text-xs font-black text-rose-500 font-mono tracking-tight">{pendingAccounts.reduce((sum, a) => sum + Number(a.value), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-text-muted dark:text-dark-text-muted font-black">Pago</span>
                        <span className="text-xs font-black text-success font-mono tracking-tight">{paidAccounts.reduce((sum, a) => sum + Number(a.value), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-text-muted dark:text-dark-text-muted font-black">Total</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono tracking-tight">{(pendingAccounts.reduce((sum, a) => sum + Number(a.value), 0) + paidAccounts.reduce((sum, a) => sum + Number(a.value), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
              </h1>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <MonthPicker selectedDate={safeDate} onSelectDate={setSelectedDate} />
                <button onClick={onOpenMoveModal} className="p-2 rounded-xl bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border-color text-slate-400 hover:text-primary transition-all shadow-sm active:scale-95 hover:border-slate-200" title="Mover Contas">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </button>
            </div>
        </header>

        {/* Tabs Bar */}
        <div className="flex border border-slate-100 dark:border-dark-border-color bg-white dark:bg-dark-surface p-1 rounded-xl shadow-sm gap-1 mx-2 sm:mx-0">
          <button
            onClick={() => setActiveSpreadsheetTab('principal')}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeSpreadsheetTab === 'principal'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            📋 Planilha Principal
          </button>
          <button
            onClick={() => setActiveSpreadsheetTab('conversa')}
            className={`flex-1 py-3 px-4 text-center rounded-lg font-bold text-xs uppercase tracking-wider transition-all relative flex items-center justify-center gap-2 ${
              activeSpreadsheetTab === 'conversa'
                ? 'bg-[#D8875D]/10 text-[#D8875D]'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            💬 Contas do Assistente
            {conversationAccounts.length > 0 && (
              <span className="bg-rose-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-surface animate-pulse">
                {conversationAccounts.length}
              </span>
            )}
          </button>
        </div>

        {activeSpreadsheetTab === 'principal' ? (
          <div className="grid grid-cols-1 gap-6 pb-24 px-2 sm:px-0">
              <div className="space-y-6">
                  <AnimatePresence>
                    {selectedAccountIds.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">
                            {selectedAccountIds.length}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary leading-none">Contas selecionadas</p>
                            <p className="text-[10px] font-bold text-primary/70 mt-0.5">
                              Total: {totalSelectedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedAccountIds([])}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-text-muted hover:text-text-primary transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handlePaySelected}
                            className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold uppercase shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Pago
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-white dark:bg-dark-surface p-2 rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm">
                      <SearchBar 
                          searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
                          filterRecurrent={filterRecurrent} setFilterRecurrent={setFilterRecurrent}
                          filterInstallment={filterInstallment} setFilterInstallment={setFilterInstallment}
                          onOpenCalculator={() => setIsCalculatorOpen(true)}
                          categories={categories}
                      />
                  </div>
                  
                  <FloatingCalculator 
                      isOpen={isCalculatorOpen} 
                      onClose={() => setIsCalculatorOpen(false)} 
                  />
                  
                  {renderAccounts(pendingAccounts, 'A Pagar', 'bg-primary')}
                  
                  {renderAccounts(paidAccounts, 'Pago', 'bg-success')}
                  
                  {pendingAccounts.length === 0 && paidAccounts.length === 0 && (
                      <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-2xl border border-dashed border-slate-200 dark:border-dark-border-color">
                          <p className="text-text-muted dark:text-dark-text-muted font-bold text-[10px] uppercase tracking-widest">Nada por aqui</p>
                      </div>
                  )}
              </div>
          </div>
        ) : (
          <div className="pb-24 px-2 sm:px-0">
            <div className="bg-white dark:bg-dark-surface p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-dark-border-color shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-border-color pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#D8875D]" /> Contas Capturadas na Conversa
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Estas contas foram anotadas pelo assistente e estão aguardando fechamento para consolidação na planilha principal.</p>
                </div>
                {conversationAccounts.length > 0 && (
                  <button
                    onClick={handleCloseConversationTab}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Fechar e Lançar Contas
                  </button>
                )}
              </div>

              {conversationAccounts.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-dark-surface-light rounded-full flex items-center justify-center text-slate-300">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Nenhuma conta capturada ainda</p>
                  <p className="text-xs text-slate-400 max-w-sm">Converse com o Tatu no chat para registrar novas compras. Exemplo: "teste 999 1/5" ou "lanche 25".</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Consolidation Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-dark-surface-light p-3 rounded-xl border border-slate-100 dark:border-dark-border-color">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">A somar no Cartão</span>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                        {conversationAccounts
                          .filter(item => item.status === AccountStatus.PAID && item.paymentMethod === 'credito')
                          .reduce((sum, item) => sum + Number(item.value), 0)
                          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-dark-surface-light p-3 rounded-xl border border-slate-100 dark:border-dark-border-color">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">A somar em Gastos Mês</span>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                        {conversationAccounts
                          .filter(item => item.status === AccountStatus.PAID && item.paymentMethod === 'dinheiro')
                          .reduce((sum, item) => sum + Number(item.value), 0)
                          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-dark-surface-light p-3 rounded-xl border border-slate-100 dark:border-dark-border-color">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Lançar como Pendentes</span>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                        {conversationAccounts
                          .filter(item => item.status === AccountStatus.PENDING)
                          .reduce((sum, item) => sum + Number(item.value), 0)
                          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-slate-100 dark:divide-dark-border-color">
                    {conversationAccounts.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-dark-surface-light flex items-center justify-center text-slate-500 text-lg">
                            📦
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-gray-100 uppercase tracking-tight">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                item.status === AccountStatus.PENDING 
                                  ? 'bg-slate-100 text-slate-600 dark:bg-dark-surface dark:text-slate-400' 
                                  : 'bg-slate-100 text-slate-600 dark:bg-dark-surface dark:text-slate-400'
                              }`}>
                                {item.status === AccountStatus.PENDING ? 'PENDENTE' : 'PAGO'}
                              </span>
                              {item.paymentMethod && (
                                <span className="text-[8px] font-black text-slate-400 bg-slate-50 dark:bg-dark-surface-light px-1.5 py-0.5 rounded border border-slate-100 dark:border-dark-border-color uppercase">
                                  {item.paymentMethod === 'credito' ? 'Cartão' : 'Dinheiro'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono">
                            {Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <button
                            onClick={() => handleDeleteConversationItem(item.id)}
                            className="w-8 h-8 rounded-lg border border-slate-100 dark:border-dark-border-color text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Closure button at the very end */}
                  <div className="pt-4 border-t border-slate-100 dark:border-dark-border-color flex justify-end">
                    <button
                      onClick={handleCloseConversationTab}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Fechar Aba e Consolidar Contas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </motion.div>
  );
};

export default AccountsView;
