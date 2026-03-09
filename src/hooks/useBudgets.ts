'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BudgetData, Category } from '@/types/expense';
import { CATEGORIES } from '@/lib/constants';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

export interface CategoryBudgetStatus {
  category: Category;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'warning' | 'over';
}

export interface BudgetSummary {
  overallBudget: number;
  overallSpent: number;
  overallRemaining: number;
  overallPercentage: number;
  overallStatus: 'under' | 'warning' | 'over';
  projectedSpending: number;
  daysLeft: number;
  categoryStatuses: CategoryBudgetStatus[];
  hasBudgets: boolean;
}

interface ApiBudgetRow {
  id: string;
  category: string;
  amount: number;
  month: string;
  spent: number;
}

interface ApiBudgetResponse {
  budgets: ApiBudgetRow[];
  overallBudget: number;
  monthlyTotal: number;
  month: string;
}

export function useBudgets() {
  const { user, loading: authLoading } = useAuth();
  const [budgets, setBudgets] = useState<BudgetData>({
    overall: 0,
    categories: { Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0 },
  });
  const [monthlySpentByCategory, setMonthlySpentByCategory] = useState<Record<Category, number>>({
    Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0,
  });
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const data = await apiFetch<ApiBudgetResponse>(`/api/budgets?month=${month}`);

      const catBudgets: Record<string, number> = {
        Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0,
      };
      const catSpent: Record<string, number> = {
        Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0,
      };

      data.budgets.forEach((b) => {
        if (b.category !== 'overall' && b.category in catBudgets) {
          catBudgets[b.category] = b.amount;
          catSpent[b.category] = b.spent;
        }
      });

      setBudgets({
        overall: data.overallBudget,
        categories: catBudgets as Record<Category, number>,
      });
      setMonthlySpentByCategory(catSpent as Record<Category, number>);
      setMonthlyTotal(data.monthlyTotal);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    async function load() {
      await fetchBudgets();
      if (!cancelled) setIsLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [user, authLoading, fetchBudgets]);

  const updateBudgets = useCallback(
    async (data: BudgetData) => {
      if (!user) return;
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        // Save overall budget
        await apiFetch('/api/budgets', {
          method: 'POST',
          body: JSON.stringify({ category: 'overall', amount: data.overall, month }),
        });

        // Save category budgets
        for (const cat of CATEGORIES) {
          await apiFetch('/api/budgets', {
            method: 'POST',
            body: JSON.stringify({ category: cat, amount: data.categories[cat], month }),
          });
        }

        // Refresh data
        await fetchBudgets();
      } catch (err) {
        throw err;
      }
    },
    [user, fetchBudgets]
  );

  const summary: BudgetSummary = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    const overallBudget = budgets.overall;
    const overallSpent = monthlyTotal;
    const overallRemaining = Math.max(0, overallBudget - overallSpent);
    const overallPercentage = overallBudget > 0 ? (overallSpent / overallBudget) * 100 : 0;
    const overallStatus: 'under' | 'warning' | 'over' =
      overallPercentage > 100 ? 'over' : overallPercentage >= 70 ? 'warning' : 'under';

    const dailyAvg = dayOfMonth > 0 ? overallSpent / dayOfMonth : 0;
    const projectedSpending = dailyAvg * daysInMonth;

    const categoryStatuses: CategoryBudgetStatus[] = CATEGORIES.map((category) => {
      const budget = budgets.categories[category];
      const spent = monthlySpentByCategory[category] || 0;
      const remaining = Math.max(0, budget - spent);
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      const status: 'under' | 'warning' | 'over' =
        percentage > 100 ? 'over' : percentage >= 80 ? 'warning' : 'under';
      return { category, budget, spent, remaining, percentage, status };
    });

    const hasBudgets = overallBudget > 0 || CATEGORIES.some((c) => budgets.categories[c] > 0);

    return {
      overallBudget, overallSpent, overallRemaining, overallPercentage, overallStatus,
      projectedSpending, daysLeft, categoryStatuses, hasBudgets,
    };
  }, [budgets, monthlySpentByCategory, monthlyTotal]);

  return {
    budgets,
    isLoaded,
    error,
    updateBudgets,
    fetchBudgets,
    summary,
  };
}
