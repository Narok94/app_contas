import fetch from 'node-fetch';
import { getMonthlyAccounts } from './utils/accountUtils.js'; // Note: might not work directly in tsx due to imports

async function main() {
  const res = await fetch('http://localhost:3000/api/accounts');
  const accounts = await res.json();
  const date = new Date(2026, 5, 1, 12, 0, 0); // June 1st 2026
  
  // mock getMonthlyAccounts inline since imports might fail
  const getSafeDateStr = (acc: any): string | null => {
        const d = acc.paymentDate || acc.dueDate || acc.date;
        if (!d) return null;
        if (typeof d === 'string') return d;
        if (d instanceof Date) return d.toISOString();
        if (typeof d === 'number') return new Date(d).toISOString();
        return String(d);
    };

    const monthKey = '2026-06';
    const physicalRecords = accounts.filter((acc: any) => {
        const dateStr = getSafeDateStr(acc);
        return dateStr?.startsWith(monthKey);
    });

  console.log('Filtered accounts for 2026-06:', physicalRecords.length);
}
main();
