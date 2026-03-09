'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatCurrency';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import { Category, Expense } from '@/types/expense';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  subMonths, differenceInDays, startOfWeek, endOfWeek,
} from 'date-fns';

export default function StatisticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    async function load() {
      try {
        // Fetch all expenses for stats (high limit)
        const data = await apiFetch<{ expenses: Expense[] }>('/api/expenses?limit=100&page=1');
        // Also fetch remaining pages if needed
        let all = data.expenses;
        // Get total count from stats
        const stats = await apiFetch<{ expenseCount: number }>('/api/expenses/stats');
        if (stats.expenseCount > 100) {
          const pages = Math.ceil(stats.expenseCount / 100);
          for (let p = 2; p <= pages; p++) {
            const more = await apiFetch<{ expenses: Expense[] }>(`/api/expenses?limit=100&page=${p}`);
            all = [...all, ...more.expenses];
          }
        }
        if (!cancelled) {
          setExpenses(all);
          setIsLoaded(true);
        }
      } catch {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const stats = useMemo(() => {
    if (expenses.length === 0) return null;

    const now = new Date();
    const sortedDates = expenses.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    const totalDays = Math.max(1, differenceInDays(now, sortedDates[0]) + 1);
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const avgDaily = total / totalDays;

    const dayMap = new Map<string, number>();
    expenses.forEach((e) => {
      const key = typeof e.date === 'string' && e.date.length >= 10 ? e.date.substring(0, 10) : e.date;
      dayMap.set(key, (dayMap.get(key) || 0) + Number(e.amount));
    });
    let highestDay = { date: '', amount: 0 };
    dayMap.forEach((amount, date) => {
      if (amount > highestDay.amount) highestDay = { date, amount };
    });

    const catMap = new Map<Category, number>();
    expenses.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + Number(e.amount));
    });
    const topCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const toDate = (d: string) => {
      const str = typeof d === 'string' && d.length >= 10 ? d.substring(0, 10) : d;
      return parseISO(str);
    };

    const currentMonthExpenses = expenses.filter((e) => { const d = toDate(e.date); return d >= currentMonthStart && d <= currentMonthEnd; });
    const prevMonthExpenses = expenses.filter((e) => { const d = toDate(e.date); return d >= prevMonthStart && d <= prevMonthEnd; });

    const currentMonthTotal = currentMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const prevMonthTotal = prevMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const monthChange = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

    const comparisonData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const monthExps = expenses.filter((e) => { const d = toDate(e.date); return d >= mStart && d <= mEnd; });
      const entry: Record<string, string | number> = { month: format(monthDate, 'MMM') };
      (['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other'] as Category[]).forEach((cat) => {
        entry[cat] = monthExps.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
      });
      comparisonData.push(entry);
    }

    const heatmapStart = startOfWeek(subMonths(now, 12), { weekStartsOn: 0 });
    const heatmapEnd = endOfWeek(now, { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start: heatmapStart, end: heatmapEnd });
    const heatmapData = allDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      return { date: day, dateStr: key, amount: dayMap.get(key) || 0, weekday: day.getDay() };
    });
    const maxDayAmount = Math.max(...heatmapData.map((d) => d.amount), 1);

    const weeks: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];
    heatmapData.forEach((day, i) => {
      currentWeek.push(day);
      if (day.weekday === 6 || i === heatmapData.length - 1) { weeks.push(currentWeek); currentWeek = []; }
    });

    const recurringCount = expenses.filter((e) => e.recurring && e.recurring !== 'none').length;

    return { avgDaily, highestDay, topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null, currentMonthTotal, prevMonthTotal, monthChange, comparisonData, weeks, maxDayAmount, totalExpenses: expenses.length, total, recurringCount };
  }, [expenses]);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28" />)}
        </div>
        <div className="skeleton h-80" />
      </div>
    );
  }

  if (!stats) {
    return (
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg width={40} height={40} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h2 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Data Yet</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Add expenses to see detailed statistics.</p>
        <Link href="/expenses/add" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">Add Expense</Link>
      </motion.div>
    );
  }

  function getHeatColor(amount: number, max: number) {
    if (amount === 0) return 'var(--input-bg)';
    const intensity = Math.min(amount / max, 1);
    if (intensity < 0.25) return 'rgba(99, 102, 241, 0.15)';
    if (intensity < 0.5) return 'rgba(99, 102, 241, 0.35)';
    if (intensity < 0.75) return 'rgba(99, 102, 241, 0.55)';
    return 'rgba(99, 102, 241, 0.85)';
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Statistics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Detailed spending analytics</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Daily', value: formatCurrency(stats.avgDaily), icon: '📊', color: '#6366f1' },
          { label: 'Highest Day', value: formatCurrency(stats.highestDay.amount), sub: stats.highestDay.date ? format(parseISO(stats.highestDay.date), 'MMM d') : '-', icon: '🔥', color: '#ef4444' },
          { label: 'Top Category', value: stats.topCategory ? `${CATEGORY_ICONS[stats.topCategory.category]} ${stats.topCategory.category}` : '-', sub: stats.topCategory ? formatCurrency(stats.topCategory.amount) : '', icon: '🏆', color: '#f59e0b' },
          { label: 'Month Change', value: `${stats.monthChange >= 0 ? '+' : ''}${stats.monthChange.toFixed(1)}%`, sub: `${formatCurrency(stats.currentMonthTotal)} vs ${formatCurrency(stats.prevMonthTotal)}`, icon: stats.monthChange >= 0 ? '📈' : '📉', color: stats.monthChange >= 0 ? '#ef4444' : '#00d4aa' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="glass-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: card.color }} />
            <span className="text-2xl mb-1 block">{card.icon}</span>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
            <p className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            {card.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>}
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spending Heatmap</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-[720px]">
            {stats.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div key={day.dateStr} className="w-[13px] h-[13px] rounded-[2px] transition-colors duration-200" style={{ background: getHeatColor(day.amount, stats.maxDayAmount) }} title={`${format(day.date, 'MMM d, yyyy')}: ${day.amount > 0 ? formatCurrency(day.amount) : 'No spending'}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Less</span>
            {[0, 0.15, 0.35, 0.55, 0.85].map((opacity, i) => (
              <div key={i} className="w-[13px] h-[13px] rounded-[2px]" style={{ background: i === 0 ? 'var(--input-bg)' : `rgba(99, 102, 241, ${opacity})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Monthly Comparison by Category</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--card-border)' }} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', boxShadow: 'var(--card-shadow)' }} labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }} formatter={(value) => [formatCurrency(Number(value)), undefined]} />
              <Legend />
              {(['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other'] as Category[]).map((cat) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} radius={cat === 'Other' ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-heading font-bold" style={{ color: 'var(--accent-primary)' }}>{stats.totalExpenses}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Total Transactions</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-heading font-bold" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(stats.total)}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Total Spent</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-heading font-bold" style={{ color: 'var(--accent-coral)' }}>{stats.recurringCount}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Recurring Expenses</p>
        </div>
      </motion.div>
    </div>
  );
}
