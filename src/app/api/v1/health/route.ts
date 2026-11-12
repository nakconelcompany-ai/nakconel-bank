import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    // Run one-time safe migrations that may not have been applied yet
    // All statements use IF NOT EXISTS / IF EXISTS so they are fully idempotent
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_accountNumber_key"
      ON "Account"("accountNumber")
      WHERE "accountNumber" IS NOT NULL;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'customer';
    `);

    // Basic DB connectivity check
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
    return NextResponse.json({
      success: true,
      status: 'ok',
      db: 'connected',
      time: result[0]?.now,
      migrations: 'accountNumber and role columns ensured',
    });
  } catch (e: unknown) {
    console.error('Health/migration error:', e);
    return NextResponse.json(
      { success: false, status: 'error', error: String(e) },
      { status: 500 }
    );
  }
}
