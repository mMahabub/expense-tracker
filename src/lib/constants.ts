import { Category } from '@/types/expense';

export const CATEGORIES: Category[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#ec4899',
  Bills: '#00d4aa',
  Other: '#64748b',
};

export const CATEGORY_GRADIENTS: Record<Category, string> = {
  Food: 'from-orange-500 to-amber-400',
  Transportation: 'from-blue-500 to-cyan-400',
  Entertainment: 'from-purple-500 to-pink-400',
  Shopping: 'from-pink-500 to-rose-400',
  Bills: 'from-teal-500 to-emerald-400',
  Other: 'from-slate-500 to-slate-400',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: '\u{1F354}',
  Transportation: '\u{1F697}',
  Entertainment: '\u{1F3AC}',
  Shopping: '\u{1F6CD}\uFE0F',
  Bills: '\u{1F4C4}',
  Other: '\u{1F4CC}',
};

export const STORAGE_KEY = 'expense-tracker-data';

export const CURRENCIES: Record<string, { code: string; symbol: string; name: string; locale: string }> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
};

export const CURRENCY_KEY = 'expense-tracker-currency';
