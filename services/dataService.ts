import { type User, type Group, type Account, type Income } from '../types';
import realtimeService from './realtimeService';

// Users
export const getUsers = () => realtimeService.getUsers();
export const updateUser = (updatedUser: User) => realtimeService.updateUser(updatedUser);
export const addUser = (newUser: Omit<User, 'id'>) => realtimeService.addUser(newUser);
export const deleteUser = (userId: string) => realtimeService.deleteUser(userId);

// Groups
export const getGroups = () => realtimeService.getGroups();
export const updateGroup = (updatedGroup: Group) => realtimeService.updateGroup(updatedGroup);
export const addGroup = (newGroup: Omit<Group, 'id'>) => realtimeService.addGroup(newGroup);
export const deleteGroup = (groupId: string) => realtimeService.deleteGroup(groupId);

// Accounts
export const getAccounts = () => realtimeService.getAccounts();
export const updateAccount = (updatedAccount: Account) => realtimeService.updateAccount(updatedAccount);
export const addAccount = (newAccount: Account) => realtimeService.addAccount(newAccount);
export const deleteAccount = (accountId: string) => realtimeService.deleteAccount(accountId);
export const updateMultipleAccounts = (updatedAccounts: Account[]) => realtimeService.updateMultipleAccounts(updatedAccounts);

// Incomes
export const getIncomes = () => realtimeService.getIncomes();
export const updateIncome = (updatedIncome: Income) => realtimeService.updateIncome(updatedIncome);
export const addIncome = (newIncome: Income) => realtimeService.addIncome(newIncome);
export const deleteIncome = (incomeId: string) => realtimeService.deleteIncome(incomeId);

// Categories
export const getCategories = () => realtimeService.getCategories();
export const saveCategories = (categories: string[]) => realtimeService.saveCategories(categories);

// Data Import/Export
export const exportData = () => realtimeService.exportData();
export const importData = (data: any) => realtimeService.importData(data);
