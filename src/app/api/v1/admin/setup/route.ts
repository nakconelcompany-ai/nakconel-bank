import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashPin } from '@/lib/crypto';
import { randomInt } from 'node:crypto';

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(200),
});

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Public admin setup is disabled. Use the secured provisioning process.',
  }, { status: 410 });
}

// Provisioning is deliberately protected by a deployment-only secret.
// It creates an administrative identity, never a customer wallet/account.
export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_PROVISIONING_SECRET;
  const supplied = request.headers.get('x-admin-provisioning-secret');
  if (!expected || expected.length < 32 || !supplied || supplied !== expected) {
    return NextResponse.json({ success: false, error: 'Not authorised.' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Provide a valid email, name and password of at least 12 characters.' }, { status: 400 });
  }

  try {
    const email = parsed.data.email.toLowerCase().trim();
    const passwordHash = await hashPassword(parsed.data.password);
    const pinHash = await hashPin(String(randomInt(1000, 10000)));
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { fullName: parsed.data.fullName, passwordHash, pinHash, role: 'owner', kycStatus: 'NONE' },
          select: { id: true, email: true, fullName: true, role: true },
        })
      : await prisma.user.create({
          data: {
            email,
            fullName: parsed.data.fullName,
            passwordHash,
            pinHash,
            role: 'owner',
            kycStatus: 'NONE',
          },
          select: { id: true, email: true, fullName: true, role: true },
        });

    // Keep immutable ledger entries for audit; disable any legacy customer accounts.
    await prisma.account.updateMany({
      where: { userId: user.id },
      data: { status: 'CLOSED', accountNumber: null },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Admin provisioning failed:', error);
    return NextResponse.json({ success: false, error: 'Admin provisioning failed.' }, { status: 500 });
  }
}
