import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSessionCookie, getAuthenticatedUserId } from '@/lib/session';

export async function GET(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });

    if (!user || user.role === 'owner' || user.role === 'admin' || user.role === 'support' || user.role === 'system') {
      const response = NextResponse.json({ success: false, error: 'Session is no longer valid.' }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }

    return NextResponse.json({
      success: true,
      data: {
        id:            user.id,
        email:         user.email,
        fullName:      user.fullName,
        accountId:     user.accounts[0]?.id,
        accountNumber: user.accounts[0]?.accountNumber ?? undefined,
        kycStatus:     user.kycStatus,
      },
    });
  } catch (error: unknown) {
    console.error('Session validation failed:', error);
    return NextResponse.json({ success: false, error: 'Session validation is temporarily unavailable.' }, { status: 500 });
  }
}
