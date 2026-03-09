'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Expense } from '@/types/expense';
import { ExpenseRow } from './ExpenseRow';
import { format, parseISO } from 'date-fns';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card text-center py-16"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--input-bg)' }}
        >
          <svg
            width={32}
            height={32}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{ color: 'var(--text-muted)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-heading font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          No expenses found
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Try adjusting your filters or add a new expense.
        </p>
      </motion.div>
    );
  }

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group by date
  const grouped = sorted.reduce<Record<string, Expense[]>>((acc, expense) => {
    const dateKey = expense.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(expense);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {Object.entries(grouped).map(([dateKey, groupExpenses]) => (
          <div key={dateKey}>
            <div
              className="sticky top-0 z-10 py-2 px-1 text-xs font-semibold uppercase tracking-wider mb-2"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--background)',
              }}
            >
              {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="space-y-2">
              {groupExpenses.map((expense, i) => (
                <ExpenseRow key={expense.id} expense={expense} onDelete={onDelete} index={i} />
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
