import { NextRequest, NextResponse } from 'next/server';
import { getAccountBalanceKobo } from '@/domains/ledger/service';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { fromKobo, formatNGN } from '@/lib/money';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId required' }, { status: 400 });
    }
    const account = await prisma.account.findFirst({ where: { id: accountId, userId, status: 'ACTIVE', currency: 'NGN' }, select: { id: true } });
    if (!account) return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    const kobo = await getAccountBalanceKobo(accountId);
    return NextResponse.json({
      success: true,
      data: {
        accountId,
        balanceKobo: kobo,
        balance: fromKobo(kobo),
        formatted: formatNGN(kobo),
        currency: 'NGN',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
