import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { listUserGifts } from '@/domains/gift/service';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const data = await listUserGifts(userId);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve gift cards.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
