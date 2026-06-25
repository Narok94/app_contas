
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Account, AccountStatus, type Income } from '../types';
import MonthPicker from './MonthPicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, BarChart3, History } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getMonthlyAccounts } from '../utils/accountUtils';
import { getCategoryIcon } from '../utils/categoryIcons';

interface DashboardProps {
  accounts: Account[];
  incomes: Income[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const COLORS = ['#6366F1', '#00DC82', '#FF4D4D', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const Dashboard: React.FC<DashboardProps> = ({ accounts, incomes, selectedDate, setSelectedDate }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'trends' | 'detailed'>('summary');
  
  const formatCurrency = (val: number) => (
    <span className="font-mono tracking-tighter">
        {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    </span>
  );

  const stats = useMemo(() => {
    const m = selectedDate.getMonth();
    const y = selectedDate.getFullYear();
    
    const monthIncomes = incomes.filter(inc => {
        const d = new Date(inc.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });
    
    const monthAccounts = getMonthlyAccounts(accounts, selectedDate);

    const totalIncome = monthIncomes.reduce((sum, inc) => sum + inc.value, 0);
    const paid = monthAccounts.filter(acc => acc.status === AccountStatus.PAID).reduce((sum, acc) => sum + acc.value, 0);
    const pending = monthAccounts.filter(acc => acc.status === AccountStatus.PENDING).reduce((sum, acc) => sum + acc.value, 0);
    
    return { totalIncome, paid, pending, balance: totalIncome - (paid + pending) };
  }, [accounts, incomes, selectedDate]);

  const categoryData = useMemo(() => {
    const monthAccounts = getMonthlyAccounts(accounts, selectedDate);
    const categoriesMap = new Map<string, number>();
    monthAccounts.forEach(acc => {
        const current = categoriesMap.get(acc.category) || 0;
        categoriesMap.set(acc.category, current + acc.value);
    });
    return Array.from(categoriesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [accounts, selectedDate]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(selectedDate, i);
        const m = targetDate.getMonth();
        const y = targetDate.getFullYear();
        const monthKey = format(targetDate, 'MMM', { locale: ptBR });
        const monthIncomes = incomes.filter(inc => {
            const d = new Date(inc.date);
            return d.getMonth() === m && d.getFullYear() === y;
        }).reduce((sum, inc) => sum + inc.value, 0);
        const monthExpenses = getMonthlyAccounts(accounts, targetDate).reduce((sum, acc) => sum + acc.value, 0);
        data.push({ name: monthKey, entradas: monthIncomes, saidas: monthExpenses });
    }
    return data;
  }, [accounts, incomes, selectedDate]);

  const detailedData = useMemo(() => {
    const monthAccounts = getMonthlyAccounts(accounts, selectedDate);
    const categoriesMap = new Map<string, { total: number; items: Account[] }>();
    monthAccounts.forEach(acc => {
        const current = categoriesMap.get(acc.category) || { total: 0, items: [] };
        categoriesMap.set(acc.category, {
            total: current.total + acc.value,
            items: [...current.items, acc].sort((a, b) => b.value - a.value)
        });
    });
    const totalExpenses = monthAccounts.reduce((sum, acc) => sum + acc.value, 0);
    return Array.from(categoriesMap.entries())
        .map(([name, data]) => ({
            name,
            total: data.total,
            items: data.items,
            percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);
  }, [accounts, selectedDate]);

  const endingInstallments = useMemo(() => {
    const monthAccounts = getMonthlyAccounts(accounts, selectedDate);
    const installments = monthAccounts.filter(acc => acc.isInstallment && acc.totalInstallments);
    
    return installments
        .map(acc => {
            const current = Number(acc.currentInstallment || 1);
            const total = Number(acc.totalInstallments || 1);
            const remaining = total - current;
            return {
                ...acc,
                current,
                total,
                remaining
            };
        })
        .sort((a, b) => a.remaining - b.remaining)
        .slice(0, 5);
  }, [accounts, selectedDate]);

  return (
    <div className="space-y-6 pb-12 font-sans max-w-[1024px] mx-auto px-4 sm:px-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h1 className="text-xl font-black text-navy dark:text-gray-100 tracking-tighter">
                Visão Geral<span className="text-primary italic font-serif">.</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex bg-slate-50 dark:bg-dark-surface p-1 rounded-xl shadow-none overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('summary')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${activeTab === 'summary' ? 'bg-white dark:bg-dark-surface-light text-primary shadow-xs' : 'text-text-muted hover:text-text-primary dark:hover:text-white'}`}>Resumo</button>
                    <button onClick={() => setActiveTab('detailed')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${activeTab === 'detailed' ? 'bg-white dark:bg-dark-surface-light text-primary shadow-xs' : 'text-text-muted hover:text-text-primary dark:hover:text-white'}`}>Categorias</button>
                    <button onClick={() => setActiveTab('trends')} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all ${activeTab === 'trends' ? 'bg-white dark:bg-dark-surface-light text-primary shadow-xs' : 'text-text-muted hover:text-text-primary dark:hover:text-white'}`}>Tendências</button>
                </div>
                <MonthPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>
        </header>

        <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
                <motion.div 
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                >
                    <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-dark-surface px-5 py-3 rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm w-full lg:w-fit">
                        {[
                            { label: 'Entradas', value: stats.totalIncome, color: 'text-text-primary dark:text-white' },
                            { label: 'Pagas', value: stats.paid, color: 'text-text-primary dark:text-white' },
                            { label: 'A Pagar', value: stats.pending, color: 'text-text-primary dark:text-white' },
                            { label: 'Saldo', value: stats.balance, color: stats.balance >= 0 ? 'text-emerald-500' : 'text-rose-500' },
                        ].map((stat, i) => (
                            <React.Fragment key={i}>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted dark:text-gray-400 mb-0.5">{stat.label}</span>
                                    <span className={`text-[15px] sm:text-base font-black font-mono tracking-tight leading-none ${stat.color}`}>
                                        {formatCurrency(stat.value)}
                                    </span>
                                </div>
                                {i < 3 && <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 sm:mx-3" />}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-100 dark:border-dark-border-color p-5 flex flex-col gap-6">
                            <h3 className="text-[10px] font-semibold text-text-muted dark:text-gray-400 uppercase tracking-widest">
                                Alocação de Gastos
                            </h3>
                            
                            {(() => {
                                const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
                                if (total === 0) return <p className="text-sm text-text-muted">Nenhum gasto registrado.</p>;
                                
                                return (
                                    <div className="space-y-8">
                                        {/* Stacked Progress Bar */}
                                        <div className="w-full h-3 flex overflow-hidden rounded-full bg-slate-100 dark:bg-dark-surface-light">
                                            {categoryData.map((cat, idx) => (
                                                <div 
                                                    key={idx} 
                                                    style={{ width: `${Math.max((cat.value / total) * 100, 2)}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                                                    className="h-full border-r border-white dark:border-dark-surface last:border-0"
                                                />
                                            ))}
                                        </div>
                                        
                                        {/* Legend List */}
                                        <div className="space-y-4">
                                            {categoryData.slice(0, 6).map((cat, idx) => {
                                                const percent = ((cat.value / total) * 100).toFixed(1);
                                                return (
                                                    <div key={idx} className="flex flex-col">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                                <span className="text-sm font-medium text-text-primary dark:text-white">{cat.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-xs font-medium text-text-muted">{percent}%</span>
                                                                <span className="text-sm font-mono font-medium text-text-primary dark:text-white">{formatCurrency(cat.value)}</span>
                                                            </div>
                                                        </div>
                                                        {idx !== categoryData.slice(0, 6).length - 1 && <hr className="mt-4 border-slate-100 dark:border-dark-border-color" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-100 dark:border-dark-border-color p-5 flex flex-col gap-6">
                            <h3 className="text-[10px] font-semibold text-text-muted dark:text-gray-400 uppercase tracking-widest">
                                Parcelamentos Próximos
                            </h3>
                            <div className="space-y-2">
                                {endingInstallments.length === 0 ? (
                                    <p className="text-sm text-text-muted">Nenhum parcelamento ativo neste mês.</p>
                                ) : (
                                    endingInstallments.map((item, i) => {
                                        const current = Number(item.currentInstallment || 1);
                                        const total = Number(item.totalInstallments || 1);
                                        return (
                                            <div key={item.id || i} className="flex flex-col">
                                                <div className="flex items-center justify-between py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <p className="text-sm font-semibold text-text-primary dark:text-white leading-none">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-text-muted">
                                                            Parcela {current} de {total}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-mono font-semibold text-text-primary dark:text-white leading-none">
                                                            {formatCurrency(item.value)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {i !== endingInstallments.length - 1 && <hr className="border-slate-100 dark:border-dark-border-color mt-1" />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'detailed' && (
                <motion.div 
                    key="detailed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2 sm:px-0"
                >
                    {detailedData.map((category, idx) => (
                        <div key={idx} className="bg-white dark:bg-dark-surface p-3 rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        {getCategoryIcon(category.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-text-primary dark:text-dark-text-primary">{category.name}</h3>
                                        <p className="text-[8px] font-bold uppercase text-text-muted">{category.items.length} itens</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary font-mono">{formatCurrency(category.total)}</p>
                                    <p className="text-[8px] font-bold text-text-muted">{category.percentage.toFixed(1)}%</p>
                                </div>
                            </div>

                            <div className="w-full h-1 bg-surface-light dark:bg-dark-surface-light rounded-full mb-3 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${category.percentage}%` }}
                                    className="h-full bg-primary"
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                            </div>

                            <div className="space-y-1">
                                {category.items.slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-dark-surface-light/30">
                                        <span className="text-[9px] font-bold text-text-primary truncate max-w-[100px]">{item.name}</span>
                                        <span className="text-[9px] font-mono font-black text-text-secondary">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                {category.items.length > 3 && (
                                    <p className="text-[8px] text-center text-text-muted mt-1">+ {category.items.length - 3} outros</p>
                                )}
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {activeTab === 'trends' && (
                <motion.div 
                    key="trends"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-dark-surface p-3.5 rounded-2xl border border-slate-100 dark:border-dark-border-color shadow-sm px-2 sm:px-0"
                >
                    <h3 className="text-[10px] font-black text-text-primary dark:text-dark-text-primary flex items-center gap-2 mb-3 uppercase tracking-wider">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        Fluxo de Caixa (6 Meses)
                    </h3>
                    <div className="h-[170px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border-color/10" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ fontSize: '9px', borderRadius: '8px', border: 'none' }} />
                                    <Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={1.5} />
                                    <Area type="monotone" dataKey="saidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={1.5} />
                                </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Dashboard;
