import { NextRequest, NextResponse } from 'next/server';
import { listPaymentLinks } from '@/domains/business/service';
import { getAuthenticatedUserId } from '@/lib/session';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const data = await listPaymentLinks(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  if (!getAuthenticatedUserId(req)) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  return NextResponse.json(
    { success: false, error: 'Payment links are unavailable until a licensed payment provider is connected.' },
    { status: 503 }
  );
}
