import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/budgets?month=2026-03
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    const budgets = await query<{
      id: string;
      category: string;
      amount: string;
      month: string;
    }>(
      'SELECT id, category, amount, month FROM budgets WHERE user_id = $1 AND month = $2',
      [auth.userId, month]
    );

    // Also get spent amounts for comparison
    const monthStart = `${month}-01`;
    const nextMonthDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 1);
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    const spent = await query<{ category: string; total: string }>(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE user_id = $1 AND date >= $2 AND date < $3
       GROUP BY category`,
      [auth.userId, monthStart, monthEnd]
    );

    const spentMap: Record<string, number> = {};
    spent.forEach((s) => { spentMap[s.category] = parseFloat(s.total); });

    const budgetData = budgets.map((b) => ({
      id: b.id,
      category: b.category,
      amount: parseFloat(b.amount),
      month: b.month,
      spent: spentMap[b.category] || 0,
    }));

    // Get overall budget (stored as category = 'overall')
    const overallRow = budgets.find((b) => b.category === 'overall');
    const overallBudget = overallRow ? parseFloat(overallRow.amount) : 0;

    const monthlyTotalRow = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE user_id = $1 AND date >= $2 AND date < $3`,
      [auth.userId, monthStart, monthEnd]
    );
    const monthlyTotal = parseFloat(monthlyTotalRow?.total || '0');

    return NextResponse.json({
      budgets: budgetData,
      overallBudget,
      monthlyTotal,
      month,
    });
  } catch (error) {
    console.error('GET /api/budgets error:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

// POST /api/budgets — upsert budget for category+month
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { category, amount, month } = body;

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (amount === undefined || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 });
    }
    if (!month || typeof month !== 'string') {
      return NextResponse.json({ error: 'Month is required (YYYY-MM)' }, { status: 400 });
    }

    // Upsert
    const budget = await queryOne(
      `INSERT INTO budgets (user_id, category, amount, month)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category, month) DO UPDATE SET amount = $3
       RETURNING id, category, amount, month`,
      [auth.userId, category, amount, month]
    );

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('POST /api/budgets error:', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}
