import type { PaymentProvider, TransferProvider, KycProvider } from './types';

export const mockPaymentProvider: PaymentProvider = {
  name: 'mock-payment',
  async charge({ reference }) {
    return { success: true, providerRef: `mock_pay_${reference}` };
  },
};

export const mockTransferProvider: TransferProvider = {
  name: 'mock-transfer',
  async transfer({ reference }) {
    return { success: true, providerRef: `mock_xfer_${reference}` };
  },
};

export const mockKycProvider: KycProvider = {
  name: 'mock-kyc',
  async verifyBvn({ bvn }) {
    if (/^0+$/.test(bvn) || bvn.length !== 11) {
      return { success: false, match: false, providerRef: 'mock_kyc_fail', message: 'Invalid BVN' };
    }
    return { success: true, match: true, providerRef: `mock_kyc_${bvn.slice(-4)}` };
  },
};
