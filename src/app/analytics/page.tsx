'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToastContext } from '@/components/ui/ToastContainer';
import { formatCurrency } from '@/lib/formatCurrency';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsData {
  heatmap: Array<{ date: string; amount: number; count: number }>;
  insights: {
    currentMonthTotal: number;
    prevMonthTotal: number;
    monthChange: number;
    currentMonthDailyAvg: number;
    prevMonthDailyAvg: number;
    dailyAvgChange: number;
    highestSpendingDay: { date: string; amount: number } | null;
    mostActiveCategory: { category: string; amount: number; count: number } | null;
    totalBudget: number;
    totalSpent: number;
    budgetUsage: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    percentage: number;
    count: number;
    average: number;
    prevMonthTotal: number;
    trend: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    label: string;
    total: number;
    categories: Record<string, number>;
  }>;
  weeklyPattern: Array<{
    day: string;
    dayNum: number;
    average: number;
    total: number;
    count: number;
  }>;
  topExpenses: Array<{
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
  }>;
  prediction: {
    projectedMonthTotal: number;
    daysElapsed: number;
    daysInMonth: number;
    dailyRate: number;
    budgetDifference: number;
    isOverBudget: boolean;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ALL_CATEGORIES = ['Food','Transportation','Entertainment','Shopping','Bills','Other'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    boxShadow: 'var(--card-shadow)',
    backdropFilter: 'blur(10px)',
  },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
};

// ── Page Component ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToastContext();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayExpenses, setDayExpenses] = useState<Array<{ id: string; amount: number; category: string; description: string; date: string }>>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set(['Total']));
  const [activeDonutIndex, setActiveDonutIndex] = useState<number>(-1);

  // ── Fetch analytics data ──

  const fetchAnalytics = useCallback(async () => {
    if (authLoading || !user) return;
    setIsLoading(true);
    try {
      const result = await apiFetch<AnalyticsData>(`/api/analytics?year=${year}&month=${month}`);
      setData(result);
    } catch {
      addToast('Failed to load analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, user, authLoading, addToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Fetch day expenses when a heatmap day is clicked ──

  useEffect(() => {
    if (!selectedDay) {
      setDayExpenses([]);
      return;
    }
    let cancelled = false;
    async function loadDay() {
      setLoadingDay(true);
      try {
        const result = await apiFetch<{ expenses: Array<{ id: string; amount: number; category: string; description: string; date: string }> }>(
          `/api/expenses?startDate=${selectedDay}&endDate=${selectedDay}`
        );
        if (!cancelled) setDayExpenses(result.expenses || []);
      } catch {
        if (!cancelled) setDayExpenses([]);
      } finally {
        if (!cancelled) setLoadingDay(false);
      }
    }
    loadDay();
    return () => { cancelled = true; };
  }, [selectedDay]);

  // ── Month navigation ──

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // ── Heatmap helpers ──

  function getHeatColor(amount: number): string {
    if (amount === 0) return 'var(--input-bg)';
    if (amount <= 20) return '#9be9a8';
    if (amount <= 50) return '#40c463';
    if (amount <= 100) return '#30a14e';
    return '#216e39';
  }

  function buildHeatmapGrid(heatmapData: AnalyticsData['heatmap']) {
    const heatmapMap = new Map(heatmapData.map(d => [d.date, d]));
    const jan1 = new Date(year, 0, 1);
    const startDay = jan1.getDay(); // 0=Sun

    const weeks: Array<Array<{ date: string; amount: number; count: number; dayOfMonth: number; monthIdx: number } | null>> = [];
    let currentWeek: Array<typeof weeks[0][0]> = [];

    // Pad the first week with nulls
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    // Determine days in year
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeap ? 366 : 365;

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(year, 0, 1 + d);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const entry = heatmapMap.get(dateStr);
      currentWeek.push({
        date: dateStr,
        amount: entry?.amount || 0,
        count: entry?.count || 0,
        dayOfMonth: date.getDate(),
        monthIdx: date.getMonth(),
      });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    // Push the last partial week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  }

  function getMonthLabels(weeks: ReturnType<typeof buildHeatmapGrid>) {
    const labels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      for (const cell of weeks[w]) {
        if (cell && cell.monthIdx !== lastMonth) {
          labels.push({ label: SHORT_MONTHS[cell.monthIdx], weekIndex: w });
          lastMonth = cell.monthIdx;
          break;
        }
      }
    }
    return labels;
  }

  // ── Budget ring color ──

  function getBudgetColor(usage: number): string {
    if (usage < 70) return '#00d4aa';
    if (usage < 90) return '#f59e0b';
    return '#ef4444';
  }

  // ── Loading state ──

  if (isLoading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-6 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-28" />)}
        </div>
        <div className="skeleton h-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-80" />
          <div className="skeleton h-80" />
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  // ── Empty state ──

  if (!data || (data.topExpenses.length === 0 && data.insights.currentMonthTotal === 0)) {
    return (
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width={40} height={40} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Analytics Data</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Add expenses to see analytics</p>
        <Link href="/expenses/add" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">Add Expense</Link>
      </motion.div>
    );
  }

  // ── Derived data ──

  const heatmapWeeks = buildHeatmapGrid(data.heatmap);
  const monthLabels = getMonthLabels(heatmapWeeks);

  const weeklyMax = data.weeklyPattern.reduce((max, d) => d.average > max.average ? d : max, data.weeklyPattern[0]);

  const sortedCategories = [...data.categoryBreakdown].sort((a, b) => b.total - a.total);
  const categoryTotal = sortedCategories.reduce((s, c) => s + c.total, 0);

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Deep dive into your spending</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={prevMonth}
            className="btn-ghost p-2 rounded-lg"
            aria-label="Previous month"
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </motion.button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={nextMonth}
            className="btn-ghost p-2 rounded-lg"
            aria-label="Next month"
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Section 1: Spending Heatmap ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spending Heatmap</h2>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex" style={{ paddingLeft: '32px' }}>
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                  position: 'relative',
                  left: `${ml.weekIndex * 16}px`,
                  marginRight: i < monthLabels.length - 1 ? '0' : undefined,
                  width: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0 mt-1" style={{ minWidth: '720px' }}>
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1" style={{ width: '28px', flexShrink: 0 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={label} className="h-[13px] flex items-center">
                  {i % 2 === 1 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Heatmap grid: columns = weeks */}
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className="rounded-[2px] cursor-pointer transition-all duration-200"
                    style={{
                      width: '13px',
                      height: '13px',
                      background: cell ? getHeatColor(cell.amount) : 'transparent',
                      outline: cell && selectedDay === cell.date ? '2px solid var(--accent-primary)' : 'none',
                      outlineOffset: '-1px',
                    }}
                    title={cell ? `${cell.date}: ${cell.amount > 0 ? formatCurrency(cell.amount) : 'No spending'} (${cell.count} expense${cell.count !== 1 ? 's' : ''})` : ''}
                    onClick={() => cell && setSelectedDay(selectedDay === cell.date ? null : cell.date)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Less</span>
            {['var(--input-bg)', '#9be9a8', '#40c463', '#30a14e', '#216e39'].map((color, i) => (
              <div key={i} className="rounded-[2px]" style={{ width: '13px', height: '13px', background: color }} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Day detail panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Expenses on {selectedDay}
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDay(null)}
                    className="btn-ghost p-1 rounded"
                  >
                    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
                {loadingDay ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="skeleton h-10" />)}
                  </div>
                ) : dayExpenses.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No expenses on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {dayExpenses.map((exp, i) => (
                      <div key={exp.id || i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--input-bg)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{CATEGORY_ICONS[exp.category as keyof typeof CATEGORY_ICONS] || '📌'}</span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{exp.description || exp.category}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.category}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 2: Spending Insights Cards ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: This Month */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#6366f1' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#6366f1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>This Month</p>
            <p className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.insights.currentMonthTotal)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>vs {formatCurrency(data.insights.prevMonthTotal)}</span>
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: data.insights.monthChange > 0 ? '#ef4444' : '#00d4aa',
                  background: data.insights.monthChange > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,170,0.1)',
                }}
              >
                {data.insights.monthChange > 0 ? '+' : ''}{data.insights.monthChange.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 2: Daily Average */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#00d4aa' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(0, 212, 170, 0.15)' }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#00d4aa">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Daily Average</p>
            <p className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.insights.currentMonthDailyAvg)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>vs {formatCurrency(data.insights.prevMonthDailyAvg)}</span>
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: data.insights.dailyAvgChange > 0 ? '#ef4444' : '#00d4aa',
                  background: data.insights.dailyAvgChange > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,170,0.1)',
                }}
              >
                {data.insights.dailyAvgChange > 0 ? '+' : ''}{data.insights.dailyAvgChange.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: Highest Day */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#ef4444' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
              </svg>
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Highest Day</p>
            <p className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
              {data.insights.highestSpendingDay ? formatCurrency(data.insights.highestSpendingDay.amount) : '-'}
            </p>
            {data.insights.highestSpendingDay && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(() => {
                  const d = new Date(data.insights.highestSpendingDay.date + 'T00:00:00');
                  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
                })()}
              </p>
            )}
          </div>

          {/* Card 4: Top Category */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#f59e0b' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#f59e0b">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768.562-2.038 1.1-.271.539-.035 1.176.543 1.776.578.6 1.484 1.1 2.494 1.278m11.502 0c.996-.178 1.768-.562 2.038-1.1.271-.539.035-1.176-.543-1.776-.578-.6-1.484-1.1-2.494-1.278M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m-6.27-5.228c.394.027.794.04 1.198.04.405 0 .805-.014 1.2-.04" />
              </svg>
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Top Category</p>
            <p className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
              {data.insights.mostActiveCategory
                ? `${CATEGORY_ICONS[data.insights.mostActiveCategory.category as keyof typeof CATEGORY_ICONS] || ''} ${data.insights.mostActiveCategory.category}`
                : '-'}
            </p>
            {data.insights.mostActiveCategory && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {formatCurrency(data.insights.mostActiveCategory.amount)} &middot; {data.insights.mostActiveCategory.count} transactions
              </p>
            )}
          </div>

          {/* Card 5: Budget Usage */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: getBudgetColor(data.insights.budgetUsage) }} />
            <div className="flex items-center gap-4">
              <div className="relative" style={{ width: 64, height: 64 }}>
                <svg width={64} height={64} viewBox="0 0 64 64">
                  <circle cx={32} cy={32} r={26} fill="none" stroke="var(--card-border)" strokeWidth={5} />
                  <circle
                    cx={32} cy={32} r={26}
                    fill="none"
                    stroke={getBudgetColor(data.insights.budgetUsage)}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={`${(Math.min(data.insights.budgetUsage, 100) / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(data.insights.budgetUsage)}%
                </span>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Budget Usage</p>
                <p className="text-sm font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(data.insights.totalSpent)} of {formatCurrency(data.insights.totalBudget)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>used</p>
              </div>
            </div>
          </div>

          {/* Card 6: Transactions */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#a855f7' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#a855f7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Transactions</p>
            <p className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{data.topExpenses.length}</p>
            {/* Mini daily distribution bar */}
            <div className="flex gap-[2px] mt-2 h-4 items-end">
              {data.weeklyPattern.map((wp, i) => {
                const maxAvg = Math.max(...data.weeklyPattern.map(w => w.average), 1);
                const h = Math.max(4, (wp.average / maxAvg) * 16);
                return <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}px`, background: 'var(--accent-primary)', opacity: 0.6 }} />;
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section 3: Category Breakdown ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Category Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut Chart */}
          <div className="glass-card p-6 flex items-center justify-center">
            <div className="relative" style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sortedCategories.map(c => ({ name: c.category, value: c.total }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                    onMouseLeave={() => setActiveDonutIndex(-1)}
                  >
                    {sortedCategories.map((entry, index) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS] || '#64748b'}
                        stroke="none"
                        style={{
                          transform: activeDonutIndex === index ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    {...CHART_TOOLTIP_STYLE}
                    formatter={(value) => [formatCurrency(Number(value)), undefined]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p>
                  <p className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(categoryTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Table */}
          <div className="glass-card p-6 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left pb-3 font-medium">Category</th>
                  <th className="text-right pb-3 font-medium">Total</th>
                  <th className="text-right pb-3 font-medium">%</th>
                  <th className="text-right pb-3 font-medium hidden sm:table-cell"># Txns</th>
                  <th className="text-right pb-3 font-medium hidden sm:table-cell">Avg</th>
                  <th className="text-right pb-3 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => (
                  <tr key={cat.category} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                    <td className="py-2.5" style={{ color: 'var(--text-primary)' }}>
                      <span className="mr-1.5">{CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📌'}</span>
                      {cat.category}
                    </td>
                    <td className="py-2.5 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cat.total)}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{cat.percentage.toFixed(0)}%</td>
                    <td className="py-2.5 text-right hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{cat.count}</td>
                    <td className="py-2.5 text-right hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(cat.average)}</td>
                    <td className="py-2.5 text-right">
                      <span style={{ color: cat.trend > 0 ? '#ef4444' : '#00d4aa' }}>
                        {cat.trend > 0 ? '↑' : '↓'} {Math.abs(cat.trend).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ── Section 4: Monthly Trend ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Monthly Trend</h2>

        {/* Category toggle pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['Total', ...ALL_CATEGORIES].map(cat => {
            const isEnabled = enabledCategories.has(cat);
            const color = cat === 'Total' ? 'var(--accent-primary)' : (CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#64748b');
            return (
              <button
                key={cat}
                onClick={() => {
                  const next = new Set(enabledCategories);
                  if (cat === 'Total') return; // Total is always shown
                  if (next.has(cat)) next.delete(cat);
                  else next.add(cat);
                  setEnabledCategories(next);
                }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: isEnabled ? color : 'var(--input-bg)',
                  color: isEnabled ? '#fff' : 'var(--text-secondary)',
                  opacity: cat === 'Total' ? 1 : undefined,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
              />
              <Legend />
              {enabledCategories.has('Total') && (
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="var(--accent-primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--accent-primary)' }}
                  activeDot={{ r: 6 }}
                />
              )}
              {ALL_CATEGORIES.filter(c => enabledCategories.has(c)).map(cat => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={`categories.${cat}`}
                  name={cat}
                  stroke={CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#64748b'}
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Section 5: Weekly Pattern ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Weekly Pattern</h2>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeklyPattern} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value) => [formatCurrency(Number(value)), 'Average']}
              />
              <Bar dataKey="average" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {weeklyMax && (
          <p className="text-sm mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
            You spend the most on <strong style={{ color: 'var(--text-primary)' }}>{weeklyMax.day}s</strong> ({formatCurrency(weeklyMax.average)} avg)
          </p>
        )}
      </motion.div>

      {/* ── Section 6: Top Expenses ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Expenses</h2>
        <div className="space-y-1">
          {data.topExpenses.slice(0, 10).map((expense, i) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 py-3 px-3 rounded-lg"
              style={{
                background: i === 0 ? 'rgba(245, 158, 11, 0.08)' : i % 2 === 0 ? 'var(--input-bg)' : 'transparent',
                borderLeft: i === 0 ? '3px solid #f59e0b' : '3px solid transparent',
              }}
            >
              <span className="text-sm font-bold min-w-[24px]" style={{ color: i === 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                #{i + 1}
              </span>
              <span className="text-lg">{CATEGORY_ICONS[expense.category as keyof typeof CATEGORY_ICONS] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{expense.description || expense.category}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(() => {
                    const d = new Date(expense.date + 'T00:00:00');
                    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
                  })()}
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(expense.amount)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 7: Savings Prediction ── */}
      {data.prediction && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Savings Prediction</h2>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Left: Text info */}
            <div className="flex-1 space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                At your current rate of <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.prediction.dailyRate)}/day</strong>...
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Projected total: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.prediction.projectedMonthTotal)}</strong>
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                That&apos;s{' '}
                <strong style={{ color: data.prediction.isOverBudget ? '#ef4444' : '#00d4aa' }}>
                  {formatCurrency(Math.abs(data.prediction.budgetDifference))}
                </strong>{' '}
                {data.prediction.isOverBudget ? 'over' : 'under'} budget
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {data.prediction.daysElapsed} of {data.prediction.daysInMonth} days elapsed
              </p>
            </div>

            {/* Right: Progress bar */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  <span>Day {data.prediction.daysElapsed}</span>
                  <span>Day {data.prediction.daysInMonth}</span>
                </div>
                <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.prediction.daysElapsed / data.prediction.daysInMonth) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      background: data.prediction.isOverBudget
                        ? 'linear-gradient(90deg, #ef4444, #f97316)'
                        : 'linear-gradient(90deg, #00d4aa, #3b82f6)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(data.insights.totalSpent)} spent</span>
                  <span style={{ color: data.prediction.isOverBudget ? '#ef4444' : '#00d4aa', fontWeight: 600 }}>
                    {formatCurrency(data.prediction.projectedMonthTotal)} projected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
