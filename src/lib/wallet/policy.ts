export type WalletCapabilities = {
  cardTopups: boolean;
  bankTransfers: false;
  airtime: false;
  billPayments: false;
  virtualCards: false;
  identityVerification: false;
};

export type TopupIntent = {
  reference: string;
  amountKobo: number;
};

export type VerifiedPayment = {
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
};

export function getWalletCapabilities(paystackSecret: string | undefined): WalletCapabilities {
  return {
    cardTopups: Boolean(paystackSecret?.trim()),
    bankTransfers: false,
    airtime: false,
    billPayments: false,
    virtualCards: false,
    identityVerification: false,
  };
}

export function isConfirmedTopup(intent: TopupIntent, payment: VerifiedPayment) {
  return (
    payment.status === "success" &&
    payment.reference === intent.reference &&
    payment.currency === "NGN" &&
    Number(payment.amount) === intent.amountKobo
  );
}
