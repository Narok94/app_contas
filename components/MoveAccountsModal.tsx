
import React, { useState, useMemo, useEffect } from 'react';
import { type Account } from '../types';

interface MoveAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountIds: string[], toMonth: string) => void;
  allAccounts: Account[];
  currentDashboardMonth: string; 
}

const MoveAccountsModal: React.FC<MoveAccountsModalProps> = ({ isOpen, onClose, onSubmit, allAccounts, currentDashboardMonth }) => {
    const [fromMonth, setFromMonth] = useState(currentDashboardMonth);
    const [toMonth, setToMonth] = useState(() => {
        const [year, month] = currentDashboardMonth.split('-').map(Number);
        const nextMonthDate = new Date(year, month, 1);
        return nextMonthDate.toISOString().slice(0, 7);
    });
    const [selectedIds, setSelectedIds] = useState(new Set<string>());

    const monthDisplayFormat = (monthKey: string) => {
        if (!monthKey) return '';
        const [year, month] = monthKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const availableMonths = useMemo(() => {
        const fromMonthsSet = new Set<string>();
        allAccounts.forEach(acc => {
            if (acc.status === 'PAID' && acc.paymentDate) {
                fromMonthsSet.add(acc.paymentDate.slice(0, 7));
            }
        });

        const toMonthsSet = new Set<string>(fromMonthsSet);
        let today = new Date();
        // Add current month and next 11 months
        for (let i = 0; i < 12; i++) {
            toMonthsSet.add(today.toISOString().slice(0, 7));
            today.setMonth(today.getMonth() + 1);
        }
        
        return {
            from: Array.from(fromMonthsSet).sort().reverse(),
            to: Array.from(toMonthsSet).sort(),
        };
    }, [allAccounts]);

    const accountsInFromMonth = useMemo(() => {
        return allAccounts
            .filter(acc => acc.status === 'PAID' && acc.paymentDate?.startsWith(fromMonth))
            .sort((a, b) => new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime());
    }, [allAccounts, fromMonth]);
    
    useEffect(() => {
        setSelectedIds(new Set());
    }, [fromMonth]);
    
    useEffect(() => {
        if (isOpen) {
            setFromMonth(currentDashboardMonth);
            const [year, month] = currentDashboardMonth.split('-').map(Number);
            const nextMonthDate = new Date(year, month, 1);
            const nextMonthKey = nextMonthDate.toISOString().slice(0, 7);
            if(availableMonths.to.includes(nextMonthKey)) {
                setToMonth(nextMonthKey);
            } else if (availableMonths.to.length > 0) {
                setToMonth(availableMonths.to[availableMonths.to.length - 1]);
            }
        }
    }, [isOpen, currentDashboardMonth, availableMonths.to]);


    const handleToggleId = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleToggleAll = () => {
        if (selectedIds.size === accountsInFromMonth.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(accountsInFromMonth.map(a => a.id)));
        }
    };

    const handleSubmit = () => {
        if (selectedIds.size > 0 && fromMonth !== toMonth) {
            onSubmit(Array.from(selectedIds), toMonth);
            onClose();
        } else {
            alert("Selecione pelo menos uma conta e um mês de destino diferente do original.");
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === accountsInFromMonth.length;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4 animate-fade-in">
            <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-dark-text-primary">Mover Contas Pagas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">De</label>
                        <select value={fromMonth} onChange={e => setFromMonth(e.target.value)} className="w-full p-2 rounded-md bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color">
                            {availableMonths.from.map(m => <option key={m} value={m}>{monthDisplayFormat(m)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">Para</label>
                        <select value={toMonth} onChange={e => setToMonth(e.target.value)} className="w-full p-2 rounded-md bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color">
                           {availableMonths.to.map(m => <option key={m} value={m}>{monthDisplayFormat(m)}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border-t border-b border-border-color dark:border-dark-border-color py-2">
                    {accountsInFromMonth.length > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center p-2">
                                <input id="select-all" type="checkbox" checked={isAllSelected} onChange={handleToggleAll} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                <label htmlFor="select-all" className="ml-3 font-semibold">Selecionar Tudo</label>
                            </div>
                            {accountsInFromMonth.map(acc => (
                                <div key={acc.id} className="flex items-center p-2 rounded-md hover:bg-surface-light dark:hover:bg-dark-surface-light">
                                    <input id={`acc-${acc.id}`} type="checkbox" checked={selectedIds.has(acc.id)} onChange={() => handleToggleId(acc.id)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                    <label htmlFor={`acc-${acc.id}`} className="ml-3 flex-1 grid grid-cols-2 gap-2 cursor-pointer">
                                        <span className="truncate">{acc.name}</span>
                                        <span className="font-medium text-right">{formatCurrency(acc.value)}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-text-muted py-8">Nenhuma conta paga neste mês.</p>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 mt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-surface-light dark:bg-dark-surface-light hover:bg-border-color dark:hover:bg-dark-border-color transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={selectedIds.size === 0 || fromMonth === toMonth} className="px-5 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50">
                        Mover ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};
export default MoveAccountsModal;
