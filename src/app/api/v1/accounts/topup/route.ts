import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const initSchema = z.object({
  accountId: z.string().uuid(),
  amountNgn: z.number().min(100, 'Minimum top-up is ₦100').max(1_000_000, 'Maximum top-up is ₦1,000,000'),
});

/**
 * Wallet funding is deliberately unavailable until a verified provider callback
 * is connected to a persistent pending-top-up record and an idempotent ledger credit.
 * Never credit a wallet merely because a user requested a top-up.
 */
export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = initSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId, currency: 'NGN', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ success: false, error: 'Active NGN account not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: false,
    error: 'Wallet funding is temporarily unavailable while verified payment settlement is being completed. No funds have been added.',
  }, { status: 503 });
}
