import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function getAccountBalanceKobo(accountId: string, client: any = prisma): Promise<number> {
  const [credits, debits] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { creditAccountId: accountId, status: 'POSTED' },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { debitAccountId: accountId, status: 'POSTED' },
      _sum: { amount: true },
    }),
  ]);
  return (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0);
}

export async function postJournal(input: {
  description: string;
  entries: Array<{
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    reference: string;
    metadata?: Record<string, unknown>;
  }>;
}) {
  for (const e of input.entries) {
    if (e.amount <= 0) throw new Error('Ledger amount must be positive');
    if (!e.debitAccountId || !e.creditAccountId) throw new Error('Debit and credit accounts required');
  }

  // Create journal + all entries in one atomic write (no $transaction needed here
  // because journal.create with nested entries is already atomic in Prisma)
  const journal = await client.journal.create({
    data: {
      description: input.description,
      entries: {
        create: input.entries.map(e => ({
          debitAccountId:  e.debitAccountId,
          creditAccountId: e.creditAccountId,
          amount:          e.amount,
          currency:        'NGN',
          reference:       e.reference,
          status:          'POSTED',
          metadata:        (e.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
    include: { entries: true },
  });

  return journal;
}

export async function reverseJournal(journalId: string, reason: string) {
  const original = await prisma.journal.findUnique({
    where: { id: journalId },
    include: { entries: true },
  });
  if (!original) throw new Error('Journal not found');

  return postJournal({
    description: `Reversal of ${journalId}: ${reason}`,
    entries: original.entries.map((e: {
      creditAccountId: string;
      debitAccountId: string;
      amount: number;
      reference: string;
      id: string;
    }) => ({
      debitAccountId:  e.creditAccountId,
      creditAccountId: e.debitAccountId,
      amount:          e.amount,
      reference:       `rev-${e.reference}`,
      metadata:        { reversalOf: e.id, reason },
    })),
  });
}
