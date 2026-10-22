import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransfer } from '@/domains/transfers/service';
import { verifyUserPin } from '@/domains/identity/service';
import { withIdempotency } from '@/lib/idempotency';
import { toKobo } from '@/lib/money';

const schema = z.object({
  userId: z.string().uuid(),
  fromAccountId: z.string().uuid(),
  amount: z.number().positive(),
  beneficiaryName: z.string().min(2),
  beneficiaryAccount: z.string().min(10),
  note: z.string().optional(),
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'Idempotency-Key header required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);
    const pinOk = await verifyUserPin(data.userId, data.pin);
    if (!pinOk) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 403 });
    }

    const { data: transfer, replayed } = await withIdempotency(idempotencyKey, () =>
      createTransfer({
        userId: data.userId,
        fromAccountId: data.fromAccountId,
        amountKobo: toKobo(data.amount),
        beneficiaryName: data.beneficiaryName,
        beneficiaryAccount: data.beneficiaryAccount,
        note: data.note,
        idempotencyKey,
        pinVerified: true,
      })
    );

    return NextResponse.json(
      { success: true, data: transfer, replayed },
      { status: replayed ? 200 : 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Transfer failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
