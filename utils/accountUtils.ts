
import { type Account, AccountStatus } from '../types';

export const isVariableExpense = (acc: Partial<Account>) => {
    if (!acc) return false;
    const nameLower = acc.name?.toLowerCase() || '';
    const categoryLower = acc.category?.toLowerCase() || '';
    const isCartao = nameLower.includes('cartão') || categoryLower.includes('cartão');
    const isAgua = nameLower.includes('água') || categoryLower.includes('água');
    const isLuz = nameLower.includes('luz') || categoryLower.includes('luz');
    return isCartao || isAgua || isLuz;
};

export const getMonthlyAccounts = (accounts: Account[], date: Date) => {
    const selectedYear = date.getFullYear();
    const selectedMonth = date.getMonth();
    const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    const getSafeDateStr = (acc: any): string | null => {
        const d = acc.paymentDate || acc.dueDate || acc.date;
        if (!d) return null;
        if (typeof d === 'string') return d;
        if (d instanceof Date) return d.toISOString();
        if (typeof d === 'number') return new Date(d).toISOString();
        return String(d);
    };

    // Parser 100% imune a fuso-horários para identificar o ano e mês dos registros
    const parseSafeYearAndMonth = (dateStr: string): { year: number; month: number } => {
        const parts = dateStr.substring(0, 7).split('-');
        if (parts.length === 2) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Mês baseado em 0 (0-11)
            if (!isNaN(year) && !isNaN(month)) {
                return { year, month };
            }
        }
        const d = new Date(dateStr);
        return { year: d.getFullYear(), month: d.getMonth() };
    };

    const physicalRecords = accounts.filter(acc => {
        const dateStr = getSafeDateStr(acc);
        return dateStr?.startsWith(monthKey);
    });
    
    const orphanAccounts = accounts.filter(acc => {
        const dateStr = getSafeDateStr(acc);
        return !dateStr && !acc.isRecurrent && !acc.isInstallment;
    });

    const recurrentTemplates = accounts.filter(acc => {
        const dateStr = getSafeDateStr(acc);
        return acc.isRecurrent && 
        !dateStr &&
        !physicalRecords.some(p => p.name === acc.name && p.category === acc.category);
    });

    const projectedInstallments: Account[] = [];
    const seriesAnchors = new Map<string, Account>();
    
    accounts.forEach(acc => {
        const dateStr = getSafeDateStr(acc);
        if (acc.isInstallment && dateStr) {
            // Chave estável para agrupamento, evitando colisão entre grupos e parcelamentos distintos
            const anchorKey = acc.installmentId || 
                `${acc.groupId || 'default'}-${acc.name}-${acc.category || 'none'}-${acc.totalInstallments || 'unknown'}`;
                
            const current = seriesAnchors.get(anchorKey);
            
            if (!current) {
                seriesAnchors.set(anchorKey, acc);
            } else {
                const currentDateStr = getSafeDateStr(current);
                if (currentDateStr) {
                    const currentMeta = parseSafeYearAndMonth(currentDateStr);
                    const accMeta = parseSafeYearAndMonth(dateStr);
                    const currentMonths = currentMeta.year * 12 + currentMeta.month;
                    const accMonths = accMeta.year * 12 + accMeta.month;
                    if (accMonths > currentMonths) {
                        seriesAnchors.set(anchorKey, acc);
                    }
                }
            }
        }
    });

    seriesAnchors.forEach((acc) => {
        const dateStr = getSafeDateStr(acc);
        if (!dateStr) return;
        
        const { year: startYear, month: startMonth } = parseSafeYearAndMonth(dateStr);
        const monthDiff = (selectedYear - startYear) * 12 + (selectedMonth - startMonth);

        // Apenas projeta se o mês selecionado for posterior ao mês da âncora
        if (monthDiff > 0) {
            const currentInst = Number(acc.currentInstallment || 1);
            const targetInstallment = currentInst + monthDiff;
            
            // Filtro preciso de itens da própria série de parcelas
            const sameSeriesAccounts = accounts.filter(a => {
                if (acc.installmentId) {
                    return a.installmentId === acc.installmentId;
                } else {
                    return !a.installmentId && 
                        a.groupId === acc.groupId && 
                        a.name === acc.name && 
                        a.category === acc.category;
                }
            });
            
            const maxTotalInSeries = Math.max(
                Number(acc.totalInstallments || 0),
                ...sameSeriesAccounts.map(a => Number(a.totalInstallments || 0))
            );

            if (targetInstallment <= maxTotalInSeries) {
                // Verifica se já existe um registro físico no mesmo mês para a mesma série
                const alreadyExists = physicalRecords.some(p => {
                    const matchesSeries = acc.installmentId 
                        ? p.installmentId === acc.installmentId
                        : (!p.installmentId && p.groupId === acc.groupId && p.name === acc.name && p.category === acc.category);
                        
                    return matchesSeries && Number(p.currentInstallment) === targetInstallment;
                });

                if (!alreadyExists) {
                    projectedInstallments.push({
                        ...acc,
                        id: `projected-${acc.id}-${monthKey}`,
                        currentInstallment: targetInstallment,
                        totalInstallments: maxTotalInSeries,
                        status: AccountStatus.PENDING,
                        paymentDate: undefined 
                    });
                }
            }
        }
    });

    const overdueRecords = accounts.filter(acc => {
        const dateStr = getSafeDateStr(acc);
        if (!dateStr || acc.status === AccountStatus.PAID || acc.id?.toString().startsWith('projected-') || acc.isInstallment || acc.isRecurrent) return false;
        
        const accMonthKey = dateStr.substring(0, 7);
        return accMonthKey < monthKey && acc.status === AccountStatus.PENDING;
    });

    return [...overdueRecords, ...physicalRecords, ...orphanAccounts, ...recurrentTemplates, ...projectedInstallments];
};
