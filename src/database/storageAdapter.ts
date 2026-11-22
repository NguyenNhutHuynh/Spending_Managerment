import {
  Category,
  CategoryBreakdown,
  CycleTrendItem,
  Setting,
  Transaction,
  TransactionType,
} from '../types';
import { calculateCycle } from '../utils/dateCycle';
import { GetTransactionsOptions } from './db';

const SETTINGS_KEY = 'spending_management_settings';
const CATEGORIES_KEY = 'spending_management_categories';
const TRANSACTIONS_KEY = 'spending_management_transactions';

// In-memory fallback nếu localStorage không khả dụng (ví dụ Safari Private Browsing hoặc SSR)
const memoryStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn(`[StorageAdapter] Không thể đọc localStorage cho key: ${key}`, e);
  }
  return memoryStorage[key] || null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`[StorageAdapter] Không thể ghi localStorage cho key: ${key}`, e);
  }
  memoryStorage[key] = value;
}

/**
 * Khởi tạo dữ liệu mặc định cho Web nếu chưa tồn tại
 */
export function initWebStorage(): void {
  // 1. Settings mặc định
  const existingSettings = getStorageItem(SETTINGS_KEY);
  if (!existingSettings) {
    const defaultSettings: Setting = {
      id: 1,
      initial_balance: 0,
      cycle_start_day: 1,
      reminder_enabled: 0,
    };
    setStorageItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  }

  // 2. Categories mặc định (6 danh mục: 4 chi, 2 thu)
  const existingCategories = getStorageItem(CATEGORIES_KEY);
  if (!existingCategories || JSON.parse(existingCategories).length === 0) {
    const defaultCategories: Category[] = [
      { id: 1, name: 'Ăn uống', type: 'expense', icon: 'fast-food', color: '#FF7043' },
      { id: 2, name: 'Di chuyển', type: 'expense', icon: 'car', color: '#42A5F5' },
      { id: 3, name: 'Mua sắm', type: 'expense', icon: 'cart', color: '#AB47BC' },
      { id: 4, name: 'Hóa đơn', type: 'expense', icon: 'receipt', color: '#FFA726' },
      { id: 5, name: 'Tiền lương', type: 'income', icon: 'wallet', color: '#66BB6A' },
      { id: 6, name: 'Thưởng/Khác', type: 'income', icon: 'gift', color: '#26A69A' },
    ];
    setStorageItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  }

  // 3. Transactions mặc định
  const existingTransactions = getStorageItem(TRANSACTIONS_KEY);
  if (!existingTransactions) {
    setStorageItem(TRANSACTIONS_KEY, JSON.stringify([]));
  }
}

// ==================== SETTINGS ====================

export function getWebSettings(): Setting {
  const data = getStorageItem(SETTINGS_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return {
        id: 1,
        initial_balance: Number(parsed.initial_balance) || 0,
        cycle_start_day: Number(parsed.cycle_start_day) || 1,
        reminder_enabled: Number(parsed.reminder_enabled) || 0,
      };
    } catch {
      // Bỏ qua lỗi parse
    }
  }
  return { id: 1, initial_balance: 0, cycle_start_day: 1, reminder_enabled: 0 };
}

export function updateWebSettings(initialBalance: number, cycleStartDay: number): void {
  const current = getWebSettings();
  const validStartDay = Math.min(Math.max(1, Math.floor(cycleStartDay || 1)), 28);
  const updated: Setting = {
    ...current,
    initial_balance: initialBalance,
    cycle_start_day: validStartDay,
  };
  setStorageItem(SETTINGS_KEY, JSON.stringify(updated));
}

export function updateWebReminderSetting(enabled: boolean): void {
  const current = getWebSettings();
  const updated: Setting = {
    ...current,
    reminder_enabled: enabled ? 1 : 0,
  };
  setStorageItem(SETTINGS_KEY, JSON.stringify(updated));
}

// ==================== CATEGORIES ====================

export function getWebCategories(type?: TransactionType): Category[] {
  const data = getStorageItem(CATEGORIES_KEY);
  let categories: Category[] = [];
  if (data) {
    try {
      categories = JSON.parse(data);
    } catch {
      categories = [];
    }
  }
  if (type) {
    return categories.filter((c) => c.type === type);
  }
  return categories;
}

export function addWebCategory(
  name: string,
  type: TransactionType,
  icon: string,
  color: string
): number {
  const categories = getWebCategories();
  const maxId = categories.reduce((max, c) => (c.id > max ? c.id : max), 0);
  const newId = maxId + 1;
  const newCategory: Category = {
    id: newId,
    name: name.trim(),
    type,
    icon,
    color,
  };
  categories.push(newCategory);
  setStorageItem(CATEGORIES_KEY, JSON.stringify(categories));
  return newId;
}

export function deleteWebCategory(id: number): boolean {
  const transactions = getWebTransactions();
  const inUse = transactions.some((t) => t.category_id === id);
  if (inUse) {
    throw new Error('Không thể xóa danh mục đã có giao dịch phát sinh!');
  }
  const categories = getWebCategories().filter((c) => c.id !== id);
  setStorageItem(CATEGORIES_KEY, JSON.stringify(categories));
  return true;
}

// ==================== TRANSACTIONS ====================

export function getWebTransactions(options: GetTransactionsOptions = {}): Transaction[] {
  const data = getStorageItem(TRANSACTIONS_KEY);
  let list: Transaction[] = [];
  if (data) {
    try {
      list = JSON.parse(data);
    } catch {
      list = [];
    }
  }

  const categories = getWebCategories();
  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id, c]));

  // Lọc theo điều kiện
  let filtered = list.filter((t) => {
    if (options.startDate && t.transaction_date < options.startDate) return false;
    if (options.endDate && t.transaction_date > options.endDate) return false;
    if (options.type && t.type !== options.type) return false;
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toLowerCase();
      const cat = categoryMap.get(t.category_id);
      const noteMatch = (t.note || '').toLowerCase().includes(q);
      const catMatch = (cat?.name || '').toLowerCase().includes(q);
      if (!noteMatch && !catMatch) return false;
    }
    return true;
  });

  // Gắn thông tin Category và sắp xếp
  const enriched: Transaction[] = filtered.map((t) => {
    const cat = categoryMap.get(t.category_id);
    return {
      ...t,
      category_name: cat ? cat.name : 'Chưa phân loại',
      category_icon: cat ? cat.icon : 'pricetag',
      category_color: cat ? cat.color : '#64748B',
    };
  });

  enriched.sort((a, b) => {
    if (a.transaction_date === b.transaction_date) {
      return b.id - a.id;
    }
    return b.transaction_date.localeCompare(a.transaction_date);
  });

  return enriched;
}

export function getWebTransactionsByRange(
  startISO: string,
  endISO: string,
  type?: TransactionType
): Transaction[] {
  return getWebTransactions({
    startDate: startISO,
    endDate: endISO,
    type,
  });
}

export function getWebTransactionById(id: number): Transaction | null {
  const list = getWebTransactions();
  return list.find((t) => t.id === id) || null;
}

export function addWebTransaction(
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): number {
  const data = getStorageItem(TRANSACTIONS_KEY);
  let list: Transaction[] = [];
  if (data) {
    try {
      list = JSON.parse(data);
    } catch {
      list = [];
    }
  }

  const maxId = list.reduce((max, t) => (t.id > max ? t.id : max), 0);
  const newId = maxId + 1;
  const newTx: Transaction = {
    id: newId,
    category_id: categoryId,
    amount,
    type,
    note: note.trim(),
    transaction_date: transactionDate,
    created_at: new Date().toISOString(),
  };

  list.push(newTx);
  setStorageItem(TRANSACTIONS_KEY, JSON.stringify(list));
  return newId;
}

export function updateWebTransaction(
  id: number,
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): void {
  const data = getStorageItem(TRANSACTIONS_KEY);
  let list: Transaction[] = [];
  if (data) {
    try {
      list = JSON.parse(data);
    } catch {
      list = [];
    }
  }

  const index = list.findIndex((t) => t.id === id);
  if (index !== -1) {
    list[index] = {
      ...list[index],
      category_id: categoryId,
      amount,
      type,
      note: note.trim(),
      transaction_date: transactionDate,
    };
    setStorageItem(TRANSACTIONS_KEY, JSON.stringify(list));
  }
}

export function deleteWebTransaction(id: number): void {
  const data = getStorageItem(TRANSACTIONS_KEY);
  let list: Transaction[] = [];
  if (data) {
    try {
      list = JSON.parse(data);
    } catch {
      list = [];
    }
  }
  const updated = list.filter((t) => t.id !== id);
  setStorageItem(TRANSACTIONS_KEY, JSON.stringify(updated));
}

// ==================== BALANCES & SUMMARIES ====================

export function getWebOverallBalance(): {
  initialBalance: number;
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
} {
  const settings = getWebSettings();
  const transactions = getWebTransactions();

  let totalIncomeAllTime = 0;
  let totalExpenseAllTime = 0;

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncomeAllTime += t.amount;
    } else if (t.type === 'expense') {
      totalExpenseAllTime += t.amount;
    }
  }

  const currentBalance =
    settings.initial_balance + totalIncomeAllTime - totalExpenseAllTime;

  return {
    initialBalance: settings.initial_balance,
    totalIncomeAllTime,
    totalExpenseAllTime,
    currentBalance,
  };
}

export function getWebAllTimeTotals(): {
  initialBalance: number;
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
} {
  return getWebOverallBalance();
}

export function getWebCycleSummary(
  startISO: string,
  endISO: string
): {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
} {
  const transactions = getWebTransactions({
    startDate: startISO,
    endDate: endISO,
  });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpense += t.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
  };
}

export function getWebCategoryBreakdown(
  startISO: string,
  endISO: string,
  type: TransactionType
): CategoryBreakdown[] {
  const transactions = getWebTransactions({
    startDate: startISO,
    endDate: endISO,
    type,
  });

  const categories = getWebCategories();
  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id, c]));

  const summaryMap = new Map<
    number,
    { total: number; count: number; name: string; icon: string; color: string }
  >();

  let grandTotal = 0;

  for (const t of transactions) {
    grandTotal += t.amount;
    const cat = categoryMap.get(t.category_id);
    const existing = summaryMap.get(t.category_id);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      summaryMap.set(t.category_id, {
        total: t.amount,
        count: 1,
        name: cat ? cat.name : 'Chưa phân loại',
        icon: cat ? cat.icon : 'pricetag',
        color: cat ? cat.color : '#64748B',
      });
    }
  }

  const result: CategoryBreakdown[] = [];
  summaryMap.forEach((val, catId) => {
    result.push({
      category_id: catId,
      category_name: val.name,
      icon: val.icon,
      color: val.color,
      total_amount: val.total,
      count: val.count,
      percentage: grandTotal > 0 ? Math.round((val.total / grandTotal) * 1000) / 10 : 0,
    });
  });

  result.sort((a, b) => b.total_amount - a.total_amount);
  return result;
}

export function getWebLast6CyclesSummary(cycleStartDay: number): CycleTrendItem[] {
  const result: CycleTrendItem[] = [];
  for (let offset = -5; offset <= 0; offset++) {
    const cycle = calculateCycle(cycleStartDay, offset);
    const summary = getWebCycleSummary(cycle.startISO, cycle.endISO);
    const startD = cycle.startDate;
    const shortLabel = `T${startD.getMonth() + 1}`;
    result.push({
      label: cycle.label,
      shortLabel,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      startISO: cycle.startISO,
      endISO: cycle.endISO,
    });
  }
  return result;
}
