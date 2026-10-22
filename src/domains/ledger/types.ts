export type LedgerEntryStatus = 'PENDING' | 'POSTED' | 'REVERSED';

export interface LedgerEntry {
  id: string;
  journalId: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: 'NGN';
  timestamp: string;
  reference: string;
  status: LedgerEntryStatus;
  metadata?: Record<string, unknown>;
}

export interface Journal {
  id: string;
  entries: LedgerEntry[];
  createdAt: string;
  description: string;
}
