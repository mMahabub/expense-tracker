'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseFilters } from '@/types/expense';
import { FilterBar } from '@/components/expenses/FilterBar';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExportButton } from '@/components/expenses/ExportButton';
import { Modal } from '@/components/ui/Modal';
import { useToastContext } from '@/components/ui/ToastContainer';
import { formatCurrency } from '@/lib/formatCurrency';

export default function ExpensesPage() {
  const { isLoaded, expenses, deleteExpense, fetchExpenses, error } = useExpenses();
  const { addToast } = useToastContext();

  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: 'All',
    dateFrom: '',
    dateTo: '',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filteredTotal, setFilteredTotal] = useState(0);

  // Fetch expenses when filters change
  const loadExpenses = useCallback(async () => {
    const data = await fetchExpenses(filters);
    setFilteredTotal(data.expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0));
  }, [filters, fetchExpenses]);

  useEffect(() => {
    if (isLoaded) {
      loadExpenses();
    }
  }, [isLoaded, loadExpenses]);

  async function handleDelete() {
    if (deleteId) {
      try {
        await deleteExpense(deleteId);
        setDeleteId(null);
        addToast('Expense deleted successfully', 'success');
        await loadExpenses();
      } catch {
        addToast('Failed to delete expense', 'error');
      }
    }
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-12" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
            Expenses
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} &middot;{' '}
            {formatCurrency(filteredTotal)} total
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton expenses={expenses} />
          <Link href="/expenses/add" className="btn-primary inline-flex items-center gap-2">
            <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Expense
          </Link>
        </div>
      </motion.div>

      {error && (
        <div className="glass-card p-4 text-center">
          <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{error}</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={loadExpenses} className="btn-ghost mt-2 text-sm">
            Retry
          </motion.button>
        </div>
      )}

      <FilterBar filters={filters} onChange={setFilters} />

      <ExpenseList expenses={expenses} onDelete={(id) => setDeleteId(id)} />

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense">
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this expense? This action cannot be undone.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-ghost">Cancel</button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', boxShadow: '0 4px 14px rgba(255, 107, 107, 0.3)' }}
          >
            Delete
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
