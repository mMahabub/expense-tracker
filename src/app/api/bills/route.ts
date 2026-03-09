import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query, queryOne } from '@/lib/db';

// GET /api/bills — list all bill reminders with stats
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
      ORDER BY b.next_due_date ASC`,
      [auth.userId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const frequencyMultiplier: Record<string, number> = {
      daily: 30,
      weekly: 4,
      biweekly: 2,
      monthly: 1,
      quarterly: 1 / 3,
      yearly: 1 / 12,
      one_time: 0,
    };

    let totalMonthly = 0;
    let totalUpcoming = 0;
    let overdueCount = 0;
    let paidThisMonth = 0;
    let totalThisMonth = 0;

    const bills = rows.map((row) => {
      const amount = parseFloat(row.amount as string);
      const nextDueDate = row.nextDueDate as string;
      const isActive = row.isActive as boolean;
      const frequency = row.frequency as string;

      // Calculate status
      let status: string;
      if (row.lastPaymentStatus === 'paid' && row.lastPaidDate) {
        // Check if payment is for the current period
        const paidDate = new Date(row.lastPaidDate as string);
        const nextDue = new Date(nextDueDate);
        if (paidDate >= monthStart && paidDate <= nextDue) {
          status = 'paid';
        } else if (nextDueDate < todayStr) {
          status = 'overdue';
        } else if (nextDueDate === todayStr) {
          status = 'due_today';
        } else {
          status = 'upcoming';
        }
      } else if (nextDueDate < todayStr) {
        status = 'overdue';
      } else if (nextDueDate === todayStr) {
        status = 'due_today';
      } else {
        status = 'upcoming';
      }

      // Stats calculations
      if (isActive) {
        const multiplier = frequencyMultiplier[frequency] ?? 0;
        totalMonthly += amount * multiplier;

        const nextDue = new Date(nextDueDate);
        if (nextDue >= today && nextDue <= sevenDaysLater) {
          totalUpcoming++;
        }

        if (status === 'overdue') {
          overdueCount++;
        }
      }

      // Count this month's bills and paid bills
      if (isActive && nextDueDate >= monthStartStr) {
        totalThisMonth++;
        if (status === 'paid') {
          paidThisMonth++;
        }
      }

      return {
        id: row.id,
        name: row.name,
        amount,
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
        status,
        lastPayment: row.lastPaidDate
          ? {
              paidAmount: parseFloat(row.lastPaidAmount as string),
              paidDate: row.lastPaidDate,
              status: row.lastPaymentStatus,
            }
          : null,
      };
    });

    // Sort: overdue first, then due_today, then upcoming by nextDueDate ASC
    const statusOrder: Record<string, number> = { overdue: 0, due_today: 1, upcoming: 2, paid: 3 };
    bills.sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 4;
      const orderB = statusOrder[b.status] ?? 4;
      if (orderA !== orderB) return orderA - orderB;
      return (a.nextDueDate as string).localeCompare(b.nextDueDate as string);
    });

    return NextResponse.json({
      bills,
      stats: {
        totalMonthly: Math.round(totalMonthly * 100) / 100,
        totalUpcoming,
        overdueCount,
        paidThisMonth,
        totalThisMonth,
      },
    });
  } catch (error) {
    console.error('GET /api/bills error:', error);
    return NextResponse.json({ error: 'Failed to fetch bill reminders' }, { status: 500 });
  }
}

// POST /api/bills — create new bill reminder
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, amount, category, frequency, dueDate, reminderDaysBefore, isAutoAdd, notes, currency } = body;

    // Validate
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Frequency must be one of: ' + validFrequencies.join(', ') }, { status: 400 });
    }
    if (!dueDate || typeof dueDate !== 'string') {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO bill_reminders (user_id, name, amount, category, frequency, due_date, next_due_date, reminder_days_before, is_auto_add, notes, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10)
       RETURNING id, name, amount, currency, category, frequency,
         TO_CHAR(due_date, 'YYYY-MM-DD') as "dueDate",
         TO_CHAR(next_due_date, 'YYYY-MM-DD') as "nextDueDate",
         reminder_days_before as "reminderDaysBefore",
         is_active as "isActive",
         is_auto_add as "isAutoAdd",
         notes, created_at as "createdAt"`,
      [
        auth.userId,
        name.trim(),
        amount,
        category,
        frequency,
        dueDate,
        reminderDaysBefore ?? 3,
        isAutoAdd ?? false,
        notes || null,
        currency || 'BDT',
      ]
    );

    return NextResponse.json(
      { bill: row ? { ...row, amount: parseFloat(row.amount as string) } : row },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bills error:', error);
    return NextResponse.json({ error: 'Failed to create bill reminder' }, { status: 500 });
  }
}
