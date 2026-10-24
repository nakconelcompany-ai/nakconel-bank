import { prisma } from '@/lib/prisma';
import { hashPassword, hashPin, verifyPassword, verifyPin } from '@/lib/crypto';
import { writeAudit } from '@/lib/audit';
import { postJournal } from '@/domains/ledger/service';

export async function registerUser(input: {
  email: string;
  fullName: string;
  password: string;
  pin: string;
  phone?: string;
}) {
  if (!/^\d{4}$/.test(input.pin)) throw new Error('PIN must be 4 digits');
  if (input.password.length < 6) throw new Error('Password too short');

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const pinHash = await hashPin(input.pin);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone || null,
      passwordHash,
      pinHash,
      kycStatus: input.phone ? 'PENDING' : 'NONE',
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
    accountId: user.accounts[0]?.id,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
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

/** Credit wallet (top-up) via ledger */
export async function topUpAccount(input: {
  userId: string;
  accountId: string;
  amountKobo: number;
  reference: string;
  pinVerified: boolean;
}) {
  if (!input.pinVerified) throw new Error('PIN required');
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
