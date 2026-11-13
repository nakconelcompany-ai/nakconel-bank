import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { getBusinessCashFlowForecast } from '@/domains/ai/service';
import { writeAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const forecast = await getBusinessCashFlowForecast(userId);

    await writeAudit({
      userId,
      action: 'AI_FORECAST_VIEW',
      resource: 'aiCashFlow',
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json(forecast);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch forecast';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
