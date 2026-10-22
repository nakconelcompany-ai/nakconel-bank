import { NextRequest, NextResponse } from 'next/server';
import { getAccountBalanceKobo } from '@/domains/ledger/service';
import { fromKobo, formatNGN } from '@/lib/money';

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId required' }, { status: 400 });
    }
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
