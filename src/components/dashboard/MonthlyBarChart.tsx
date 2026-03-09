'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatCurrency';

interface MonthlyBarChartProps {
  data: { month: string; amount: number }[];
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h3 className="text-base font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Monthly Trend
        </h3>
        <div className="flex items-center justify-center h-[250px] text-sm" style={{ color: 'var(--text-muted)' }}>
          No data to display
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6"
    >
      <h3 className="text-base font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Monthly Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border)" opacity={0.5} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) return null;
              return (
                <div
                  className="glass-card px-3 py-2 text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <p className="font-semibold">{label}</p>
                  <p>{formatCurrency(Number(payload[0].value))}</p>
                </div>
              );
            }}
          />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <Bar
            dataKey="amount"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            animationBegin={300}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
