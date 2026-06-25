
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
}

const FloatingCalculator: React.FC<FloatingCalculatorProps> = ({ isOpen, onClose }) => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [shouldReset, setShouldReset] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [constraints, setConstraints] = useState({ top: -400, bottom: 20, left: -400, right: 20 });

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 640;
            setIsMobile(mobile);
            setConstraints({
                top: -window.innerHeight + 320,
                bottom: 20,
                left: -window.innerWidth + 280,
                right: 20
            });
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isOpen) return null;

    const handleNumber = (num: string) => {
        if (display === '0' || shouldReset) {
            setDisplay(num);
            setShouldReset(false);
        } else {
            setDisplay(display + num);
        }
    };

    const handleOperator = (op: string) => {
        setEquation(display + ' ' + op + ' ');
        setShouldReset(true);
    };

    const calculate = () => {
        try {
            const result = eval(equation + display);
            setDisplay(String(result));
            setEquation('');
            setShouldReset(true);
        } catch (e) {
            setDisplay('Erro');
            setEquation('');
            setShouldReset(true);
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
        setShouldReset(false);
    };

    const buttons = [
        { label: 'C', action: clear, color: 'bg-danger text-white' },
        { label: '÷', action: () => handleOperator('/'), color: 'bg-primary/10 dark:bg-primary/20 text-primary' },
        { label: '×', action: () => handleOperator('*'), color: 'bg-primary/10 dark:bg-primary/20 text-primary' },
        { label: '⌫', action: () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0'), color: 'bg-surface-light dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted' },
        
        { label: '7', action: () => handleNumber('7') },
        { label: '8', action: () => handleNumber('8') },
        { label: '9', action: () => handleNumber('9') },
        { label: '-', action: () => handleOperator('-'), color: 'bg-primary/10 dark:bg-primary/20 text-primary' },
        
        { label: '4', action: () => handleNumber('4') },
        { label: '5', action: () => handleNumber('5') },
        { label: '6', action: () => handleNumber('6') },
        { label: '+', action: () => handleOperator('+'), color: 'bg-primary/10 dark:bg-primary/20 text-primary' },
        
        { label: '1', action: () => handleNumber('1') },
        { label: '2', action: () => handleNumber('2') },
        { label: '3', action: () => handleNumber('3') },
        { label: '=', action: calculate, color: 'bg-primary text-white row-span-2' },
        
        { label: '0', action: () => handleNumber('0'), color: 'col-span-2' },
        { label: '.', action: () => handleNumber('.') },
    ];

    return (
        <motion.div
            drag={!isMobile}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={constraints}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[100] w-64 bg-surface dark:bg-dark-surface rounded-3xl shadow-2xl border border-border-color dark:border-dark-border-color overflow-hidden select-none"
        >
            {/* Header */}
            <div className="bg-surface-light dark:bg-dark-surface-light p-3 flex justify-between items-center cursor-move border-b border-border-color dark:border-dark-border-color">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-dark-text-muted">Calculadora</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Display */}
            <div className="p-4 bg-surface-light dark:bg-dark-surface-light/30 text-right">
                <div className="text-[10px] text-text-muted dark:text-dark-text-muted font-mono h-4 truncate">{equation}</div>
                <div className="text-3xl font-black tracking-tighter text-text-primary dark:text-dark-text-primary truncate">
                    {display}
                </div>
            </div>

            {/* Buttons Grid */}
            <div className="p-3 grid grid-cols-4 gap-2">
                {buttons.map((btn, idx) => (
                    <button
                        key={idx}
                        onClick={btn.action}
                        className={`h-11 rounded-xl font-bold text-sm transition-all active:scale-90 shadow-sm flex items-center justify-center ${
                            btn.color || 'bg-surface-light dark:bg-dark-surface-light/50 text-text-secondary dark:text-dark-text-secondary hover:bg-surface dark:hover:bg-dark-surface'
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </motion.div>
    );
};

export default FloatingCalculator;
