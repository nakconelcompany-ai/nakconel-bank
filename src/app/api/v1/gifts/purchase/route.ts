import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { verifyUserPin } from '@/domains/identity/service';
import { purchaseGiftCard } from '@/domains/gift/service';
import { toKobo } from '@/lib/money';

const purchaseSchema = z.object({
  amountNaira:    z.number().min(100, 'Minimum gift card is ₦100').max(500_000, 'Maximum gift card is ₦500,000'),
  occasion:       z.enum(['GENERAL', 'BIRTHDAY', 'CONGRATULATIONS', 'THANK_YOU', 'WEDDING', 'HOLIDAY', 'BUSINESS_BONUS']).default('GENERAL'),
  senderName:     z.string().max(80).optional(),
  message:        z.string().max(300).optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  recipientPhone: z.string().max(20).optional().or(z.literal('')),
  pin:            z.string().length(4, 'PIN must be 4 digits'),
});

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  // 1. Verify transaction PIN
  const pinValid = await verifyUserPin(userId, parsed.data.pin);
  if (!pinValid) {
    return NextResponse.json({ success: false, error: 'Incorrect transaction PIN.' }, { status: 403 });
  }

  try {
    const result = await purchaseGiftCard({
      creatorUserId: userId,
      amountKobo: toKobo(parsed.data.amountNaira),
      occasion: parsed.data.occasion,
      senderName: parsed.data.senderName,
      message: parsed.data.message,
      recipientEmail: parsed.data.recipientEmail || undefined,
      recipientPhone: parsed.data.recipientPhone || undefined,
      pinVerified: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        giftCard: result.giftCard,
        rawCode: result.rawCode,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gift card purchase failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
