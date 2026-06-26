import { getDb } from './db/index';
import { accounts } from './db/schema';
import { AccountStatus } from './types';

async function main() {
  try {
    const db = getDb();
    
    const customSpecs = [
      { name: 'Pet love', value: 133.79, category: '📦 Outros', type: 'installment', current: 2, total: 2 },
      { name: 'Época', value: 74.88, category: '📦 Outros', type: 'installment', current: 6, total: 8 },
      { name: 'Centauro', value: 99.99, category: '📦 Outros', type: 'installment', current: 7, total: 10 },
      { name: 'Stanley', value: 22.80, category: '📦 Outros', type: 'installment', current: 7, total: 10 },
      { name: 'Celular Jessica', value: 323.81, category: '📦 Outros', type: 'installment', current: 17, total: 21 },
      { name: 'Farmácia', value: 60.13, category: '🏥 Saúde', type: 'installment', current: 2, total: 3 },
      { name: 'Disney', value: 46.90, category: '🎮 Lazer', type: 'recurrent' },
      { name: 'Academia Jessica', value: 129.90, category: '🏥 Saúde', type: 'recurrent' },
      { name: 'Havan', value: 29.99, category: '📦 Outros', type: 'installment', current: 9, total: 10 },
      { name: 'Compras bh', value: 242.40, category: '🍱 Alimentação', type: 'installment', current: 3, total: 3 },
      { name: 'Farmácia minas master', value: 39.50, category: '🏥 Saúde', type: 'installment', current: 1, total: 2 },
      { name: 'Big sup', value: 55.00, category: '🍱 Alimentação', type: 'installment', current: 1, total: 2 },
      { name: 'Loja 61', value: 81.68, category: '📦 Outros', type: 'installment', current: 1, total: 3 },
      { name: 'Farmácia minas master 2', value: 63.28, category: '🏥 Saúde', type: 'installment', current: 1, total: 3 },
      { name: 'Dragaria americana', value: 64.52, category: '🏥 Saúde', type: 'installment', current: 1, total: 3 },
      { name: 'Araújo', value: 88.00, category: '🏥 Saúde', type: 'installment', current: 1, total: 3 }
    ];

    const targetGroup = 'jessica-personal';

    for (const spec of customSpecs) {
      if (spec.type === 'installment') {
        const installmentId = 'series-' + spec.name.toLowerCase().replace(/\\s+/g, '-') + '-12345';
        
        for (let i = 1; i <= spec.total!; i++) {
          const isPaid = i < spec.current!;
          const monthOffset = i - spec.current!;
          const paymentDate = new Date(2026, 5 + monthOffset, 15, 12, 0, 0);

          await db.insert(accounts).values({
            id: 'acc-' + spec.name.toLowerCase().replace(/\\s+/g, '-') + '-' + i,
            groupId: targetGroup,
            name: spec.name,
            category: spec.category,
            value: String(spec.value),
            status: isPaid ? AccountStatus.PAID : AccountStatus.PENDING,
            isRecurrent: false,
            isInstallment: true,
            currentInstallment: i,
            totalInstallments: spec.total!,
            installmentId: installmentId,
            totalValue: String(spec.value * spec.total!),
            paymentDate: paymentDate.toISOString()
          }).onConflictDoNothing();
        }
      } else if (spec.type === 'recurrent') {
        await db.insert(accounts).values({
          id: 'acc-' + spec.name.toLowerCase().replace(/\\s+/g, '-') + '-template',
          groupId: targetGroup,
          name: spec.name,
          category: spec.category,
          value: String(spec.value),
          status: AccountStatus.PENDING,
          isRecurrent: true,
          isInstallment: false,
        }).onConflictDoNothing();
      }
    }
    console.log("Seeded Jessica's custom accounts!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
