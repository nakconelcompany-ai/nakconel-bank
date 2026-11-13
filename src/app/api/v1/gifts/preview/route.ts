import { NextRequest, NextResponse } from 'next/server';
import { previewGiftCard } from '@/domains/gift/service';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code || code.trim().length < 8) {
    return NextResponse.json({ success: false, error: 'Valid gift card code required.' }, { status: 400 });
  }

  try {
    const preview = await previewGiftCard(code.trim());
    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid gift card code.';
    return NextResponse.json({ success: false, error: msg }, { status: 404 });
  }
}
