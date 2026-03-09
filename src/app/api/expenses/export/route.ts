import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const expenses = await query<{
      date: string;
      category: string;
      description: string;
      amount: string;
      recurring: string;
    }>(
      `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, category, description, amount, recurring
       FROM expenses WHERE user_id = $1
       ORDER BY date DESC, created_at DESC`,
      [auth.userId]
    );

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Recurring'];
    const rows = expenses.map((e) => [
      e.date,
      e.category,
      `"${e.description.replace(/"/g, '""')}"`,
      parseFloat(e.amount).toFixed(2),
      e.recurring !== 'none' ? e.recurring : '',
    ]);

    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    rows.push(['', '', '"TOTAL"', total.toFixed(2), '']);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/expenses/export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
