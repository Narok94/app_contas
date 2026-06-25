import { pgTable, text, timestamp, boolean, integer, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull(), // ADMIN or USER
  groupIds: text('group_ids').array(),
});

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  value: numeric('value').notNull(),
  status: text('status').notNull(), // PENDING or PAID
  isRecurrent: boolean('is_recurrent').notNull(),
  isInstallment: boolean('is_installment').notNull(),
  totalInstallments: integer('total_installments'),
  currentInstallment: integer('current_installment'),
  totalValue: numeric('total_value'),
  installmentId: text('installment_id'),
  paymentDate: text('payment_date'),
});

export const incomes = pgTable('incomes', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull(),
  name: text('name').notNull(),
  value: numeric('value').notNull(),
  date: text('date').notNull(),
  isRecurrent: boolean('is_recurrent').notNull(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull(),
  logoUrl: text('logo_url'),
  whatsappEnabled: boolean('whatsapp_enabled'),
  whatsappGroupLink: text('whatsapp_group_link'),
});
