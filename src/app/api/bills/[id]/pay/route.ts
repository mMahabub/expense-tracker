import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// POST /api/bills/[id]/pay — mark bill as paid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { paidAmount, paidDate } = body;

    if (!paidAmount || typeof paidAmount !== 'number' || paidAmount <= 0) {
      return NextResponse.json({ error: 'Paid amount must be a positive number' }, { status: 400 });
    }
    if (!paidDate || typeof paidDate !== 'string') {
      return NextResponse.json({ error: 'Paid date is required' }, { status: 400 });
    }

    // Verify ownership and get bill details
    const bill = await queryOne<Record<string, unknown>>(
      `SELECT id, name, category, frequency, is_active as "isActive"
       FROM bill_reminders WHERE id = $1 AND user_id = $2`,
      [params.id, auth.userId]
    );

    if (!bill) {
      return NextResponse.json({ error: 'Bill reminder not found' }, { status: 404 });
    }

    // Auto-create expense entry
    const expense = await queryOne<Record<string, unknown>>(
      `INSERT INTO expenses (user_id, amount, category, description, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [auth.userId, paidAmount, bill.category, `Bill payment: ${bill.name}`, paidDate]
    );

    const expenseId = expense?.id;

    // Insert bill payment
    const payment = await queryOne<Record<string, unknown>>(
      `INSERT INTO bill_payments (reminder_id, user_id, paid_amount, paid_date, status, expense_id)
       VALUES ($1, $2, $3, $4, 'paid', $5)
       RETURNING id, paid_amount as "paidAmount", TO_CHAR(paid_date, 'YYYY-MM-DD') as "paidDate", status, expense_id as "expenseId"`,
      [params.id, auth.userId, paidAmount, paidDate, expenseId]
    );

    // Calculate next due date based on frequency
    const frequency = bill.frequency as string;
    let nextDueResult: Record<string, unknown> | null;

    if (frequency === 'one_time') {
      nextDueResult = await queryOne<Record<string, unknown>>(
        `UPDATE bill_reminders
         SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING TO_CHAR(next_due_date, 'YYYY-MM-DD') as "nextDueDate"`,
        [params.id]
      );
    } else {
      const intervalMap: Record<string, string> = {
        daily: "1 day",
        weekly: "7 days",
        biweekly: "14 days",
        monthly: "1 month",
        quarterly: "3 months",
        yearly: "1 year",
      };
      const interval = intervalMap[frequency];

      nextDueResult = await queryOne<Record<string, unknown>>(
        `UPDATE bill_reminders
         SET next_due_date = next_due_date + INTERVAL '${interval}', updated_at = NOW()
         WHERE id = $1
         RETURNING TO_CHAR(next_due_date, 'YYYY-MM-DD') as "nextDueDate"`,
        [params.id]
      );
    }

    return NextResponse.json({
      payment: payment
        ? { ...payment, paidAmount: parseFloat(payment.paidAmount as string) }
        : payment,
      nextDueDate: nextDueResult?.nextDueDate || null,
    });
  } catch (error) {
    console.error('POST /api/bills/[id]/pay error:', error);
    return NextResponse.json({ error: 'Failed to mark bill as paid' }, { status: 500 });
  }
}
