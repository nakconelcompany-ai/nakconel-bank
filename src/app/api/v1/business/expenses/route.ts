import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense, listExpenses } from '@/domains/business/service';
import { getAuthenticatedUserId } from '@/lib/session';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const data = await listExpenses(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const body = z.object({
      category: z.string().min(2),
      title: z.string().min(2),
      amount: z.number().positive(),
      note: z.string().optional(),
    }).parse(await req.json());
    const data = await createExpense({
      userId,
      category: body.category,
      title: body.title,
      amountNaira: body.amount,
      note: body.note,
    });
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
