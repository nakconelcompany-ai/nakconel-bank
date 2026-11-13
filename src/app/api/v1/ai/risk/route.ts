import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// Admin-only: view risk assessments
export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  // Check admin/owner role
  const adminUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (adminUser?.role !== 'admin' && adminUser?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get('userId') ?? undefined;
  const level = url.searchParams.get('level') ?? undefined; // e.g. HIGH, CRITICAL

  const assessments = await (prisma as any).aiRiskAssessment.findMany({
    where: {
      ...(targetUserId ? { userId: targetUserId } : {}),
      ...(level ? { riskLevel: level } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ assessments });
}
