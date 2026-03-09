'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BudgetData, Category } from '@/types/expense';
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/constants';

interface BudgetSetupFormProps {
  budgets: BudgetData;
  onSave: (data: BudgetData) => void;
}

export function BudgetSetupForm({ budgets, onSave }: BudgetSetupFormProps) {
  const [overall, setOverall] = useState(budgets.overall.toString());
  const [categories, setCategories] = useState<Record<Category, string>>(
    Object.fromEntries(
      CATEGORIES.map((c) => [c, budgets.categories[c].toString()])
    ) as Record<Category, string>
  );

  function handleSave() {
    const data: BudgetData = {
      overall: parseFloat(overall) || 0,
      categories: Object.fromEntries(
        CATEGORIES.map((c) => [c, parseFloat(categories[c]) || 0])
      ) as Record<Category, number>,
    };
    onSave(data);
  }

  return (
    <div className="space-y-6">
      {/* Overall budget */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
            style={{ boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
              Overall Monthly Budget
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Your total spending limit for the month
            </p>
          </div>
        </div>
        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            $
          </span>
          <input
            type="number"
            min="0"
            step="50"
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
            placeholder="0"
            className="glass-input w-full pl-10 pr-4 py-3 text-lg font-heading font-bold"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </motion.div>

      {/* Category budgets */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Category Budgets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background: `${CATEGORY_COLORS[cat]}18`,
                    border: `1px solid ${CATEGORY_COLORS[cat]}25`,
                  }}
                >
                  {CATEGORY_ICONS[cat]}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {cat}
                </span>
              </div>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={categories[cat]}
                  onChange={(e) =>
                    setCategories((prev) => ({ ...prev, [cat]: e.target.value }))
                  }
                  placeholder="0"
                  className="glass-input w-full pl-8 pr-3 py-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        className="btn-primary w-full py-3 text-base"
      >
        Save Budgets
      </motion.button>
    </div>
  );
}
