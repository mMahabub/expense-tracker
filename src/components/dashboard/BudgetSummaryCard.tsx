'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatCurrency';
import { BudgetSummary } from '@/hooks/useBudgets';

interface BudgetSummaryCardProps {
  budget: BudgetSummary;
}

export function BudgetSummaryCard({ budget }: BudgetSummaryCardProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!budget.hasBudgets) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6"
      >
        <h3 className="text-base font-heading font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Monthly Budget
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Set up a monthly budget to track your spending goals.
        </p>
        <Link href="/budget" className="btn-primary inline-flex items-center gap-2 text-sm">
          Set Up Budget
        </Link>
      </motion.div>
    );
  }

  const { overallBudget, overallSpent, overallPercentage, overallStatus, projectedSpending, daysLeft } = budget;

  const ringSize = 120;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(overallPercentage, 100);
  const strokeDashoffset = circumference - (circumference * clampedPct) / 100;

  const color =
    overallStatus === 'over'
      ? 'var(--accent-coral)'
      : overallStatus === 'warning'
      ? '#f59e0b'
      : 'var(--accent-teal)';

  const glowColor =
    overallStatus === 'over'
      ? 'rgba(255, 107, 107, 0.25)'
      : overallStatus === 'warning'
      ? 'rgba(245, 158, 11, 0.25)'
      : 'rgba(0, 212, 170, 0.25)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
          Monthly Budget
        </h3>
        <Link
          href="/budget"
          className="text-xs font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          Manage &rarr;
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--input-border)"
              strokeWidth={strokeWidth}
              opacity={0.3}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset: animated ? strokeDashoffset : circumference,
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-heading font-bold" style={{ color }}>
              {Math.round(overallPercentage)}%
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-2">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You&apos;ve spent{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(overallSpent)}
            </span>{' '}
            of{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(overallBudget)}
            </span>
          </p>

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {daysLeft} days left this month
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            Projected: {formatCurrency(projectedSpending)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
