'use client';

import { useState, useEffect, useCallback } from 'react';
import { CurrencyCode } from '@/types/expense';
import { loadCurrency, saveCurrency } from '@/lib/storage';
import { setCurrency as setGlobalCurrency } from '@/lib/formatCurrency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  useEffect(() => {
    const saved = loadCurrency();
    setCurrencyState(saved);
    setGlobalCurrency(saved);
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    saveCurrency(code);
    setGlobalCurrency(code);
  }, []);

  return { currency, setCurrency };
}
