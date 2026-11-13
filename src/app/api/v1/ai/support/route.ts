import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { resolveSupportQuery } from '@/domains/ai/service';
import { writeAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.message) {
    return NextResponse.json({ error: 'subject and message are required' }, { status: 400 });
  }

  try {
    const result = await resolveSupportQuery(userId, body.subject, body.message);

    await writeAudit({
      userId,
      action: 'SUPPORT_TICKET_CREATED',
      resource: 'supportTicket',
      resourceId: result.ticketId,
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit support query';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
