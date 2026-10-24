import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateBusiness } from '@/domains/business/service';

export async function POST(req: NextRequest) {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      businessName: z.string().optional(),
    }).parse(await req.json());
    const data = await getOrCreateBusiness(body.userId, body.businessName);
    return NextResponse.json({
      success: true,
      phase: 2,
      data: {
        id: data.id,
        businessName: data.businessName,
        businessType: data.businessType,
        status: data.status,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
