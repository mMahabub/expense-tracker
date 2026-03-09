import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// POST /api/bills/[id]/skip — skip this billing period
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Verify ownership and get bill details
    const bill = await queryOne<Record<string, unknown>>(
      `SELECT id, frequency
       FROM bill_reminders WHERE id = $1 AND user_id = $2`,
      [params.id, auth.userId]
    );

    if (!bill) {
      return NextResponse.json({ error: 'Bill reminder not found' }, { status: 404 });
    }

    // Insert skipped payment record
    await queryOne(
      `INSERT INTO bill_payments (reminder_id, user_id, paid_amount, paid_date, status)
       VALUES ($1, $2, 0, CURRENT_DATE, 'skipped')`,
      [params.id, auth.userId]
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
      nextDueDate: nextDueResult?.nextDueDate || null,
    });
  } catch (error) {
    console.error('POST /api/bills/[id]/skip error:', error);
    return NextResponse.json({ error: 'Failed to skip bill period' }, { status: 500 });
  }
}
