'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Expense, RecurringFrequency } from '@/types/expense';
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/constants';
import { getCurrencySymbol } from '@/lib/formatCurrency';

interface ExpenseFormProps {
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialData?: Expense;
  isSubmitting?: boolean;
  onCategoryChange?: (category: Category) => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export function ExpenseForm({ onSubmit, initialData, isSubmitting, onCategoryChange }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Food');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [recurring, setRecurring] = useState<RecurringFrequency>(initialData?.recurring || 'none');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (numAmount > 999999.99) {
      newErrors.amount = 'Amount cannot exceed $999,999.99';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (description.trim().length > 200) {
      newErrors.description = 'Description must be under 200 characters';
    }
    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setShowSuccess(true);
    setTimeout(() => {
      onSubmit({
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        category,
        description: description.trim(),
        date,
        recurring: recurring !== 'none' ? recurring : undefined,
      });
    }, 600);
  }

  return (
    <AnimatePresence mode="wait">
      {showSuccess ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #00b894)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              />
            </svg>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-heading font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {initialData ? 'Expense Updated!' : 'Expense Added!'}
          </motion.p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Amount — large and bold */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Amount
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold"
                style={{ color: 'var(--text-muted)' }}
              >
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="0.00"
                className={`glass-input w-full pl-12 pr-4 py-4 text-2xl font-heading font-bold placeholder-opacity-30 ${
                  errors.amount ? 'border-red-400 dark:border-red-500' : ''
                }`}
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            {errors.amount && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-red-500"
              >
                {errors.amount}
              </motion.p>
            )}
          </motion.div>

          {/* Category */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <motion.button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); onCategoryChange?.(cat); }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isSelected
                        ? `${CATEGORY_COLORS[cat]}18`
                        : 'var(--input-bg)',
                      border: isSelected
                        ? `2px solid ${CATEGORY_COLORS[cat]}`
                        : '2px solid var(--input-border)',
                      color: isSelected ? CATEGORY_COLORS[cat] : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                    <span className="text-xs truncate">{cat}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="e.g., Lunch at restaurant"
              className={`glass-input w-full px-4 py-3 text-sm ${
                errors.description ? 'border-red-400 dark:border-red-500' : ''
              }`}
              style={{ color: 'var(--text-primary)' }}
            />
            {errors.description && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-red-500"
              >
                {errors.description}
              </motion.p>
            )}
          </motion.div>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              className={`glass-input w-full px-4 py-3 text-sm ${
                errors.date ? 'border-red-400 dark:border-red-500' : ''
              }`}
              style={{ color: 'var(--text-primary)' }}
            />
            {errors.date && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 text-sm text-red-500"
              >
                {errors.date}
              </motion.p>
            )}
          </motion.div>

          {/* Recurring */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Recurring
            </label>
            <div className="flex gap-2">
              {(['none', 'daily', 'weekly', 'monthly'] as RecurringFrequency[]).map((freq) => {
                const isSelected = recurring === freq;
                const labels: Record<RecurringFrequency, string> = {
                  none: 'One-time',
                  daily: 'Daily',
                  weekly: 'Weekly',
                  monthly: 'Monthly',
                };
                const icons: Record<RecurringFrequency, string> = {
                  none: '1x',
                  daily: '📅',
                  weekly: '📆',
                  monthly: '🗓️',
                };
                return (
                  <motion.button
                    key={freq}
                    type="button"
                    onClick={() => setRecurring(freq)}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                    style={{
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'var(--input-bg)',
                      border: isSelected
                        ? '2px solid rgba(99, 102, 241, 0.6)'
                        : '2px solid var(--input-border)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-sm">{icons[freq]}</span>
                    <span>{labels[freq]}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Saving...'
                : initialData
                ? 'Update Expense'
                : 'Add Expense'}
            </motion.button>
          </motion.div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
