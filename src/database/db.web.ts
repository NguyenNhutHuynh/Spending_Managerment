import {
  Category,
  CategoryBreakdown,
  CycleTrendItem,
  Setting,
  Transaction,
  TransactionType,
} from '../types';
import * as storageAdapter from './storageAdapter';

export interface GetTransactionsOptions {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  searchQuery?: string;
}

export function initDatabase(): void {
  storageAdapter.initWebStorage();
}

export function getSettings(): Setting {
  return storageAdapter.getWebSettings();
}

export function updateSettings(initialBalance: number, cycleStartDay: number): void {
  storageAdapter.updateWebSettings(initialBalance, cycleStartDay);
}

export function updateReminderSetting(enabled: boolean): void {
  storageAdapter.updateWebReminderSetting(enabled);
}

export function getCategories(type?: TransactionType): Category[] {
  return storageAdapter.getWebCategories(type);
}

export function addCategory(
  name: string,
  type: TransactionType,
  icon: string,
  color: string
): number {
  return storageAdapter.addWebCategory(name, type, icon, color);
}

export function deleteCategory(id: number): boolean {
  return storageAdapter.deleteWebCategory(id);
}

export function getTransactions(options: GetTransactionsOptions = {}): Transaction[] {
  return storageAdapter.getWebTransactions(options);
}

export function getTransactionsByRange(
  startISO: string,
  endISO: string,
  type?: TransactionType
): Transaction[] {
  return storageAdapter.getWebTransactionsByRange(startISO, endISO, type);
}

export function getTransactionById(id: number): Transaction | null {
  return storageAdapter.getWebTransactionById(id);
}

export function addTransaction(
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): number {
  return storageAdapter.addWebTransaction(categoryId, amount, type, note, transactionDate);
}

export function updateTransaction(
  id: number,
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): void {
  storageAdapter.updateWebTransaction(id, categoryId, amount, type, note, transactionDate);
}

export function deleteTransaction(id: number): void {
  storageAdapter.deleteWebTransaction(id);
}

export function getOverallBalance(): {
  initialBalance: number;
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
} {
  return storageAdapter.getWebOverallBalance();
}

export function getAllTimeTotals(): {
  initialBalance: number;
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
} {
  return storageAdapter.getWebAllTimeTotals();
}

export function getCycleSummary(
  startISO: string,
  endISO: string
): {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
} {
  return storageAdapter.getWebCycleSummary(startISO, endISO);
}

export function getCategoryBreakdown(
  startISO: string,
  endISO: string,
  type: TransactionType
): CategoryBreakdown[] {
  return storageAdapter.getWebCategoryBreakdown(startISO, endISO, type);
}

export function getLast6CyclesSummary(cycleStartDay: number): CycleTrendItem[] {
  return storageAdapter.getWebLast6CyclesSummary(cycleStartDay);
}
