'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Category } from '@/types/expense';
import { CATEGORY_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatCurrency';

interface CategoryPieChartProps {
  data: { category: Category; amount: number }[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="text-base font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Spending by Category
        </h3>
        <div className="flex items-center justify-center h-[250px] text-sm" style={{ color: 'var(--text-muted)' }}>
          No data to display
        </div>
      </motion.div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <h3 className="text-base font-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Spending by Category
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={4}
            dataKey="amount"
            nameKey="category"
            animationBegin={200}
            animationDuration={800}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={CATEGORY_COLORS[entry.category]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0];
              const value = Number(item.value);
              const name = String(item.name);
              return (
                <div
                  className="glass-card px-3 py-2 text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <p className="font-semibold">{name}</p>
                  <p>
                    {formatCurrency(value)} ({((value / total) * 100).toFixed(1)}%)
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((d) => (
          <div key={d.category} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: CATEGORY_COLORS[d.category] }}
            />
            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
              {d.category}
            </span>
            <span className="ml-auto font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {((d.amount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
