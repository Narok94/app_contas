
import React, { useState, useEffect } from 'react';
import { type Account } from '../types';

interface BatchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accounts: any[]) => Promise<void>;
  categories: string[];
}

interface BatchRow {
  id: string; // Temp ID for UI handling
  name: string;
  value: string;
  category: string;
  isRecurrent: boolean;
  isInstallment: boolean;
  totalInstallments: string;
}

const BatchAccountModal: React.FC<BatchAccountModalProps> = ({ isOpen, onClose, onSubmit, categories }) => {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with 3 empty rows when opened
  useEffect(() => {
    if (isOpen) {
      setRows([
        { id: '1', name: '', value: '', category: categories[0] || 'Outros', isRecurrent: false, isInstallment: false, totalInstallments: '2' },
        { id: '2', name: '', value: '', category: categories[0] || 'Outros', isRecurrent: false, isInstallment: false, totalInstallments: '2' },
        { id: '3', name: '', value: '', category: categories[0] || 'Outros', isRecurrent: false, isInstallment: false, totalInstallments: '2' },
      ]);
      setIsSubmitting(false);
    }
  }, [isOpen, categories]);

  const handleAddRow = () => {
    setRows(prev => [
      ...prev, 
      { id: Date.now().toString(), name: '', value: '', category: categories[0] || 'Outros', isRecurrent: false, isInstallment: false, totalInstallments: '2' }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return; // Keep at least one row
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof BatchRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Mutual exclusivity logic: Se for parcelado, não pode ser recorrente livre, e vice-versa.
        if (field === 'isInstallment' && value === true) {
            updatedRow.isRecurrent = false;
        }
        if (field === 'isRecurrent' && value === true) {
            updatedRow.isInstallment = false;
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty rows
    const validRows = rows.filter(r => r.name.trim() !== '' && r.value.trim() !== '');
    
    if (validRows.length === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);

    const accountsData = validRows.map(row => ({
      name: row.name,
      value: row.value.replace(',', '.'), // O App.tsx fará o cast definitivo para Number
      totalValue: row.isInstallment ? parseFloat(row.value.replace(',', '.')) : undefined,
      category: row.category,
      isRecurrent: Boolean(row.isRecurrent),
      isInstallment: Boolean(row.isInstallment),
      totalInstallments: row.isInstallment ? row.totalInstallments : undefined,
      currentInstallment: row.isInstallment ? 1 : undefined,
      status: 'PENDING'
    }));

    await onSubmit(accountsData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Adicionar em Lote</h2>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Cadastre várias contas rapidamente</p>
            </div>
            <button onClick={onClose} className="text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary text-3xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 pr-2">
            <form id="batch-form" onSubmit={handleSubmit}>
                <div className="space-y-3">
                    {/* Header Row (Hidden on mobile) */}
                    <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-sm font-semibold text-text-secondary dark:text-dark-text-secondary mb-2">
                        <div className="col-span-3">Nome</div>
                        <div className="col-span-2">Valor / Total</div>
                        <div className="col-span-3">Categoria</div>
                        <div className="col-span-1 text-center">Recor.</div>
                        <div className="col-span-1 text-center">Parc.</div>
                        <div className="col-span-1 text-center">Qtd</div>
                        <div className="col-span-1"></div>
                    </div>

                    {rows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-surface-light dark:bg-dark-surface-light p-3 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="md:col-span-3">
                                <label className="md:hidden text-xs text-text-muted">Nome</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Luz, Mercado"
                                    value={row.name}
                                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                    className="w-full p-2 text-sm rounded bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary font-medium text-text-primary dark:text-dark-text-primary"
                                    autoFocus={index === 0}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="md:hidden text-xs text-text-muted">{row.isInstallment ? 'Total' : 'Valor'}</label>
                                <input 
                                    type="text" 
                                    placeholder={row.isInstallment ? "Total" : "0,00"}
                                    value={row.value}
                                    onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                                    className="w-full p-2 text-sm rounded bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary font-bold text-primary"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="md:hidden text-xs text-text-muted">Categoria</label>
                                <select 
                                    value={row.category}
                                    onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                                    className="w-full p-2 text-sm rounded bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary text-text-primary dark:text-dark-text-primary"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex justify-between md:contents">
                                 <div className="flex md:justify-center md:col-span-1 items-center">
                                    <label className="flex items-center space-x-2 cursor-pointer" title="Recorrente">
                                        <input 
                                            type="checkbox" 
                                            checked={row.isRecurrent}
                                            onChange={(e) => updateRow(row.id, 'isRecurrent', e.target.checked)}
                                            className="h-5 w-5 text-primary focus:ring-primary border-border-color dark:border-dark-border-color rounded bg-surface dark:bg-dark-surface"
                                        />
                                        <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Recor.</span>
                                    </label>
                                </div>
                                
                                <div className="flex md:justify-center md:col-span-1 items-center">
                                    <label className="flex items-center space-x-2 cursor-pointer" title="Parcelado">
                                        <input 
                                            type="checkbox" 
                                            checked={row.isInstallment}
                                            onChange={(e) => updateRow(row.id, 'isInstallment', e.target.checked)}
                                            className="h-5 w-5 text-danger focus:ring-danger border-border-color dark:border-dark-border-color rounded bg-surface dark:bg-dark-surface"
                                        />
                                        <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Parc.</span>
                                    </label>
                                </div>
                                
                                <div className="md:col-span-1">
                                    {row.isInstallment && (
                                        <input 
                                            type="number" 
                                            min="2"
                                            value={row.totalInstallments}
                                            onChange={(e) => updateRow(row.id, 'totalInstallments', e.target.value)}
                                            className="w-full p-2 text-sm rounded bg-primary/10 dark:bg-dark-surface-light border border-primary/20 dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary text-center font-black text-text-primary dark:text-dark-text-primary"
                                            placeholder="Qtd"
                                            title="Quantidade de Parcelas"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end md:justify-center md:col-span-1 mt-2 md:mt-0">
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveRow(row.id)}
                                    className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
                                    title="Remover linha"
                                    disabled={rows.length === 1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </form>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-border-color dark:border-dark-border-color gap-4">
            <button 
                type="button" 
                onClick={handleAddRow}
                className="flex items-center space-x-2 text-primary hover:text-primary-dark font-black text-xs uppercase tracking-widest transition-all"
            >
                <div className="p-1 rounded-full bg-primary/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <span>Adicionar Linha</span>
            </button>

            <div className="flex space-x-3 w-full sm:w-auto">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-surface-light dark:bg-dark-surface-light hover:bg-surface dark:hover:bg-dark-surface border border-border-color dark:border-dark-border-color transition-colors font-bold text-xs uppercase tracking-wider text-text-secondary dark:text-dark-text-secondary"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    form="batch-form"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-70 active:scale-95"
                >
                    {isSubmitting ? 'Salvando...' : 'Salvar Todas'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BatchAccountModal;
