'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgets } from '@/hooks/useBudgets';
import { useToastContext } from '@/components/ui/ToastContainer';
import { BudgetProgressRing } from '@/components/budget/BudgetProgressRing';
import { BudgetCategoryBar } from '@/components/budget/BudgetCategoryBar';
import { BudgetSetupForm } from '@/components/budget/BudgetSetupForm';
import { BudgetData } from '@/types/expense';
import { formatCurrency } from '@/lib/formatCurrency';

export default function BudgetPage() {
  const {
    budgets,
    isLoaded,
    updateBudgets,
    summary: budgetSummary,
    error,
    fetchBudgets,
  } = useBudgets();
  const { addToast } = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="skeleton h-24" />))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm mb-4" style={{ color: 'var(--accent-coral)' }}>{error}</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={fetchBudgets} className="btn-primary px-5 py-2.5">Retry</motion.button>
      </div>
    );
  }

  async function handleSave(data: BudgetData) {
    setIsSaving(true);
    try {
      await updateBudgets(data);
      setIsEditing(false);
      addToast('Budgets saved successfully', 'success');
    } catch {
      addToast('Failed to save budgets', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing || !budgetSummary.hasBudgets) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
              {budgetSummary.hasBudgets ? 'Edit Budgets' : 'Set Up Budgets'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Define your monthly spending limits</p>
          </div>
          {budgetSummary.hasBudgets && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(false)} className="btn-ghost text-sm">Cancel</motion.button>
          )}
        </div>
        <BudgetSetupForm budgets={budgets} onSave={handleSave} />
        {isSaving && <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>Saving...</p>}
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Budget</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {budgetSummary.daysLeft} days remaining in {new Date().toLocaleString('default', { month: 'long' })}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)} className="btn-ghost inline-flex items-center gap-2 text-sm">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit Budgets
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <BudgetProgressRing spent={budgetSummary.overallSpent} budget={budgetSummary.overallBudget} />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Remaining</p>
              <p className="text-lg font-heading font-bold" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(budgetSummary.overallRemaining)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Days Left</p>
              <p className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{budgetSummary.daysLeft}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Daily Avg</p>
              <p className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(budgetSummary.overallSpent / Math.max(1, new Date().getDate()))}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Projected</p>
              <p className="text-lg font-heading font-bold" style={{ color: budgetSummary.projectedSpending > budgetSummary.overallBudget ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                {formatCurrency(budgetSummary.projectedSpending)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Category Budgets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgetSummary.categoryStatuses.filter((s) => s.budget > 0).map((status, i) => (
            <BudgetCategoryBar key={status.category} status={status} index={i} />
          ))}
          {budgetSummary.categoryStatuses.filter((s) => s.budget > 0).length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full glass-card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No category budgets set.{' '}
                <button onClick={() => setIsEditing(true)} className="font-medium" style={{ color: 'var(--accent-primary)' }}>Add category budgets</button>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
