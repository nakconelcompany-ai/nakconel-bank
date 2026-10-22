export interface PaymentProvider {
  name: string;
  charge(input: {
    amountKobo: number;
    currency: string;
    reference: string;
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; providerRef: string; message?: string }>;
}

export interface TransferProvider {
  name: string;
  transfer(input: {
    amountKobo: number;
    accountNumber: string;
    accountName: string;
    bankCode?: string;
    reference: string;
  }): Promise<{ success: boolean; providerRef: string; message?: string }>;
}

export interface KycProvider {
  name: string;
  verifyBvn(input: {
    bvn: string;
    fullName: string;
    dateOfBirth: string;
  }): Promise<{ success: boolean; match: boolean; providerRef: string; message?: string }>;
}
