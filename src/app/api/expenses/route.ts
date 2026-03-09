import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/expenses — list with filtering + pagination
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['e.user_id = $1'];
  const params: unknown[] = [auth.userId];
  let paramIndex = 2;

  if (category && category !== 'All') {
    conditions.push(`e.category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }
  if (startDate) {
    conditions.push(`e.date >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    conditions.push(`e.date <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }
  if (search) {
    conditions.push(`e.description ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const where = conditions.join(' AND ');

  try {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM expenses e WHERE ${where}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const rows = await query(
      `SELECT e.id, e.amount, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') as date, e.recurring, e.created_at as "createdAt"
       FROM expenses e
       WHERE ${where}
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const expenses = rows.map((e: Record<string, unknown>) => ({
      ...e,
      amount: parseFloat(e.amount as string),
    }));

    return NextResponse.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST /api/expenses — create new expense
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { amount, category, description, date, recurring } = body;

    // Validate
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO expenses (user_id, amount, category, description, date, recurring)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date, recurring, created_at as "createdAt"`,
      [auth.userId, amount, category, description.trim(), date, recurring || 'none']
    );

    return NextResponse.json({ expense: row ? { ...row, amount: parseFloat(row.amount as string) } : row }, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
