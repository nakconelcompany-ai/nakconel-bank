import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createInternationalTransfer,
  listInternationalTransfers,
} from '@/domains/international/service';
import { verifyUserPin } from '@/domains/identity/service';
import { withIdempotency } from '@/lib/idempotency';

const schema = z.object({
  userId: z.string().uuid(),
  fromAccountId: z.string().uuid(),
  corridorId: z.string(),
  countryCode: z.string(),
  amountNgn: z.number().positive(),
  beneficiaryName: z.string().min(2),
  beneficiaryAccount: z.string().min(5),
  beneficiaryBank: z.string().optional(),
  note: z.string().optional(),
  pin: z.string().regex(/^\d{4}$/),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }
    const data = await listInternationalTransfers(userId);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

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
      createInternationalTransfer({
        userId: data.userId,
        fromAccountId: data.fromAccountId,
        corridorId: data.corridorId,
        countryCode: data.countryCode,
        amountNgn: data.amountNgn,
        beneficiaryName: data.beneficiaryName,
        beneficiaryAccount: data.beneficiaryAccount,
        beneficiaryBank: data.beneficiaryBank,
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
    const msg = e instanceof Error ? e.message : 'International transfer failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
