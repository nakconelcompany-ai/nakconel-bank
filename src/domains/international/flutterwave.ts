/**
 * Flutterwave sandbox-only payout adapter.
 *
 * This module deliberately refuses production mode. It is a preparation and
 * integration-test boundary, not authorization to move customer funds.
 * Never expose FLW_SECRET_KEY to browser code.
 */

export type FlutterwaveTransferInput = {
  accountBank: string;
  accountNumber: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  reference: string;
  narration?: string;
  debitCurrency?: string;
};

export type FlutterwaveTransferResult = {
  providerId: number;
  reference: string;
  providerStatus: string;
  amount: number;
  currency: string;
  fee: number | null;
  message: string;
};

export function isFlutterwaveSandboxReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production'
    && env.FLW_MODE === 'sandbox'
    && env.FLW_TRANSFERS_ENABLED === 'true'
    && Boolean(env.FLW_SECRET_KEY?.startsWith('FLWSECK_TEST-'));
}

export async function createFlutterwaveSandboxTransfer(
  input: FlutterwaveTransferInput,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<FlutterwaveTransferResult> {
  if (!isFlutterwaveSandboxReady(env)) {
    throw new Error('Flutterwave sandbox is not configured. No transfer was submitted.');
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('Transfer amount must be a positive whole number in the destination currency.');
  }
  if (!/^\d{5,20}$/.test(input.accountNumber)) {
    throw new Error('Beneficiary account number is invalid.');
  }
  if (!input.accountBank.trim() || !input.currency.trim() || !input.beneficiaryName.trim()) {
    throw new Error('Beneficiary bank, currency, and name are required.');
  }
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(input.reference)) {
    throw new Error('Transfer reference format is invalid.');
  }

  const response = await fetcher('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      account_bank: input.accountBank,
      account_number: input.accountNumber,
      amount: input.amount,
      currency: input.currency,
      beneficiary_name: input.beneficiaryName,
      reference: input.reference,
      narration: input.narration ?? 'Nakconel sandbox transfer test',
      ...(input.debitCurrency ? { debit_currency: input.debitCurrency } : {}),
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null) as {
    status?: string;
    message?: string;
    data?: {
      id?: number;
      reference?: string;
      status?: string;
      amount?: number;
      currency?: string;
      fee?: number;
    };
  } | null;

  if (!response.ok || payload?.status !== 'success' || !payload.data?.id) {
    throw new Error(payload?.message || `Flutterwave sandbox request failed (HTTP ${response.status}).`);
  }

  return {
    providerId: payload.data.id,
    reference: payload.data.reference || input.reference,
    providerStatus: payload.data.status || 'UNKNOWN',
    amount: payload.data.amount ?? input.amount,
    currency: payload.data.currency || input.currency,
    fee: typeof payload.data.fee === 'number' ? payload.data.fee : null,
    message: payload.message || 'Sandbox request accepted by provider.',
  };
}
