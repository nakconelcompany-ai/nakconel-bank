import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/session';

/**
 * POST /api/v1/health/promote
 * Promotes the currently logged-in user to owner role.
 * Only works if there are NO existing owners — first-run setup only.
 */
export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'You must be logged in.' }, { status: 401 });
  }

  // Safety check: only allow if no owners exist yet
  const existingOwner = await prisma.user.findFirst({
    where: { role: 'owner' },
  });

  if (existingOwner) {
    return NextResponse.json(
      { success: false, error: 'An owner already exists. Contact the current owner to grant admin access.' },
      { status: 403 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data:  { role: 'owner' },
    select: { id: true, fullName: true, email: true, role: true },
  });

  return NextResponse.json({
    success: true,
    data: { ...user, message: `${user.fullName} is now the owner. Visit /admin to access the dashboard.` },
  });
}
