'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseFilters, Category } from '@/types/expense';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

interface ExpenseSummary {
  total: number;
  monthlyTotal: number;
  dailyAverage: number;
  topCategory: { category: Category; amount: number } | null;
  categoryBreakdown: { category: Category; amount: number }[];
  monthlyCategorySpent: Record<Category, number>;
  monthlyTrend: { month: string; amount: number }[];
}

interface StatsResponse {
  totalSpending: number;
  thisMonthSpending: number;
  dailyAverage: number;
  topCategory: { category: string; amount: number } | null;
  categoryBreakdown: { category: string; amount: number }[];
  monthlyCategorySpent: Record<string, number>;
  monthlyTrend: { month: string; amount: number }[];
  recentExpenses: Expense[];
  expenseCount: number;
}

const emptySummary: ExpenseSummary = {
  total: 0,
  monthlyTotal: 0,
  dailyAverage: 0,
  topCategory: null,
  categoryBreakdown: [],
  monthlyCategorySpent: { Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0 },
  monthlyTrend: [],
};

export function useExpenses() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>(emptySummary);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch stats (for dashboard, budget comparison)
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<StatsResponse>('/api/expenses/stats');
      setSummary({
        total: data.totalSpending,
        monthlyTotal: data.thisMonthSpending,
        dailyAverage: data.dailyAverage,
        topCategory: data.topCategory as ExpenseSummary['topCategory'],
        categoryBreakdown: data.categoryBreakdown as ExpenseSummary['categoryBreakdown'],
        monthlyCategorySpent: {
          Food: data.monthlyCategorySpent?.Food || 0,
          Transportation: data.monthlyCategorySpent?.Transportation || 0,
          Entertainment: data.monthlyCategorySpent?.Entertainment || 0,
          Shopping: data.monthlyCategorySpent?.Shopping || 0,
          Bills: data.monthlyCategorySpent?.Bills || 0,
          Other: data.monthlyCategorySpent?.Other || 0,
        },
        monthlyTrend: data.monthlyTrend,
      });
      setRecentExpenses(data.recentExpenses || []);
      setTotalCount(data.expenseCount || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  }, [user]);

  // Fetch filtered expenses (for expenses list page)
  const fetchExpenses = useCallback(
    async (filters: ExpenseFilters, page = 1, limit = 50) => {
      if (!user) return { expenses: [], total: 0, page: 1, totalPages: 0 };
      try {
        const params = new URLSearchParams();
        if (filters.category !== 'All') params.set('category', filters.category);
        if (filters.dateFrom) params.set('startDate', filters.dateFrom);
        if (filters.dateTo) params.set('endDate', filters.dateTo);
        if (filters.search) params.set('search', filters.search);
        params.set('page', String(page));
        params.set('limit', String(limit));

        const data = await apiFetch<{
          expenses: Expense[];
          total: number;
          page: number;
          totalPages: number;
        }>(`/api/expenses?${params.toString()}`);

        setExpenses(data.expenses);
        setTotalCount(data.total);
        setError(null);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expenses');
        return { expenses: [], total: 0, page: 1, totalPages: 0 };
      }
    },
    [user]
  );

  // Load initial data
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    async function load() {
      await fetchStats();
      if (!cancelled) setIsLoaded(true);
    }
    load();

    return () => { cancelled = true; };
  }, [user, authLoading, fetchStats]);

  const addExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'createdAt'>) => {
      try {
        const result = await apiFetch<{ expense: Expense }>('/api/expenses', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        // Refresh stats after adding
        await fetchStats();
        return result.expense;
      } catch (err) {
        throw err;
      }
    },
    [fetchStats]
  );

  const updateExpense = useCallback(
    async (id: string, data: Omit<Expense, 'id' | 'createdAt'>) => {
      try {
        const result = await apiFetch<{ expense: Expense }>(`/api/expenses/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        await fetchStats();
        return result.expense;
      } catch (err) {
        throw err;
      }
    },
    [fetchStats]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setRecentExpenses((prev) => prev.filter((e) => e.id !== id));
        await fetchStats();
      } catch (err) {
        throw err;
      }
    },
    [fetchStats]
  );

  const getExpense = useCallback(
    async (id: string): Promise<Expense | null> => {
      try {
        const data = await apiFetch<{ expense: Expense }>(`/api/expenses/${id}`);
        return data.expense;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    expenses,
    recentExpenses,
    isLoaded,
    error,
    totalCount,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    fetchExpenses,
    fetchStats,
    summary,
  };
}
