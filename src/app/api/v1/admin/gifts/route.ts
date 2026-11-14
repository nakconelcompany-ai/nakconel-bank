import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { adminListGiftCards, adminRevokeGiftCard } from '@/domains/gift/service';

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('nakconel_admin_session')?.value;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user && (user.role === 'admin' || user.role === 'owner') ? userId : null;
}

export async function GET(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get('status') as any;
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 50;

  try {
    const data = await adminListGiftCards({ status: status || undefined, limit });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Admin gift fetch failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

const revokeSchema = z.object({
  cardId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Valid card ID required.' }, { status: 400 });
  }

  try {
    const card = await adminRevokeGiftCard(parsed.data.cardId, userId);
    return NextResponse.json({ success: true, data: card });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Revocation failed.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
