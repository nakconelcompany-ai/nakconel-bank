import { NextRequest, NextResponse } from 'next/server';
import { listPaymentLinks } from '@/domains/business/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const data = await listPaymentLinks(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Payment links are unavailable until a licensed payment provider is connected.' },
    { status: 503 }
  );
}
