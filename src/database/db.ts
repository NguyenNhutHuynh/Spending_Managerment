import * as SQLite from 'expo-sqlite';
import {
  Category,
  CategoryBreakdown,
  CycleTrendItem,
  Setting,
  Transaction,
  TransactionType,
} from '../types';
import { calculateCycle } from '../utils/dateCycle';

const DB_NAME = 'spending_management.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Khởi tạo Database và nạp dữ liệu ban đầu nếu chưa có
 */
export function initDatabase(): void {
  const db = getDb();

  // Bật chế độ FOREIGN KEY và WAL
  db.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  // Tạo các bảng
  db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      initial_balance REAL DEFAULT 0,
      cycle_start_day INTEGER DEFAULT 1 CHECK (cycle_start_day >= 1 AND cycle_start_day <= 28)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      note TEXT,
      transaction_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed settings mặc định
  db.runSync(`
    INSERT OR IGNORE INTO settings (id, initial_balance, cycle_start_day)
    VALUES (1, 0, 1);
  `);

  // Kiểm tra và seed categories mặc định nếu bảng trống
  const catCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if (!catCount || catCount.count === 0) {
    // 4 Danh mục chi tiêu mặc định
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Ăn uống', 'expense', 'fast-food', '#FF7043']
    );
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Di chuyển', 'expense', 'car', '#42A5F5']
    );
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Mua sắm', 'expense', 'cart', '#AB47BC']
    );
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Hóa đơn', 'expense', 'receipt', '#FFA726']
    );

    // 2 Danh mục thu nhập mặc định
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Tiền lương', 'income', 'wallet', '#66BB6A']
    );
    db.runSync(
      `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)`,
      ['Thưởng/Khác', 'income', 'gift', '#26A69A']
    );
  }
}

// ==================== SETTINGS ====================

export function getSettings(): Setting {
  const db = getDb();
  const setting = db.getFirstSync<Setting>('SELECT * FROM settings WHERE id = 1;');
  if (setting) {
    return setting;
  }
  return { id: 1, initial_balance: 0, cycle_start_day: 1 };
}

export function updateSettings(initialBalance: number, cycleStartDay: number): void {
  const db = getDb();
  const validStartDay = Math.min(Math.max(1, Math.floor(cycleStartDay || 1)), 28);
  db.runSync(
    `UPDATE settings SET initial_balance = ?, cycle_start_day = ? WHERE id = 1;`,
    [initialBalance, validStartDay]
  );
}

// ==================== CATEGORIES ====================

export function getCategories(type?: TransactionType): Category[] {
  const db = getDb();
  if (type) {
    return db.getAllSync<Category>(
      'SELECT * FROM categories WHERE type = ? ORDER BY id ASC;',
      [type]
    );
  }
  return db.getAllSync<Category>('SELECT * FROM categories ORDER BY id ASC;');
}

export function addCategory(
  name: string,
  type: TransactionType,
  icon: string,
  color: string
): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?);`,
    [name.trim(), type, icon, color]
  );
  return Number(result.lastInsertRowId);
}

export function deleteCategory(id: number): boolean {
  const db = getDb();
  // Kiểm tra xem danh mục có giao dịch nào tham chiếu đến không
  const usage = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;',
    [id]
  );
  if (usage && usage.count > 0) {
    throw new Error('Không thể xóa danh mục đã có giao dịch phát sinh!');
  }
  db.runSync('DELETE FROM categories WHERE id = ?;', [id]);
  return true;
}

// ==================== TRANSACTIONS ====================

export interface GetTransactionsOptions {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  searchQuery?: string;
}

export function getTransactions(options: GetTransactionsOptions = {}): Transaction[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.startDate) {
    conditions.push('t.transaction_date >= ?');
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push('t.transaction_date <= ?');
    params.push(options.endDate);
  }
  if (options.type) {
    conditions.push('t.type = ?');
    params.push(options.type);
  }
  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    conditions.push('(t.note LIKE ? OR c.name LIKE ?)');
    const term = `%${options.searchQuery.trim()}%`;
    params.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.id,
      t.category_id,
      t.amount,
      t.type,
      t.note,
      t.transaction_date,
      t.created_at,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY t.transaction_date DESC, t.id DESC;
  `;

  return db.getAllSync<Transaction>(sql, params);
}

export function getTransactionById(id: number): Transaction | null {
  const db = getDb();
  const sql = `
    SELECT 
      t.id,
      t.category_id,
      t.amount,
      t.type,
      t.note,
      t.transaction_date,
      t.created_at,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?;
  `;
  return db.getFirstSync<Transaction>(sql, [id]);
}

export function addTransaction(
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO transactions (category_id, amount, type, note, transaction_date)
     VALUES (?, ?, ?, ?, ?);`,
    [categoryId, amount, type, note.trim(), transactionDate]
  );
  return Number(result.lastInsertRowId);
}

export function updateTransaction(
  id: number,
  categoryId: number,
  amount: number,
  type: TransactionType,
  note: string,
  transactionDate: string
): void {
  const db = getDb();
  db.runSync(
    `UPDATE transactions 
     SET category_id = ?, amount = ?, type = ?, note = ?, transaction_date = ?
     WHERE id = ?;`,
    [categoryId, amount, type, note.trim(), transactionDate, id]
  );
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  db.runSync('DELETE FROM transactions WHERE id = ?;', [id]);
}

// ==================== BALANCES & SUMMARIES ====================

/**
 * Tính số dư thực tế hiện tại = initial_balance + Tổng thu toàn thời gian - Tổng chi toàn thời gian
 */
export function getOverallBalance(): {
  initialBalance: number;
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
} {
  const db = getDb();
  const setting = getSettings();

  const incomeRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income';`
  );
  const expenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense';`
  );

  const totalIncomeAllTime = incomeRow?.total || 0;
  const totalExpenseAllTime = expenseRow?.total || 0;
  const currentBalance = setting.initial_balance + totalIncomeAllTime - totalExpenseAllTime;

  return {
    initialBalance: setting.initial_balance,
    totalIncomeAllTime,
    totalExpenseAllTime,
    currentBalance,
  };
}

/**
 * Tổng kết thu, chi trong khoảng thời gian cụ thể (chu kỳ)
 */
export function getCycleSummary(startISO: string, endISO: string): {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
} {
  const db = getDb();
  const incomeRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE type = 'income' AND transaction_date >= ? AND transaction_date <= ?;`,
    [startISO, endISO]
  );
  const expenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM transactions 
     WHERE type = 'expense' AND transaction_date >= ? AND transaction_date <= ?;`,
    [startISO, endISO]
  );

  const totalIncome = incomeRow?.total || 0;
  const totalExpense = expenseRow?.total || 0;
  const netSavings = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netSavings,
  };
}

/**
 * Thống kê tỷ trọng theo danh mục trong khoảng thời gian chu kỳ
 */
export function getCategoryBreakdown(
  startISO: string,
  endISO: string,
  type: TransactionType
): CategoryBreakdown[] {
  const db = getDb();
  const rows = db.getAllSync<{
    category_id: number;
    category_name: string;
    icon: string;
    color: string;
    total_amount: number;
    count: number;
  }>(
    `SELECT 
      t.category_id,
      COALESCE(c.name, 'Chưa phân loại') as category_name,
      COALESCE(c.icon, 'pricetag') as icon,
      COALESCE(c.color, '#64748B') as color,
      SUM(t.amount) as total_amount,
      COUNT(t.id) as count
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.type = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
     GROUP BY t.category_id
     ORDER BY total_amount DESC;`,
    [type, startISO, endISO]
  );

  const grandTotal = rows.reduce((sum, r) => sum + r.total_amount, 0);

  return rows.map((r) => ({
    ...r,
    percentage: grandTotal > 0 ? Math.round((r.total_amount / grandTotal) * 1000) / 10 : 0,
  }));
}

/**
 * Lấy tổng kết 6 chu kỳ tháng gần nhất (từ cũ đến mới)
 */
export function getLast6CyclesSummary(cycleStartDay: number): CycleTrendItem[] {
  const result: CycleTrendItem[] = [];
  for (let offset = -5; offset <= 0; offset++) {
    const cycle = calculateCycle(cycleStartDay, offset);
    const summary = getCycleSummary(cycle.startISO, cycle.endISO);
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
