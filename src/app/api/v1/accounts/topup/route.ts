import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { topUpAccount } from '@/domains/identity/service';
import { sendMoneyReceivedEmail } from '@/lib/brevo';

const initSchema = z.object({
  accountId: z.string().uuid(),
  amountNgn: z.number().min(100, 'Minimum top-up is ₦100').max(1_000_000, 'Maximum top-up is ₦1,000,000'),
});

/* POST /api/v1/accounts/topup
   Initiates a Paystack checkout. On success the client redirects to Paystack.
   The callback (/?payment=...) credits the wallet via webhook or manual verify. */
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
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
    include: { user: true },
  });
  if (!account) {
    return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
  }

  const amountKobo = Math.round(parsed.data.amountNgn * 100);
  const reference  = `topup_${userId.slice(0, 8)}_${Date.now()}`;

  // Try Paystack if configured; otherwise use mock credit (demo)
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const appUrl      = process.env.APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  if (paystackKey && process.env.PAYMENTS_ENABLED === 'true') {
    try {
      const { PaystackClient } = await import('@/domains/providers/paystack');
      const client = new PaystackClient(paystackKey);
      const callbackUrl = `${appUrl}/?payment=completed&ref=${reference}&accountId=${account.id}`;
      const result = await client.initializeTransaction({
        email: account.user.email,
        amountKobo,
        reference,
        callbackUrl,
      });
      return NextResponse.json({
        success: true,
        data: { mode: 'paystack', authorizationUrl: result.authorizationUrl, reference },
      });
    } catch (e: unknown) {
      console.error('Paystack init error:', e);
      // Fall through to demo mode
    }
  }

  // Demo mode — credit immediately without a real payment provider
  try {
    await topUpAccount({ userId, accountId: account.id, amountKobo, reference });
    // Send money received alert (non-blocking)
    const formatted = `₦${parsed.data.amountNgn.toLocaleString('en-NG')}`;
    const time = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
    sendMoneyReceivedEmail({ to: account.user.email, toName: account.user.fullName, amount: formatted, reference, time }).catch(() => {});
    return NextResponse.json({
      success: true,
      data: {
        mode: 'demo',
        message: `${formatted} credited to your wallet.`,
        amountKobo,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Top-up failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
