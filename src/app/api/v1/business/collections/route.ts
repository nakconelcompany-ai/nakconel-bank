import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listCollections, recordCollection } from '@/domains/business/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const data = await listCollections(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      source: z.enum(['INVOICE', 'PAYMENT_LINK', 'DIRECT']),
      sourceId: z.string().optional(),
      amount: z.number().positive(),
      payerName: z.string().optional(),
      payerEmail: z.string().email().optional(),
    }).parse(await req.json());
    const data = await recordCollection({
      userId: body.userId,
      source: body.source,
      sourceId: body.sourceId,
      amountNaira: body.amount,
      payerName: body.payerName,
      payerEmail: body.payerEmail,
    });
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
