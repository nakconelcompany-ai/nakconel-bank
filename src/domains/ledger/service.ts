import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type LedgerClient = typeof prisma | any;

export async function getAccountBalanceKobo(accountId: string, client: LedgerClient = prisma): Promise<number> {
  const [credits, debits] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { creditAccountId: accountId, status: 'POSTED', currency: 'NGN' },
      _sum: { amount: true },
    }),
    client.ledgerEntry.aggregate({
      where: { debitAccountId: accountId, status: 'POSTED', currency: 'NGN' },
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
}, client: LedgerClient = prisma) {
  for (const entry of input.entries) {
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
      throw new Error('Ledger amount must be a positive integer in kobo.');
    }
    if (!entry.debitAccountId || !entry.creditAccountId) {
      throw new Error('Debit and credit accounts are required.');
    }
    if (entry.debitAccountId === entry.creditAccountId) {
      throw new Error('A journal entry must use different debit and credit accounts.');
    }
  }

  // Nested journal entries are created atomically by Prisma. Supplying a
  // transaction client keeps this journal within the caller's transaction.
  return client.journal.create({
    data: {
      description: input.description,
      entries: {
        create: input.entries.map(entry => ({
          debitAccountId: entry.debitAccountId,
          creditAccountId: entry.creditAccountId,
          amount: entry.amount,
          currency: 'NGN',
          reference: entry.reference,
          status: 'POSTED',
          metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
    include: { entries: true },
  });
}

export async function reverseJournal(journalId: string, reason: string) {
  const original = await prisma.journal.findUnique({
    where: { id: journalId },
    include: { entries: true },
  });
  if (!original) throw new Error('Journal not found');

  return postJournal({
    description: `Reversal of ${journalId}: ${reason}`,
    entries: original.entries.map(entry => ({
      debitAccountId: entry.creditAccountId,
      creditAccountId: entry.debitAccountId,
      amount: entry.amount,
      reference: `rev-${entry.reference}`,
      metadata: { reversalOf: entry.id, reason },
    })),
  });
}
