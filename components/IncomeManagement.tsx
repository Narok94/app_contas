
import React, { useState, useEffect } from 'react';
import { type Income } from '../types';
import { Banknote, TrendingUp, Plus, Edit2, Trash2, Repeat, Tag } from 'lucide-react';

interface IncomeManagementProps {
    incomes: Income[];
    onAddOrUpdate: (incomeData: Omit<Income, 'id' | 'date'> & { id?: string }) => void;
    onDelete: (incomeId: string) => void;
    activeGroupId: string | null;
}

const IncomeManagement: React.FC<IncomeManagementProps> = ({ incomes, onAddOrUpdate, onDelete, activeGroupId }) => {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [groupId, setGroupId] = useState(activeGroupId || '');

    useEffect(() => {
        if (editingIncome) {
            setGroupId(editingIncome.groupId);
        } else if (activeGroupId) {
            setGroupId(activeGroupId);
        }
    }, [editingIncome, activeGroupId]);

    const resetForm = () => {
        setName('');
        setValue('');
        setIsRecurrent(false);
        setEditingIncome(null);
        setGroupId(activeGroupId || '');
    };
    
    const handleEditClick = (income: Income) => {
        setEditingIncome(income);
        setName(income.name);
        setValue(String(income.value));
        setIsRecurrent(income.isRecurrent);
        setGroupId(income.groupId);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddOrUpdate({
            id: editingIncome?.id,
            name,
            value: parseFloat(value),
            isRecurrent,
            groupId,
        });
        resetForm();
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="max-w-5xl mx-auto p-2 sm:p-0 space-y-4 font-sans pb-24">
            <header className="flex items-center gap-3 px-2">
                <div className="p-2 rounded-xl bg-success/10 text-success">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-text-muted dark:text-dark-text-muted font-black text-[9px] uppercase tracking-[0.25em] mb-0.5">Gestão Financeira</p>
                  <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary tracking-tight">Gerenciar Entradas<span className="text-primary">.</span></h1>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 order-1">
                    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                {editingIncome ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </div>
                            <h3 className="text-sm font-bold text-text-primary dark:text-dark-text-primary">{editingIncome ? 'Editar Entrada' : 'Nova Entrada'}</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-text-muted ml-1 flex items-center gap-1">
                                    <Tag className="w-2.5 h-2.5" /> Nome
                                </label>
                                <input type="text" placeholder="Ex: Salário" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 rounded-lg bg-slate-50 dark:bg-dark-surface-light border border-slate-200 dark:border-dark-border-color focus:border-primary outline-none transition-all text-xs text-text-primary dark:text-dark-text-primary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-text-muted ml-1 flex items-center gap-1">
                                    <Banknote className="w-2.5 h-2.5" /> Valor (R$)
                                </label>
                                <input type="number" step="0.01" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} required className="w-full p-2 rounded-lg bg-slate-50 dark:bg-dark-surface-light border border-slate-200 dark:border-dark-border-color focus:border-primary outline-none transition-all font-mono text-xs text-text-primary dark:text-dark-text-primary" />
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-dark-surface-light rounded-lg border border-slate-200 dark:border-dark-border-color cursor-pointer">
                                <input id="income-recurrent" type="checkbox" checked={isRecurrent} onChange={e => setIsRecurrent(e.target.checked)} className="h-4 w-4 text-primary border-border-color rounded cursor-pointer" />
                                <label htmlFor="income-recurrent" className="text-[10px] font-bold text-text-secondary cursor-pointer flex items-center gap-1">
                                    <Repeat className="w-3 h-3" /> Recorrente
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {editingIncome && (
                                <button type="button" onClick={resetForm} className="flex-1 py-2 text-[10px] font-black uppercase rounded-lg bg-surface-light dark:bg-dark-surface-light border border-border-color text-text-secondary hover:bg-surface transition-colors">
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className="flex-1 py-2 text-[10px] font-black uppercase rounded-lg bg-primary text-white hover:bg-primary-dark shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1">
                                {editingIncome ? <><Edit2 className="w-3 h-3" /> Salvar</> : <><Plus className="w-3 h-3" /> Adicionar</>}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-8 order-2">
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border-color shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-slate-100 dark:border-dark-border-color bg-slate-50 dark:bg-dark-surface-light flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Entradas Ativas</h3>
                            <span className="text-[10px] font-mono opacity-50">{incomes.length} registros</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-dark-border-color max-h-[500px] overflow-y-auto">
                            {incomes.length > 0 ? incomes.map(income => (
                                <div key={income.id} className="flex items-center justify-between p-3 hover:bg-primary/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                                            <Banknote className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-text-primary dark:text-dark-text-primary text-xs flex items-center gap-1.5 truncate">
                                                {income.name} 
                                                {income.isRecurrent && (
                                                    <span className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 rounded shrink-0">Rec</span>
                                                )}
                                            </p>
                                            <p className="text-sm font-mono font-black text-success tracking-tighter">{formatCurrency(income.value)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleEditClick(income)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Editar">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { if (window.confirm(`Excluir "${income.name}"?`)) onDelete(income.id); }} className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors" title="Excluir">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 flex flex-col items-center gap-2">
                                    <Banknote className="w-6 h-6 text-text-muted opacity-20" />
                                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Nenhuma entrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomeManagement;
