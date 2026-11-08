import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addTeamMember, listTeam } from '@/domains/business/service';
import { getAuthenticatedUserId } from '@/lib/session';

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const data = await listTeam(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === 'pay') {
      return NextResponse.json(
        { success: false, error: 'Payroll transfers are unavailable until a licensed payment provider is connected.' },
        { status: 503 }
      );
    }
    const parsed = z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      role: z.string().optional(),
      salary: z.number().nonnegative().optional(),
    }).parse(body);
    const data = await addTeamMember({
      userId,
      fullName: parsed.fullName,
      email: parsed.email,
      role: parsed.role,
      salaryNaira: parsed.salary,
    });
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
