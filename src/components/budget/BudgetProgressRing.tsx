'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatCurrency';

interface BudgetProgressRingProps {
  spent: number;
  budget: number;
  size?: number;
  strokeWidth?: number;
}

export function BudgetProgressRing({
  spent,
  budget,
  size = 160,
  strokeWidth = 12,
}: BudgetProgressRingProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0;
  const displayPercentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(percentage, 100)) / 100;

  const color =
    percentage > 100
      ? 'var(--accent-coral)'
      : percentage >= 70
      ? '#f59e0b'
      : 'var(--accent-teal)';

  const glowColor =
    percentage > 100
      ? 'rgba(255, 107, 107, 0.3)'
      : percentage >= 70
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(0, 212, 170, 0.3)';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--input-border)"
            strokeWidth={strokeWidth}
            opacity={0.4}
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
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
            style={{
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="text-2xl font-heading font-bold"
            style={{ color }}
          >
            {displayPercentage}%
          </motion.span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            of budget
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(spent)} of {formatCurrency(budget)}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatCurrency(Math.max(0, budget - spent))} remaining
        </p>
      </div>
    </div>
  );
}
