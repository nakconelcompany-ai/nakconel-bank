import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransfer } from '@/domains/transfers/service';
import { verifyUserPin } from '@/domains/identity/service';
import { withIdempotency } from '@/lib/idempotency';
import { toKobo } from '@/lib/money';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const sendSchema = z.object({
  fromAccountId:    z.string().uuid(),
  amount:           z.number().positive(),
  beneficiaryName:  z.string().min(2),
  beneficiaryAccount: z.string().min(10).max(10),
  bankCode:         z.string().optional(),
  note:             z.string().max(140).optional(),
  pin:              z.string().regex(/^\d{4}$/),
});

/* POST /api/v1/transfers — send money */
export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json({ success: false, error: 'Idempotency-Key header required.' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const pinOk = await verifyUserPin(userId, parsed.data.pin);
  if (!pinOk) {
    return NextResponse.json({ success: false, error: 'Invalid PIN.' }, { status: 403 });
  }

  try {
    const scopedIdempotencyKey = `${userId}:domestic-transfer:${idempotencyKey}`;
    const { data: transfer, replayed } = await withIdempotency(scopedIdempotencyKey, () =>
      createTransfer({
        userId,
        fromAccountId: parsed.data.fromAccountId,
        amountKobo: toKobo(parsed.data.amount),
        beneficiaryName: parsed.data.beneficiaryName,
        beneficiaryAccount: parsed.data.beneficiaryAccount,
        note: parsed.data.note,
        idempotencyKey: scopedIdempotencyKey,
        pinVerified: true,
      })
    );
    return NextResponse.json({ success: true, data: transfer, replayed }, { status: replayed ? 200 : 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Transfer failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

/* GET /api/v1/transfers?accountId=&limit=&cursor= — history */
export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get('accountId') ?? undefined;
  const limit     = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
  const cursor    = searchParams.get('cursor') ?? undefined;

  try {
    // Get all accounts owned by this user
    const userAccounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = userAccounts.map((a: { id: string }) => a.id);
    if (accountId && !accountIds.includes(accountId)) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
    }
    const filterIds = accountId ? [accountId] : accountIds;

    const transfers = await prisma.transfer.findMany({
      where: { fromAccountId: { in: filterIds } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = transfers.length > limit;
    const items = transfers.slice(0, limit).map((t: {
      id: string; beneficiaryName: string; beneficiaryAccount: string;
      amount: number; fee: number; currency: string; status: string;
      note: string | null; createdAt: Date;
    }) => ({
      id:            t.id,
      type:          'send' as const,
      title:         t.beneficiaryName,
      accountNumber: t.beneficiaryAccount,
      amount:        t.amount / 100,
      amountKobo:    t.amount,
      fee:           t.fee / 100,
      currency:      t.currency,
      status:        t.status,
      note:          t.note ?? undefined,
      createdAt:     t.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        hasMore,
        nextCursor: hasMore ? transfers[limit - 1].id : null,
      },
    });
  } catch (e: unknown) {
    console.error('Transfer history error:', e);
    return NextResponse.json({ success: false, error: 'Could not load transaction history.' }, { status: 500 });
  }
}
