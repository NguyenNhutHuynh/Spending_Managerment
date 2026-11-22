export type TransactionType = 'income' | 'expense';

export interface Setting {
  id: number;
  initial_balance: number;
  cycle_start_day: number;
  reminder_enabled?: number;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Transaction {
  id: number;
  category_id: number;
  amount: number;
  type: TransactionType;
  note: string;
  transaction_date: string; // ISO string YYYY-MM-DDTHH:mm:ss
  created_at?: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface MonthCycle {
  startDate: Date;
  endDate: Date;
  startISO: string;
  endISO: string;
  label: string;
  isCurrentCycle: boolean;
}

export interface CycleSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}

export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  icon: string;
  color: string;
  total_amount: number;
  percentage: number;
  count: number;
}

export interface CycleTrendItem {
  label: string;
  shortLabel: string;
  totalIncome: number;
  totalExpense: number;
  startISO: string;
  endISO: string;
}
