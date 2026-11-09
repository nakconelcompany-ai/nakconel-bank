import { prisma } from '@/lib/prisma';
import { hashPassword, hashPin, verifyPassword, verifyPin } from '@/lib/crypto';
import { writeAudit } from '@/lib/audit';
import { postJournal } from '@/domains/ledger/service';

function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('234') && d.length >= 13) d = '0' + d.slice(3);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d.slice(0, 11);
}

export async function registerUser(input: {
  phone: string;
  fullName: string;
  email?: string;
  password: string;
  pin: string;
  bvn?: string;
  dateOfBirth?: string;
  address?: string;
}) {
  if (!/^\d{4}$/.test(input.pin)) throw new Error('PIN must be 4 digits');
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters');

  const phone = normalizePhone(input.phone);
  if (!/^0[7-9]\d{9}$/.test(phone)) {
    throw new Error('Enter a valid Nigerian mobile number (e.g. 08012345678)');
  }

  // Check phone uniqueness
  const existingPhone = await prisma.user.findFirst({ where: { phone } });
  if (existingPhone) throw new Error('This phone number is already registered');

  // Check email uniqueness if provided
  if (input.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) throw new Error('This email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const pinHash = await hashPin(input.pin);

  const user = await prisma.user.create({
    data: {
      email: input.email?.toLowerCase().trim() ?? `${phone}@nakconel.app`,
      fullName: input.fullName.trim(),
      phone,
      address: input.address ?? null,
      passwordHash,
      pinHash,
      kycStatus: 'NONE',
      accounts: {
        create: { currency: 'NGN', status: 'ACTIVE' },
      },
    },
    include: { accounts: true },
  });

  await writeAudit({
    userId: user.id,
    action: 'USER_REGISTERED',
    resource: 'user',
    resourceId: user.id,
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? undefined,
    accountId: user.accounts[0]?.id,
    kycStatus: user.kycStatus,
  };
}

export async function loginUser(emailOrPhone: string, password: string) {
  // Accept either email or phone number
  const isPhone = !emailOrPhone.includes('@');
  const phone = isPhone ? normalizePhone(emailOrPhone) : null;

  const user = await prisma.user.findFirst({
    where: isPhone
      ? { phone: phone ?? undefined }
      : { email: emailOrPhone.toLowerCase().trim() },
    include: { accounts: true },
  });
  if (!user) throw new Error('Invalid credentials');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  await writeAudit({
    userId: user.id,
    action: 'USER_LOGIN',
    resource: 'user',
    resourceId: user.id,
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? undefined,
    kycStatus: user.kycStatus,
    accountId: user.accounts[0]?.id,
  };
}

export async function verifyUserPin(userId: string, pin: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return verifyPin(pin, user.pinHash);
}

export async function changePin(userId: string, oldPin: string, newPin: string) {
  if (!/^\d{4}$/.test(newPin)) throw new Error('PIN must be 4 digits');
  const ok = await verifyUserPin(userId, oldPin);
  if (!ok) throw new Error('Current PIN is incorrect');
  const pinHash = await hashPin(newPin);
  await prisma.user.update({ where: { id: userId }, data: { pinHash } });
  await writeAudit({ userId, action: 'PIN_CHANGED', resource: 'user', resourceId: userId });
}

/** Credit wallet after a confirmed top-up payment */
export async function topUpAccount(input: {
  userId: string;
  accountId: string;
  amountKobo: number;
  reference: string;
}) {
  if (input.amountKobo < 10000) throw new Error('Minimum top-up is ₦100');

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, userId: input.userId },
  });
  if (!account) throw new Error('Account not found');

  const journal = await postJournal({
    description: 'Wallet top-up',
    entries: [
      {
        debitAccountId: 'funding:nakconel',
        creditAccountId: input.accountId,
        amount: input.amountKobo,
        reference: input.reference,
      },
    ],
  });

  await writeAudit({
    userId: input.userId,
    action: 'TOPUP_COMPLETED',
    resource: 'account',
    resourceId: input.accountId,
    meta: { amount: input.amountKobo, journalId: journal.id },
  });

  return journal;
}
