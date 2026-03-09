'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CategoryBudgetStatus } from '@/hooks/useBudgets';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatCurrency';

interface BudgetCategoryBarProps {
  status: CategoryBudgetStatus;
  index: number;
}

export function BudgetCategoryBar({ status, index }: BudgetCategoryBarProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200 + index * 100);
    return () => clearTimeout(t);
  }, [index]);

  const barColor =
    status.status === 'over'
      ? 'var(--accent-coral)'
      : status.status === 'warning'
      ? '#f59e0b'
      : CATEGORY_COLORS[status.category];

  const barWidth = status.budget > 0
    ? Math.min((status.spent / status.budget) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_ICONS[status.category]}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {status.category}
          </span>
          {status.status === 'over' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255, 107, 107, 0.15)', color: 'var(--accent-coral)' }}
            >
              <svg width={12} height={12} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Over
            </motion.span>
          )}
          {status.status === 'warning' && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
            >
              Near limit
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(status.spent)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {' / '}{formatCurrency(status.budget)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--input-border)', opacity: 0.4 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: animated ? `${barWidth}%` : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {status.budget > 0 ? `${Math.round(status.percentage)}% used` : 'No budget set'}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatCurrency(status.remaining)} left
        </span>
      </div>
    </motion.div>
  );
}
