import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { queryOne } from '@/lib/db';

// PUT /api/bills/[id] — update bill reminder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, amount, category, frequency, dueDate, nextDueDate, reminderDaysBefore, isAutoAdd, notes, currency, isActive } = body;

    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Frequency must be one of: ' + validFrequencies.join(', ') }, { status: 400 });
    }
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Build dynamic update
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const addField = (column: string, value: unknown) => {
      if (value !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    addField('name', name?.trim());
    addField('amount', amount);
    addField('category', category);
    addField('frequency', frequency);
    addField('due_date', dueDate);
    addField('next_due_date', nextDueDate);
    addField('reminder_days_before', reminderDaysBefore);
    addField('is_auto_add', isAutoAdd);
    addField('notes', notes);
    addField('currency', currency);
    addField('is_active', isActive);

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE bill_reminders
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, name, amount, currency, category, frequency,
         TO_CHAR(due_date, 'YYYY-MM-DD') as "dueDate",
         TO_CHAR(next_due_date, 'YYYY-MM-DD') as "nextDueDate",
         reminder_days_before as "reminderDaysBefore",
         is_active as "isActive",
         is_auto_add as "isAutoAdd",
         notes, created_at as "createdAt"`,
      [...values, params.id, auth.userId]
    );

    if (!row) {
      return NextResponse.json({ error: 'Bill reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ bill: { ...row, amount: parseFloat(row.amount as string) } });
  } catch (error) {
    console.error('PUT /api/bills/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update bill reminder' }, { status: 500 });
  }
}

// DELETE /api/bills/[id] — delete bill reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await queryOne(
      'DELETE FROM bill_reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [params.id, auth.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'Bill reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Bill reminder deleted' });
  } catch (error) {
    console.error('DELETE /api/bills/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete bill reminder' }, { status: 500 });
  }
}
