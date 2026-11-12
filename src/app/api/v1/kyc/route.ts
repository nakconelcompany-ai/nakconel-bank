import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { encryptField } from '@/lib/crypto';
import { writeAudit } from '@/lib/audit';

const submitSchema = z.object({
  fullName:    z.string().min(2).max(100),
  dateOfBirth: z.string().min(8),
  phone:       z.string().min(10).max(15),
  address:     z.string().min(5).max(200),
  bvn:         z.string().length(11, 'BVN must be 11 digits').regex(/^\d{11}$/, 'BVN must be digits only'),
  idType:      z.enum(['NIN', 'PASSPORT', 'DRIVERS_LICENCE', 'VOTERS_CARD']),
});

/* GET /api/v1/kyc — get current KYC status */
export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycSubmissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!user) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      kycStatus: user.kycStatus,
      latestSubmission: user.kycSubmissions[0]
        ? {
            id:          user.kycSubmissions[0].id,
            status:      user.kycSubmissions[0].status,
            idType:      user.kycSubmissions[0].idType,
            createdAt:   user.kycSubmissions[0].createdAt,
          }
        : null,
    },
  });
}

/* POST /api/v1/kyc — submit KYC */
export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid KYC data.' }, { status: 400 });
  }

  const { fullName, dateOfBirth, phone, address, bvn, idType } = parsed.data;

  // Encrypt BVN at rest
  const bvnEnc = encryptField(bvn);

  // Do not approve identity from format checks alone. A licensed identity
  // verification provider and review workflow must confirm the submitted details.
  const submission = await prisma.kycSubmission.create({
    data: {
      userId,
      fullName,
      dateOfBirth,
      phone,
      address,
      bvnEnc,
      idType,
      status: 'PENDING',
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: 'PENDING', address },
  });

  await writeAudit({
    userId,
    action: 'KYC_SUBMITTED',
    resource: 'kyc',
    resourceId: submission.id,
    meta: { idType, status: submission.status },
  });

  return NextResponse.json({
    success: true,
    data: {
      id:     submission.id,
      status: submission.status,
      message: 'Your identity details have been submitted and are pending verification. Your account has not been marked as verified.',
    },
  }, { status: 201 });
}
