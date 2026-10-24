import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addTeamMember, listTeam, payTeamMember } from '@/domains/business/service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    const data = await listTeam(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'pay') {
      const parsed = z.object({
        userId: z.string().uuid(),
        teamMemberId: z.string().uuid(),
        amount: z.number().positive().optional(),
        period: z.string().optional(),
      }).parse(body);
      const data = await payTeamMember({
        userId: parsed.userId,
        teamMemberId: parsed.teamMemberId,
        amountNaira: parsed.amount,
        period: parsed.period,
      });
      return NextResponse.json({ success: true, phase: 2, data });
    }
    const parsed = z.object({
      userId: z.string().uuid(),
      fullName: z.string().min(2),
      email: z.string().email(),
      role: z.string().optional(),
      salary: z.number().nonnegative().optional(),
    }).parse(body);
    const data = await addTeamMember({
      userId: parsed.userId,
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
