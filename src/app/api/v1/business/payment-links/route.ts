import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPaymentLink, listPaymentLinks } from '@/domains/business/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const data = await listPaymentLinks(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      title: z.string().min(2),
      amount: z.number().positive().optional(),
    }).parse(await req.json());
    const data = await createPaymentLink({
      userId: body.userId,
      title: body.title,
      amountNaira: body.amount,
    });
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
