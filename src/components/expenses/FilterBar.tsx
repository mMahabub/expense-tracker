'use client';

import { motion } from 'framer-motion';
import { ExpenseFilters } from '@/types/expense';
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/constants';

interface FilterBarProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  function update(partial: Partial<ExpenseFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      {/* Search */}
      <div className="relative">
        <svg
          width={16}
          height={16}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          style={{ color: 'var(--text-muted)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="glass-input w-full pl-11 pr-4 py-3 text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => update({ category: 'All' })}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={{
            background: filters.category === 'All' ? 'var(--accent-primary)' : 'var(--input-bg)',
            color: filters.category === 'All' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (filters.category === 'All' ? 'transparent' : 'var(--input-border)'),
          }}
        >
          All
        </motion.button>
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => update({ category: cat })}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              background: filters.category === cat ? `${CATEGORY_COLORS[cat]}20` : 'var(--input-bg)',
              color: filters.category === cat ? CATEGORY_COLORS[cat] : 'var(--text-secondary)',
              border: `1px solid ${filters.category === cat ? CATEGORY_COLORS[cat] + '40' : 'var(--input-border)'}`,
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex gap-3">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="glass-input flex-1 px-3 py-2 text-sm"
          style={{ color: 'var(--text-primary)' }}
          title="From date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="glass-input flex-1 px-3 py-2 text-sm"
          style={{ color: 'var(--text-primary)' }}
          title="To date"
        />
      </div>
    </motion.div>
  );
}
