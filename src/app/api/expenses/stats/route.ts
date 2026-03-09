import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const dayOfMonth = now.getDate();

    // Total spending (all time)
    const totalRow = await queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1',
      [auth.userId]
    );
    const totalSpending = parseFloat(totalRow?.total || '0');

    // This month spending
    const monthRow = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE user_id = $1 AND date >= $2`,
      [auth.userId, currentMonthStart]
    );
    const thisMonthSpending = parseFloat(monthRow?.total || '0');

    // Daily average (this month)
    const dailyAverage = dayOfMonth > 0 ? thisMonthSpending / dayOfMonth : 0;

    // Top category (all time)
    const topCatRow = await queryOne<{ category: string; total: string }>(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE user_id = $1
       GROUP BY category ORDER BY total DESC LIMIT 1`,
      [auth.userId]
    );
    const topCategory = topCatRow
      ? { category: topCatRow.category, amount: parseFloat(topCatRow.total) }
      : null;

    // Spending by category (all time, for pie chart)
    const categoryRows = await query<{ category: string; total: string }>(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE user_id = $1
       GROUP BY category ORDER BY total DESC`,
      [auth.userId]
    );
    const categoryBreakdown = categoryRows.map((r) => ({
      category: r.category,
      amount: parseFloat(r.total),
    }));

    // Monthly category spent (current month, for budget comparison)
    const monthlyCatRows = await query<{ category: string; total: string }>(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE user_id = $1 AND date >= $2
       GROUP BY category`,
      [auth.userId, currentMonthStart]
    );
    const monthlyCategorySpent: Record<string, number> = {
      Food: 0, Transportation: 0, Entertainment: 0, Shopping: 0, Bills: 0, Other: 0,
    };
    monthlyCatRows.forEach((r) => {
      monthlyCategorySpent[r.category] = parseFloat(r.total);
    });

    // Monthly trend (last 6 months, for bar chart)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const row = await queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE user_id = $1 AND date >= $2 AND date < $3`,
        [auth.userId, monthStart, monthEnd]
      );

      monthlyTrend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        amount: parseFloat(row?.total || '0'),
      });
    }

    // Recent expenses (for dashboard)
    const recentRows = await query<Record<string, unknown>>(
      `SELECT id, amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date, recurring, created_at as "createdAt"
       FROM expenses WHERE user_id = $1
       ORDER BY date DESC, created_at DESC LIMIT 5`,
      [auth.userId]
    );
    const recentExpenses = recentRows.map((e) => ({
      ...e,
      amount: parseFloat(e.amount as string),
    }));

    // Expense count
    const countRow = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = $1',
      [auth.userId]
    );
    const expenseCount = parseInt(countRow?.count || '0');

    return NextResponse.json({
      totalSpending,
      thisMonthSpending,
      dailyAverage,
      topCategory,
      categoryBreakdown,
      monthlyCategorySpent,
      monthlyTrend,
      recentExpenses,
      expenseCount,
    });
  } catch (error) {
    console.error('GET /api/expenses/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
