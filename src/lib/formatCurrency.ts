import { CurrencyCode } from '@/types/expense';
import { CURRENCIES } from './constants';

let currentCurrency: CurrencyCode = 'USD';

export function setCurrency(code: CurrencyCode) {
  currentCurrency = code;
}

export function getCurrency(): CurrencyCode {
  return currentCurrency;
}

export function formatCurrency(amount: number, code?: CurrencyCode): string {
  const c = code || currentCurrency;
  const info = CURRENCIES[c];
  return new Intl.NumberFormat(info?.locale || 'en-US', {
    style: 'currency',
    currency: c,
  }).format(amount);
}

export function getCurrencySymbol(code?: CurrencyCode): string {
  const c = code || currentCurrency;
  return CURRENCIES[c]?.symbol || '$';
}
