'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { useToastContext } from '@/components/ui/ToastContainer';
import { Expense } from '@/types/expense';
import Link from 'next/link';

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { getExpense, updateExpense } = useExpenses();
  const { addToast } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await getExpense(id);
      if (!cancelled) {
        setExpense(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, getExpense]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="skeleton h-6 w-32 mb-6" />
        <div className="skeleton h-[400px]" />
      </div>
    );
  }

  if (!expense) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <h2 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Expense Not Found</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>The expense you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/expenses" className="btn-primary inline-flex items-center gap-2">Back to Expenses</Link>
      </motion.div>
    );
  }

  async function handleSubmit(data: Parameters<typeof updateExpense>[1]) {
    setIsSubmitting(true);
    try {
      await updateExpense(id, data);
      addToast('Expense updated successfully', 'success');
      setTimeout(() => router.push('/expenses'), 600);
    } catch {
      addToast('Failed to update expense', 'error');
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/expenses" className="inline-flex items-center gap-1 text-sm mb-3 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Edit Expense</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Update expense details</p>
      </div>
      <div className="glass-card p-6">
        <ExpenseForm onSubmit={handleSubmit} initialData={expense} isSubmitting={isSubmitting} />
      </div>
    </motion.div>
  );
}
