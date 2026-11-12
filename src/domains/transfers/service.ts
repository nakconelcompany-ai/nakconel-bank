import { prisma } from '@/lib/prisma';
import { getAccountBalanceKobo, postJournal } from '@/domains/ledger/service';
import { writeAudit } from '@/lib/audit';

const DEFAULT_FEE_KOBO = 5000; // NGN 50
const DAILY_LIMIT_KOBO = 500_000 * 100; // NGN 500,000 daily limit

export async function createTransfer(input: {
  userId: string;
  fromAccountId: string;
  amountKobo: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  note?: string;
  idempotencyKey: string;
  pinVerified: boolean;
}) {
  if (!input.pinVerified) throw new Error('PIN required');
  if (input.amountKobo < 100) throw new Error('Minimum transfer is ₦1');

  const fee   = DEFAULT_FEE_KOBO;
  const total = input.amountKobo + fee;

  const account = await prisma.account.findFirst({
    where: { id: input.fromAccountId, userId: input.userId },
  });
  if (!account) throw new Error('Account not found');

  // Enforce daily transfer limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayAgg = await prisma.transfer.aggregate({
    where: { fromAccountId: input.fromAccountId, status: 'COMPLETED', createdAt: { gte: startOfDay } },
    _sum: { amount: true },
  });
  const sentToday = todayAgg._sum.amount ?? 0;
  if (sentToday + input.amountKobo > DAILY_LIMIT_KOBO) {
    const remaining = Math.max(0, DAILY_LIMIT_KOBO - sentToday) / 100;
    throw new Error(`Daily transfer limit reached. You can send up to ₦${remaining.toLocaleString('en-NG')} more today.`);
  }

  const balance = await getAccountBalanceKobo(input.fromAccountId);
  if (balance < total) throw new Error('Insufficient balance');

  const transfer = await prisma.transfer.create({
    data: {
      fromAccountId:      input.fromAccountId,
      amount:             input.amountKobo,
      fee,
      currency:           'NGN',
      status:             'PROCESSING',
      beneficiaryName:    input.beneficiaryName,
      beneficiaryAccount: input.beneficiaryAccount,
      note:               input.note,
      idempotencyKey:     input.idempotencyKey,
    },
  });

  const journal = await postJournal({
    description: `Transfer to ${input.beneficiaryName}`,
    entries: [
      { debitAccountId: input.fromAccountId, creditAccountId: `external:${input.beneficiaryAccount}`, amount: input.amountKobo, reference: transfer.id },
      { debitAccountId: input.fromAccountId, creditAccountId: 'fee:nakconel', amount: fee, reference: `${transfer.id}-fee` },
    ],
  });

  const completed = await prisma.transfer.update({
    where: { id: transfer.id },
    data:  { status: 'COMPLETED', journalId: journal.id },
  });

  await writeAudit({
    userId:     input.userId,
    action:     'TRANSFER_COMPLETED',
    resource:   'transfer',
    resourceId: completed.id,
    meta:       { amount: input.amountKobo, fee, to: input.beneficiaryAccount },
  });

  return completed;
}
