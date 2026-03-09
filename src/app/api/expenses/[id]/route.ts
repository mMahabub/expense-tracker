import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// GET /api/expenses/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT id, amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date, recurring, created_at as "createdAt"
       FROM expenses WHERE id = $1 AND user_id = $2`,
      [params.id, auth.userId]
    );

    if (!row) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense: { ...row, amount: parseFloat(row.amount as string) } });
  } catch (error) {
    console.error('GET /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

// PUT /api/expenses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { amount, category, description, date, recurring } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!category || !description?.trim() || !date) {
      return NextResponse.json({ error: 'Category, description, and date are required' }, { status: 400 });
    }

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE expenses
       SET amount = $1, category = $2, description = $3, date = $4, recurring = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date, recurring, created_at as "createdAt"`,
      [amount, category, description.trim(), date, recurring || 'none', params.id, auth.userId]
    );

    if (!row) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense: { ...row, amount: parseFloat(row.amount as string) } });
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await queryOne(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id',
      [params.id, auth.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
