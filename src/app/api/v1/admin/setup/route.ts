/**
 * GET /api/v1/admin/setup
 * One-time setup: creates the admin account if it doesn't exist.
 * Safe to call multiple times — idempotent.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashPin } from '@/lib/crypto';

const ADMIN_EMAIL    = 'nakconelcompany@gmail.com';
const ADMIN_PASSWORD = 'NAKCONEL';
const ADMIN_NAME     = 'Nakconel Admin';

export async function GET() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      // Already exists — just ensure role is owner
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'owner' } });
      return NextResponse.json({ success: true, message: 'Admin account already exists. Role confirmed as owner.' });
    }

    const [passwordHash, pinHash] = await Promise.all([
      hashPassword(ADMIN_PASSWORD),
      hashPin('0000'), // default admin PIN — change via app after first login
    ]);

    // Generate a unique admin account number
    const accountNumber = '9000000001';

    const user = await prisma.user.create({
      data: {
        email:        ADMIN_EMAIL,
        fullName:     ADMIN_NAME,
        phone:        '08000000000',
        passwordHash,
        pinHash,
        role:         'owner',
        kycStatus:    'VERIFIED',
        accounts: {
          create: { currency: 'NGN', status: 'ACTIVE', accountNumber },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Admin account created. Email: ${ADMIN_EMAIL} · You can now log in at /admin/login`,
      id: user.id,
    });
  } catch (e: unknown) {
    console.error('Admin setup error:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
