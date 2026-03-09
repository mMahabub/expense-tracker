import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getPrevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

    const currentMonth = formatMonth(year, month);
    const prev = getPrevMonth(year, month);
    const prevMonth = formatMonth(prev.year, prev.month);
    const daysInMonth = getDaysInMonth(year, month);
    const daysElapsed = (year === now.getFullYear() && month === now.getMonth() + 1)
      ? now.getDate()
      : daysInMonth;

    // Run all queries in parallel for efficiency
    const [
      heatmapRows,
      currentMonthRow,
      prevMonthRow,
      highestDayRow,
      mostActiveCatRow,
      budgetRow,
      categoryRows,
      prevCategoryRows,
      monthlyTrendRows,
      weeklyPatternRows,
      topExpenseRows,
    ] = await Promise.all([
      // 1. Heatmap - all daily spending for the year
      query<{ date: string; amount: string; count: string }>(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date,
                COALESCE(SUM(amount), 0) as amount,
                COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
         GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
         ORDER BY date`,
        [auth.userId, year]
      ),

      // 2a. Current month totals
      query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
        [auth.userId, currentMonth]
      ),

      // 2b. Previous month totals
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
        [auth.userId, prevMonth]
      ),

      // 2c. Highest spending day this month
      query<{ date: string; amount: string }>(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, SUM(amount) as amount
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
         ORDER BY amount DESC LIMIT 1`,
        [auth.userId, currentMonth]
      ),

      // 2d. Most active category this month
      query<{ category: string; amount: string; count: string }>(
        `SELECT category, SUM(amount) as amount, COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         GROUP BY category
         ORDER BY amount DESC LIMIT 1`,
        [auth.userId, currentMonth]
      ),

      // 2e. Budget
      query<{ amount: string }>(
        `SELECT amount FROM budgets WHERE user_id = $1 AND category = 'overall' AND month = $2`,
        [auth.userId, currentMonth]
      ).catch(() => [] as Array<{ amount: string }>),

      // 3a. Category breakdown - current month
      query<{ category: string; total: string; count: string }>(
        `SELECT category,
                SUM(amount) as total,
                COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         GROUP BY category
         ORDER BY total DESC`,
        [auth.userId, currentMonth]
      ),

      // 3b. Category breakdown - previous month
      query<{ category: string; total: string }>(
        `SELECT category, SUM(amount) as total
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         GROUP BY category`,
        [auth.userId, prevMonth]
      ),

      // 4. Monthly trend - last 12 months
      query<{ month: string; category: string; total: string }>(
        `SELECT TO_CHAR(date, 'YYYY-MM') as month,
                category,
                SUM(amount) as total
         FROM expenses
         WHERE user_id = $1 AND date >= (CURRENT_DATE - INTERVAL '12 months')
         GROUP BY TO_CHAR(date, 'YYYY-MM'), category
         ORDER BY month`,
        [auth.userId]
      ),

      // 5. Weekly pattern
      query<{ day_num: string; total: string; count: string }>(
        `SELECT EXTRACT(DOW FROM date) as day_num,
                SUM(amount) as total,
                COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         GROUP BY EXTRACT(DOW FROM date)
         ORDER BY day_num`,
        [auth.userId, currentMonth]
      ),

      // 6. Top expenses
      query<{ id: string; amount: string; category: string; description: string; date: string }>(
        `SELECT id, amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date
         FROM expenses
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         ORDER BY amount DESC
         LIMIT 10`,
        [auth.userId, currentMonth]
      ),
    ]);

    // --- Build heatmap ---
    const heatmapMap = new Map<string, { amount: number; count: number }>();
    for (const row of heatmapRows) {
      heatmapMap.set(row.date, {
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      });
    }
    const heatmap: Array<{ date: string; amount: number; count: number }> = [];
    for (let m = 1; m <= 12; m++) {
      const days = getDaysInMonth(year, m);
      for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const entry = heatmapMap.get(dateStr);
        heatmap.push({
          date: dateStr,
          amount: entry?.amount ?? 0,
          count: entry?.count ?? 0,
        });
      }
    }

    // --- Build insights ---
    const currentMonthTotal = parseFloat(currentMonthRow[0]?.total ?? '0');
    const prevMonthTotal = parseFloat(prevMonthRow[0]?.total ?? '0');
    const monthChange = prevMonthTotal > 0
      ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : 0;

    const prevDaysInMonth = getDaysInMonth(prev.year, prev.month);
    const currentMonthDailyAvg = daysElapsed > 0 ? currentMonthTotal / daysElapsed : 0;
    const prevMonthDailyAvg = prevDaysInMonth > 0 ? prevMonthTotal / prevDaysInMonth : 0;
    const dailyAvgChange = prevMonthDailyAvg > 0
      ? ((currentMonthDailyAvg - prevMonthDailyAvg) / prevMonthDailyAvg) * 100
      : 0;

    const highestSpendingDay = highestDayRow.length > 0
      ? { date: highestDayRow[0].date, amount: parseFloat(highestDayRow[0].amount) }
      : null;

    const mostActiveCategory = mostActiveCatRow.length > 0
      ? {
          category: mostActiveCatRow[0].category,
          amount: parseFloat(mostActiveCatRow[0].amount),
          count: parseInt(mostActiveCatRow[0].count),
        }
      : null;

    const totalBudget = budgetRow.length > 0 ? parseFloat(budgetRow[0].amount) : 0;
    const totalSpent = currentMonthTotal;
    const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const insights = {
      currentMonthTotal,
      prevMonthTotal,
      monthChange,
      currentMonthDailyAvg,
      prevMonthDailyAvg,
      dailyAvgChange,
      highestSpendingDay,
      mostActiveCategory,
      totalBudget,
      totalSpent,
      budgetUsage,
    };

    // --- Build category breakdown ---
    const prevCategoryMap = new Map<string, number>();
    for (const row of prevCategoryRows) {
      prevCategoryMap.set(row.category, parseFloat(row.total));
    }

    const categoryBreakdown = categoryRows.map((row) => {
      const total = parseFloat(row.total);
      const count = parseInt(row.count);
      const prevTotal = prevCategoryMap.get(row.category) ?? 0;
      const trend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

      return {
        category: row.category,
        total,
        percentage: currentMonthTotal > 0 ? (total / currentMonthTotal) * 100 : 0,
        count,
        average: count > 0 ? total / count : 0,
        prevMonthTotal: prevTotal,
        trend,
      };
    });

    // --- Build monthly trend ---
    const trendMap = new Map<string, { total: number; categories: Record<string, number> }>();
    for (const row of monthlyTrendRows) {
      if (!trendMap.has(row.month)) {
        trendMap.set(row.month, { total: 0, categories: {} });
      }
      const entry = trendMap.get(row.month)!;
      const amount = parseFloat(row.total);
      entry.total += amount;
      entry.categories[row.category] = amount;
    }

    const monthlyTrend: Array<{
      month: string;
      label: string;
      total: number;
      categories: Record<string, number>;
    }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mKey = formatMonth(d.getFullYear(), d.getMonth() + 1);
      const entry = trendMap.get(mKey);
      monthlyTrend.push({
        month: mKey,
        label: MONTH_LABELS[d.getMonth()],
        total: entry?.total ?? 0,
        categories: entry?.categories ?? {},
      });
    }

    // --- Build weekly pattern ---
    const weeklyMap = new Map<number, { total: number; count: number }>();
    for (const row of weeklyPatternRows) {
      weeklyMap.set(parseInt(row.day_num), {
        total: parseFloat(row.total),
        count: parseInt(row.count),
      });
    }

    const weeklyPattern: Array<{
      day: string;
      dayNum: number;
      average: number;
      total: number;
      count: number;
    }> = [];
    for (let d = 0; d < 7; d++) {
      const entry = weeklyMap.get(d);
      const total = entry?.total ?? 0;
      const count = entry?.count ?? 0;
      weeklyPattern.push({
        day: DAY_NAMES[d],
        dayNum: d,
        average: count > 0 ? total / count : 0,
        total,
        count,
      });
    }

    // --- Build top expenses ---
    const topExpenses = topExpenseRows.map((row) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      category: row.category,
      description: row.description,
      date: row.date,
    }));

    // --- Build prediction ---
    const dailyRate = daysElapsed > 0 ? currentMonthTotal / daysElapsed : 0;
    const projectedMonthTotal = dailyRate * daysInMonth;
    const budgetDifference = totalBudget > 0 ? totalBudget - projectedMonthTotal : 0;

    const prediction = {
      projectedMonthTotal,
      daysElapsed,
      daysInMonth,
      dailyRate,
      budgetDifference,
      isOverBudget: totalBudget > 0 && projectedMonthTotal > totalBudget,
    };

    return NextResponse.json({
      heatmap,
      insights,
      categoryBreakdown,
      monthlyTrend,
      weeklyPattern,
      topExpenses,
      prediction,
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
