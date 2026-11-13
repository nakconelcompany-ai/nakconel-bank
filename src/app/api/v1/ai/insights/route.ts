import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { getFinancialInsights } from '@/domains/ai/service';
import { writeAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const insights = await getFinancialInsights(userId);

    await writeAudit({
      userId,
      action: 'AI_INSIGHTS_VIEW',
      resource: 'aiInsights',
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json(insights);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch insights';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
