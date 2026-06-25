
import React from 'react';

interface AddSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSingle: () => void;
  onSelectBatch: () => void;
}

const AddSelectionModal: React.FC<AddSelectionModalProps> = ({ isOpen, onClose, onSelectSingle, onSelectBatch }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
          className="bg-surface dark:bg-dark-surface rounded-2xl shadow-xl p-6 w-full max-w-sm animate-fade-in-up"
          onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-center mb-6 text-text-primary dark:text-dark-text-primary">O que deseja adicionar?</h3>
        
        <div className="space-y-4">
            <button 
                onClick={() => { onSelectSingle(); onClose(); }}
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-dark-surface-light hover:bg-primary/10 hover:border-primary border border-transparent transition-all flex items-center gap-4 group"
            >
                <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="text-left">
                    <p className="font-bold text-text-primary dark:text-dark-text-primary">Conta Única</p>
                    <p className="text-xs text-text-muted">Adicionar uma despesa detalhada</p>
                </div>
            </button>

            <button 
                 onClick={() => { onSelectBatch(); onClose(); }}
                 className="w-full p-4 rounded-xl bg-surface-light dark:bg-dark-surface-light hover:bg-secondary/10 hover:border-secondary border border-transparent transition-all flex items-center gap-4 group"
            >
                <div className="p-3 rounded-full bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                 <div className="text-left">
                    <p className="font-bold text-text-primary dark:text-dark-text-primary">Várias em Lote</p>
                    <p className="text-xs text-text-muted">Preencher lista rápida</p>
                </div>
            </button>
        </div>

        <button 
            onClick={onClose}
            className="mt-6 w-full py-2 text-sm font-medium text-text-muted hover:text-text-primary dark:hover:text-dark-text-primary transition-colors"
        >
            Cancelar
        </button>
      </div>
    </div>
  );
};

export default AddSelectionModal;
