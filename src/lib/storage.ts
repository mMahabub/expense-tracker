import { Expense, BudgetData, CurrencyCode } from '@/types/expense';
import { STORAGE_KEY, CURRENCY_KEY } from './constants';

const BUDGET_KEY = 'expense-tracker-budgets';

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function loadBudgets(): BudgetData | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = window.localStorage.getItem(BUDGET_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveBudgets(budgets: BudgetData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

export function loadCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';
  try {
    const data = window.localStorage.getItem(CURRENCY_KEY);
    return (data as CurrencyCode) || 'USD';
  } catch {
    return 'USD';
  }
}

export function saveCurrency(currency: CurrencyCode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENCY_KEY, currency);
}
