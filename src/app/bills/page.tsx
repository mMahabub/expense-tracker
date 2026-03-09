'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToastContext } from '@/components/ui/ToastContainer';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/formatCurrency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Bill {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  frequency: string;
  dueDate: string;
  nextDueDate: string;
  reminderDaysBefore: number;
  isActive: boolean;
  isAutoAdd: boolean;
  notes: string | null;
  createdAt: string;
  lastPayment: { paidAmount: number; paidDate: string; status: string } | null;
  status: 'overdue' | 'due_today' | 'upcoming' | 'paid';
}

interface BillStats {
  totalMonthly: number;
  totalUpcoming: number;
  overdueCount: number;
  paidThisMonth: number;
  totalThisMonth: number;
}

interface BillFormData {
  name: string;
  amount: string;
  category: string;
  frequency: string;
  dueDate: string;
  reminderDaysBefore: number;
  isAutoAdd: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BILL_CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
  'Rent',
  'Subscription',
  'Insurance',
  'Loan',
] as const;

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Food: '\u{1F354}',
    Transportation: '\u{1F697}',
    Entertainment: '\u{1F3AC}',
    Shopping: '\u{1F6CD}\uFE0F',
    Bills: '\u{1F4C4}',
    Other: '\u{1F4CC}',
    Rent: '\u{1F3E0}',
    Subscription: '\u{1F4F1}',
    Insurance: '\u{1F6E1}\uFE0F',
    Loan: '\u{1F4B3}',
  };
  return icons[category] || '\u{1F4CC}';
}

function getDaysUntilDue(nextDueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusInfo(bill: Bill): { label: string; color: string; bgColor: string } {
  const days = getDaysUntilDue(bill.nextDueDate);

  if (bill.status === 'paid') {
    return { label: 'Paid', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
  }
  if (bill.status === 'overdue' || days < 0) {
    return {
      label: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
    };
  }
  if (bill.status === 'due_today' || days === 0) {
    return { label: 'Due Today', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
  }
  return {
    label: `Due in ${days} day${days !== 1 ? 's' : ''}`,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  };
}

function getFrequencyLabel(frequency: string): string {
  const found = FREQUENCIES.find((f) => f.value === frequency);
  return found ? found.label : frequency;
}

function getBorderColor(bill: Bill): string {
  if (!bill.isActive) return 'var(--card-border)';
  if (bill.status === 'paid') return '#10B981';
  if (bill.status === 'overdue') return '#EF4444';
  if (bill.status === 'due_today') return '#3B82F6';
  return 'var(--card-border)';
}

const emptyForm: BillFormData = {
  name: '',
  amount: '',
  category: 'Bills',
  frequency: 'monthly',
  dueDate: '',
  reminderDaysBefore: 1,
  isAutoAdd: false,
  notes: '',
};

// ---------------------------------------------------------------------------
// Progress Ring Component
// ---------------------------------------------------------------------------

function ProgressRing({ paid, total }: { paid: number; total: number }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? paid / total : 0;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--card-border)"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--text-primary)"
        fontSize="11"
        fontWeight="600"
      >
        {paid}/{total}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BillsPage() {
  const { user } = useAuth();
  const { addToast } = useToastContext();

  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats>({
    totalMonthly: 0,
    totalUpcoming: 0,
    overdueCount: 0,
    paidThisMonth: 0,
    totalThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);

  // Form state
  const [form, setForm] = useState<BillFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Pay form state
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchBills = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<{ bills: Bill[]; stats: BillStats }>('/api/bills');
      setBills(data.bills);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchBills();
  }, [user, fetchBills]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openAddModal() {
    setEditingBill(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEditModal(bill: Bill) {
    setEditingBill(bill);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      category: bill.category,
      frequency: bill.frequency,
      dueDate: bill.dueDate,
      reminderDaysBefore: bill.reminderDaysBefore,
      isAutoAdd: bill.isAutoAdd,
      notes: bill.notes || '',
    });
    setShowFormModal(true);
    setOpenMenuId(null);
  }

  function openPayModal(bill: Bill) {
    setPayingBill(bill);
    setPaidAmount(String(bill.amount));
    setPaidDate(new Date().toISOString().split('T')[0]);
    setShowPayModal(true);
  }

  function openDeleteModal(bill: Bill) {
    setDeletingBill(bill);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount || !form.dueDate) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        frequency: form.frequency,
        dueDate: form.dueDate,
        reminderDaysBefore: form.reminderDaysBefore,
        isAutoAdd: form.isAutoAdd,
        notes: form.notes.trim() || null,
      };

      if (editingBill) {
        await apiFetch<{ bill: Bill }>(`/api/bills/${editingBill.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        addToast('Bill updated successfully', 'success');
      } else {
        await apiFetch<{ bill: Bill }>('/api/bills', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addToast('Bill created successfully', 'success');
      }
      setShowFormModal(false);
      await fetchBills();
    } catch {
      addToast(editingBill ? 'Failed to update bill' : 'Failed to create bill', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePay() {
    if (!payingBill) return;
    setIsPaying(true);
    try {
      await apiFetch<{ payment: unknown; nextDueDate: string }>(
        `/api/bills/${payingBill.id}/pay`,
        {
          method: 'POST',
          body: JSON.stringify({
            paidAmount: parseFloat(paidAmount),
            paidDate,
          }),
        }
      );
      addToast('Payment recorded successfully', 'success');
      setShowPayModal(false);
      await fetchBills();
    } catch {
      addToast('Failed to record payment', 'error');
    } finally {
      setIsPaying(false);
    }
  }

  async function handleSkip(bill: Bill) {
    try {
      await apiFetch<{ nextDueDate: string }>(`/api/bills/${bill.id}/skip`, {
        method: 'POST',
      });
      addToast('Bill skipped', 'success');
      await fetchBills();
    } catch {
      addToast('Failed to skip bill', 'error');
    }
  }

  async function handleDelete() {
    if (!deletingBill) return;
    try {
      await apiFetch(`/api/bills/${deletingBill.id}`, { method: 'DELETE' });
      addToast('Bill deleted successfully', 'success');
      setShowDeleteModal(false);
      setDeletingBill(null);
      await fetchBills();
    } catch {
      addToast('Failed to delete bill', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm mb-4" style={{ color: 'var(--accent-coral)' }}>{error}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={fetchBills}
          className="btn-primary px-5 py-2.5"
        >
          Retry
        </motion.button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl font-heading font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Bill Reminders
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {bills.length} bill{bills.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openAddModal}
          className="btn-primary inline-flex items-center gap-2"
        >
          <svg
            width={16}
            height={16}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Bill
        </motion.button>
      </motion.div>

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {/* Total Monthly */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width={16}
                height={16}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="var(--accent-primary)"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Total Monthly
          </p>
          <p
            className="text-lg font-heading font-bold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatCurrency(stats.totalMonthly)}
          </p>
        </div>

        {/* Due This Week */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width={16}
                height={16}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="#F59E0B"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Due This Week
          </p>
          <p
            className="text-lg font-heading font-bold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {stats.totalUpcoming}
          </p>
        </div>

        {/* Overdue */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width={16}
                height={16}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="var(--accent-coral)"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Overdue
          </p>
          <p
            className="text-lg font-heading font-bold mt-0.5"
            style={{ color: stats.overdueCount > 0 ? 'var(--accent-coral)' : 'var(--text-primary)' }}
          >
            {stats.overdueCount}
          </p>
        </div>

        {/* Paid This Month */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <ProgressRing paid={stats.paidThisMonth} total={stats.totalThisMonth} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Paid This Month
          </p>
          <p
            className="text-lg font-heading font-bold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {stats.paidThisMonth}/{stats.totalThisMonth}
          </p>
        </div>
      </motion.div>

      {/* Bill List */}
      {bills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-12 text-center"
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg
              width={28}
              height={28}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="var(--accent-primary)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p
            className="text-base font-heading font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            No bills yet
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Start tracking your recurring bills and never miss a payment.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg
              width={16}
              height={16}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Your First Bill
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {bills.map((bill, i) => {
              const statusInfo = getStatusInfo(bill);
              const borderColor = getBorderColor(bill);
              const isDueToday = bill.status === 'due_today';

              return (
                <motion.div
                  key={bill.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card"
                  style={{
                    borderLeft: `3px solid ${borderColor}`,
                    opacity: bill.isActive ? 1 : 0.5,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {isDueToday && (
                    <style>{`
                      @keyframes badge-pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                      }
                    `}</style>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {getCategoryIcon(bill.category)}
                      </div>

                      {/* Bill Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {bill.name}
                              </p>
                              {!bill.isActive && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: 'rgba(100, 116, 139, 0.15)',
                                    color: '#64748b',
                                  }}
                                >
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  color: 'var(--accent-primary)',
                                }}
                              >
                                {getFrequencyLabel(bill.frequency)}
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Next: {new Date(bill.nextDueDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className="text-sm font-bold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {formatCurrency(bill.amount)}
                            </p>
                          </div>
                        </div>

                        {/* Status + Actions row */}
                        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                          {/* Status Badge */}
                          <span
                            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                            style={{
                              background: statusInfo.bgColor,
                              color: statusInfo.color,
                              animation: isDueToday ? 'badge-pulse 2s ease-in-out infinite' : undefined,
                            }}
                          >
                            {statusInfo.label}
                          </span>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            {bill.isActive && bill.status !== 'paid' && (
                              <>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => openPayModal(bill)}
                                  className="btn-primary text-[11px] px-3 py-1.5"
                                  style={{ fontSize: 11 }}
                                >
                                  Pay Now
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleSkip(bill)}
                                  className="btn-ghost text-[11px] px-2.5 py-1.5"
                                  style={{ fontSize: 11 }}
                                >
                                  Skip
                                </motion.button>
                              </>
                            )}
                            {/* Three-dot menu */}
                            <div style={{ position: 'relative' }}>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === bill.id ? null : bill.id);
                                }}
                                className="btn-ghost"
                                style={{
                                  padding: '4px 6px',
                                  minWidth: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <svg
                                  width={16}
                                  height={16}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                                  />
                                </svg>
                              </motion.button>
                              <AnimatePresence>
                                {openMenuId === bill.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.12 }}
                                    className="glass-card"
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '100%',
                                      marginTop: 4,
                                      padding: '4px',
                                      minWidth: 120,
                                      zIndex: 50,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => openEditModal(bill)}
                                      className="w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = 'var(--card-bg)')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = 'transparent')
                                      }
                                    >
                                      <svg
                                        width={14}
                                        height={14}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                                        />
                                      </svg>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(bill)}
                                      className="w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2"
                                      style={{ color: 'var(--accent-coral)' }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = 'transparent')
                                      }
                                    >
                                      <svg
                                        width={14}
                                        height={14}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                        />
                                      </svg>
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Bill Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingBill ? 'Edit Bill' : 'Add Bill'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Name *
            </label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="e.g., Netflix, Rent, Insurance..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Amount *
            </label>
            <input
              type="number"
              className="glass-input w-full"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Category
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {BILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all"
                  style={{
                    background:
                      form.category === cat
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'transparent',
                    border:
                      form.category === cat
                        ? '1.5px solid var(--accent-primary)'
                        : '1.5px solid var(--card-border)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{getCategoryIcon(cat)}</span>
                  <span
                    className="text-[10px] font-medium leading-tight"
                    style={{
                      color:
                        form.category === cat
                          ? 'var(--accent-primary)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {cat}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Frequency
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setForm({ ...form, frequency: freq.value })}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background:
                      form.frequency === freq.value
                        ? 'var(--accent-primary)'
                        : 'rgba(99, 102, 241, 0.08)',
                    color:
                      form.frequency === freq.value
                        ? '#fff'
                        : 'var(--text-secondary)',
                    border:
                      form.frequency === freq.value
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--card-border)',
                  }}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Due Date *
            </label>
            <input
              type="date"
              className="glass-input w-full"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          {/* Remind days before */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Remind days before
            </label>
            <input
              type="number"
              className="glass-input w-full"
              min="0"
              max="30"
              value={form.reminderDaysBefore}
              onChange={(e) =>
                setForm({ ...form, reminderDaysBefore: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          {/* Auto-add expense toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Auto-add expense
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Automatically create an expense when paid
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isAutoAdd: !form.isAutoAdd })}
              className="relative"
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: form.isAutoAdd ? 'var(--accent-primary)' : 'var(--card-border)',
                transition: 'background 0.2s',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: form.isAutoAdd ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Notes
            </label>
            <textarea
              className="glass-input w-full"
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-3 justify-end mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
          <button onClick={() => setShowFormModal(false)} className="btn-ghost">
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-5 py-2.5"
            style={{ opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? 'Saving...' : editingBill ? 'Update Bill' : 'Save Bill'}
          </motion.button>
        </div>
      </Modal>

      {/* Pay Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Record Payment"
      >
        {payingBill && (
          <div className="space-y-4">
            <div
              className="glass-card p-3 flex items-center gap-3"
              style={{ background: 'var(--card-bg)' }}
            >
              <span style={{ fontSize: 24 }}>{getCategoryIcon(payingBill.category)}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {payingBill.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Expected: {formatCurrency(payingBill.amount)}
                </p>
              </div>
            </div>

            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Paid Amount
              </label>
              <input
                type="number"
                className="glass-input w-full"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>

            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Paid Date
              </label>
              <input
                type="date"
                className="glass-input w-full"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button onClick={() => setShowPayModal(false)} className="btn-ghost">
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePay}
                disabled={isPaying}
                className="btn-primary px-5 py-2.5"
                style={{ opacity: isPaying ? 0.7 : 1 }}
              >
                {isPaying ? 'Processing...' : 'Confirm Payment'}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingBill(null);
        }}
        title="Delete Bill"
      >
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{deletingBill?.name}</strong>? This
          action cannot be undone.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingBill(null);
            }}
            className="btn-ghost"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              boxShadow: '0 4px 14px rgba(255, 107, 107, 0.3)',
            }}
          >
            Delete
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
