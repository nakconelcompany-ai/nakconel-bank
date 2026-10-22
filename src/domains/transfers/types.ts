export type TransferStatus =
  | 'CREATED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REQUIRES_REVIEW';

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee: number;
  currency: 'NGN';
  status: TransferStatus;
  beneficiaryName: string;
  beneficiaryAccount: string;
  note?: string;
  idempotencyKey: string;
  journalId?: string;
  createdAt: string;
  updatedAt: string;
}
