'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Expense } from '@/types/expense';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatCurrency';
import { format, parseISO } from 'date-fns';

interface ExpenseRowProps {
  expense: Expense;
  onDelete: (id: string) => void;
  index?: number;
}

export function ExpenseRow({ expense, onDelete, index = 0 }: ExpenseRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="glass-card flex items-center gap-4 p-4 group cursor-default"
    >
      {/* Category Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${CATEGORY_COLORS[expense.category]}25, ${CATEGORY_COLORS[expense.category]}10)`,
          border: `1px solid ${CATEGORY_COLORS[expense.category]}20`,
        }}
      >
        {CATEGORY_ICONS[expense.category]}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {expense.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${CATEGORY_COLORS[expense.category]}15`,
              color: CATEGORY_COLORS[expense.category],
            }}
          >
            {expense.category}
          </span>
          {expense.recurring && expense.recurring !== 'none' && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent-primary)',
              }}
              title={`Repeats ${expense.recurring}`}
            >
              <svg width={12} height={12} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.985 4.356v4.992" />
              </svg>
              {expense.recurring}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {format(parseISO(expense.date), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="font-heading font-bold" style={{ color: 'var(--accent-coral)' }}>
          -{formatCurrency(expense.amount)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Link
          href={`/expenses/${expense.id}/edit`}
          className="p-2 rounded-lg transition-colors duration-200"
          style={{ color: 'var(--text-muted)' }}
          title="Edit"
        >
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </Link>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-2 rounded-lg transition-colors duration-200 hover:text-red-500"
          style={{ color: 'var(--text-muted)' }}
          title="Delete"
        >
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
