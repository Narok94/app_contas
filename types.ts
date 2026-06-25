export type View = 'login' | 'dashboard' | 'accounts' | 'income' | 'assistant';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum AccountStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  whatsappEnabled?: boolean;
  whatsappGroupLink?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  groupIds: string[];
}

export interface Group {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  groupId: string;
  name: string;
  category: string;
  value: number;
  status: AccountStatus;
  isRecurrent: boolean;
  isInstallment: boolean;
  totalInstallments?: number;
  currentInstallment?: number;
  totalValue?: number;
  installmentId?: string;
  paymentDate?: string;
}

export interface Income {
  id: string;
  groupId: string;
  name: string;
  value: number;
  date: string;
  isRecurrent: boolean;
}
