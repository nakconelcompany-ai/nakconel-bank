import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  customerEmail: z.string().email().optional(),
});

/** Phase 2 — Business invoices (scaffold) */
export async function GET() {
  return NextResponse.json({
    success: true,
    phase: 2,
    data: [],
    message: 'Business invoices API — Phase 2 scaffold',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const id = `inv_${Date.now().toString(36)}`;
    return NextResponse.json({
      success: true,
      phase: 2,
      data: {
        id,
        ...data,
        status: 'UNPAID',
        paymentLink: `https://pay.nakconel.com/i/${id}`,
        currency: 'NGN',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid invoice';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
