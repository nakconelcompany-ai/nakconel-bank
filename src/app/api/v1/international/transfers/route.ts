import { NextRequest, NextResponse } from 'next/server';
import { listInternationalTransfers } from '@/domains/international/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }
    const data = await listInternationalTransfers(userId);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'International transfers are unavailable until a licensed payment provider is connected.' },
    { status: 503 }
  );
}
