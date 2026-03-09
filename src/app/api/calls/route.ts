import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { query } from '@/lib/db';

interface CallLogRow {
  id: string;
  callType: string;
  status: string;
  duration: number | null;
  createdAt: string;
  callerName: string;
  calleeName: string;
  callerId: string;
  calleeId: string;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  try {
    const rows = await query<CallLogRow>(
      `SELECT cl.id, cl.call_type as "callType", cl.status, cl.duration,
              cl.created_at as "createdAt",
              caller.name as "callerName", callee.name as "calleeName",
              cl.caller_id as "callerId", cl.callee_id as "calleeId"
       FROM call_logs cl
       JOIN users caller ON cl.caller_id = caller.id
       JOIN users callee ON cl.callee_id = callee.id
       WHERE cl.conversation_id = $1
       ORDER BY cl.created_at DESC
       LIMIT 50`,
      [conversationId]
    );

    return NextResponse.json({ calls: rows });
  } catch (error) {
    console.error('GET /api/calls error:', error);
    return NextResponse.json({ error: 'Failed to fetch call history' }, { status: 500 });
  }
}
