import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { redeemGiftCard } from '@/domains/gift/service';

const redeemSchema = z.object({
  code:      z.string().min(8, 'Invalid code format'),
  accountId: z.string().uuid('Valid NGN account ID required'),
});

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  try {
    const result = await redeemGiftCard({
      userId,
      accountId: parsed.data.accountId,
      rawCode: parsed.data.code,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Redemption failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
