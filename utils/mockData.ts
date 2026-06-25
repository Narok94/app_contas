import { Role, AccountStatus, type User, type Group, type Account, type Income } from '../types';

const today = new Date();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);

export const ACCOUNT_CATEGORIES: string[] = [
    '🏠 Moradia',
    '🍱 Alimentação',
    '🚗 Transporte',
    '🏥 Saúde',
    '🎮 Lazer',
    '🎓 Educação',
    '🌐 Internet',
    '💳 Cartão',
    '💡 Luz',
    '💧 Água',
    '🧸 Manuela',
    '📦 Outros',
].sort((a, b) => a.localeCompare(b));

export const MOCK_GROUPS: Group[] = [
  { id: 'jessica-personal', name: 'Controle de Contas' },
];

export const MOCK_USERS: User[] = [
  { id: 'user-4', name: 'Jéssica', username: 'jessica', password: '123', role: Role.USER, groupIds: ['jessica-personal'] },
];

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc-j3', groupId: 'jessica-personal', name: 'Unimed', category: '🏥 Saúde', value: 348.69, status: AccountStatus.PAID, isRecurrent: true, isInstallment: false, paymentDate: lastMonth.toISOString() },
  { id: 'acc-j6', groupId: 'jessica-personal', name: 'Cartão', category: '💳 Cartão', value: 0.00, status: AccountStatus.PENDING, isRecurrent: true, isInstallment: false },
  { id: 'acc-j9', groupId: 'jessica-personal', name: 'Cemig', category: '💡 Luz', value: 0.00, status: AccountStatus.PENDING, isRecurrent: true, isInstallment: false },
  { id: 'acc-j10', groupId: 'jessica-personal', name: 'Copasa', category: '💧 Água', value: 0.00, status: AccountStatus.PENDING, isRecurrent: true, isInstallment: false },
];

export const MOCK_INCOMES: Income[] = [
  { id: 'inc-j1', groupId: 'jessica-personal', name: 'Salário Jéssica', value: 7500, date: lastMonth.toISOString(), isRecurrent: true },
];
