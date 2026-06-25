
import React from 'react';
import { AccountStatus } from '../types';

interface SearchBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterStatus: AccountStatus | 'ALL';
    setFilterStatus: (status: AccountStatus | 'ALL') => void;
    filterCategory: string;
    setFilterCategory: (category: string) => void;
    filterRecurrent: boolean;
    setFilterRecurrent: (recurrent: boolean) => void;
    filterInstallment: boolean;
    setFilterInstallment: (installment: boolean) => void;
    onOpenCalculator: () => void;
    categories: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({ 
    searchTerm, 
    setSearchTerm, 
    filterStatus, 
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    filterRecurrent,
    setFilterRecurrent,
    filterInstallment,
    setFilterInstallment,
    onOpenCalculator,
    categories 
}) => {
    const statusFilters: { label: string; value: AccountStatus | 'ALL' }[] = [
        { label: 'Todos', value: 'ALL' },
        { label: 'Pendentes', value: AccountStatus.PENDING },
        { label: 'Pagos', value: AccountStatus.PAID },
    ];

    return (
        <div className="flex flex-col md:flex-row items-center gap-4 w-full mb-2">
            {/* Toggles de Status (Pill style) */}
            <div className="flex bg-slate-50 dark:bg-dark-surface p-1 rounded-full border border-slate-100 dark:border-dark-border-color shadow-sm w-full md:w-auto">
                {statusFilters.map(filter => (
                    <button
                        key={filter.value}
                        onClick={() => setFilterStatus(filter.value)}
                        className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap ${
                            filterStatus === filter.value
                                ? 'bg-white dark:bg-dark-surface-light text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-primary'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Busca */}
            <div className="relative flex-1 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                    type="text"
                    placeholder="Buscar despesa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:ring-0 text-slate-700 outline-none placeholder:text-slate-300 font-medium"
                />
            </div>

            {/* Categoria / Filtros da Direita */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar justify-end">
                <button
                    onClick={onOpenCalculator}
                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                    title="Calculadora"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <div className="relative shrink-0 flex items-center gap-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="appearance-none bg-transparent border-none text-[10px] font-black uppercase tracking-widest py-2 rounded-lg text-slate-600 focus:ring-0 cursor-pointer pr-4"
                    >
                        <option value="ALL">TODAS</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                {(filterCategory !== 'ALL' || filterRecurrent || filterInstallment || searchTerm !== '' || filterStatus !== 'ALL') && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('ALL');
                            setFilterCategory('ALL');
                            setFilterRecurrent(false);
                            setFilterInstallment(false);
                        }}
                        className="shrink-0 px-2 py-2 text-[10px] font-black text-danger uppercase tracking-tight hover:underline"
                    >
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchBar;
