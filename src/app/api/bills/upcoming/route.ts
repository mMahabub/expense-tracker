import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

// GET /api/bills/upcoming — get bills due in next 7 days
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT
        b.id,
        b.name,
        b.amount,
        b.currency,
        b.category,
        b.frequency,
        TO_CHAR(b.due_date, 'YYYY-MM-DD') as "dueDate",
        TO_CHAR(b.next_due_date, 'YYYY-MM-DD') as "nextDueDate",
        b.reminder_days_before as "reminderDaysBefore",
        b.is_active as "isActive",
        b.is_auto_add as "isAutoAdd",
        b.notes,
        b.created_at as "createdAt",
        lp.paid_amount as "lastPaidAmount",
        TO_CHAR(lp.paid_date, 'YYYY-MM-DD') as "lastPaidDate",
        lp.status as "lastPaymentStatus"
      FROM bill_reminders b
      LEFT JOIN LATERAL (
        SELECT bp.paid_amount, bp.paid_date, bp.status
        FROM bill_payments bp
        WHERE bp.reminder_id = b.id
        ORDER BY bp.paid_date DESC
        LIMIT 1
      ) lp ON true
      WHERE b.user_id = $1
        AND b.is_active = true
        AND b.next_due_date >= CURRENT_DATE
        AND b.next_due_date <= CURRENT_DATE + 7
      ORDER BY b.next_due_date ASC`,
      [auth.userId]
    );

    const upcoming = rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: parseFloat(row.amount as string),
      currency: row.currency,
      category: row.category,
      frequency: row.frequency,
      dueDate: row.dueDate,
      nextDueDate: row.nextDueDate,
      reminderDaysBefore: row.reminderDaysBefore,
      isActive: row.isActive,
      isAutoAdd: row.isAutoAdd,
      notes: row.notes,
      createdAt: row.createdAt,
      lastPayment: row.lastPaidDate
        ? {
            paidAmount: parseFloat(row.lastPaidAmount as string),
            paidDate: row.lastPaidDate,
            status: row.lastPaymentStatus,
          }
        : null,
    }));

    return NextResponse.json({ upcoming });
  } catch (error) {
    console.error('GET /api/bills/upcoming error:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming bills' }, { status: 500 });
  }
}
