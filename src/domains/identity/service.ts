import { prisma } from '@/lib/prisma';
import { hashPassword, hashPin, verifyPassword, verifyPin } from '@/lib/crypto';
import { writeAudit } from '@/lib/audit';
import { postJournal } from '@/domains/ledger/service';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('234') && d.length >= 13) d = '0' + d.slice(3);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d.slice(0, 11);
}

/** Generate a unique 10-digit account number */
async function generateAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    // Start with 9 (like most Nigerian banks) + 9 random digits
    const num = '9' + String(randomInt(0, 1_000_000_000)).padStart(9, '0');
    const existing = await prisma.account.findFirst({ where: { accountNumber: num } });
    if (!existing) return num;
  }
  throw new Error('Could not generate a unique account number. Please try again.');
}

/** Hash a plain OTP code so we never store it in plaintext */
function hashCode(code: string): string {
  return createHash('sha256').update(`otp:${code}`).digest('hex');
}

/** Store an email OTP in the IdempotencyRecord table (reuses existing infra) */
export async function saveEmailOtp(email: string, code: string, purpose: 'signup' | 'password-reset') {
  const key = `email-otp:${purpose}:${email.toLowerCase()}`;
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.idempotencyRecord.upsert({
    where:  { key },
    create: { key, response: { codeHash: hashCode(code), purpose }, expiresAt },
    update: { response: { codeHash: hashCode(code), purpose }, expiresAt },
  });
}

/** Verify and consume an email OTP — returns true once, then it's gone */
export async function verifyEmailOtp(email: string, code: string, purpose: 'signup' | 'password-reset'): Promise<boolean> {
  const key = `email-otp:${purpose}:${email.toLowerCase()}`;
  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record || record.expiresAt < new Date()) return false;
  const stored = record.response as { codeHash: string; purpose: string };
  const expected = Buffer.from(stored.codeHash, 'hex');
  const supplied = Buffer.from(hashCode(code), 'hex');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  // consume — delete so it can't be reused
  await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
  return true;
}

/** Issue a short-lived, single-use proof that signup email OTP was verified. */
export async function issueSignupVerificationToken(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString('base64url');
  const key = `signup-verified:${normalizedEmail}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: { key, response: { token, email: normalizedEmail }, expiresAt },
    update: { response: { token, email: normalizedEmail }, expiresAt },
  });
  return token;
}

export async function consumeSignupVerificationToken(email: string, token: string): Promise<boolean> {
  const key = `signup-verified:${email.toLowerCase().trim()}`;
  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record || record.expiresAt < new Date()) return false;
  const stored = record.response as { token: string; email: string };
  const a = Buffer.from(stored.token);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const deleted = await prisma.idempotencyRecord.deleteMany({ where: { key, expiresAt: { gt: new Date() } } });
  return deleted.count === 1;
}

/** After OTP is verified for password-reset, issue a short-lived reset token */
export async function issuePasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const key = `reset-token:${email.toLowerCase()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await prisma.idempotencyRecord.upsert({
    where:  { key },
    create: { key, response: { token, email: email.toLowerCase() }, expiresAt },
    update: { response: { token, email: email.toLowerCase() }, expiresAt },
  });
  return token;
}

/** Verify and consume a password reset token */
export async function verifyPasswordResetToken(email: string, token: string): Promise<boolean> {
  const key = `reset-token:${email.toLowerCase()}`;
  const record = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!record || record.expiresAt < new Date()) return false;
  const stored = record.response as { token: string; email: string };
  const storedBuffer = Buffer.from(stored.token);
  const suppliedBuffer = Buffer.from(token);
  if (storedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(storedBuffer, suppliedBuffer)) return false;
  await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
  return true;
}

export async function registerUser(input: {
  phone: string;
  fullName: string;
  email: string;
  password: string;
  pin: string;
  dateOfBirth?: string;
  address?: string;
}) {
  if (!/^\d{4}$/.test(input.pin)) throw new Error('PIN must be 4 digits');
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters');

  const phone = normalizePhone(input.phone);
  if (!/^0[7-9]\d{9}$/.test(phone)) {
    throw new Error('Enter a valid Nigerian mobile number (e.g. 08012345678)');
  }

  const email = input.email.toLowerCase().trim();
  if (!email.includes('@') || !email.includes('.')) throw new Error('Enter a valid email address');

  const [existingPhone, existingEmail] = await Promise.all([
    prisma.user.findFirst({ where: { phone } }),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (existingPhone) throw new Error('This phone number is already registered');
  if (existingEmail) throw new Error('This email address is already registered');

  const [passwordHash, pinHash] = await Promise.all([
    hashPassword(input.password),
    hashPin(input.pin),
  ]);

  const accountNumber = await generateAccountNumber();

  const user = await prisma.user.create({
    data: {
      email,
      fullName: input.fullName.trim(),
      phone,
      address: input.address ?? null,
      passwordHash,
      pinHash,
      kycStatus: 'NONE',
      accounts: { create: { currency: 'NGN', status: 'ACTIVE', accountNumber } },
    },
    include: { accounts: true },
  });

  await writeAudit({ userId: user.id, action: 'USER_REGISTERED', resource: 'user', resourceId: user.id });

  return {
    id:            user.id,
    email:         user.email,
    fullName:      user.fullName,
    phone:         user.phone ?? undefined,
    accountId:     user.accounts[0]?.id,
    accountNumber: user.accounts[0]?.accountNumber ?? undefined,
    kycStatus:     user.kycStatus,
  };
}

export async function loginUser(emailOrPhone: string, password: string) {
  const isPhone = !emailOrPhone.includes('@');
  const phone   = isPhone ? normalizePhone(emailOrPhone) : null;

  const user = await prisma.user.findFirst({
    where: isPhone
      ? { phone: phone ?? undefined }
      : { email: emailOrPhone.toLowerCase().trim() },
    include: { accounts: true },
  });
  if (!user) throw new Error('Invalid credentials');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  await writeAudit({ userId: user.id, action: 'USER_LOGIN', resource: 'user', resourceId: user.id });

  return {
    id:            user.id,
    email:         user.email,
    fullName:      user.fullName,
    phone:         user.phone ?? undefined,
    role:          user.role ?? 'customer',
    kycStatus:     user.kycStatus,
    accountId:     user.accounts[0]?.id,
    accountNumber: user.accounts[0]?.accountNumber ?? undefined,
  };
}

export async function resetPassword(email: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw new Error('No account found with that email address');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await writeAudit({ userId: user.id, action: 'PASSWORD_RESET', resource: 'user', resourceId: user.id });
  return { id: user.id, email: user.email, fullName: user.fullName };
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

export async function topUpAccount(input: {
  userId: string;
  accountId: string;
  amountKobo: number;
  reference: string;
}) {
  if (input.amountKobo < 10000) throw new Error('Minimum top-up is ₦100');
  const account = await prisma.account.findFirst({ where: { id: input.accountId, userId: input.userId } });
  if (!account) throw new Error('Account not found');

  const journal = await postJournal({
    description: 'Wallet top-up',
    entries: [{
      debitAccountId:  'funding:nakconel',
      creditAccountId: input.accountId,
      amount:          input.amountKobo,
      reference:       input.reference,
    }],
  });

  await writeAudit({
    userId: input.userId, action: 'TOPUP_COMPLETED',
    resource: 'account', resourceId: input.accountId,
    meta: { amount: input.amountKobo, journalId: journal.id },
  });

  return journal;
}
