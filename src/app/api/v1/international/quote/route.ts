import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CORRIDORS, quoteInternational } from '@/domains/international/service';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: CORRIDORS.map((c) => ({
      id: c.id,
      label: c.label,
      subtitle: c.subtitle,
      flag: c.flag,
      feePct: c.feePct,
      feeMinNgn: c.feeMinNgn,
      settlementDays: c.settlementDays,
      countries: c.countries,
    })),
  });
}

const quoteSchema = z.object({
  corridorId: z.string(),
  countryCode: z.string(),
  amountNgn: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = quoteSchema.parse(body);
    const quote = quoteInternational(data);
    return NextResponse.json({ success: true, data: quote });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Quote failed';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
