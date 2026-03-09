'use client';

import { createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { ToastProvider } from '@/components/ui/ToastContainer';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { QuickAddFAB } from '@/components/ui/QuickAddFAB';
import { CurrencyCode } from '@/types/expense';

interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggle: () => {},
});

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function useCurrencyContext() {
  return useContext(CurrencyContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const currencyState = useCurrency();

  return (
    <ThemeContext.Provider value={theme}>
      <CurrencyContext.Provider value={currencyState}>
        <ToastProvider>
          <div
            className="min-h-screen flex transition-colors duration-300"
            style={{ background: 'var(--background)' }}
          >
            <Sidebar />
            <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
              <TopHeader />
              <main className="flex-1 pb-24 md:pb-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                  {children}
                </div>
              </main>
            </div>
            <MobileNav />
            <QuickAddFAB />
          </div>
        </ToastProvider>
      </CurrencyContext.Provider>
    </ThemeContext.Provider>
  );
}
