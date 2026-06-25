import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonthPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ selectedDate, onSelectDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const validDate = useMemo(() => {
    return selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();
  }, [selectedDate]);

  const currentYear = validDate.getFullYear();
  const currentMonth = validDate.getMonth();

  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const fullMonthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (monthIndex: number) => {
    onSelectDate(new Date(currentYear, monthIndex, 1));
    setIsOpen(false);
  };

  const handleYearChange = (delta: number) => {
    const newYear = currentYear + delta;
    onSelectDate(new Date(newYear, currentMonth, 1));
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Gatilho Compacto e Singelo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-white/5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-surface-light transition-all active:scale-95 group"
      >
        <span className="text-xs font-black text-text-primary dark:text-dark-text-primary">
          {fullMonthNames[currentMonth]} <span className="text-primary">{currentYear}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover de Seleção */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 p-3 bg-surface dark:bg-dark-surface border border-border-color dark:border-dark-border-color rounded-2xl shadow-2xl z-50 min-w-[220px]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <button 
                onClick={(e) => { e.stopPropagation(); handleYearChange(-1); }} 
                className="p-1 rounded-lg hover:bg-surface-light dark:hover:bg-dark-surface-light transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-black text-primary">{currentYear}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleYearChange(1); }} 
                className="p-1 rounded-lg hover:bg-surface-light dark:hover:bg-dark-surface-light transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {monthNames.map((name, index) => {
                const isSelected = index === currentMonth;
                return (
                  <button
                    key={name}
                    onClick={() => handleMonthSelect(index)}
                    className={`py-2 text-[10px] font-black rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-primary text-white shadow-md' 
                        : 'hover:bg-primary/10 hover:text-primary text-text-secondary'
                    }`}
                  >
                    {name.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthPicker;