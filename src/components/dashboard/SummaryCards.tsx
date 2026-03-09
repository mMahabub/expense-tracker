'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CATEGORY_ICONS } from '@/lib/constants';
import { Category } from '@/types/expense';
import { formatCurrency } from '@/lib/formatCurrency';

interface SummaryCardsProps {
  total: number;
  monthlyTotal: number;
  dailyAverage: number;
  topCategory: { category: Category; amount: number } | null;
}

const cardMeta = [
  {
    key: 'total',
    label: 'Total Spending',
    gradient: 'from-indigo-500 to-purple-600',
    shadow: 'rgba(99, 102, 241, 0.25)',
    icon: WalletIcon,
  },
  {
    key: 'monthly',
    label: 'This Month',
    gradient: 'from-teal-400 to-emerald-500',
    shadow: 'rgba(0, 212, 170, 0.25)',
    icon: CalendarIcon,
  },
  {
    key: 'daily',
    label: 'Daily Average',
    gradient: 'from-orange-400 to-pink-500',
    shadow: 'rgba(249, 115, 22, 0.25)',
    icon: TrendIcon,
  },
  {
    key: 'top',
    label: 'Top Category',
    gradient: 'from-violet-500 to-fuchsia-500',
    shadow: 'rgba(139, 92, 246, 0.25)',
    icon: StarIcon,
  },
] as const;

export function SummaryCards({ total, monthlyTotal, dailyAverage, topCategory }: SummaryCardsProps) {
  function getSubtext(key: string): string {
    switch (key) {
      case 'total':
        return 'All time';
      case 'monthly':
        return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      case 'daily':
        return 'This month';
      case 'top':
        return topCategory ? formatCurrency(topCategory.amount) : 'No expenses yet';
      default:
        return '';
    }
  }

  function getValue(key: string): number {
    switch (key) {
      case 'total': return total;
      case 'monthly': return monthlyTotal;
      case 'daily': return dailyAverage;
      default: return 0;
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cardMeta.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="glass-card p-5 relative overflow-hidden group"
        >
          {/* Gradient orb background */}
          <div
            className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-20 group-hover:opacity-30 transition-opacity blur-xl`}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
                style={{ boxShadow: `0 4px 12px ${card.shadow}` }}
              >
                <card.icon />
              </div>
            </div>

            {card.key === 'top' ? (
              <p className="text-lg font-heading font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {topCategory
                  ? `${CATEGORY_ICONS[topCategory.category]} ${topCategory.category}`
                  : 'N/A'}
              </p>
            ) : (
              <AnimatedNumber
                value={getValue(card.key)}
                className="text-xl font-heading font-bold block"
              />
            )}

            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {card.label} &middot; {getSubtext(card.key)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
