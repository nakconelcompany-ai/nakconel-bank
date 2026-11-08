import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateBusiness } from '@/domains/business/service';
import { getAuthenticatedUserId } from '@/lib/session';

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const body = z.object({
      businessName: z.string().optional(),
    }).parse(await req.json());
    const data = await getOrCreateBusiness(userId, body.businessName);
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
