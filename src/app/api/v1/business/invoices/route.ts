import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createInvoice, listInvoices } from '@/domains/business/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const data = await listInvoices(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      customerName: z.string().min(2),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
      amount: z.number().positive(),
      description: z.string().optional(),
      dueDate: z.string().optional(),
    }).parse(await req.json());
    const data = await createInvoice({
      userId: body.userId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      amountNaira: body.amount,
      description: body.description,
      dueDate: body.dueDate,
    });
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
