import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';

const DEFAULT_FEE_KOBO = 5000; // NGN 50
const DAILY_LIMIT_KOBO = 500_000 * 100; // NGN 500,000 daily limit

/**
 * Internal Nakconel-to-Nakconel transfer only.
 * External bank payouts must be implemented through a licensed transfer provider;
 * this function deliberately never treats an external bank account as settled.
 */
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
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 100) {
    throw new Error('Minimum transfer is ₦1');
  }
  if (!/^\d{10}$/.test(input.beneficiaryAccount)) {
    throw new Error('Enter a valid 10-digit Nakconel account number.');
  }

  const fee = DEFAULT_FEE_KOBO;
  const total = input.amountKobo + fee;

  const completed = await prisma.$transaction(async (tx: any) => {
    const replay = await tx.transfer.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (replay) return replay;

    const sender = await tx.account.findFirst({
      where: { id: input.fromAccountId, userId: input.userId, status: 'ACTIVE', currency: 'NGN' },
    });
    if (!sender) throw new Error('Active NGN source account not found.');

    const recipient = await tx.account.findFirst({
      where: { accountNumber: input.beneficiaryAccount, status: 'ACTIVE', currency: 'NGN' },
      include: { user: { select: { fullName: true } } },
    });
    if (!recipient) {
      throw new Error('This bank is not connected to Nakconel transfers yet. External bank payouts are currently unavailable.');
    }
    if (recipient.id === sender.id) throw new Error('You cannot transfer money to the same account.');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayAgg = await tx.transfer.aggregate({
      where: { fromAccountId: sender.id, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      _sum: { amount: true },
    });
    const sentToday = todayAgg._sum.amount ?? 0;
    if (sentToday + input.amountKobo > DAILY_LIMIT_KOBO) {
      const remaining = Math.max(0, DAILY_LIMIT_KOBO - sentToday) / 100;
      throw new Error(`Daily transfer limit reached. You can send up to ₦${remaining.toLocaleString('en-NG')} more today.`);
    }

    const [credits, debits] = await Promise.all([
      tx.ledgerEntry.aggregate({
        where: { creditAccountId: sender.id, status: 'POSTED', currency: 'NGN' },
        _sum: { amount: true },
      }),
      tx.ledgerEntry.aggregate({
        where: { debitAccountId: sender.id, status: 'POSTED', currency: 'NGN' },
        _sum: { amount: true },
      }),
    ]);
    const balance = (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0);
    if (balance < total) throw new Error('Insufficient balance.');

    const journal = await tx.journal.create({
      data: {
        description: `Nakconel transfer to ${recipient.user.fullName}`,
        entries: {
          create: [
            {
              debitAccountId: sender.id,
              creditAccountId: recipient.id,
              amount: input.amountKobo,
              currency: 'NGN',
              reference: input.idempotencyKey,
              status: 'POSTED',
              metadata: { transferType: 'INTERNAL' },
            },
            {
              debitAccountId: sender.id,
              creditAccountId: 'fee:nakconel',
              amount: fee,
              currency: 'NGN',
              reference: `${input.idempotencyKey}-fee`,
              status: 'POSTED',
              metadata: { transferType: 'FEE' },
            },
          ],
        },
      },
    });

    return tx.transfer.create({
      data: {
        fromAccountId: sender.id,
        toAccountId: recipient.id,
        amount: input.amountKobo,
        fee,
        currency: 'NGN',
        status: 'COMPLETED',
        beneficiaryName: recipient.user.fullName,
        beneficiaryAccount: input.beneficiaryAccount,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
        journalId: journal.id,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await writeAudit({
    userId: input.userId,
    action: 'INTERNAL_TRANSFER_COMPLETED',
    resource: 'transfer',
    resourceId: completed.id,
    meta: { amount: input.amountKobo, fee, toAccount: input.beneficiaryAccount },
  });
  return completed;
}
