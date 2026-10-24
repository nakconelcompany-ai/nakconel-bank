import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateBusiness } from '@/domains/business/service';

export async function POST(req: NextRequest) {
  try {
    const body = z.object({ userId: z.string().uuid(), businessName: z.string().min(2).optional() }).parse(await req.json());
    const biz = await getOrCreateBusiness(body.userId, body.businessName);
    return NextResponse.json({ success: true, phase: 2, data: biz });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const biz = await getOrCreateBusiness(userId);
    return NextResponse.json({ success: true, phase: 2, data: biz });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
