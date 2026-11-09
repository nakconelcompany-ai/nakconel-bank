import { NextRequest, NextResponse } from 'next/server';
import { listInternationalTransfers } from '@/domains/international/service';
import { getAuthenticatedUserId } from '@/lib/session';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  try {
    const data = await listInternationalTransfers(userId);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'International transfers are unavailable until a licensed payment provider is connected.' },
    { status: 503 }
  );
}
