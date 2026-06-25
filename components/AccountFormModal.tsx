import React, { useState, useEffect, useRef } from 'react';
import { type Account } from '../types';
import { getCategoryIcon } from '../utils/categoryIcons';
import { ChevronDown } from 'lucide-react';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: any) => void;
  account: Account | null;
  categories: string[];
  onManageCategories: () => void;
  activeGroupId: string | null;
  selectedDate: Date;
}

// Define a specific type for the form's state to improve type safety.
type AccountFormData = {
  name: string;
  category: string;
  value: string;
  isRecurrent: boolean;
  isInstallment: boolean;
  totalInstallments: string;
  totalValue: string;
  paymentDate: string;
  groupId: string;
  currentInstallment: string;
};

const AccountFormModal: React.FC<AccountFormModalProps> = ({ isOpen, onClose, onSubmit, account, categories, onManageCategories, activeGroupId, selectedDate }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('2');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [totalValue, setTotalValue] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const initialStateRef = useRef<AccountFormData | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialGroupId = account?.groupId || activeGroupId || '';
      
      // Use selectedDate for new accounts to default to the viewed month
      const defaultDate = new Date(selectedDate);
      // Set to 15th of the month by default to avoid timezone shifts to previous/next month
      const year = defaultDate.getFullYear();
      const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const defaultDateStr = `${year}-${month}-15`;

      const initialState: AccountFormData = account
        ? {
            name: account.name,
            category: account.category,
            value: String(account.value),
            isRecurrent: account.isRecurrent,
            isInstallment: account.isInstallment,
            totalInstallments: String(account.totalInstallments || 2),
            totalValue: String(account.totalValue || account.value * (account.totalInstallments || 1)),
            paymentDate: account.paymentDate ? account.paymentDate.split('T')[0] : defaultDateStr,
            groupId: initialGroupId,
            currentInstallment: String(account.currentInstallment || 1),
          }
        : {
            name: '',
            category: categories[0] || '',
            value: '',
            isRecurrent: false,
            isInstallment: false,
            totalInstallments: '2',
            totalValue: '',
            paymentDate: defaultDateStr,
            groupId: initialGroupId,
            currentInstallment: '1',
          };
      
      initialStateRef.current = initialState;
      
      setName(initialState.name);
      setCategory(initialState.category);
      setValue(initialState.value);
      setIsRecurrent(initialState.isRecurrent);
      setIsInstallment(initialState.isInstallment);
      setTotalInstallments(initialState.totalInstallments);
      setCurrentInstallment(initialState.currentInstallment);
      setTotalValue(initialState.totalValue);
      setPaymentDate(initialState.paymentDate);
      setShowConfirmDialog(false); // Reset confirmation on open
    }
  }, [isOpen, account, categories, activeGroupId]);

  const hasUnsavedChanges = () => {
    if (!isOpen || !initialStateRef.current) {
        return false;
    }
    
    if (initialStateRef.current.name !== name) return true;
    if (initialStateRef.current.category !== category) return true;
    if (initialStateRef.current.value !== value) return true;
    if (initialStateRef.current.isRecurrent !== isRecurrent) return true;
    if (initialStateRef.current.isInstallment !== isInstallment) return true;
    if (isInstallment && initialStateRef.current.totalInstallments !== totalInstallments) return true;
    if (isInstallment && initialStateRef.current.currentInstallment !== currentInstallment) return true;
    if (isInstallment && initialStateRef.current.totalValue !== totalValue) return true;
    if (initialStateRef.current.paymentDate !== paymentDate) return true;
    
    return false;
  };
  
  const handleAttemptClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };
  
  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    onClose();
  };
  
  const handleCancelDiscard = () => {
    setShowConfirmDialog(false);
  };

  // Update installment value in real-time
  useEffect(() => {
    if (isInstallment && totalValue && totalInstallments) {
        const total = parseFloat(totalValue.toString().replace(',', '.'));
        const installments = parseInt(totalInstallments, 10);
        if (!isNaN(total) && !isNaN(installments) && installments > 0) {
            setValue((total / installments).toFixed(2));
        }
    }
  }, [isInstallment, totalValue, totalInstallments]);

  // Auto-check isRecurrent for typical variable expenses when creating a NEW account
  useEffect(() => {
    if (!account && name && isOpen) {
        const nameLower = name.toLowerCase();
        const categoryLower = category.toLowerCase();
        const isCartao = nameLower.includes('cartão') || categoryLower.includes('cartão');
        const isAgua = nameLower.includes('água') || categoryLower.includes('água');
        const isLuz = nameLower.includes('luz') || categoryLower.includes('luz');
        if (isCartao || isAgua || isLuz) {
            setIsRecurrent(true);
        }
    }
  }, [name, category, account, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalValue = isInstallment 
      ? parseFloat(totalValue.replace(',', '.')) / parseInt(totalInstallments, 10)
      : parseFloat(value.replace(',', '.'));

    const groupId = account?.groupId || activeGroupId;
    if (!name || isNaN(finalValue) || !category || !groupId) return;

    onSubmit({
      id: account?.id,
      name,
      category,
      value: finalValue,
      totalValue: isInstallment ? parseFloat(totalValue.replace(',', '.')) : undefined,
      isRecurrent,
      isInstallment,
      totalInstallments: isInstallment ? parseInt(totalInstallments, 10) : undefined,
      paymentDate: paymentDate ? `${paymentDate}T12:00:00Z` : undefined,
      currentInstallment: isInstallment ? parseInt(currentInstallment, 10) : undefined,
      installmentId: account?.installmentId,
      groupId: groupId,
    });
    onClose(); 
  };
  
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" 
        onClick={handleAttemptClose}
    >
      <div 
          className="relative bg-surface dark:bg-dark-surface rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg animate-fade-in-up border border-border-color dark:border-dark-border-color" 
          onClick={e => e.stopPropagation()}
      >
        {showConfirmDialog && (
            <div className="absolute inset-0 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md flex flex-col justify-center items-center z-10 rounded-[2.5rem] p-8 animate-fade-in text-center">
                <h3 className="text-2xl font-serif italic text-text-primary dark:text-dark-text-primary mb-4">Descartar Alterações?</h3>
                <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                    Você tem alterações não salvas. Tem certeza que quer sair e perdê-las?
                </p>
                <div className="flex flex-col w-full gap-3">
                    <button 
                        onClick={handleCancelDiscard} 
                        className="w-full py-4 rounded-2xl bg-surface-light dark:bg-dark-surface-light text-text-primary dark:text-dark-text-primary font-black uppercase text-xs tracking-widest hover:bg-surface dark:hover:bg-dark-surface transition-colors"
                    >
                        Continuar Editando
                    </button>
                    <button 
                        onClick={handleConfirmDiscard} 
                        className="w-full py-4 rounded-2xl bg-danger text-white font-black uppercase text-xs tracking-widest hover:bg-danger-dark transition-colors shadow-lg shadow-danger/20"
                    >
                        Descartar e Sair
                    </button>
                </div>
            </div>
        )}
        
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-serif italic text-text-primary dark:text-dark-text-primary">{account ? 'Editar Conta' : 'Nova Conta'}<span className="text-primary">.</span></h2>
            <button onClick={handleAttemptClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-light dark:bg-dark-surface-light text-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary transition-colors text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="account-name" className="text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted ml-1">Nome</label>
              <input id="account-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-3 rounded-xl bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-text-primary dark:text-dark-text-primary" />
            </div>
            <div className="space-y-1">
              <label htmlFor="account-value" className="text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted ml-1">
                {isInstallment ? 'Valor Total (R$)' : 'Valor (R$)'}
              </label>
              <input 
                id="account-value" 
                type="number" 
                step="0.01" 
                value={isInstallment ? totalValue : value} 
                onChange={e => isInstallment ? setTotalValue(e.target.value) : setValue(e.target.value)} 
                required 
                className="w-full p-3 rounded-xl bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-mono text-text-primary dark:text-dark-text-primary" 
              />
            </div>
          </div>

          {isInstallment && totalValue && totalInstallments && (
            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-primary/60">Valor da Parcela:</span>
              <span className="font-mono font-black text-primary">
                {(parseFloat(totalValue) / parseInt(totalInstallments, 10)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}

          {/* Date input removed as per user request */}
          <input type="hidden" value={paymentDate} />

          <div className="space-y-1">
            <label htmlFor="account-category" className="text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted ml-1">Categoria</label>
            <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center pointer-events-none">
                        {getCategoryIcon(category)}
                    </div>
                    <select 
                        id="account-category" 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        required 
                        className="w-full pl-14 pr-10 py-3 rounded-xl bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-text-primary dark:text-dark-text-primary font-bold text-sm"
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
                <button type="button" onClick={onManageCategories} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Gerenciar Categorias">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8 space-y-4 sm:space-y-0 p-4 bg-surface-light dark:bg-dark-surface-light rounded-2xl border border-border-color dark:border-dark-border-color">
            <div className="flex items-center">
              <input id="account-recurrent" type="checkbox" checked={isRecurrent} onChange={e => setIsRecurrent(e.target.checked)} disabled={isInstallment} className="h-5 w-5 text-primary focus:ring-primary border-border-color dark:border-dark-border-color rounded-lg cursor-pointer bg-surface dark:bg-dark-surface" />
              <label htmlFor="account-recurrent" className="ml-3 block text-sm font-medium text-text-secondary dark:text-dark-text-secondary cursor-pointer">Recorrente</label>
            </div>
            <div className="flex items-center">
              <input id="account-installment" type="checkbox" checked={isInstallment} onChange={e => { setIsInstallment(e.target.checked); if (e.target.checked) setIsRecurrent(false); }} className="h-5 w-5 text-primary focus:ring-primary border-border-color dark:border-dark-border-color rounded-lg cursor-pointer bg-surface dark:bg-dark-surface" />
              <label htmlFor="account-installment" className="ml-3 block text-sm font-medium text-text-secondary dark:text-dark-text-secondary cursor-pointer">Parcelada</label>
            </div>
          </div>

          {isInstallment && (
            <div className="animate-fade-in grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="account-current-installment" className="text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted ml-1">Parcela Atual</label>
                <input 
                  id="account-current-installment" 
                  type="number" 
                  min="1" 
                  max={totalInstallments} 
                  value={currentInstallment} 
                  onChange={e => setCurrentInstallment(e.target.value)} 
                  required={isInstallment} 
                  className="w-full p-3 rounded-xl bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-text-primary dark:text-dark-text-primary" 
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="account-total-installments" className="text-[10px] font-black uppercase text-text-muted dark:text-dark-text-muted ml-1">Total de Parcelas</label>
                <input 
                  id="account-total-installments" 
                  type="number" 
                  min="1" 
                  value={totalInstallments} 
                  onChange={e => setTotalInstallments(e.target.value)} 
                  required={isInstallment} 
                  className="w-full p-3 rounded-xl bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-text-primary dark:text-dark-text-primary" 
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border-color dark:border-dark-border-color">
            <button type="button" onClick={handleAttemptClose} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-surface-light dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-secondary font-black uppercase text-[10px] tracking-widest hover:bg-surface dark:hover:bg-dark-surface transition-colors">Cancelar</button>
            <button type="submit" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95">{account ? 'Salvar Alterações' : 'Adicionar Conta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountFormModal;
