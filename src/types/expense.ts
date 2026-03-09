export type Category = 'Food' | 'Transportation' | 'Entertainment' | 'Shopping' | 'Bills' | 'Other';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'none';

export type CurrencyCode = 'USD' | 'BDT' | 'EUR' | 'GBP' | 'INR';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  createdAt: string;
  recurring?: RecurringFrequency;
}

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  dateFrom: string;
  dateTo: string;
}

export interface BudgetData {
  overall: number;
  categories: Record<Category, number>;
}

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export interface AppBackupData {
  version: number;
  exportedAt: string;
  expenses: Expense[];
  budgets: BudgetData | null;
  currency: CurrencyCode;
}
